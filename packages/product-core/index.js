export const SESSIONS_RELEASE=Object.freeze({
  id:'unified-platform-v1-phase5',
  phase:5,
  phaseStatus:'complete',
  brand:'black-royal-blue-white',
  brandPrimary:'#4169E1',
  visualRevision:'phase1-5-native-desktop-v2',
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
  Object.freeze({key:'today',label:'Today'}),
  Object.freeze({key:'requests',label:'Requests'}),
  Object.freeze({key:'rooms',label:'Rooms'}),
  Object.freeze({key:'more',label:'More'}),
]);

export const WORKSPACE_CONTEXTS=Object.freeze([
  Object.freeze({type:'personal',label:'Personal',description:'Personal marketplace',access:'account'}),
  Object.freeze({type:'provider',label:'Provider',description:'Studio operations',access:'membership'}),
  Object.freeze({type:'corporate',label:'Sessions company',description:'Authorized corporate operations',access:'authorized-only'}),
]);

export const REGISTRY_BOOKING_STATES=Object.freeze([
  'requested','confirmed','completed','declined','cancelled',
]);

const BOOKING_TRANSITIONS=Object.freeze({
  requested:Object.freeze(['confirmed','declined','cancelled']),
  confirmed:Object.freeze(['completed','cancelled']),
  completed:Object.freeze([]),
  declined:Object.freeze([]),
  cancelled:Object.freeze([]),
});

export function canTransitionRegistryBooking(from,to){
  return Boolean(BOOKING_TRANSITIONS[from]?.includes(to));
}

export const NATIVE_AUTH_BOUNDARY=Object.freeze({
  provider:'supabase-auth',
  audienceGateIsNativeAuth:false,
  browserCookieImportAllowed:false,
  status:'blocked-until-sessions-supabase-identified',
  forbiddenProject:'svhxjfearcuqxikzvlyb',
});

export const PHASE_1_5_PARITY=Object.freeze({
  1:Object.freeze({name:'Foundation and product UI',ios:'testing',android:'testing',pwa:'passed',desktop:'passed'}),
  2:Object.freeze({name:'Identity projection',ios:'testing',android:'testing',pwa:'passed',desktop:'passed'}),
  3:Object.freeze({name:'Workspace projection',ios:'testing',android:'testing',pwa:'passed',desktop:'passed'}),
  4:Object.freeze({name:'Bounded corporate/mobile operations',ios:'testing',android:'testing',pwa:'passed',desktop:'passed'}),
  4.5:Object.freeze({name:'Production authentication',ios:'blocked',android:'blocked',pwa:'testing',desktop:'testing'}),
  5:Object.freeze({name:'Booking/provider operations',ios:'testing',android:'testing',pwa:'passed',desktop:'passed'}),
});

export function releaseMatchesPhase5(value){
  return Boolean(value&&value.id===SESSIONS_RELEASE.id&&value.phase===SESSIONS_RELEASE.phase&&value.visualRevision===SESSIONS_RELEASE.visualRevision);
}
