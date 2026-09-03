import {notFound} from 'next/navigation';
import {readPublicVoucher} from '@/db/booking-vouchers';
import {prettyDate,timeLabel} from '@/lib/domain';

export const dynamic='force-dynamic';

export default async function VoucherPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params,voucher=await readPublicVoucher(token);if(!voucher)notFound();
 return <main className="voucher-page"><section className="voucher-card"><p className="voucher-kicker">SESSIONS BOOKING VOUCHER</p><h1>Booking confirmed</h1><p className="voucher-reference">{voucher.reference}</p><dl><div><dt>Studio</dt><dd>{voucher.studioName}</dd></div><div><dt>Room</dt><dd>{voucher.roomName}</dd></div><div><dt>Date and time</dt><dd>{prettyDate(voucher.date)} · {timeLabel(voucher.start)}–{timeLabel(voucher.start+voucher.duration)} CAT</dd></div></dl><p className="voucher-note">This is a shareable booking reference, not proof of payment or admission. Confirm the live booking status and access instructions with the studio before travelling.</p></section></main>;
}
