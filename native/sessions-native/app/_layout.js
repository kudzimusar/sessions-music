import React from 'react';
import {Stack} from 'expo-router';
import {SafeAreaProvider,initialWindowMetrics} from 'react-native-safe-area-context';
import {DESIGN_TOKENS} from '@sessions/product-core';

export default function RootLayout(){
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:DESIGN_TOKENS.color.canvas},animation:'default',gestureEnabled:true}}><Stack.Screen name="index"/><Stack.Screen name="(customer)"/><Stack.Screen name="studio/[id]"/><Stack.Screen name="booking/[id]" options={{presentation:'card'}}/><Stack.Screen name="planner"/><Stack.Screen name="provider"/><Stack.Screen name="onboarding"/><Stack.Screen name="security"/><Stack.Screen name="corporate-critical"/><Stack.Screen name="diagnostics"/></Stack></SafeAreaProvider>;
}
