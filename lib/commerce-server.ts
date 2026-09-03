import {database} from '@/db/store';
import {foundingPilotPolicy,type FeeBasis,type FeePayer,type FeePolicySnapshot} from '@/lib/commerce';

export type FeePolicyRecord={
 id:string;
 scope:'global'|'room';
 studioId?:string;
 roomId?:string;
 status:'active'|'retired';
 effectiveFrom:string;
 effectiveUntil?:string;
 revision:number;
 policy:FeePolicySnapshot;
 createdAt:string;
 createdBy:string;
};

const defaultRecord:FeePolicyRecord={id:foundingPilotPolicy.id,scope:'global',status:'active',effectiveFrom:foundingPilotPolicy.effectiveFrom,revision:0,policy:foundingPilotPolicy,createdAt:foundingPilotPolicy.effectiveFrom+'T00:00:00.000Z',createdBy:'system'};
const asRecord=(row:any):FeePolicyRecord=>{const content=JSON.parse(row.content);return {...content,id:row.id,scope:row.scope,status:row.status,effectiveFrom:row.effective_from,effectiveUntil:row.effective_until||undefined,revision:row.revision};};
export function validatePolicy(input:{payer:FeePayer;musicianBps:number;studioBps:number;basis:FeeBasis;effectiveFrom:string}){
 const {payer,musicianBps,studioBps}=input;
 for(const value of [musicianBps,studioBps])if(!Number.isSafeInteger(value)||value<0||value>2500)throw new Error('Fee rates must be integer basis points between 0 and 2500');
 if(payer==='musician'&&(musicianBps<=0||studioBps!==0))throw new Error('Musician-paid policy must set a musician fee only');
 if(payer==='studio'&&(studioBps<=0||musicianBps!==0))throw new Error('Studio-paid policy must set a studio fee only');
 if(payer==='split'&&(musicianBps<=0||studioBps<=0))throw new Error('Split policy requires a positive fee on both sides');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom))throw new Error('effectiveFrom must be YYYY-MM-DD');
}
export async function ensureFoundingPilot(){
 const db=database();
 await db.prepare('INSERT OR IGNORE INTO fee_policies(id,scope,status,effective_from,revision,content) VALUES(?,?,?,?,?,?)').bind(defaultRecord.id,'global','active',defaultRecord.effectiveFrom,0,JSON.stringify(defaultRecord)).run();
}
export async function resolveFeePolicy(studioId:string,roomId:string,onDate:string):Promise<FeePolicyRecord>{
 await ensureFoundingPilot();const db=database();
 const rows=(await db.prepare("SELECT * FROM fee_policies WHERE status='active' AND effective_from<=? AND (effective_until IS NULL OR effective_until>=?) AND ((scope='room' AND studio_id=? AND room_id=?) OR scope='global') ORDER BY CASE scope WHEN 'room' THEN 0 ELSE 1 END,effective_from DESC,rowid DESC").bind(onDate,onDate,studioId,roomId).all()).results;
 return rows.length?asRecord(rows[0]):defaultRecord;
}
export async function readFeePolicies(){await ensureFoundingPilot();const db=database();return (await db.prepare('SELECT * FROM fee_policies ORDER BY scope,effective_from DESC,rowid DESC').all()).results.map(asRecord);}
export function policySnapshot(record:FeePolicyRecord):FeePolicySnapshot{return {...record.policy,id:record.id,version:record.revision,effectiveFrom:record.effectiveFrom,source:record.id===foundingPilotPolicy.id?'founding_pilot':'configured_policy'};}
