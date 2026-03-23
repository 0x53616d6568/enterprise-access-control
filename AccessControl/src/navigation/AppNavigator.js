import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/auth/LoginScreen";
import ChangePasswordScreen from "../screens/auth/ChangePasswordScreen";
import LoadingScreen from "../components/LoadingScreen";
import EmployeeTabs from "./EmployeeTabs";
import ManagerTabs from "./ManagerTabs";
import AdminTabs from "./AdminTabs";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading, isFirstLogin } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </>
        ) : isFirstLogin ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : user.access_level >= 5 ? (
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
        ) : user.access_level >= 3 ? (
          <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
        ) : (
          <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
