export const SESSIONS_RELEASE=Object.freeze({
  id:'unified-platform-v1-phase5',
  phase:5,
  phaseStatus:'complete',
  brand:'black-royal-blue-white',
  brandPrimary:'#4169E1',
  visualRevision:'phase1-5-surface-consolidated-v20',
  source:'github-main',
  deploymentModel:'chatgpt-sites-versioned',
});

export const SESSIONS_SURFACES=Object.freeze([
  'ios-native',
  'android-native',
  'pwa',
  'desktop-web',
]);

export const DESIGN_TOKENS=Object.freeze({
  color:Object.freeze({
    ink:'#050505',
    royal:'#4169E1',
    royalDark:'#2F50C9',
    white:'#FFFFFF',
    canvas:'#F6F7F9',
    surface:'#FFFFFF',
    muted:'#6B7280',
    subtle:'#9CA3AF',
    line:'#E5E7EB',
    success:'#08783E',
    successSurface:'#EAF8F0',
    warning:'#9A5B00',
    warningSurface:'#FFF7E6',
    danger:'#B42318',
    dangerSurface:'#FFF0EE',
  }),
  radius:Object.freeze({small:10,medium:16,large:22,pill:999}),
  spacing:Object.freeze({xs:4,sm:8,md:12,lg:16,xl:20,xxl:28,section:36}),
  touchTarget:Object.freeze({ios:44,android:48,web:44}),
});

export const CUSTOMER_TABS=Object.freeze([
  Object.freeze({key:'home',label:'Home'}),
  Object.freeze({key:'search',label:'Search'}),
  Object.freeze({key:'sessions',label:'Sessions'}),
  Object.freeze({key:'profile',label:'Profile'}),
]);

export const PROVIDER_TABS=Object.freeze([
  Object.freeze({key:'home',label:'Home'}),
  Object.freeze({key:'requests',label:'Requests'}),
  Object.freeze({key:'calendar',label:'Calendar'}),
  Object.freeze({key:'profile',label:'Profile'}),
]);

export const sessionsNativeApiBase=()=>{
  const raw=process.env.EXPO_PUBLIC_SESSIONS_API_BASE_URL||process.env.SESSIONS_API_BASE_URL||'';
  return raw.replace(/\/+$/,'');
};
