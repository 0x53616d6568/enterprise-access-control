import React, { createContext, useContext, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeColors from '../hooks/useThemeColors';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    type: 'default', // 'default', 'success', 'error', 'warning'
  });

  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'default') => {
    setConfig({ title, message, buttons, type });
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        config={config}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

const CustomAlert = ({ visible, config, onClose }) => {
  const colors = useThemeColors();
  const { title, message, buttons, type } = config;

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: colors.success, bg: colors.successBg };
      case 'error':
        return { name: 'close-circle', color: colors.danger, bg: colors.dangerBg };
      case 'warning':
        return { name: 'warning', color: colors.warning, bg: colors.warningBg };
      default:
        return { name: 'information-circle', color: colors.accent, bg: colors.bgDeep };
    }
  };

  const iconConfig = getIconConfig();

  const handleButtonPress = (button) => {
    onClose();
    if (button.onPress) {
      setTimeout(() => button.onPress(), 100);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    container: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: iconConfig.bg,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    message: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    buttonsContainer: {
      flexDirection: buttons.length > 2 ? 'column' : 'row',
      gap: 10,
    },
    button: {
      flex: buttons.length <= 2 ? 1 : 0,
      paddingVertical: 13,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: colors.accent,
    },
    cancelButton: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    destructiveButton: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: '#fff',
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    destructiveButtonText: {
      color: colors.danger,
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconConfig.name} size={32} color={iconConfig.color} />
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonsContainer}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isPrimary && styles.primaryButton,
                    isCancel && styles.cancelButton,
                    isDestructive && styles.destructiveButton,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isPrimary && styles.primaryButtonText,
                      isCancel && styles.cancelButtonText,
                      isDestructive && styles.destructiveButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export default AlertContext;
