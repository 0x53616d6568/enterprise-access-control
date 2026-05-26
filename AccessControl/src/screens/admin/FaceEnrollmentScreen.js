import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/apiService';
import { enrollUserFace } from '../../services/faceEnrollmentService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

const STEPS = [
  { label: 'Select user',       sub: '' },
  { label: 'Capture face',      sub: 'Look straight at the camera' },
  { label: 'Generate embedding',sub: 'ArcFace processes the capture' },
  { label: 'Save profile',      sub: 'Stored securely in database' },
];

export default function FaceEnrollmentScreen({ navigation, route }) {
  const { user: adminUser } = useAuth();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.bg },
    centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn:   { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title:     { color: colors.textPrimary, fontSize: 20, fontWeight: '500', letterSpacing: -0.4, marginBottom: 2 },
    subtitle:  { color: colors.textMuted, fontSize: 12 },
    userCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 20 },
    userAvatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
    userAvatarText: { color: colors.accentText, fontSize: 13, fontWeight: '500' },
    userInfo:  { flex: 1 },
    userName:  { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    userMeta:  { color: colors.textMuted, fontSize: 11 },
    cameraFrame: { height: 220, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
    camera:    { flex: 1 },
    cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 10 },
    faceOutline: { width: 100, height: 120, borderWidth: 2, borderColor: colors.accent, borderRadius: 60, opacity: 0.6 },
    cameraLabel: { color: colors.textMuted, fontSize: 12 },
    cornerTL:  { position: 'absolute', top: 16, left: 16, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.accent, borderTopLeftRadius: 3 },
    cornerTR:  { position: 'absolute', top: 16, right: 16, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.accent, borderTopRightRadius: 3 },
    cornerBL:  { position: 'absolute', bottom: 16, left: 16, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: colors.accent, borderBottomLeftRadius: 3 },
    cornerBR:  { position: 'absolute', bottom: 16, right: 16, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.accent, borderBottomRightRadius: 3 },
    permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    permissionText: { color: colors.textMuted, fontSize: 13 },
    permBtn:   { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
    permBtnText: { color: '#fff', fontSize: 13 },
    successCard: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, marginBottom: 20 },
    successIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    successTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '500' },
    successSub:   { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    steps:     { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
    step:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    stepNum:   { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    stepNumDone:   { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    stepNumActive: { backgroundColor: colors.bgDeep, borderColor: colors.accentDark },
    stepNumText:   { color: '#484F58', fontSize: 12, fontWeight: '500' },
    stepInfo:  { flex: 1 },
    stepTitle: { color: colors.textPrimary, fontSize: 13, marginBottom: 1 },
    stepSub:   { color: colors.textMuted, fontSize: 11 },
    enrollBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    enrollBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  });

  const targetUser = route?.params?.user;

  const [permission, requestPermission] = useCameraPermissions();
  const [step,       setStep]       = useState(targetUser ? 1 : 0);
  const [capturing,  setCapturing]  = useState(false);
  const [enrolled,   setEnrolled]   = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('front');
  const [useGallery, setUseGallery] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const cameraRef = useRef(null);

  // Fetch current enrollment count when component mounts
  React.useEffect(() => {
    if (targetUser) {
      checkEnrollmentStatus();
    }
  }, [targetUser]);

  const checkEnrollmentStatus = async () => {
    try {
      const status = await api.get(`${API.FACE_STATUS(targetUser.user_id)}`);
      setEnrollmentCount(status.data.data.count || 0);
    } catch (err) {
      console.log('Status check:', err.message);
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        handleEnrollment(result.assets[0].base64);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image: ' + err.message);
    }
  };

  const handleEnrollment = async (base64Image) => {
    setCapturing(true);
    setErrorMessage(null);
    try {
      setStep(2);
      const result = await enrollUserFace(targetUser.user_id, base64Image);
      setEnrollmentCount(result.total_embeddings || enrollmentCount + 1);
      setStep(3);
      setTimeout(() => {
        setEnrolled(true);
        setStep(4);
      }, 1000);
    } catch (err) {
      console.error('Enrollment error:', err);
      setStep(1);
      setErrorMessage(err.message || 'Could not process face. Please try again.');
      // Show alert with better formatting
      Alert.alert(
        'Enrollment Failed',
        err.message || 'Could not process face. Please try again.',
        [
          { text: 'Try Again', onPress: () => setErrorMessage(null) },
        ],
        { cancelable: false }
      );
    } finally {
      setCapturing(false);
      setUseGallery(false);
    }
  };

  const initials = targetUser?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (!permission) return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Face Enrollment</Text>
            <Text style={styles.subtitle}>Register a user's face profile</Text>
          </View>
        </View>

        {/* User selector */}
        {targetUser ? (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{targetUser.full_name}</Text>
              <Text style={styles.userMeta}>
                {targetUser.department} · {enrollmentCount > 0 ? `${enrollmentCount} face(s)` : 'No profile yet'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color="#484F58" />
          </View>
        ) : (
          <TouchableOpacity style={styles.userCard}>
            <View style={[styles.userAvatar, { backgroundColor: colors.bgCard }]}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            </View>
            <Text style={styles.userMeta}>Select a user to enroll</Text>
          </TouchableOpacity>
        )}

        {/* Camera/Gallery options */}
        {!enrolled && targetUser && !useGallery && step === 1 && (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              style={[
                { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 6 }
              ]}
              onPress={() => setUseGallery(false)}
            >
              <Ionicons name="camera" size={20} color={colors.accent} />
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '500' }}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 6 }
              ]}
              onPress={pickImageFromGallery}
            >
              <Ionicons name="images" size={20} color={colors.accent} />
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '500' }}>Upload</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Camera frame */}
        {!enrolled && targetUser && step === 1 && (
          <View style={styles.cameraFrame}>
            {permission.granted ? (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing={cameraFacing}
                />
                {/* Camera flip button */}
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={20} color="#fff" />
                </TouchableOpacity>

                {/* Overlay */}
                <View style={styles.cameraOverlay}>
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                  <View style={styles.faceOutline} />
                  <Text style={styles.cameraLabel}>Position face in frame</Text>
                </View>
              </>
            ) : (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                <Text style={styles.permissionText}>Camera permission required</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Grant permission</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Success state */}
        {enrolled && (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={28} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Face enrolled successfully</Text>
            <Text style={styles.successSub}>
              {targetUser.full_name} now has {enrollmentCount} enrolled face(s){'\n'}
              Better accuracy with multiple angles
            </Text>
          </View>
        )}

        {/* Steps */}
        <View style={styles.steps}>
          {STEPS.map((s, i) => {
            const isDone   = i < step;
            const isActive = i === step;
            return (
              <View key={i} style={[styles.step, i === STEPS.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[
                  styles.stepNum,
                  isDone   && styles.stepNumDone,
                  isActive && styles.stepNumActive,
                ]}>
                  {isDone
                    ? <Ionicons name="checkmark" size={12} color={colors.success} />
                    : <Text style={[styles.stepNumText, isActive && { color: colors.accentText }]}>{i + 1}</Text>
                  }
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepTitle, !isDone && !isActive && { color: '#484F58' }]}>
                    {s.label}
                  </Text>
                  {(isDone || isActive) && s.sub ? (
                    <Text style={styles.stepSub}>{isDone ? 'Completed' : s.sub}</Text>
                  ) : null}
                </View>
                {isActive && capturing && <ActivityIndicator size="small" color={colors.accent} />}
              </View>
            );
          })}
        </View>

        {/* Action button */}
        {!enrolled && targetUser && permission.granted && step === 1 && (
          <TouchableOpacity
            style={[styles.enrollBtn, capturing && { opacity: 0.6 }]}
            onPress={async () => {
              if (!cameraRef.current) return;
              setCapturing(true);
              setErrorMessage(null);
              try {
                // Capture 3 frames at 300ms intervals for better accuracy (multi-frame enrollment)
                const frames = [];
                for (let i = 0; i < 3; i++) {
                  console.log(`Capturing frame ${i + 1}/3...`);
                  const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.95, // Increased from 0.8 for better image quality
                    base64: true,
                  });
                  frames.push(photo.base64);
                  
                  // Wait 300ms between frames for natural variation
                  if (i < 2) {
                    await new Promise(r => setTimeout(r, 300));
                  }
                }
                console.log(`Successfully captured ${frames.length} frames for multi-frame enrollment`);
                handleEnrollment(frames); // Pass array of frames
              } catch (err) {
                Alert.alert('Capture failed', err.message || 'Could not capture photos.');
                setCapturing(false);
              }
            }}
            disabled={capturing}
          >
            {capturing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.enrollBtnText}>Capture &amp; Enroll (3 frames)</Text>
            }
          </TouchableOpacity>
        )}

        {enrolled && (
          <>
            <TouchableOpacity 
              style={[styles.enrollBtn, { marginBottom: 12 }]} 
              onPress={() => {
                setEnrolled(false);
                setStep(1);
              }}
            >
              <Text style={styles.enrollBtnText}>+ Enroll Another Face</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.enrollBtn, { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border }]} 
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.enrollBtnText, { color: colors.textPrimary }]}>Done</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
