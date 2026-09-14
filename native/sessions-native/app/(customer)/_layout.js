import React from 'react';
import {Tabs} from 'expo-router';
import {Platform} from 'react-native';
import {DESIGN_TOKENS} from '@sessions/product-core';

const c=DESIGN_TOKENS.color;
export default function CustomerTabs(){
  return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:c.royal,tabBarInactiveTintColor:c.muted,tabBarLabelStyle:{fontSize:11,fontWeight:'800'},tabBarStyle:{height:Platform.OS==='ios'?82:68,paddingTop:8,paddingBottom:Platform.OS==='ios'?20:8,borderTopColor:c.line,backgroundColor:c.white}}}><Tabs.Screen name="home" options={{title:'Home'}}/><Tabs.Screen name="search" options={{title:'Search'}}/><Tabs.Screen name="sessions" options={{title:'Sessions'}}/><Tabs.Screen name="profile" options={{title:'Profile'}}/></Tabs>;
}
