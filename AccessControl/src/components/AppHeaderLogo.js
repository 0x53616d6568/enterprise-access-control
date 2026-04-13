import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useThemeColors from '../hooks/useThemeColors';

const AppHeaderLogo = () => {
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.accent,
      borderRadius: 16,
      minWidth: 50,
    },
    text: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
    },
  });

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.text}>EAC</Text>
    </View>
  );
};

export default AppHeaderLogo;
