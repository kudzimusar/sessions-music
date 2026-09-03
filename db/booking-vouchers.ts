import {database} from './store';
import type {BookingVoucher} from '@/lib/registry';

export async function readPublicVoucher(token:string):Promise<BookingVoucher|null>{
 if(!/^[0-9a-f-]{36}$/i.test(token))return null;
 const row=await database().prepare("SELECT content FROM booking_vouchers WHERE token=? AND status='active'").bind(token).first();
 return row?JSON.parse(row.content) as BookingVoucher:null;
}
