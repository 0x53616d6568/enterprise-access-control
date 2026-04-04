import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext'; 
import { AlertProvider } from './src/context/AlertContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AlertProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}