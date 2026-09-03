import {settlementPricing,type AddOnLine,type SettlementPricingSnapshot} from '@/lib/commerce';
import {policySnapshot,type FeePolicyRecord} from '@/lib/commerce-server';
import type {StudioRoom} from '@/lib/registry';

export type QuoteAddOnRequest={id:string;quantity:number};
export type BookingQuote={roomSubtotal:number;addOns:AddOnLine[];pricing:SettlementPricingSnapshot};

export function quoteRoomBooking(room:StudioRoom,duration:number,requests:QuoteAddOnRequest[],policy:FeePolicyRecord,roomSubtotalOverride?:number):BookingQuote{
 if(!Number.isSafeInteger(duration)||duration<room.minimum||duration>480||duration%30)throw new Error('Choose a valid session duration');
 if(requests.length>12)throw new Error('Too many add-on selections');
 const seen=new Set<string>();const addOns: AddOnLine[]=[];
 for(const request of requests){
  if(!request.id||seen.has(request.id))throw new Error('Each add-on may be selected once');seen.add(request.id);
  if(!Number.isSafeInteger(request.quantity)||request.quantity<1||request.quantity>12)throw new Error('Add-on quantities must be between 1 and 12');
  const addOn=room.addOns?.find(value=>value.id===request.id&&value.available);if(!addOn)throw new Error('This add-on is not available');
  addOns.push({id:addOn.id,name:addOn.name,price:addOn.price,quantity:request.quantity,commissionable:addOn.commissionable});
 }
 const roomSubtotal=roomSubtotalOverride??Math.round(room.price*duration/60);
 if(!Number.isSafeInteger(roomSubtotal)||roomSubtotal<0)throw new Error('Invalid room price');
 const addOnSubtotal=addOns.reduce((sum,line)=>sum+line.price*line.quantity,0);
 const commissionable=addOns.filter(line=>line.commissionable).reduce((sum,line)=>sum+line.price*line.quantity,0);
 const pricing=settlementPricing(roomSubtotal,addOnSubtotal,Math.min(room.deposit||0,roomSubtotal+addOnSubtotal),policySnapshot(policy),commissionable);
 return {roomSubtotal,addOns,pricing};
}
