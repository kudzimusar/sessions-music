import React from 'react';
import {FlatList,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {DESIGN_TOKENS} from '@sessions/product-core';
import {Notice,Screen} from '../../src/native-ui';
import {BookingRow} from '../../src/product-components';
import {UAT_DATA_NOTICE,UAT_SESSIONS} from '../../src/uat-data';
import {useOnlineState} from '../../src/network';

const c=DESIGN_TOKENS.color;
export default function SessionsScreen(){const router=useRouter();const{online}=useOnlineState();return <Screen scroll={false} offline={!online} contentStyle={{paddingHorizontal:0}}><View style={styles.header}><Text style={styles.title}>Your sessions</Text><Text style={styles.subtitle}>Upcoming, past and cancelled bookings share one canonical history.</Text></View><FlatList data={UAT_SESSIONS} keyExtractor={item=>item.id} renderItem={({item})=><BookingRow item={item} onPress={()=>router.push(`/session/${item.id}`)}/>} contentContainerStyle={styles.list} ListFooterComponent={<Notice>{UAT_DATA_NOTICE}</Notice>}/></Screen>}
const styles=StyleSheet.create({header:{paddingHorizontal:18,paddingTop:18,paddingBottom:14},title:{fontSize:30,fontWeight:'900',letterSpacing:-1,color:c.ink},subtitle:{fontSize:14,lineHeight:20,color:c.muted,marginTop:5},list:{paddingHorizontal:18,paddingBottom:110}});
