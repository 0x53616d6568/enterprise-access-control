import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import useThemeColors from '../hooks/useThemeColors';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import ChangeCurrentPasswordScreen from '../screens/auth/ChangeCurrentPasswordScreen';
  
// Tab Navigators (Role-based)
import AdminTabs from './AdminTabs';
import EmployeeTabs from './EmployeeTabs';
import ManagerTabs from './ManagerTabs';

// Shared Screens
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NotificationSettingsScreen from '../screens/shared/NotificationSettingsScreen';
import AppearanceScreen from '../screens/shared/AppearanceScreen';
import BLETokenScreen from '../screens/shared/BLETokenScreen';
import HelpCenterScreen from '../screens/shared/HelpCenterScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();
  const colors = useThemeColors();

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
        // 1. Auth Stack
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
          
          {/* change password screen from settings menu in profile screen */}
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />
          
          {/* change current password screen from settings menu in profile screen */}
          <Stack.Screen name="ChangeCurrentPassword" component={ChangeCurrentPasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />
          
          

    
          {/* 3. Global Shared Screens */}
          {/* These use the exact names called in ProfileScreen's navigation.navigate() */}
          
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

          <Stack.Screen 
            name="HelpCenter" 
            component={HelpCenterScreen} 
            options={{ 
              headerShown: false,
              title: 'Help Center' 
            }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
}