import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FamilyTreeScreen } from '../screens/FamilyTreeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PersonDetailScreen } from '../screens/PersonDetailScreen';

export type RootStackParamList = {
  FamilyTree: undefined;
  Settings: undefined;
  PersonDetail: { personId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigation: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="FamilyTree" component={FamilyTreeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen 
          name="PersonDetail" 
          component={PersonDetailScreen}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

