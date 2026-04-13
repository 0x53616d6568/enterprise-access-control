import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useThemeColors from '../hooks/useThemeColors';

const Logo = ({ width = 100, height = 100 }) => {
  const colors = useThemeColors();
  const size = Math.min(width, height);

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      width,
      height,
    },
    badge: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: size / 2,
      width: size,
      height: size,
    },
    text: {
      color: '#fff',
      fontSize: size * 0.4,
      fontWeight: '700',
      letterSpacing: 1,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.text}>EAC</Text>
      </View>
    </View>
  );
};

export default Logo;
