import { env } from 'cloudflare:workers';
import { initialState, seedRooms, type AppState } from '@/lib/domain';
export function database(){const db=(env as unknown as {DB:any}).DB;if(!db)throw new Error('Database not connected');return db;}
export async function readState(owner:string):Promise<AppState>{
 const db=database();let row=await db.prepare('SELECT content FROM workspaces WHERE owner = ?').bind(owner).first();
 if(!row){await db.batch([db.prepare('INSERT OR IGNORE INTO workspaces(owner,content) VALUES(?,?)').bind(owner,JSON.stringify({feeBps:initialState.feeBps,profile:initialState.profile,favorites:[],reports:[]})),...seedRooms.map(r=>db.prepare('INSERT OR IGNORE INTO rooms(owner,id,content) VALUES(?,?,?)').bind(owner,r.id,JSON.stringify(r)))]);row=await db.prepare('SELECT content FROM workspaces WHERE owner = ?').bind(owner).first();}
 const [rooms,bookings,blocks]=await Promise.all(['rooms','bookings','blocks'].map(table=>db.prepare(`SELECT content FROM ${table} WHERE owner = ?`).bind(owner).all()));
 return {...initialState,...JSON.parse(row.content),rooms:rooms.results.map((r:any)=>JSON.parse(r.content)),bookings:bookings.results.map((r:any)=>JSON.parse(r.content)),blocks:blocks.results.map((r:any)=>JSON.parse(r.content))};
}
