import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeColors from '../hooks/useThemeColors';

/**
 * Custom Alert Modal Component
 * Matches app design instead of default Android popup
 */
export const CustomAlert = React.forwardRef((props, ref) => {
  const colors = useThemeColors();
  const [visible, setVisible] = React.useState(false);
  const [config, setConfig] = React.useState({
    title: 'Alert',
    message: 'Alert message',
    type: 'info', // 'success', 'error', 'warning', 'info'
    buttons: [{ text: 'OK', onPress: () => {} }]
  });
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useImperativeHandle(ref, () => ({
    show: (alertConfig) => {
      setConfig(alertConfig);
      setVisible(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
    hide: () => {
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }));

  const handleButtonPress = (onPress) => {
    Animated.spring(scaleAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onPress) onPress();
    });
  };

  const getTypeConfig = () => {
    const configs = {
      success: {
        icon: 'checkmark-circle',
        iconColor: colors.success,
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
      },
      error: {
        icon: 'close-circle',
        iconColor: colors.danger,
        backgroundColor: colors.dangerBg,
        borderColor: colors.dangerBorder,
      },
      warning: {
        icon: 'alert-circle',
        iconColor: colors.warning,
        backgroundColor: colors.warningBg,
        borderColor: colors.warningBorder,
      },
      info: {
        icon: 'information-circle',
        iconColor: colors.accent,
        backgroundColor: colors.accentBg,
        borderColor: colors.accentBorder,
      }
    };
    return configs[config.type] || configs.info;
  };

  const typeConfig = getTypeConfig();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      width: '100%',
      maxWidth: 320,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      backgroundColor: typeConfig.backgroundColor,
      borderBottomWidth: 1,
      borderBottomColor: typeConfig.borderColor,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: typeConfig.backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: typeConfig.iconColor,
    },
    headerText: {
      flex: 1,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    body: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    message: {
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
    },
    footer: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 4,
      paddingHorizontal: 4,
      gap: 4,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.bgDeep,
    },
    buttonPrimary: {
      backgroundColor: typeConfig.backgroundColor,
      borderWidth: 1,
      borderColor: typeConfig.borderColor,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    buttonTextPrimary: {
      color: typeConfig.iconColor,
      fontWeight: '700',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => handleButtonPress()}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name={typeConfig.icon} size={24} color={typeConfig.iconColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{config.title}</Text>
            </View>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.message}>{config.message}</Text>
          </View>

          {/* Footer - Buttons */}
          <View style={styles.footer}>
            {config.buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && { backgroundColor: colors.dangerBg },
                  index === config.buttons.length - 1 && styles.buttonPrimary,
                ]}
                onPress={() => handleButtonPress(button.onPress)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    index === config.buttons.length - 1 && styles.buttonTextPrimary,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

CustomAlert.displayName = 'CustomAlert';
