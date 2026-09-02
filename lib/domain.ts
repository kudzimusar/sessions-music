export type Currency = 'USD' | 'ZiG';
export const EQUIPMENT = ['Drum kit','PA system','Vocal microphones','Bass amp','Guitar amps','Keyboard','Piano','Music stands','Acoustic treatment'] as const;
export const AREAS = ['Borrowdale','Avondale','Mount Pleasant','Newlands','Greendale','Highfield','Mbare','Harare CBD','Waterfalls','Milton Park'];
export type Room = {id:string;name:string;venue:string;category:string;area:string;description:string;price:number;capacity:number;equipment:string[];backup:boolean;parking:boolean;accessible:boolean;instant:boolean;verified:boolean;active:boolean;image:string;photos?:string[];minimum:number;deposit:number;buffer:number;cancellation:number;hours:Record<string,[number,number] | null>;rules:string;address:string;contact:string;checkin:string;restricted:string;verification:string};
export type BookingState='pending_approval'|'confirmed'|'completed'|'cancelled';
export type PaymentState='authorized'|'paid'|'refunded'|'partially_refunded'|'void';
export type Booking={id:string;roomId:string;roomName:string;venue:string;area:string;image:string;date:string;start:number;duration:number;status:BookingState;payment:PaymentState;subtotal:number;fee:number;deposit:number;total:number;refund:number;currency:Currency;groupName:string;groupSize:number;createdAt:string;address:string;checkin:string;cancellation:number;review?:{rating:number;text:string;hidden?:boolean};simulatedCompletion?:boolean};
export type Block={id:string;roomId:string;date:string;start:number;end:number;reason:string};
export type Profile={name:string;phone:string;intent:string;organisation:string;contact:string;payout:string};
export type Report={id:string;bookingId:string;reason:string;status:'open'|'resolved';createdAt:string};
export type AppState={rooms:Room[];bookings:Booking[];blocks:Block[];favorites:string[];feeBps:number;profile:Profile;reports:Report[];user:{email:string;displayName:string}|null};
export function localDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Harare',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function addDays(date:string,n:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function timeLabel(minutes:number){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`}
export function prettyDate(date:string){return new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',month:'short',day:'numeric',timeZone:'Africa/Harare'})}
export function money(cents:number){return `US$${(cents/100).toFixed(cents%100?2:0)}`}
export function timestamp(date:string,minutes:number){return new Date(date+'T00:00:00+02:00').getTime()+minutes*60000}
export function overlaps(a:number,b:number,c:number,d:number){return a<d&&c<b}
export function slotReason(room:Room,date:string,start:number,duration:number,bookings:Booking[],blocks:Block[],now=Date.now()):string|null{
 if(!room.active)return 'Listing unavailable';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(timestamp(date,0))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return 'Invalid date';
 if(!Number.isInteger(start)||start%30||start<0||!Number.isInteger(duration)||duration%30||duration<room.minimum||duration>480)return `Minimum ${room.minimum} minutes; use 30-minute increments`;
 if(timestamp(date,start)<=now)return 'Time has passed';
 if(date>addDays(localDate(new Date(now)),365))return 'Book up to one year ahead';
 const day=new Date(date+'T12:00:00Z').getUTCDay();const hours=room.hours[String(day)];
 if(!hours||start<hours[0]||start+duration+room.buffer>hours[1])return 'Outside public hours';
 if(blocks.some(b=>b.roomId===room.id&&b.date===date&&overlaps(start,start+duration+room.buffer,b.start,b.end)))return 'Provider block';
 if(bookings.some(b=>b.roomId===room.id&&b.date===date&&b.status!=='cancelled'&&overlaps(start,start+duration+room.buffer,b.start,b.start+b.duration+room.buffer)))return 'Booked / reset buffer';
 return null;
}
export function slots(room:Room,date:string,duration:number,bookings:Booking[],blocks:Block[],now=Date.now()){
 const day=new Date(date+'T12:00:00Z').getUTCDay();const hours=room.hours[String(day)];const first=hours?hours[0]:540;const last=hours?hours[1]:1080;return Array.from({length:Math.max(0,(last-first)/30)},(_,i)=>{const start=first+i*30;return {start,reason:slotReason(room,date,start,duration,bookings,blocks,now)}});
}
export function quote(room:Room,duration:number,feeBps:number){const subtotal=Math.round(room.price*duration/60);const fee=Math.round(subtotal*feeBps/10000);return {subtotal,fee,deposit:room.deposit,total:subtotal+fee+room.deposit}}
export function refundable(booking:Booking,now=Date.now()){
 if(booking.status==='pending_approval')return booking.total;
 return timestamp(booking.date,booking.start)-now>=booking.cancellation*3600000?booking.total:booking.deposit;
}
export function reviewStats(roomId:string,bookings:Booking[]){const reviews=bookings.filter(b=>b.roomId===roomId&&b.status==='completed'&&b.review&&!b.review.hidden);return {count:reviews.length,rating:reviews.length?reviews.reduce((s,b)=>s+b.review!.rating,0)/reviews.length:0}}
export function parseSearch(text:string,date=localDate()){
 const t=text.toLowerCase();const area=AREAS.find(a=>t.includes(a.toLowerCase()));const equipment:string[]=[];
 if(/drum/.test(t))equipment.push('Drum kit');if(/\bpa\b|sound system/.test(t))equipment.push('PA system');if(/keyboard/.test(t))equipment.push('Keyboard');if(/piano/.test(t))equipment.push('Piano');if(/mic|vocal/.test(t))equipment.push('Vocal microphones');if(/bass amp/.test(t))equipment.push('Bass amp');if(/guitar/.test(t))equipment.push('Guitar amps');
 const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,ten:10};const group=t.match(/(\d+|one|two|three|four|five|six|seven|eight|ten)[ -]?(?:piece|people|musicians|members)/);const price=t.match(/(?:under|max|budget|less than)\s*(?:us)?\$?\s*(\d+)/);const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];const day=days.findIndex(d=>t.includes(d));let target=date;
 if(t.includes('tomorrow'))target=addDays(date,1);else if(day>=0){const current=new Date(date+'T12:00:00Z').getUTCDay();target=addDays(date,(day-current+7)%7||7)}
 const durationMatch=t.match(/(\d+(?:\.5)?)\s*(hours?|hrs?)/);const minutesMatch=t.match(/(30|60|90|120)\s*min/);
 return {area:area||'All Harare',equipment,capacity:group?Number(words[group[1]]||group[1]):1,budget:price?Number(price[1]):100,date:target,time:t.includes('afternoon')?'afternoon':t.includes('evening')?'evening':t.includes('morning')?'morning':'flexible',duration:durationMatch?Math.max(30,Math.min(480,Math.round(Number(durationMatch[1])*2)*30)):minutesMatch?Number(minutesMatch[1]):60,backup:/backup|solar|generator/.test(t)};
}
const standard:Record<string,[number,number]|null>={'0':[600,1080],'1':[540,1260],'2':[540,1260],'3':[540,1260],'4':[540,1260],'5':[540,1260],'6':[540,1260]};
const institutional:Record<string,[number,number]|null>={'0':null,'1':[960,1200],'2':null,'3':[900,1140],'4':null,'5':[960,1200],'6':[600,960]};
const details:[string,string,string,string,string,number,number,string[],boolean,boolean,boolean,number][]=[
 ['the-live-room','The Live Room','Tempo House','Studio','Avondale',1800,6,['Drum kit','PA system','Vocal microphones','Bass amp','Guitar amps','Acoustic treatment'],true,true,true,24],
 ['borrowdale-studio','Studio One','Northside Sessions','Studio','Borrowdale',2400,8,['Drum kit','PA system','Vocal microphones','Bass amp','Guitar amps','Keyboard','Acoustic treatment'],true,true,true,24],
 ['the-music-hall','The Music Hall','Harmony Community Church','Church','Mount Pleasant',1200,24,['PA system','Vocal microphones','Keyboard','Piano','Music stands'],true,true,false,48],
 ['pocket-studio','The Pocket Studio','Backbeat Rooms','Studio','Newlands',1000,4,['Drum kit','Bass amp','Guitar amps','Vocal microphones'],false,false,true,24],
 ['green-room','The Green Room','Eastern Arts Centre','Arts centre','Greendale',1500,10,['Drum kit','PA system','Vocal microphones','Keyboard','Music stands'],true,true,true,24],
 ['rhythm-room','Rhythm Room','Southside Creative School','School','Highfield',800,8,['Drum kit','PA system','Music stands'],false,true,false,48],
 ['live-lab','Live Lab','Mbare Music Collective','Arts centre','Mbare',900,6,['Drum kit','Bass amp','Guitar amps','PA system'],true,false,true,24],
 ['loft-studio','The Loft Studio','City Sound House','Studio','Harare CBD',2200,5,['Drum kit','PA system','Vocal microphones','Bass amp','Guitar amps','Acoustic treatment'],true,false,true,48],
 ['choir-room','The Choir Room','Waterfalls Community Hall','Institution','Waterfalls',1400,30,['Keyboard','PA system','Vocal microphones','Music stands'],true,true,false,24],
 ['practice-suite','Practice Suite','Milton Park Music Academy','University','Milton Park',1600,12,['Piano','Keyboard','Music stands','Vocal microphones','Acoustic treatment'],false,true,false,48]
];
export const seedRooms:Room[]=details.map((r,i)=>({id:r[0],name:r[1],venue:r[2],category:r[3],area:r[4],price:r[5],capacity:r[6],equipment:r[7],backup:r[8],parking:r[9],instant:r[10],cancellation:r[11],description:i===0?'A room made for the whole band. Settle into a warm, acoustically treated space with a full backline, clear monitoring and room to find your sound. Just bring your instruments and your next idea.':`A music-ready ${r[3].toLowerCase()} space in ${r[4]}, thoughtfully equipped for ${r[6]>15?'choirs and larger groups':'focused rehearsals'}. Book the hours you need and make the time your own.`,image:i===2||i===5||i===8||i===9?'/images/hall.webp':i===3||i===6?'/images/intimate.webp':'/images/studio.webp',minimum:i===2||i===8?60:30,deposit:i===1?500:0,buffer:30,hours:{...(r[3]==='Studio'||r[3]==='Arts centre'?standard:institutional)},accessible:i!==3&&i!==7,verified:i!==5&&i!==9,verification:i!==5&&i!==9?'Demo checked':'Not reviewed',active:true,rules:'No smoking. Food and drinks stay outside the equipment area. Include setup and pack-down in your session. Bring your own instruments, drumsticks and cables.',address:`Sample location in ${r[4]}, Harare — not a real venue address`,contact:'Demo contact — messaging not connected',checkin:'Demo instructions: arrive 10 minutes early and show your booking reference to reception. Actual access details will be provided by a real provider before launch.',restricted:'Instruments remain in the room. Recording services are not included.'}));
export const initialState:AppState={rooms:seedRooms,bookings:[],blocks:[],favorites:[],feeBps:1000,profile:{name:'',phone:'',intent:'musician',organisation:'',contact:'',payout:''},reports:[],user:null};
