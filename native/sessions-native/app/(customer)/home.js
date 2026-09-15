import React from 'react';
import {FlatList,Pressable,StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {AI_DISCOVERY_CONTRACT,DESIGN_TOKENS} from '@sessions/product-core';
import {Body,Card,Eyebrow,LinkButton,PrimaryButton,Screen,Section,Small,Title} from '../../src/native-ui';
import {StudioCard} from '../../src/product-components';
import {UAT_STUDIOS} from '../../src/uat-data';
import {useOnlineState} from '../../src/network';

const c=DESIGN_TOKENS.color;
export default function HomeScreen(){
  const router=useRouter();const{online}=useOnlineState();
  return <Screen offline={!online}><View style={styles.wordmarkRow}><Text style={styles.wordmark}>SESSIONS<Text style={{color:c.royal}}>.</Text></Text><LinkButton onPress={()=>router.push('/diagnostics')}>Diagnostics</LinkButton></View><Eyebrow>HARARE · ZIMBABWE</Eyebrow><Title>Find your next rehearsal room.</Title><Body style={{marginTop:8}}>Search real music-space constraints, compare what matters, then choose valid time inventory.</Body>
    <Pressable accessibilityRole="search" onPress={()=>router.push('/search')} style={styles.search}><Text style={styles.searchText}>Studio, area, equipment or service</Text><Text style={styles.arrow}>›</Text></Pressable>
    <Card style={styles.aiCard}><Eyebrow>SESSIONS AI · INTENT, NOT INVENTION</Eyebrow><Text style={styles.aiTitle}>Describe the rehearsal you need.</Text><Body>AI turns natural language into editable search requirements. Canonical Sessions data—not the model—decides price, equipment and availability.</Body><View style={{marginTop:14}}><PrimaryButton onPress={()=>router.push('/planner')}>Plan with AI or guided filters</PrimaryButton></View><Small style={{marginTop:9}}>AI may book: {AI_DISCOVERY_CONTRACT.mayBook?'yes':'no'} · interpreted fields stay editable.</Small></Card>
    <Section eyebrow="DISCOVER" title="Spaces for your sound" action={<LinkButton onPress={()=>router.push('/search')}>See all</LinkButton>}><FlatList horizontal data={UAT_STUDIOS} keyExtractor={item=>item.id} renderItem={({item})=><StudioCard studio={item} onPress={()=>router.push(`/studio/${item.id}`)}/>} ItemSeparatorComponent={()=><View style={{width:12}}/>} showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight:18}}/></Section>
    <Section eyebrow="FOR STUDIO TEAMS" title="Run today from your phone"><Card><Text style={styles.providerTitle}>Requests, rooms and urgent actions—without shrinking the desktop portal.</Text><Body style={{marginTop:6}}>Pricing setup, staff administration, reporting and long-range configuration stay on PWA/desktop by design.</Body><View style={{marginTop:14}}><PrimaryButton onPress={()=>router.push('/provider')}>Open provider mode</PrimaryButton></View></Card></Section>
  </Screen>;
}

const styles=StyleSheet.create({wordmarkRow:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20},wordmark:{fontSize:20,fontWeight:'900',letterSpacing:1.2,color:c.ink},search:{minHeight:58,marginTop:22,borderRadius:18,backgroundColor:c.white,borderWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',paddingHorizontal:16},searchText:{fontSize:15,color:c.muted,flex:1},arrow:{fontSize:24,color:c.ink},aiCard:{marginTop:26,borderColor:'#C9D3FF',backgroundColor:'#F6F8FF'},aiTitle:{fontSize:20,fontWeight:'900',color:c.ink,marginTop:7,marginBottom:5},providerTitle:{fontSize:18,lineHeight:23,fontWeight:'850',color:c.ink}});
