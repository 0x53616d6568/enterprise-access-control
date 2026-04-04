import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import useThemeColors from '../hooks/useThemeColors';

import DashboardScreen     from '../screens/employee/DashboardScreen';
import AttendanceScreen    from '../screens/employee/AttendanceScreen';
import RequestsScreen      from '../screens/employee/RequestsScreen';
import ProfileScreen       from '../screens/employee/ProfileScreen';

// Shared Screens
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import AllLogsScreen       from '../screens/shared/AllLogsScreen';
import BLETokenScreen      from '../screens/shared/BLETokenScreen';
import AppearanceScreen    from '../screens/shared/AppearanceScreen';
import NotificationSettingsScreen from '../screens/shared/NotificationSettingsScreen';


const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard"     component={DashboardScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="AllLogs"       component={AllLogsScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain"   component={ProfileScreen} />
    <Stack.Screen name="BLEToken"      component={BLETokenScreen} />
    <Stack.Screen name="Appearance"    component={AppearanceScreen} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
  </Stack.Navigator>
);

const EmployeeTabs = () => {
  const colors = useThemeColors();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          paddingBottom:   8,
          paddingTop:      8,
          height:          60,
        },
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: '#484F58',
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
        tabBarIcon: ({ color }) => {
          const icons = {
            Home:       'home-outline',
            Attendance: 'calendar-outline',
            Requests:   'document-text-outline',
            Profile:    'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"       component={HomeStack} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Requests"   component={RequestsScreen} />
      <Tab.Screen name="Profile"    component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default EmployeeTabs;