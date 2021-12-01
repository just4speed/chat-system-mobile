import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Navigation
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
// Screens
import ConversationsList from './screens/ConversationsList';
import Conversation from './screens/Conversation';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ConversationsList">
        <Stack.Screen name="ConversationsList" component={ConversationsList} />
        <Stack.Screen
          name="Conversation"
          component={Conversation}
          options={{
            headerShown: false
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
