import {database} from '@/db/store';

export type LoyaltyCreditSetting={id:string;enabled:boolean;creditCents:number;revision:number;updatedAt:string;updatedBy:string};
export type MembershipLedgerKind='membership_settlement'|'attendance'|'loyalty_credit'|'loyalty_redemption'|'loyalty_reversal';
export type MembershipLedgerEntry={id:string;studioId:string;membershipId?:string;customer:string;bookingId?:string;kind:MembershipLedgerKind;amount:number;method?:'ecocash'|'bank_transfer'|'cash'|'other';occurredAt:string;note?:string;seriesId?:string};
export type BookingSeries={id:string;studioId:string;customer:string;requestKey:string;status:'requested'|'closed';bookingIds:string[];occurrences:number;createdAt:string};

export const loyaltyCreditDefault:LoyaltyCreditSetting={id:'platform-loyalty-credit-v1',enabled:false,creditCents:0,revision:0,updatedAt:'2026-09-03T00:00:00.000Z',updatedBy:'system'};
const toSetting=(row:any):LoyaltyCreditSetting=>({...JSON.parse(row.content),id:row.id,enabled:!!row.enabled,creditCents:row.credit_cents,revision:row.revision});
export async function ensureLoyaltyCreditSetting(){const db=database();await db.prepare('INSERT OR IGNORE INTO loyalty_credit_settings(id,enabled,credit_cents,revision,content) VALUES(?,?,?,?,?)').bind(loyaltyCreditDefault.id,0,0,0,JSON.stringify(loyaltyCreditDefault)).run();}
export async function readLoyaltyCreditSetting(){await ensureLoyaltyCreditSetting();const row=await database().prepare('SELECT * FROM loyalty_credit_settings WHERE id=?').bind(loyaltyCreditDefault.id).first();return row?toSetting(row):loyaltyCreditDefault;}
export function loyaltyBalance(entries:MembershipLedgerEntry[],studioId:string,customer:string){return entries.filter(entry=>entry.studioId===studioId&&entry.customer===customer).reduce((total,entry)=>total+(entry.kind==='loyalty_redemption'?-entry.amount:entry.kind==='loyalty_credit'||entry.kind==='loyalty_reversal'?entry.amount:0),0);}
