import type {Studio,StudioBooking} from './registry';

export const PLATFORM_TIME_ZONE='Africa/Harare';

const encoded=(bytes:Uint8Array)=>{
 let binary='';
 for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};

export async function platformCalendarEventId(bookingId:string){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('sessions-calendar:'+bookingId));
 return 'sessions'+Array.from(new Uint8Array(digest).slice(0,20),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export const base64UrlJson=(value:unknown)=>encoded(new TextEncoder().encode(JSON.stringify(value)));
export const base64UrlBytes=encoded;

function instant(date:string,minutes:number){
 const epoch=new Date(`${date}T00:00:00+02:00`).getTime()+minutes*60_000;
 if(!Number.isFinite(epoch))throw new Error('Invalid booking time');
 return new Date(epoch).toISOString();
}

export function platformCalendarEvent(studio:Studio,booking:StudioBooking,eventId:string){
 const prefix=booking.status==='cancelled'?'[Cancelled] ':booking.status==='completed'?'[Completed] ':'';
 return {
  id:eventId,
  summary:`${prefix}${studio.name} · ${booking.roomName}`,
  description:`Sessions booking ${booking.id}\n${booking.size} musicians\nManage the booking in Sessions. Customer email, phone and notes are intentionally excluded.`,
  location:studio.address,
  start:{dateTime:instant(booking.date,booking.start),timeZone:PLATFORM_TIME_ZONE},
  end:{dateTime:instant(booking.date,booking.start+booking.duration),timeZone:PLATFORM_TIME_ZONE},
  visibility:'private',
  transparency:booking.status==='cancelled'?'transparent':'opaque',
  guestsCanInviteOthers:false,
  guestsCanModify:false,
  guestsCanSeeOtherGuests:false,
  reminders:{useDefault:false},
  extendedProperties:{private:{sessionsBookingId:booking.id,sessionsStudioId:studio.id,sessionsStatus:booking.status}}
 };
}
