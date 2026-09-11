import {database} from '@/db/store';
import {isRegistryUserOperator} from '@/db/registry-store';
import type {SessionUser} from '@/app/chatgpt-auth';
import type {Studio,StudioBooking} from './registry';

export type BookingAccess={booking:StudioBooking;studio:Studio;role:'musician'|'studio'|'operations';recipient:string};

export async function bookingAccess(user:SessionUser,bookingId:string,studioId?:string):Promise<BookingAccess|null>{
 const db=database();const row=await db.prepare(studioId?'SELECT content FROM studio_bookings WHERE id=? AND studio_id=?':'SELECT content FROM studio_bookings WHERE id=?').bind(...(studioId?[bookingId,studioId]:[bookingId])).first();
 if(!row)return null;
 const booking=JSON.parse(row.content) as StudioBooking;const studioRow=await db.prepare('SELECT owner,content FROM studio_registry WHERE id=?').bind(booking.studioId).first();
 if(!studioRow)return null;const studio=JSON.parse(studioRow.content) as Studio;
 if(booking.customer===user.id)return {booking,studio,role:'musician',recipient:user.id};
 if(isRegistryUserOperator(user))return {booking,studio,role:'operations',recipient:'operations'};
 const identity=user.memberships.find(value=>value.organizationId===booking.studioId&&value.active),legacy=user.method==='chatgpt_demo';
 if(studioRow.owner===user.id&&(legacy||identity?.role==='owner'))return {booking,studio,role:'studio',recipient:`studio:${booking.studioId}`};
 const contacts=[user.email?.toLowerCase(),user.phone].filter(Boolean);const staff=contacts.length?await db.prepare("SELECT role FROM studio_staff WHERE studio_id=? AND email IN (?,?) AND status='active'").bind(booking.studioId,contacts[0]||'',contacts[1]||'').first():null;
 if(staff?.role==='manager'&&(legacy||identity?.role==='manager'||identity?.role==='staff'||identity?.role==='owner'))return {booking,studio,role:'studio',recipient:`studio:${booking.studioId}`};
 return null;
}
