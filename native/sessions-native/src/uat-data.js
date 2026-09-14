export const UAT_STUDIOS=[
  {id:'onevibe-studiox',name:'OneVibe Studiox',area:'Harare CBD',category:'Rehearsal studio',services:['Rehearsal','Recording','Lessons'],bookable:true,rate:1800,rooms:[{id:'room-a',name:'Live Room',capacity:8,price:1800},{id:'room-b',name:'Studio B',capacity:5,price:1400}]},
  {id:'soundlab-rehearsal',name:'SoundLab Rehearsal Studio',area:'Harare CBD',category:'Rehearsal studio',services:['Rehearsal','Live sessions'],bookable:true,rate:1200,rooms:[{id:'main',name:'Main Room',capacity:10,price:1200}]},
  {id:'bridgenorth-studios',name:'Bridgenorth Studios',area:'Greendale',category:'Recording studio',services:['Recording','Mixing','Residential'],bookable:false,rate:null,rooms:[]},
  {id:'loft-events-studios',name:'Loft Events & Studios',area:'Avenues',category:'Rehearsal studio',services:['Rehearsal'],bookable:false,rate:null,rooms:[]},
];

export const UAT_SESSIONS=[
  {id:'uat-session-1',studioId:'onevibe-studiox',studio:'OneVibe Studiox',room:'Live Room',date:'18 Sep',time:'18:00',duration:'120 min',status:'confirmed'},
  {id:'uat-session-2',studioId:'soundlab-rehearsal',studio:'SoundLab Rehearsal Studio',room:'Main Room',date:'24 Sep',time:'16:30',duration:'90 min',status:'requested'},
];

export const UAT_PROVIDER_BOOKINGS=[
  {id:'req-1',name:'Tari & band',room:'Live Room',date:'Today',time:'18:00',duration:'120 min',size:5,status:'confirmed'},
  {id:'req-2',name:'Nyasha',room:'Studio B',date:'Tomorrow',time:'14:00',duration:'90 min',size:3,status:'requested'},
  {id:'req-3',name:'Munashe Choir',room:'Live Room',date:'Friday',time:'17:30',duration:'120 min',size:8,status:'requested'},
];

export const UAT_IDENTITY={
  displayName:'Sessions UAT reviewer',
  contact:'Native identity not connected',
  contexts:[
    {type:'personal',label:'Personal',detail:'Marketplace and bookings',authorized:true},
    {type:'provider',label:'Provider',detail:'Daily studio operations',authorized:true},
    {type:'corporate',label:'Sessions company',detail:'Trusted staff assignment required',authorized:false},
  ],
};

export const UAT_DATA_NOTICE='UI projection only — not a second source of truth. Live authenticated data replaces this preview after Sessions Supabase Auth is positively identified.';
