import type {BookingNotification,BookingVoucher,Studio,StudioBooking} from './registry';
import {timeLabel,timestamp} from './domain';

export const studioInboxRecipient=(studioId:string)=>`studio:${studioId}`;

export function createVoucher(studio:Studio,booking:StudioBooking,now:string):BookingVoucher{
 const token=crypto.randomUUID();
 return {id:'VOU-'+token,bookingId:booking.id,studioId:studio.id,token,reference:`SES-${booking.id.replace(/[^A-Za-z0-9]/g,'').slice(-8).toUpperCase()}`,status:'active',studioName:studio.name,roomName:booking.roomName,date:booking.date,start:booking.start,duration:booking.duration,createdAt:now};
}

export function createInAppNotification(input:{booking:StudioBooking;recipient:string;kind:Extract<BookingNotification['kind'],'booking_confirmed'|'booking_declined'|'booking_cancelled'|'settlement_updated'|'message_received'|'reminder_24h'|'reminder_2h'>;content:string;now:string;scheduledAt?:string}):BookingNotification{
 return {id:'NTF-'+crypto.randomUUID(),bookingId:input.booking.id,studioId:input.booking.studioId,recipient:input.recipient,channel:'in_app',kind:input.kind,status:'available',createdAt:input.now,scheduledAt:input.scheduledAt,content:input.content};
}

const icsEscape=(value:string)=>value.replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replace(/\r?\n/g,'\\n');
const icsDate=(date:string,minutes:number)=>`${date.replaceAll('-','')}T${String(Math.floor(minutes/60)).padStart(2,'0')}${String(minutes%60).padStart(2,'0')}00`;

/** A deliberately minimal calendar artifact: never puts personal contact, payment or notes in a third-party calendar. */
export function bookingIcs(studio:Studio,booking:StudioBooking,origin:string){
 const created=booking.createdAt.replace(/[-:]/g,'').replace(/\.\d{3}/,'').replace('Z','Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sessions Music//Booking//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${icsEscape(booking.id)}@sessions.music`,`DTSTAMP:${created}`,`DTSTART;TZID=Africa/Harare:${icsDate(booking.date,booking.start)}`,`DTEND;TZID=Africa/Harare:${icsDate(booking.date,booking.start+booking.duration)}`,`SUMMARY:${icsEscape(`${studio.name} · ${booking.roomName}`)}`,`LOCATION:${icsEscape(studio.address)}`,`DESCRIPTION:${icsEscape(`Sessions reference ${booking.id}. Confirm live status in Sessions before travelling.`)}`,`URL:${icsEscape(origin+'/requests')}`,'END:VEVENT','END:VCALENDAR',''];
 return lines.join('\r\n');
}

export function voucherDescription(voucher:BookingVoucher){return `${voucher.studioName} · ${voucher.roomName} · ${voucher.date} · ${timeLabel(voucher.start)} CAT`;}

export function bookingStartsAt(booking:Pick<StudioBooking,'date'|'start'>){return timestamp(booking.date,booking.start);}

export function whatsappHref(phone:string,message:string){
 const digits=phone.replace(/\D/g,'');
 if(digits.length<8||digits.length>15)throw new Error('A valid phone number is required for WhatsApp.');
 return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
