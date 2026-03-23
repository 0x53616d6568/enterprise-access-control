import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

// Screen Imports
import DashboardScreen      from '../screens/employee/DashboardScreen';
import UsersScreen          from '../screens/admin/UsersScreen';
import AddUserScreen         from '../screens/admin/AddUserScreen';
import DoorsScreen           from '../screens/admin/DoorsScreen';
import AddDoorScreen         from '../screens/admin/AddDoorScreen';
import LogsScreen            from '../screens/admin/LogsScreen';
import FaceEnrollmentScreen from '../screens/admin/FaceEnrollmentScreen';
import ProfileScreen         from '../screens/employee/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 1. Users Stack (Internal to Admin)
const UsersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="UsersList"      component={UsersScreen} />
    <Stack.Screen name="AddUser"         component={AddUserScreen} />
    <Stack.Screen name="FaceEnrollment" component={FaceEnrollmentScreen} />
  </Stack.Navigator>
);

// 2. Doors Stack (Internal to Admin)
const DoorsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DoorsList" component={DoorsScreen} />
    <Stack.Screen name="AddDoor"   component={AddDoorScreen} />
  </Stack.Navigator>
);

// 3. Main Admin Tab Navigator
const AdminTabs = () => (
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
      tabBarLabelStyle: { fontSize: 9, marginTop: 2 },
      tabBarIcon: ({ color }) => {
        const icons = {
          Home:    'home-outline',
          Users:   'people-outline',
          Doors:   'lock-closed-outline',
          Logs:    'document-text-outline',
          Profile: 'person-outline',
        };
        return <Ionicons name={icons[route.name]} size={20} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home"    component={DashboardScreen} />
    <Tab.Screen name="Users"   component={UsersStack} />
    <Tab.Screen name="Doors"   component={DoorsStack} />
    <Tab.Screen name="Logs"    component={LogsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AdminTabs;