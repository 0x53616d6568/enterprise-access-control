"""
ESP-32 Serial Image Uploader
Sends images from your PC to ESP-32 via serial port

Requires: pyserial, Pillow
Install: pip install pyserial Pillow

Usage:
    python esp32_serial_uploader.py --port COM3 image.jpg
    python esp32_serial_uploader.py --port COM3 --camera
    python esp32_serial_uploader.py --list-ports
"""

import serial
import serial.tools.list_ports
import sys
import os
import time
import argparse
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text.center(60)}{Colors.RESET}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*60}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")

def list_ports():
    """List available serial ports"""
    print_header("Available Serial Ports")
    
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print_warning("No serial ports found")
        return
    
    for i, port in enumerate(ports, 1):
        print(f"{i}. {port.device}")
        print(f"   Description: {port.description}")
        print(f"   Serial Number: {port.serial_number}")
        print()

def open_serial_connection(port, baudrate=115200):
    """Open serial connection to ESP-32"""
    print_info(f"Connecting to {port}...")
    
    try:
        ser = serial.Serial(port, baudrate, timeout=2)
        time.sleep(1)  # Wait for ESP-32 to reset
        print_success(f"Connected to {port} at {baudrate} baud")
        return ser
    except serial.SerialException as e:
        print_error(f"Failed to open {port}: {e}")
        return None

def read_until_prompt(ser, timeout=5):
    """Read serial output until stable"""
    output = ""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if ser.in_waiting:
            chunk = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
            output += chunk
            time.sleep(0.1)
        else:
            time.sleep(0.1)
    
    return output

def send_command(ser, command):
    """Send command to ESP-32"""
    print_info(f"Sending: {command}")
    ser.write(f"{command}\n".encode())
    time.sleep(0.5)
    
    # Read response
    output = read_until_prompt(ser, timeout=3)
    if output:
        print(output)

def send_image(ser, image_path):
    """Send image file to ESP-32"""
    print_info(f"Reading image: {image_path}")
    
    if not os.path.exists(image_path):
        print_error(f"File not found: {image_path}")
        return False
    
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
    except Exception as e:
        print_error(f"Failed to read image: {e}")
        return False
    
    file_size = len(image_data)
    print_info(f"Image size: {file_size} bytes")
    
    if file_size > 100000:  # 100KB limit
        print_error(f"Image too large (max 100KB, got {file_size})")
        return False
    
    # Send image start command
    print_info("Sending IMAGE_START command...")
    ser.write(b"IMAGE_START\n")
    time.sleep(1)
    
    # Read ESP-32 response
    output = read_until_prompt(ser, timeout=2)
    print(output)
    
    # Send image data
    print_info(f"Sending {file_size} bytes of image data...")
    
    # Show progress
    chunk_size = 256
    total_sent = 0
    
    start_time = time.time()
    
    try:
        for i in range(0, len(image_data), chunk_size):
            chunk = image_data[i:i+chunk_size]
            sent = ser.write(chunk)
            total_sent += sent
            
            percent = (total_sent / file_size) * 100
            elapsed = time.time() - start_time
            speed = total_sent / (elapsed + 0.1)
            
            print(f"  [{percent:5.1f}%] {total_sent:6d}/{file_size:6d} bytes  ({speed/1024:6.1f} KB/s)", end='\r')
            
            time.sleep(0.05)
    except Exception as e:
        print_error(f"Failed to send image: {e}")
        return False
    
    # Send end marker
    ser.write(b"\n")
    print()  # New line after progress
    
    print_success(f"Sent {total_sent} bytes in {elapsed:.2f} seconds")
    
    # Read response
    time.sleep(2)
    output = read_until_prompt(ser, timeout=5)
    print(output)
    
    return True

def capture_from_webcam():
    """Capture image from webcam"""
    try:
        import cv2
    except ImportError:
        print_error("OpenCV not installed. Install with: pip install opencv-python")
        return None
    
    print_info("Initializing webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print_error("Could not open webcam")
        return None
    
    print_success("Webcam opened")
    print_info("Press SPACE to capture, ESC to cancel")
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print_error("Failed to read frame")
            break
        
        cv2.imshow('Press SPACE to capture, ESC to cancel', frame)
        key = cv2.waitKey(1)
        
        if key == 32:  # SPACE
            # Save captured frame
            image_path = "webcam_capture.jpg"
            cv2.imwrite(image_path, frame)
            cap.release()
            cv2.destroyAllWindows()
            print_success(f"Image captured: {image_path}")
            return image_path
        elif key == 27:  # ESC
            cap.release()
            cv2.destroyAllWindows()
            return None
    
    cap.release()
    cv2.destroyAllWindows()
    return None

def interactive_mode(ser):
    """Interactive command prompt"""
    print_header("ESP-32 Interactive Mode")
    print_info("Type commands and press Enter")
    print_info("Available commands: TRIGGER, STATUS, UNLOCK, LOCK, HELP, QUIT")
    print()
    
    while True:
        try:
            command = input(f"{Colors.CYAN}ESP32> {Colors.RESET}").strip()
            
            if not command:
                continue
            
            if command.upper() == "QUIT":
                break
            
            if command.upper() == "SEND_IMAGE":
                image_path = input("Image path: ").strip()
                if image_path:
                    send_image(ser, image_path)
            else:
                send_command(ser, command)
        
        except KeyboardInterrupt:
            print("\n")
            break
        except Exception as e:
            print_error(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(
        description='ESP-32 Serial Image Uploader',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python esp32_serial_uploader.py --port COM3 image.jpg
  python esp32_serial_uploader.py --port COM3 --camera
  python esp32_serial_uploader.py --list-ports
  python esp32_serial_uploader.py --port COM3 --interactive
        """
    )
    
    parser.add_argument('--port', help='Serial port (e.g., COM3, /dev/ttyUSB0)')
    parser.add_argument('--baudrate', type=int, default=115200, help='Baud rate (default: 115200)')
    parser.add_argument('--list-ports', action='store_true', help='List available ports')
    parser.add_argument('--camera', action='store_true', help='Capture from webcam')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    parser.add_argument('image', nargs='?', help='Image file to send')
    
    args = parser.parse_args()
    
    # List ports
    if args.list_ports:
        list_ports()
        return
    
    # Require port for other operations
    if not args.port:
        print_error("No port specified")
        print_info("Use --list-ports to see available ports")
        print_info("Or specify with: --port COM3")
        return
    
    # Open serial connection
    ser = open_serial_connection(args.port, args.baudrate)
    if not ser:
        return
    
    # Print banner
    print_header("ESP-32 Door Controller Test")
    
    # Read initial output
    print_info("Reading ESP-32 output...")
    output = read_until_prompt(ser, timeout=2)
    print(output)
    
    try:
        # Interactive mode
        if args.interactive:
            interactive_mode(ser)
        
        # Send image from file
        elif args.image:
            send_image(ser, args.image)
        
        # Capture from camera
        elif args.camera:
            image_path = capture_from_webcam()
            if image_path:
                send_image(ser, image_path)
                # Cleanup
                try:
                    os.remove(image_path)
                except:
                    pass
        
        # Default: just connect
        else:
            print_info("Connected to ESP-32")
            print_info("Type commands:")
            print_info("  - TRIGGER (start access request)")
            print_info("  - STATUS (show status)")
            print_info("  - UNLOCK (unlock door manually)")
            print_info("  - HELP (show all commands)")
            print_info("  - QUIT (exit)")
            print()
            interactive_mode(ser)
    
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    
    finally:
        if ser and ser.is_open:
            ser.close()
            print_info("Serial connection closed")

if __name__ == "__main__":
    main()
