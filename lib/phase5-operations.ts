export const caseStatuses=['open','triaged','in_progress','waiting_customer','waiting_provider','waiting_internal','resolved','closed'] as const;
export type CaseStatus=(typeof caseStatuses)[number];
export const bookingOperationStates=['normal','attention','intervention','waiting_customer','waiting_provider','waiting_internal','resolved'] as const;
export type BookingOperationState=(typeof bookingOperationStates)[number];

const transitions:Record<CaseStatus,readonly CaseStatus[]>={
 open:['triaged'],
 triaged:['in_progress','waiting_customer','waiting_provider','waiting_internal','resolved'],
 in_progress:['waiting_customer','waiting_provider','waiting_internal','resolved'],
 waiting_customer:['in_progress','waiting_provider','waiting_internal','resolved'],
 waiting_provider:['in_progress','waiting_customer','waiting_internal','resolved'],
 waiting_internal:['in_progress','waiting_customer','waiting_provider','resolved'],
 resolved:['closed'],
 closed:[],
};

export function canTransitionCase(from:CaseStatus,to:CaseStatus){return transitions[from]?.includes(to)||false}
export function caseTransitionTargets(from:CaseStatus){return transitions[from]||[]}
export function requiresCaseResolution(status:CaseStatus){return status==='resolved'||status==='closed'}
export function slaState(targetAt:string|null,now=Date.now()){
 if(!targetAt)return 'paused' as const;
 const target=Date.parse(targetAt);if(!Number.isFinite(target))return 'paused' as const;
 if(target<=now)return 'breached' as const;
 if(target-now<=60*60*1000)return 'due_soon' as const;
 return 'on_track' as const;
}
export function caseReference(now=new Date(),random=crypto.randomUUID().slice(0,6).toUpperCase()){
 const date=now.toISOString().slice(0,10).replaceAll('-','');return `CASE-${date}-${random}`;
}
export function maskedReference(value:unknown){const text=String(value||'');return text.length>14?`${text.slice(0,8)}…${text.slice(-4)}`:text||'—'}
