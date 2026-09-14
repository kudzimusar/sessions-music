export const UAT_STUDIOS=[
  {id:'onevibe-studiox',name:'OneVibe Studiox',area:'Harare CBD',category:'Rehearsal studio',services:['Rehearsal','Recording','Lessons'],equipment:['Drums','PA','3 microphones','Bass amp'],backupPower:true,verified:true,rating:4.8,nextAvailable:'Today · 18:00',bookable:true,rate:1800,rooms:[{id:'room-a',name:'Live Room',capacity:8,price:1800,equipment:['Drums','PA','Bass amp']},{id:'room-b',name:'Studio B',capacity:5,price:1400,equipment:['PA','2 microphones']}]},
  {id:'soundlab-rehearsal',name:'SoundLab Rehearsal Studio',area:'Harare CBD',category:'Rehearsal studio',services:['Rehearsal','Live sessions'],equipment:['Drums','PA','Guitar amp'],backupPower:false,verified:true,rating:4.6,nextAvailable:'Tomorrow · 16:30',bookable:true,rate:1200,rooms:[{id:'main',name:'Main Room',capacity:10,price:1200,equipment:['Drums','PA','Guitar amp']}]},
  {id:'bridgenorth-studios',name:'Bridgenorth Studios',area:'Greendale',category:'Recording studio',services:['Recording','Mixing','Residential'],equipment:['Recording console','Live room'],backupPower:true,verified:false,rating:null,nextAvailable:null,bookable:false,rate:null,rooms:[]},
  {id:'loft-events-studios',name:'Loft Events & Studios',area:'Avenues',category:'Rehearsal studio',services:['Rehearsal'],equipment:['PA'],backupPower:false,verified:false,rating:null,nextAvailable:null,bookable:false,rate:null,rooms:[]},
];

export const UAT_SESSIONS=[
  {id:'uat-session-1',studioId:'onevibe-studiox',studio:'OneVibe Studiox',room:'Live Room',date:'18 Sep',time:'18:00',duration:'120 min',status:'confirmed',reference:'SES-UAT-1842'},
  {id:'uat-session-2',studioId:'soundlab-rehearsal',studio:'SoundLab Rehearsal Studio',room:'Main Room',date:'24 Sep',time:'16:30',duration:'90 min',status:'requested',reference:'SES-UAT-2416'},
];

export const UAT_PROVIDER_BOOKINGS=[
  {id:'req-1',name:'Tari & band',room:'Live Room',date:'Today',time:'18:00',duration:'120 min',size:5,status:'confirmed',needsAction:false},
  {id:'req-2',name:'Nyasha',room:'Studio B',date:'Tomorrow',time:'14:00',duration:'90 min',size:3,status:'requested',needsAction:true},
  {id:'req-3',name:'Munashe Choir',room:'Live Room',date:'Friday',time:'17:30',duration:'120 min',size:8,status:'requested',needsAction:true},
];

export const UAT_CRITICAL_CASES=[
  {id:'CASE-UAT-104',severity:'urgent',status:'triaged',title:'Customer cannot enter confirmed room',booking:'SES-UAT-1842',nextAction:'Acknowledge and contact provider',sla:'18 min',assignee:'Booking Operations'},
  {id:'CASE-UAT-107',severity:'high',status:'open',title:'Provider requests same-day slot correction',booking:'SES-UAT-2416',nextAction:'Verify inventory before change',sla:'42 min',assignee:'Unassigned'},
];

export const UAT_IDENTITY={
  displayName:'Sessions UAT reviewer',
  contact:'Sessions Music Supabase authority is active; installed native auth still requires deployed runtime configuration and device certification',
  onboardingState:'auth-ready-uat',
  contexts:[
    {type:'personal',label:'Personal',detail:'Marketplace and bookings',authorized:true},
    {type:'provider',label:'Provider',detail:'Daily studio operations',authorized:true},
    {type:'corporate',label:'Sessions company',detail:'Trusted staff assignment required',authorized:false},
  ],
};

export const UAT_ONBOARDING_STEPS=[
  {key:'identity',label:'Verify phone or email',status:'testing',detail:'Sessions Music Supabase is active. Native OTP activates only when the deployed auth config exposes this exact verified project and an enabled delivery channel.'},
  {key:'profile',label:'Customer profile',status:'testing',detail:'Display name, market and versioned required consent are written through the canonical onboarding service after verified identity.'},
  {key:'provider',label:'Manage a studio',status:'optional',detail:'Claim or register, submit evidence, remain a customer while pending.'},
  {key:'corporate',label:'Corporate invitation',status:'trusted-only',detail:'Never public self-selection; identity-bound invitation and security setup are required.'},
];

export const UAT_DATA_NOTICE='UAT projection only — not a second source of truth. Live authenticated data replaces this preview when the deployed runtime exposes the active Sessions Music Supabase configuration and installed native authentication is certified.';
