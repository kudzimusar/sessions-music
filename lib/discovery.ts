import type {Studio, StudioBooking} from './registry';
import {registrySlotReason,studioPin} from './registry';
import {addDays,localDate} from './domain';

export type MemberPlan={id:string;name:string;fee:number;termDays:number;discountPercent:number;priority:boolean;benefits:string;active:boolean};
export type StudioMember={id:string;studioId:string;customer:string;name:string;plan:MemberPlan;status:'requested'|'active'|'declined'|'cancelled';startsOn?:string;expiresOn?:string;createdAt:string;note?:string};
export type Registration={id:string;applicant:string;name:string;area:string;address:string;category:string;description:string;website:string;phone:string;representative:string;evidence:string;status:'pending'|'approved'|'rejected';createdAt:string;note?:string;studioId?:string};
export type Coordinates={lat:number;lng:number};
export function distanceKm(a:Coordinates,b:Coordinates){const r=Math.PI/180;const dLat=(b.lat-a.lat)*r,dLon=(b.lng-a.lng)*r;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
export function findAStudioNearMe(studios:Studio[],position:Coordinates,radius=25,includeApproximate=true){
 if(!Number.isFinite(position.lat)||Math.abs(position.lat)>90||!Number.isFinite(position.lng)||Math.abs(position.lng)>180||!Number.isFinite(radius)||radius<=0)return [];
 return studios.flatMap(studio=>{const pin=studioPin(studio,includeApproximate);return !studio.hidden&&pin?[{studio,distance:distanceKm(position,pin),approximate:pin.approximate}]:[];}).filter(s=>s.distance<=radius).sort((a,b)=>a.distance-b.distance||a.studio.id.localeCompare(b.studio.id));
}
export function memberForDate(members:StudioMember[],studioId:string,date:string){return members.find(m=>m.studioId===studioId&&m.status==='active'&&!!m.startsOn&&m.startsOn<=date&&!!m.expiresOn&&m.expiresOn>=date);}
export function sessionPrice(rate:number,duration:number,member?:StudioMember){const basePrice=Math.round(rate*duration/60);const discount=member?Math.round(basePrice*Math.min(50,Math.max(0,member.plan.discountPercent))/100):0;return {basePrice,discount,price:basePrice-discount,membershipId:member?.id,priority:member?.plan.priority||false};}
export function capacityLabel(s:Studio){return s.rooms.length?`Largest room: ${Math.max(...s.rooms.map(r=>r.capacity))} people`:'Capacity not supplied';}
export type DiscoverySettings={position:Coordinates|null;radius:number;size:string;budget:string;duration:number;includeApproximate:boolean};
export const defaultDiscovery:DiscoverySettings={position:null,radius:25,size:'',budget:'',duration:60,includeApproximate:true};
export function refineDiscovery(studios:Studio[],settings:DiscoverySettings,members:StudioMember[]){
 const {position,radius,size,budget,duration,includeApproximate}=settings;
 const nearby=position?findAStudioNearMe(studios,position,radius,includeApproximate).map(r=>r.studio):studios.filter(s=>!s.hidden);
 return nearby.filter(s=>{if(!size&&!budget)return true;const member=memberForDate(members,s.id,localDate());return s.rooms.some(r=>(!size||r.capacity>=Number(size))&&(!budget||sessionPrice(r.price,duration,member).price<=Math.round(Number(budget)*100)));});
}
export type PlannerInput={date:string;start:number|null;duration:number;size:number;budget:number|null;area:string;service:string;flexDays:number};
export type PlanOption={studioId:string;studioName:string;roomId:string;roomName:string;date:string;start:number;duration:number;size:number;capacity:number;price:number;basePrice:number;discount:number;priority:boolean;address:string};
export function planSessions(studios:Studio[],bookings:StudioBooking[],members:StudioMember[],input:PlannerInput):PlanOption[]{
 const result:PlanOption[]=[];
 for(let offset=0;offset<=input.flexDays;offset++){
 const date=addDays(input.date,offset);if(date<localDate())continue;
 for(const studio of studios){
 if(studio.hidden||studio.status!=='claimed'||!studio.bookingEnabled)continue;
 if(input.area&&!`${studio.area} ${studio.address}`.toLowerCase().includes(input.area.toLowerCase()))continue;
 if(input.service&&!studio.services.some(s=>s.toLowerCase().includes(input.service.toLowerCase())))continue;
 for(const room of studio.rooms){
 if(room.capacity<input.size)continue;
 const price=sessionPrice(room.price,input.duration,memberForDate(members,studio.id,date));
 if(input.budget!==null&&price.price>input.budget)continue;
 const times=input.start===null?Array.from({length:Math.max(0,(room.close-room.open)/30)},(_,i)=>room.open+30*i):[input.start];
 let count=0;for(const start of times){if(registrySlotReason(studio,room,date,start,input.duration,bookings))continue;result.push({studioId:studio.id,studioName:studio.name,roomId:room.id,roomName:room.name,date,start,duration:input.duration,size:input.size,capacity:room.capacity,address:studio.address,...price});if(++count>=3)break;}
 }
 }
 }
 return result.sort((a,b)=>a.price-b.price||a.date.localeCompare(b.date)||a.start-b.start).slice(0,12);
}
