import {useCallback,useEffect,useState} from 'react';
import {AppState} from 'react-native';
import * as Network from 'expo-network';

export function useOnlineState(){
  const[online,setOnline]=useState(true);
  const[checked,setChecked]=useState(false);
  const check=useCallback(async()=>{
    try{
      const state=await Network.getNetworkStateAsync();
      const reachable=state.isInternetReachable;
      setOnline(Boolean(state.isConnected&&reachable!==false));
    }catch{
      setOnline(false);
    }finally{
      setChecked(true);
    }
  },[]);
  useEffect(()=>{
    void check();
    const subscription=AppState.addEventListener('change',next=>{if(next==='active')void check()});
    return()=>subscription.remove();
  },[check]);
  return {online,checked,refreshNetwork:check};
}
