import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import colors from '../constants/colors';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';

// Tab Navigators (Role-based)
import AdminTabs from './AdminTabs';
import EmployeeTabs from './EmployeeTabs';
import ManagerTabs from './ManagerTabs';

// Shared Screens
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NotificationSettingsScreen from '../screens/shared/NotificationSettingsScreen';
import AppearanceScreen from '../screens/shared/AppearanceScreen';
import BLETokenScreen from '../screens/shared/BLETokenScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: colors.bgCard || '#121212',
        },
        headerTintColor: colors.textPrimary || '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      }}
    >
      {!user ? (
        // 1. Auth Stack: Only accessible when logged out
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {/* 2. Main Role-based Entry Point */}
          {user.access_level >= 5 ? (
            <Stack.Screen name="MainTabs" component={AdminTabs} />
          ) : user.access_level >= 3 ? (
            <Stack.Screen name="MainTabs" component={ManagerTabs} />
          ) : (
            <Stack.Screen name="MainTabs" component={EmployeeTabs} />
          )}

          {/* 3. Global Shared Screens */}
          {/* These slide in over the bottom tabs when called from the Profile */}
          
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen} 
            options={{ 
              headerShown: true, 
              title: 'Recent Activity' 
            }} 
          />
          
          <Stack.Screen 
            name="NotificationSettings" 
            component={NotificationSettingsScreen} 
            options={{ 
              headerShown: true, 
              title: 'Notification Preferences' 
            }} 
          />

          <Stack.Screen 
            name="Appearance" 
            component={AppearanceScreen} 
            options={{ 
              headerShown: true, 
              title: 'Theme & Display' 
            }} 
          />

          <Stack.Screen 
            name="BLEToken" 
            component={BLETokenScreen} 
            options={{ 
              headerShown: true, 
              title: 'Security Token' 
            }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
}