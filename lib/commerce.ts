export type FeePayer='musician'|'studio'|'split';
export type FeeBasis='room_subtotal'|'room_plus_addons';

export type FeePolicySnapshot={
 id:string;
 version:number;
 payer:FeePayer;
 musicianBps:number;
 studioBps:number;
 basis:FeeBasis;
 depositsExcluded:boolean;
 effectiveFrom:string;
 source:'founding_pilot'|'configured_policy';
};

export type AddOnLine={
 id:string;
 name:string;
 price:number;
 quantity:number;
 commissionable:boolean;
};

export type SettlementPricingSnapshot={
 currency:'USD';
 roomSubtotal:number;
 addOnSubtotal:number;
 gross:number;
 customerFee:number;
 studioFee:number;
 platformFee:number;
 customerTotal:number;
 depositDue:number;
 studioNet:number;
 policy:FeePolicySnapshot;
};

// Phase R launches with an explicitly free founding-studio pilot. Workstream 3
// replaces selection of this record with effective-dated policy data; bookings
// already carrying this snapshot remain unchanged.
export const foundingPilotPolicy:FeePolicySnapshot={
 id:'founding-pilot-zero-v1',
 version:1,
 payer:'studio',
 musicianBps:0,
 studioBps:0,
 basis:'room_subtotal',
 depositsExcluded:true,
 effectiveFrom:'2026-09-02',
 source:'founding_pilot'
};

export function settlementPricing(roomSubtotal:number,addOnSubtotal=0,depositDue=0,policy=foundingPilotPolicy,commissionableAddOnSubtotal=addOnSubtotal):SettlementPricingSnapshot{
 for(const [name,value] of Object.entries({roomSubtotal,addOnSubtotal,depositDue,customerBps:policy.musicianBps,studioBps:policy.studioBps}))if(!Number.isSafeInteger(value)||value<0)throw new Error(`${name} must be non-negative integer cents`);
 if(!Number.isSafeInteger(commissionableAddOnSubtotal)||commissionableAddOnSubtotal<0||commissionableAddOnSubtotal>addOnSubtotal)throw new Error('commissionableAddOnSubtotal must be a valid integer subset');
 const basis=policy.basis==='room_plus_addons'?roomSubtotal+commissionableAddOnSubtotal:roomSubtotal;
 const customerFee=Math.round(basis*policy.musicianBps/10000);
 const studioFee=Math.round(basis*policy.studioBps/10000);
 const gross=roomSubtotal+addOnSubtotal;
 const platformFee=customerFee+studioFee;
 const customerTotal=gross+customerFee;
 if(depositDue>customerTotal)throw new Error('Deposit cannot exceed the customer total');
 return {currency:'USD',roomSubtotal,addOnSubtotal,gross,customerFee,studioFee,platformFee,customerTotal,depositDue,studioNet:gross-studioFee,policy:{...policy}};
}
