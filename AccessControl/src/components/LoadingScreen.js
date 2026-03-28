import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import useThemeColors from '../hooks/useThemeColors';

const LoadingScreen = () => {
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    container: {
      flex:            1,
      backgroundColor: colors.bg,
      alignItems:      'center',
      justifyContent:  'center',
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
};

export default LoadingScreen;
