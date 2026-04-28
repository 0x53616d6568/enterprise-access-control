import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext'; 
import { AlertProvider } from './src/context/AlertContext';
import { MQTTProvider } from './src/context/MQTTContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/components/LoadingScreen';

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MQTTProvider>
          <AlertProvider>
            <AppContent />
          </AlertProvider>
        </MQTTProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}