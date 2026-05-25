#!/usr/bin/env python3
"""
PC Door Station

Live camera preview + MQTT-triggered face verification for SecureApp.

Flow:
1. Subscribe to door access request topics on MQTT.
2. Keep a live preview open on the PC camera.
3. When a request arrives, capture the current frame.
4. Send the frame to the Hugging Face Space for recognition.
5. POST the verification result back to the backend.
6. Backend publishes the unlock MQTT command for the ESP32.

Install:
  pip install opencv-python paho-mqtt requests numpy python-dotenv

Configuration:
  Create a .env file in the SecureApp directory with these variables:
  
  MQTT_BROKER_URL         Default: mqtt://localhost:1883
  MQTT_USERNAME           HiveMQ username (sameh)
  MQTT_PASSWORD           HiveMQ password
  MQTT_REQUEST_TOPIC      Default: doors/+/access/request
  MQTT_RESPONSE_TOPIC     Default: doors/{door_id}/access/response/{request_id}
  BACKEND_VERIFY_URL      Default: http://localhost:3001/api/mqtt/request/{requestId}/face-auth
  HF_SPACE_URL            Your Hugging Face Space URL
  HF_SPACE_API_KEY        Optional API key for the HF Space
  CAMERA_INDEX            Default: 0 (0=default camera)
  MQTT_CLIENT_ID          Default: pc-door-station-{timestamp}
  PREVIEW_TITLE           Default: SecureApp Door Station
  FACE_THRESHOLD          Default: 0.60 (0.0-1.0 similarity threshold)
  MQTT_TLS_INSECURE       Default: false (true for self-signed TLS)

Run:
  python pc_door_station.py
  
Press q or ESC to exit the camera preview.
"""

from __future__ import annotations

import base64
import queue
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse

import cv2
import numpy as np
import paho.mqtt.client as mqtt
import requests
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _parse_broker_url(broker_url: str) -> Tuple[str, int, str, Optional[str], bool]:
    parsed = urlparse(broker_url)

    if parsed.scheme not in {"mqtt", "mqtts", "ws", "wss"}:
        raise ValueError(f"Unsupported MQTT broker scheme: {parsed.scheme}")

    host = parsed.hostname
    if not host:
        raise ValueError("MQTT_BROKER_URL must include a host")

    if parsed.scheme == "mqtt":
        port = parsed.port or 1883
        transport = "tcp"
        use_tls = False
        path = None
    elif parsed.scheme == "mqtts":
        port = parsed.port or 8883
        transport = "tcp"
        use_tls = True
        path = None
    elif parsed.scheme == "ws":
        port = parsed.port or 80
        transport = "websockets"
        use_tls = False
        path = parsed.path or "/mqtt"
    else:
        port = parsed.port or 443
        transport = "websockets"
        use_tls = True
        path = parsed.path or "/mqtt"

    return host, port, transport, path, use_tls


@dataclass
class DoorStationConfig:
    # Backend service
    backend_host: str = _env("BACKEND_HOST", "localhost")
    backend_port: int = int(_env("BACKEND_PORT", "3001"))
    backend_protocol: str = _env("BACKEND_PROTOCOL", "http")
    backend_verify_url: str = _env("BACKEND_VERIFY_URL", "")
    
    # MQTT Configuration
    mqtt_broker_url: str = _env("MQTT_BROKER_URL", "mqtt://localhost:1883")
    mqtt_username: str = _env("MQTT_USERNAME", "")
    mqtt_password: str = _env("MQTT_PASSWORD", "")
    mqtt_request_topic: str = _env("MQTT_REQUEST_TOPIC", "doors/+/access/request")
    mqtt_response_topic: str = _env(
        "MQTT_RESPONSE_TOPIC", "doors/{door_id}/access/response/{request_id}"
    )
    mqtt_client_id: str = _env("MQTT_CLIENT_ID", f"pc-door-station-{int(time.time())}")
    mqtt_tls_insecure: bool = _env_bool("MQTT_TLS_INSECURE", False)
    
    # Face Recognition Service (Hugging Face)
    hf_space_url: str = _env("HF_SPACE_URL", "https://your-space.hf.space")
    hf_space_api_key: str = _env("HF_SPACE_API_KEY", "")
    
    # Camera Configuration
    camera_index: int = int(_env("CAMERA_INDEX", "0"))
    
    # UI Configuration
    preview_title: str = _env("PREVIEW_TITLE", "SecureApp Door Station")
    face_threshold: float = float(_env("FACE_THRESHOLD", "0.60"))
    
    def __post_init__(self):
        """Build backend_verify_url if not explicitly set"""
        if not self.backend_verify_url:
            self.backend_verify_url = f"{self.backend_protocol}://{self.backend_host}:{self.backend_port}/api/mqtt/request"


class DoorStation:
    def __init__(self, config: DoorStationConfig):
        self.config = config
        self.stop_event = threading.Event()
        self.request_queue: "queue.Queue[Dict[str, Any]]" = queue.Queue()
        self.latest_frame: Optional[np.ndarray] = None
        self.frame_lock = threading.Lock()
        self.status_lock = threading.Lock()
        self.status_line = "Waiting for MQTT access request..."
        self.last_recognition_line = "HF Space: idle"
        self.last_backend_line = "Backend: idle"
        self.mqtt_client: Optional[mqtt.Client] = None
        self.camera: Optional[cv2.VideoCapture] = None

    def set_status(
        self,
        status_line: Optional[str] = None,
        recognition_line: Optional[str] = None,
        backend_line: Optional[str] = None,
    ) -> None:
        with self.status_lock:
            if status_line is not None:
                self.status_line = status_line
            if recognition_line is not None:
                self.last_recognition_line = recognition_line
            if backend_line is not None:
                self.last_backend_line = backend_line

    def _safe_request_id(self, payload: Dict[str, Any]) -> Optional[str]:
        return str(payload.get("requestId") or payload.get("request_id") or "") or None

    def _safe_door_id(self, payload: Dict[str, Any], topic: str) -> Optional[str]:
        door_id = payload.get("doorId") or payload.get("door_id")
        if door_id is not None:
            return str(door_id)

        parts = topic.split("/")
        if len(parts) >= 2 and parts[0] == "doors":
            return parts[1]

        return None

    def _safe_token_hash(self, payload: Dict[str, Any]) -> Optional[str]:
        # Look for tokenHash first, then tokenId (which can be used as token hash)
        token_hash = payload.get("tokenHash") or payload.get("token_hash") or payload.get("tokenId") or payload.get("token_id")
        return str(token_hash) if token_hash else None

    def _open_camera(self) -> None:
        self.camera = cv2.VideoCapture(self.config.camera_index)
        if not self.camera.isOpened():
            raise RuntimeError(f"Could not open camera index {self.config.camera_index}")

    def _mqtt_connect(self) -> None:
        host, port, transport, path, use_tls = _parse_broker_url(self.config.mqtt_broker_url)
        client = mqtt.Client(client_id=self.config.mqtt_client_id, transport=transport)

        if self.config.mqtt_username:
            client.username_pw_set(self.config.mqtt_username, self.config.mqtt_password)

        if use_tls:
            client.tls_set()
            client.tls_insecure_set(self.config.mqtt_tls_insecure)

        if transport == "websockets":
            client.ws_set_options(path=path or "/mqtt")

        def on_connect(client_ref, userdata, flags, rc, properties=None):
            if rc == 0:
                self.set_status("MQTT connected", backend_line=f"Broker: {host}:{port}")
                client_ref.subscribe(self.config.mqtt_request_topic, qos=1)
                self.set_status(
                    recognition_line=f"Subscribed: {self.config.mqtt_request_topic}",
                    backend_line=f"Broker: {host}:{port}"
                )
            else:
                self.set_status(status_line=f"MQTT connect failed: {rc}")

        def on_message(client_ref, userdata, message):
            try:
                payload = json.loads(message.payload.decode("utf-8"))
            except Exception as exc:
                self.set_status(status_line=f"Bad MQTT payload: {exc}")
                return

            payload["__topic"] = message.topic
            self.request_queue.put(payload)

        def on_disconnect(client_ref, userdata, rc, properties=None):
            if not self.stop_event.is_set():
                self.set_status(status_line=f"MQTT disconnected: {rc}")

        client.on_connect = on_connect
        client.on_message = on_message
        client.on_disconnect = on_disconnect

        try:
            client.connect(host, port, keepalive=30)
        except Exception as exc:
            raise RuntimeError(f"Could not connect to MQTT broker: {exc}") from exc

        client.loop_start()
        self.mqtt_client = client

    def _capture_latest_frame(self) -> Optional[np.ndarray]:
        with self.frame_lock:
            if self.latest_frame is None:
                return None
            return self.latest_frame.copy()

    def _encode_frame(self, frame: np.ndarray) -> Optional[str]:
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not ok:
            return None
        return base64.b64encode(buffer.tobytes()).decode("ascii")

    def _recognize_face(self, frame: np.ndarray) -> Dict[str, Any]:
        image_base64 = self._encode_frame(frame)
        if not image_base64:
            raise RuntimeError("Could not encode camera frame")

        headers = {"Content-Type": "application/json"}
        if self.config.hf_space_api_key:
            headers["X-API-Key"] = self.config.hf_space_api_key

        response = requests.post(
            _join_url(self.config.hf_space_url, "/recognize"),
            json={"image_base64": image_base64},
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()

        if not payload.get("success"):
            raise RuntimeError(payload.get("error", "HF Space recognition failed"))

        data = payload.get("data", {})
        similarity = float(data.get("similarity") or 0.0)
        recognized_user_id = data.get("user_id")
        authorized = bool(data.get("is_authorized")) and similarity >= self.config.face_threshold

        return {
            "success": True,
            "recognized_user_id": recognized_user_id,
            "similarity": similarity,
            "authorized": authorized,
            "raw": data,
        }

    def _post_backend_verification(self, request_payload: Dict[str, Any], recognition: Dict[str, Any]) -> Dict[str, Any]:
        request_id = self._safe_request_id(request_payload)
        token_hash = self._safe_token_hash(request_payload)
        door_id = self._safe_door_id(request_payload, request_payload.get("__topic", ""))

        if not request_id or not token_hash or not door_id:
            raise RuntimeError("MQTT request must include requestId, tokenHash, and doorId")

        backend_payload = {
            "faceAuthPassed": bool(recognition.get("authorized")),
            "faceSimilarity": recognition.get("similarity", 0.0),
            "recognizedUserId": recognition.get("recognized_user_id"),
        }

        # Build full URL with requestId
        verify_url = f"{self.config.backend_verify_url}/{request_id}/face-auth"

        response = requests.post(
            verify_url,
            json=backend_payload,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def _publish_response(self, request_payload: Dict[str, Any], recognition: Dict[str, Any], backend_result: Dict[str, Any]) -> None:
        if not self.mqtt_client:
            return

        request_id = self._safe_request_id(request_payload)
        door_id = self._safe_door_id(request_payload, request_payload.get("__topic", ""))
        if not request_id or not door_id:
            return

        response_topic = self.config.mqtt_response_topic.format(door_id=door_id, request_id=request_id)
        message = {
            "requestId": request_id,
            "doorId": door_id,
            "granted": bool(backend_result.get("data", {}).get("granted", False)),
            "recognition": {
                "userId": recognition.get("recognized_user_id"),
                "similarity": recognition.get("similarity", 0.0),
                "authorized": recognition.get("authorized", False),
            },
            "backend": backend_result.get("data", backend_result),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        self.mqtt_client.publish(response_topic, json.dumps(message), qos=1, retain=False)

    def _process_request(self, request_payload: Dict[str, Any]) -> None:
        request_id = self._safe_request_id(request_payload)
        door_id = self._safe_door_id(request_payload, request_payload.get("__topic", ""))

        if not request_id or not door_id:
            self.set_status(status_line="Skipping malformed MQTT request")
            return

        self.set_status(status_line=f"Processing request {request_id} for door {door_id}")

        frame = self._capture_latest_frame()
        if frame is None:
            self.set_status(status_line="No camera frame available yet")
            return

        try:
            recognition = self._recognize_face(frame)
            self.set_status(
                status_line=f"Request {request_id} on door {door_id}",
                recognition_line=f"HF: user={recognition.get('recognized_user_id')} similarity={recognition.get('similarity', 0.0):.3f} authorized={recognition.get('authorized')}",
            )
        except Exception as exc:
            self.set_status(status_line=f"HF recognition failed: {exc}")
            recognition = {
                "success": False,
                "recognized_user_id": None,
                "similarity": 0.0,
                "authorized": False,
            }

        try:
            backend_result = self._post_backend_verification(request_payload, recognition)
            backend_data = backend_result.get("data", backend_result)
            self.set_status(
                status_line=f"Backend: granted={backend_data.get('granted', False)} mqtt_sent={backend_data.get('mqtt_sent', False)}",
                backend_line=f"Backend: {backend_result.get('message', 'verified')}",
            )
            self._publish_response(request_payload, recognition, backend_result)
        except Exception as exc:
            self.set_status(status_line=f"Backend verification failed: {exc}")

    def _request_worker(self) -> None:
        while not self.stop_event.is_set():
            try:
                request_payload = self.request_queue.get(timeout=0.25)
            except queue.Empty:
                continue

            try:
                self._process_request(request_payload)
            finally:
                self.request_queue.task_done()

    def _draw_overlay(self, frame: np.ndarray) -> None:
        with self.status_lock:
            status_line = self.status_line
            recognition_line = self.last_recognition_line
            backend_line = self.last_backend_line

        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (frame.shape[1], 92), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.45, frame, 0.55, 0, frame)

        lines = [
            f"MQTT: {self.config.mqtt_request_topic}",
            status_line,
            recognition_line,
            backend_line,
        ]

        y = 24
        for line in lines:
            cv2.putText(frame, line, (16, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
            y += 22

    def run(self) -> None:
        self._open_camera()
        self._mqtt_connect()

        worker = threading.Thread(target=self._request_worker, daemon=True)
        worker.start()

        try:
            while not self.stop_event.is_set():
                ok, frame = self.camera.read()
                if not ok:
                    self.set_status(status_line="Camera read failed")
                    time.sleep(0.05)
                    continue

                with self.frame_lock:
                    self.latest_frame = frame.copy()

                self._draw_overlay(frame)
                cv2.imshow(self.config.preview_title, frame)

                key = cv2.waitKey(1) & 0xFF
                if key in {27, ord("q")}:  # ESC or q
                    self.stop_event.set()
                    break
        finally:
            self.shutdown()

    def shutdown(self) -> None:
        self.stop_event.set()

        if self.mqtt_client is not None:
            try:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
            except Exception:
                pass

        if self.camera is not None:
            try:
                self.camera.release()
            except Exception:
                pass

        try:
            cv2.destroyAllWindows()
        except Exception:
            pass


def main() -> None:
    config = DoorStationConfig()
    station = DoorStation(config)

    print("PC Door Station starting...")
    print(f"  MQTT topic:   {config.mqtt_request_topic}")
    print(f"  Backend URL:  {config.backend_verify_url}")
    print(f"  HF Space URL: {config.hf_space_url}")
    print(f"  Camera index: {config.camera_index}")
    print("  Press q or ESC to exit")

    station.run()


if __name__ == "__main__":
    main()