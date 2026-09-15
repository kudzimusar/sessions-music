import React from 'react';
import {ActivityIndicator,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {DESIGN_TOKENS} from '@sessions/product-core';

const c=DESIGN_TOKENS.color;
export const MIN_TOUCH=Platform.OS==='ios'?DESIGN_TOKENS.touchTarget.ios:Platform.OS==='android'?DESIGN_TOKENS.touchTarget.android:DESIGN_TOKENS.touchTarget.web;

async function feedback(kind='selection'){
  try{
    if(kind==='success')await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if(kind==='warning')await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else await Haptics.selectionAsync();
  }catch{}
}

export function Screen({children,scroll=true,edges=['top','left','right'],offline=false,contentStyle}){
  const body=scroll?<ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content,contentStyle]}>{children}</ScrollView>:<View style={[styles.fill,contentStyle]}>{children}</View>;
  return <SafeAreaView style={styles.safe} edges={edges}><StatusBar style="dark"/><View style={styles.fill}>{offline?<OfflineBanner/>:null}{body}</View></SafeAreaView>;
}

export function OfflineBanner(){return <View accessibilityRole="alert" style={styles.offline}><Text style={styles.offlineText}>Offline · saved screens remain available, live availability and actions need a connection.</Text></View>}
export function Eyebrow({children}){return <Text style={styles.eyebrow}>{children}</Text>}
export function Title({children}){return <Text accessibilityRole="header" style={styles.title}>{children}</Text>}
export function Body({children,style,accessibilityLabel}){const label=accessibilityLabel|| (typeof children==='string'?children:undefined);return <Text accessibilityLabel={label} style={[styles.body,style]}>{children}</Text>}
export function Small({children,style}){return <Text style={[styles.small,style]}>{children}</Text>}
export function Section({eyebrow,title,children,action}){return <View style={styles.section}><View style={styles.sectionHead}><View style={styles.flex}><Eyebrow>{eyebrow}</Eyebrow><Text style={styles.sectionTitle}>{title}</Text></View>{action||null}</View>{children}</View>}
export function Card({children,style}){return <View style={[styles.card,style]}>{children}</View>}
export function Row({children,style}){return <View style={[styles.row,style]}>{children}</View>}
export function Between({children,style}){return <View style={[styles.between,style]}>{children}</View>}
export function Pill({children,tone='info'}){return <View style={[styles.pill,tone==='success'&&styles.pillSuccess,tone==='danger'&&styles.pillDanger]}><Text style={[styles.pillText,tone==='success'&&styles.pillSuccessText,tone==='danger'&&styles.pillDangerText]}>{children}</Text></View>}
export function Notice({children,tone='warning'}){return <View accessible accessibilityLiveRegion={tone==='danger'?'assertive':'polite'} style={[styles.notice,tone==='danger'&&styles.noticeDanger]}><Text style={[styles.noticeText,tone==='danger'&&styles.noticeDangerText]}>{children}</Text></View>}
export function Divider(){return <View style={styles.divider}/>}

export function PrimaryButton({children,onPress,disabled=false,accessibilityLabel}){
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={async()=>{await feedback();onPress?.()}} style={({pressed})=>[styles.primary,pressed&&styles.primaryPressed,disabled&&styles.disabled]}><Text style={styles.primaryText}>{children}</Text></Pressable>;
}
export function SecondaryButton({children,onPress,disabled=false}){
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={async()=>{await feedback();onPress?.()}} style={({pressed})=>[styles.secondary,pressed&&styles.secondaryPressed,disabled&&styles.disabled]}><Text style={styles.secondaryText}>{children}</Text></Pressable>;
}
export function DestructiveButton({children,onPress,disabled=false}){
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={async()=>{await feedback('warning');onPress?.()}} style={[styles.destructive,disabled&&styles.disabled]}><Text style={styles.destructiveText}>{children}</Text></Pressable>;
}
export function LinkButton({children,onPress}){return <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.linkButton}><Text style={styles.link}>{children}</Text></Pressable>}

export function Field({label,hint,style,accessibilityLabel,...props}){
  return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={accessibilityLabel||label} placeholderTextColor={c.subtle} style={[styles.field,style]} {...props}/>{hint?<Small>{hint}</Small>:null}</View>;
}

export function LoadingState({label='Loading…'}){return <View accessibilityRole="progressbar" style={styles.state}><ActivityIndicator/><Body>{label}</Body></View>}
export function EmptyState({title,body,action}){return <View style={styles.state}><Text style={styles.stateTitle}>{title}</Text><Body style={styles.center}>{body}</Body>{action||null}</View>}
export function ErrorState({title='Something went wrong',body,action}){return <View accessibilityRole="alert" style={styles.state}><Text style={styles.errorTitle}>{title}</Text><Body style={styles.center}>{body}</Body>{action||null}</View>}

export const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:c.canvas},fill:{flex:1},content:{paddingHorizontal:18,paddingTop:14,paddingBottom:110,gap:0},flex:{flex:1},
  offline:{backgroundColor:c.warningSurface,borderBottomWidth:1,borderBottomColor:'#F7DDAA',paddingHorizontal:16,paddingVertical:9},offlineText:{fontSize:12,lineHeight:17,color:'#6E4A00',fontWeight:'700'},
  eyebrow:{fontSize:10,lineHeight:14,fontWeight:'800',letterSpacing:1.25,color:c.muted,textTransform:'uppercase'},
  title:{fontSize:32,lineHeight:36,fontWeight:'900',letterSpacing:-1.05,color:c.ink,marginTop:6},body:{fontSize:15,lineHeight:22,color:c.muted},small:{fontSize:12,lineHeight:17,color:c.muted},
  section:{marginTop:30},sectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12,marginBottom:13},sectionTitle:{fontSize:21,lineHeight:25,fontWeight:'850',letterSpacing:-0.45,color:c.ink,marginTop:2},
  card:{backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:20,padding:16,marginBottom:10},row:{flexDirection:'row',alignItems:'center',gap:10},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  pill:{alignSelf:'flex-start',borderRadius:999,paddingHorizontal:9,paddingVertical:5,backgroundColor:'#EEF2FF'},pillText:{fontSize:10,fontWeight:'850',textTransform:'uppercase',color:c.royal},pillSuccess:{backgroundColor:c.successSurface},pillSuccessText:{color:c.success},pillDanger:{backgroundColor:c.dangerSurface},pillDangerText:{color:c.danger},
  notice:{padding:14,borderRadius:16,backgroundColor:c.warningSurface,borderWidth:1,borderColor:'#F7DDAA',marginTop:10},noticeText:{fontSize:12,lineHeight:18,color:'#6E4A00'},noticeDanger:{backgroundColor:c.dangerSurface,borderColor:'#F7C6C0'},noticeDangerText:{color:c.danger},divider:{height:StyleSheet.hairlineWidth,backgroundColor:c.line,marginVertical:14},
  primary:{minHeight:Math.max(52,MIN_TOUCH),borderRadius:16,backgroundColor:c.royal,alignItems:'center',justifyContent:'center',paddingHorizontal:18},primaryPressed:{backgroundColor:c.royalDark},primaryText:{fontSize:15,fontWeight:'850',color:c.white},
  secondary:{minHeight:MIN_TOUCH,borderRadius:15,borderWidth:1,borderColor:c.line,backgroundColor:c.white,alignItems:'center',justifyContent:'center',paddingHorizontal:14},secondaryPressed:{backgroundColor:'#F9FAFB'},secondaryText:{fontSize:14,fontWeight:'800',color:c.ink},
  destructive:{minHeight:MIN_TOUCH,borderRadius:15,borderWidth:1,borderColor:'#F7C6C0',backgroundColor:c.dangerSurface,alignItems:'center',justifyContent:'center',paddingHorizontal:14},destructiveText:{fontSize:14,fontWeight:'800',color:c.danger},disabled:{opacity:.45},
  linkButton:{minHeight:MIN_TOUCH,justifyContent:'center',paddingHorizontal:4},link:{fontSize:13,fontWeight:'850',color:c.royal},
  fieldWrap:{gap:6,marginTop:14},fieldLabel:{fontSize:12,fontWeight:'800',color:c.ink},field:{minHeight:52,borderRadius:16,backgroundColor:c.white,borderWidth:1,borderColor:c.line,paddingHorizontal:15,paddingVertical:12,fontSize:16,color:c.ink},
  state:{minHeight:220,padding:28,alignItems:'center',justifyContent:'center',gap:10},stateTitle:{fontSize:18,fontWeight:'850',color:c.ink},errorTitle:{fontSize:18,fontWeight:'850',color:c.danger},center:{textAlign:'center'},
});
