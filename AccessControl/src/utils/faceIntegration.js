/**
 * Example: How to use FaceService in your screens
 * 
 * This shows how to integrate the face recognition microservice
 * into your AccessControl app
 */

import FaceService from '../services/faceService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

/**
 * Example 1: Enroll a face from camera
 */
export const handleFaceEnrollment = async (userId) => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission required');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.cancelled) return;

    // Convert image to base64
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call face enrollment
    const response = await FaceService.enrollFace(userId, base64);

    if (response.success) {
      alert('Face enrolled successfully!');
      console.log('Embedding:', response.data.embedding);
      return response.data;
    } else {
      alert(`Enrollment failed: ${response.error}`);
    }
  } catch (error) {
    console.error('Enrollment error:', error);
    alert('Error enrolling face');
  }
};

/**
 * Example 2: Recognize a face from camera
 */
export const handleFaceRecognition = async () => {
  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission required');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.cancelled) return;

    // Convert image to base64
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call face recognition
    const response = await FaceService.recognizeFace(base64);

    if (response.success) {
      const { user_id, similarity, is_authorized } = response.data;
      
      if (user_id) {
        alert(`Match found! User: ${user_id}, Similarity: ${(similarity * 100).toFixed(1)}%`);
        console.log('Is authorized:', is_authorized);
        return response.data;
      } else {
        alert('No matching face found');
      }
    } else {
      alert(`Recognition failed: ${response.error}`);
    }
  } catch (error) {
    console.error('Recognition error:', error);
    alert('Error recognizing face');
  }
};

/**
 * Example 3: Check microservice health
 */
export const checkFaceServiceHealth = async () => {
  const response = await FaceService.getHealth();
  
  if (response.success) {
    console.log('Face service is healthy:', response.data);
    return true;
  } else {
    console.error('Face service unhealthy:', response.error);
    return false;
  }
};

/**
 * Usage in a React Native screen:
 * 
 * import { handleFaceEnrollment, handleFaceRecognition } from '../utils/faceIntegration';
 * 
 * export default function AttendanceScreen({ userId }) {
 *   return (
 *     <View>
 *       <Button
 *         title="Enroll Face"
 *         onPress={() => handleFaceEnrollment(userId)}
 *       />
 *       <Button
 *         title="Mark Attendance (Face)"
 *         onPress={handleFaceRecognition}
 *       />
 *     </View>
 *   );
 * }
 */
