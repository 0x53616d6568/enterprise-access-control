import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Your EAC logo design
const LogoSvg = `<svg width="150" height="165" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer hexagon -->
  <polygon points="100,28 171,69 171,151 100,192 29,151 29,69" fill="#1A3A5C" stroke="#2D7DD2" stroke-width="2.5"/>
  <!-- Inner ring shimmer -->
  <polygon points="100,37 163,73 163,147 100,183 37,147 37,73" fill="none" stroke="#58A6FF" stroke-width="0.8" opacity="0.22"/>

  <!-- Face scan bracket corners -->
  <path d="M 87 43 L 83 43 L 83 49" fill="none" stroke="#2D7DD2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 113 43 L 117 43 L 117 49" fill="none" stroke="#2D7DD2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 83 61 L 83 67 L 87 67" fill="none" stroke="#2D7DD2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 117 61 L 117 67 L 113 67" fill="none" stroke="#2D7DD2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Face scan circle -->
  <circle cx="100" cy="54" r="8" fill="none" stroke="#58A6FF" stroke-width="1.5"/>
  
  <!-- Scan lines -->
  <line x1="94" y1="50" x2="106" y2="50" stroke="#58A6FF" stroke-width="1" opacity="0.65"/>
  <line x1="92" y1="54" x2="108" y2="54" stroke="#58A6FF" stroke-width="1" opacity="0.65"/>
  <line x1="94" y1="58" x2="106" y2="58" stroke="#58A6FF" stroke-width="1" opacity="0.65"/>

  <!-- Door arch -->
  <path d="M 65 164 L 65 90 Q 65 72 100 72 Q 135 72 135 90 L 135 164 Z" fill="#F0F6FC" opacity="0.95"/>
  
  <!-- Door panel inset -->
  <path d="M 70 160 L 70 94 Q 70 77 100 77 Q 130 77 130 94 L 130 160 Z" fill="#AACCEE" opacity="0.17"/>
  
  <!-- Doorknob -->
  <circle cx="122" cy="118" r="4.5" fill="#2D7DD2"/>

  <!-- BLE signal arcs -->
  <path d="M 138 110 A 8 8 0 0 1 138 122" fill="none" stroke="#58A6FF" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 143 106 A 12 12 0 0 1 143 126" fill="none" stroke="#58A6FF" stroke-width="2" stroke-linecap="round" opacity="0.68"/>
  <path d="M 148 102 A 15 15 0 0 1 148 130" fill="none" stroke="#58A6FF" stroke-width="1.5" stroke-linecap="round" opacity="0.42"/>
</svg>`;

const LoadingScreen = () => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0D1117',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoContainer: {
      marginBottom: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <SvgXml xml={LogoSvg} width={150} height={165} />
      </View>
      <ActivityIndicator size="large" color="#2D7DD2" />
    </View>
  );
};

export default LoadingScreen;
