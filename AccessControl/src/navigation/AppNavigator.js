import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import useThemeColors from '../hooks/useThemeColors';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
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
import MQTTTokenScreen from '../screens/shared/MQTTTokenScreen';
import HelpCenterScreen from '../screens/shared/HelpCenterScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isFirstLogin } = useAuth();
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.bg,
        },
        headerStyle: {
          backgroundColor: colors.bgCard,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      }}
    >
      {!user ? (
        // 1. Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPasswordScreen}
            options={{
              headerShown: true,
              title: 'Reset Password',
              headerTintColor: colors.accent,
            }}
          />
        </>
      ) : isFirstLogin ? (
        // 2. First Login - Force password setup
        <>
          <Stack.Screen 
            name="InitialPasswordSetup" 
            component={ChangePasswordScreen}
            options={{ 
              headerShown: false,
              animationEnabled: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />
        </>
      ) : (
        
        <>
          {/* 3. Main Role-based Entry Point */}
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
            name="MQTTToken" 
            component={MQTTTokenScreen} 
            options={{ 
              headerShown: true, 
              title: 'MQTT Tokens' 
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