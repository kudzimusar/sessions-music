import React from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {DESIGN_TOKENS} from '@sessions/product-core';
import {Between,Pill,Small} from './native-ui';
import {UAT_ORIGIN} from './api';

const c=DESIGN_TOKENS.color;
export function money(cents){return Number.isFinite(cents)?`US$${(cents/100).toFixed(cents%100?2:0)}`:'Rates not published'}
export function initials(name=''){return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}

function canonicalMediaUri(value){
  if(typeof value!=='string'||!value)return null;
  if(/^\/api\/media\/[0-9a-f-]{36}$/i.test(value))return `${UAT_ORIGIN}${value}`;
  try{
    const url=new URL(value);
    const origin=new URL(UAT_ORIGIN);
    return url.origin===origin.origin&&/^\/api\/media\/[0-9a-f-]{36}$/i.test(url.pathname)?url.toString():null;
  }catch{return null}
}

export function StudioArtwork({studio,compact=false}){
  const candidate=studio.image||studio.rooms?.flatMap(room=>room.photos||[])[0]||null;
  const mediaUri=canonicalMediaUri(candidate);
  return <View style={[styles.art,compact&&styles.artCompact]} accessibilityLabel={mediaUri?`${studio.name} room photo`:`${studio.name} branded image fallback`}>
    {mediaUri?<Image source={{uri:mediaUri}} resizeMode="cover" style={StyleSheet.absoluteFillObject}/>:null}
    {mediaUri?<View style={styles.scrim}/>:null}
    <Between><Pill>{studio.verified?'Verified':'Profile'}</Pill>{studio.backupPower?<Text style={styles.power}>Backup power</Text>:null}</Between>
    {!mediaUri?<Text style={[styles.initials,compact&&styles.initialsCompact]}>{initials(studio.name)}</Text>:null}
  </View>;
}

export function StudioCard({studio,onPress,compact=false}){
  const capacity=Math.max(0,...studio.rooms.map(room=>room.capacity||0));
  return <Pressable accessibilityRole="button" accessibilityLabel={`${studio.name}, ${studio.area}`} onPress={onPress} style={({pressed})=>[styles.card,compact&&styles.cardCompact,pressed&&styles.pressed]}>
    <StudioArtwork studio={studio} compact={compact}/>
    <View style={styles.body}><Between><View style={styles.flex}><Text numberOfLines={1} style={styles.name}>{studio.name}</Text><Small>{studio.area} · {studio.category}</Small></View>{studio.rating?<Text style={styles.rating}>★ {studio.rating}</Text>:null}</Between>
      <Text numberOfLines={1} style={styles.meta}>{capacity?`Up to ${capacity} · `:''}{studio.equipment.slice(0,3).join(' · ')}</Text>
      <Between><Text style={styles.price}>{studio.rate?`from ${money(studio.rate)}/hr`:'Rates not published'}</Text>{studio.nextAvailable?<Text style={styles.next}>{studio.nextAvailable}</Text>:null}</Between>
    </View>
  </Pressable>;
}

export function BookingRow({item,onPress}){
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[styles.rowCard,pressed&&styles.pressed]}><Between><Pill tone={item.status==='confirmed'?'success':'info'}>{item.status}</Pill><Small>{item.date}</Small></Between><Text style={styles.rowTitle}>{item.studio}</Text><Small>{item.time} · {item.duration} · {item.room}</Small>{item.reference?<Text style={styles.reference}>{item.reference}</Text>:null}</Pressable>;
}

const styles=StyleSheet.create({
  card:{width:250,borderRadius:22,backgroundColor:c.white,borderWidth:1,borderColor:c.line,overflow:'hidden'},cardCompact:{width:'100%',marginBottom:12},pressed:{opacity:.78},flex:{flex:1},
  art:{height:145,backgroundColor:'#111827',padding:14,justifyContent:'space-between',overflow:'hidden'},artCompact:{height:120},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.28)'},initials:{fontSize:40,fontWeight:'900',color:c.white,letterSpacing:-1.6},initialsCompact:{fontSize:34},power:{fontSize:10,fontWeight:'800',color:c.white},
  body:{padding:14,gap:7},name:{fontSize:16,fontWeight:'850',color:c.ink},rating:{fontSize:12,fontWeight:'800',color:c.ink},meta:{fontSize:12,lineHeight:17,color:c.muted},price:{fontSize:13,fontWeight:'850',color:c.ink},next:{fontSize:11,fontWeight:'750',color:c.royal},
  rowCard:{padding:16,borderRadius:18,backgroundColor:c.white,borderWidth:1,borderColor:c.line,marginBottom:10},rowTitle:{fontSize:18,fontWeight:'850',color:c.ink,marginTop:10,marginBottom:4},reference:{fontSize:11,fontWeight:'800',letterSpacing:.6,color:c.royal,marginTop:8},
});
