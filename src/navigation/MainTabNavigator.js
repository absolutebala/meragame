import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import LogActivityScreen from '../screens/LogActivityScreen';
import ClubsScreen from '../screens/ClubsScreen';
import CreateClubScreen from '../screens/CreateClubScreen';
import ClubDetailScreen from '../screens/ClubDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClubsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClubsList" component={ClubsScreen} />
      <Stack.Screen name="CreateClub" component={CreateClubScreen} />
      <Stack.Screen name="ClubDetail" component={ClubDetailScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Feed: 'home',
            Log: 'add-circle',
            Clubs: 'people',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={HomeScreen} />
      <Tab.Screen name="Log" component={LogActivityScreen} />
      <Tab.Screen name="Clubs" component={ClubsStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
