import {cache} from 'react';
import {database} from './store';
import {seedRegistry} from './registry-store';
import type {Studio} from '@/lib/registry';

// Public record only; no identity, claims, bookings or staff invitation data enters metadata.
export const readPublicStudio=cache(async(id:string):Promise<Studio|null>=>{
 try{
  await seedRegistry();
  const row=await database().prepare('SELECT content,revision FROM studio_registry WHERE id=?').bind(id).first();
  if(!row)return null;
  const studio:Studio={...JSON.parse(row.content),revision:row.revision};
  return studio.hidden?null:studio;
 }catch{return null;}
});
