import React from 'react';
import {Tabs} from 'expo-router';
import {Platform} from 'react-native';
import {SymbolView} from 'expo-symbols';
import {DESIGN_TOKENS} from '@sessions/product-core';

const c=DESIGN_TOKENS.color;
const icon=(name)=>(props)=><SymbolView name={name} tintColor={props.color} size={props.size}/>

export default function CustomerTabs(){
  return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:c.royal,tabBarInactiveTintColor:c.muted,tabBarLabelStyle:{fontSize:11,fontWeight:'800'},tabBarHideOnKeyboard:true,tabBarStyle:{height:Platform.OS==='ios'?82:68,paddingTop:8,paddingBottom:Platform.OS==='ios'?20:8,borderTopColor:c.line,backgroundColor:c.white}}}>
    <Tabs.Screen name="home" options={{title:'Home',tabBarIcon:icon({ios:'house.fill',android:'home',web:'home'})}}/>
    <Tabs.Screen name="search" options={{title:'Search',tabBarIcon:icon({ios:'magnifyingglass',android:'search',web:'search'})}}/>
    <Tabs.Screen name="sessions" options={{title:'Sessions',tabBarIcon:icon({ios:'calendar',android:'calendar_month',web:'calendar_month'})}}/>
    <Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:icon({ios:'person.crop.circle',android:'account_circle',web:'account_circle'})}}/>
  </Tabs>;
}
