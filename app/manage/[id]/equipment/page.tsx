import {redirect} from 'next/navigation';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import RoomEquipmentManager from '@/app/room-equipment-manager';
import type {Studio} from '@/lib/registry';
import type {RoomEquipmentMap} from '@/lib/discovery';

export const dynamic='force-dynamic';
type StudioWithEquipment=Studio&{roomEquipment?:RoomEquipmentMap};
export default async function RoomEquipmentPage({params}:{params:Promise<{id:string}>}){
 const{id}=await params;const actor=await getProductionUser();if(!actor)redirect(`/welcome?return_to=${encodeURIComponent(`/manage/${id}/equipment`)}`);
 const row=await database().prepare('SELECT owner,revision,content FROM studio_registry WHERE id=?').bind(id).first();if(!row)redirect('/manage');
 const membership=actor.memberships.find(value=>value.organizationId===id&&value.active);const owner=row.owner===actor.id&&(actor.method==='chatgpt_demo'||membership?.role==='owner');if(!owner)redirect(`/manage/${id}`);
 const studio={...JSON.parse(String(row.content)),revision:Number(row.revision)} as StudioWithEquipment;
 return <RoomEquipmentManager studioId={id} studioName={studio.name} rooms={studio.rooms.map(room=>({id:room.id,name:room.name}))} initial={studio.roomEquipment||{}} initialRevision={studio.revision}/>;
}
