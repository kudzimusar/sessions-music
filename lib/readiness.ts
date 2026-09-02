import {studioPin,type Studio} from './registry';

export type GatewayStatus={name:string;ready:boolean};
export type LaunchConfiguration={ai:boolean|null;gateways:GatewayStatus[]|null;mode?:string};
export function launchReadiness(studios:Studio[],configuration:LaunchConfiguration){
 const visible=studios.filter(s=>!s.hidden),total=visible.length;
 const entrances=visible.filter(s=>!!s.location).length;
 const approximate=visible.filter(s=>studioPin(s)?.approximate).length;
 const capacities=visible.filter(s=>s.rooms.length>0).length;
 const bookable=visible.filter(s=>s.status==='claimed'&&s.bookingEnabled&&s.rooms.length>0).length;
 const plans=visible.filter(s=>s.memberPlans?.some(p=>p.active)).length;
 const ai=configuration.ai===null?'Configuration not checked':configuration.ai?'AI configured; live use not verified here':'AI not connected';
 return [
  {title:'Find a studio near me',status:`${entrances} entrance pins · ${approximate} approximate locations`,detail:`${total-entrances-approximate} profiles cannot appear in distance results. Public building, campus and street points are labelled approximate and can be excluded. Device permission is required.`,href:'/map'},
  {title:'AI scheduling',status:ai,detail:`${bookable} studios have published bookable rooms. AI interprets a request; the server checks availability, and the customer reviews and submits the booking. Configuration alone is not an end-to-end test.`,href:'/planner'},
  {title:'AI budget matching',status:ai,detail:`${capacities} of ${total} studios have published room prices and capacities. Unknown rates cannot be presented as within budget. The guided filter is not AI.`,href:'/planner'},
  {title:'Studio memberships',status:`${plans} studios offer a published plan`,detail:'Owner-controlled terms, discounts and priority request review are implemented. Paid membership fees are settled offline and confirmed by the owner. Online membership checkout and studio payouts are not implemented.',href:'/studios'},
  {title:'Room capacity',status:`${capacities} of ${total} profiles have room limits`,detail:'Owners must enter a capacity for every bookable room. Missing capacities remain unknown; a building’s area or floor count is not its safe group size.',href:'/studios'},
  {title:'Full visitor addresses',status:`${entrances} owner-confirmed entrance pins`,detail:'Profiles retain public addresses and sources. City-only, neighbourhood-only and unnumbered street addresses still need owner verification; an approximate map point does not make an address complete.',href:'/map'},
  {title:'Studio sign-in & onboarding',status:'ChatGPT sign-in · independent ownership review',detail:'Existing studios claim their listing; new studios register for review. Each approved studio receives its own dashboard, team and setup checklist. There is no separate email/password account system.',href:'/register'},
  {title:'Subscriptions & gateways',status:configuration.gateways===null?'Configuration not checked':configuration.gateways.some(p=>p.ready)?`Platform billing configured (${configuration.mode||'unknown mode'})`:'No payment gateway activated',detail:'Visible Stripe, PayPal and Paynow adapters are for platform subscriptions, not customers’ studio memberships. Merchant setup, an approved price and real provider checkout/webhook tests are required before calling payments complete.',href:'/subscriptions'}
 ];
}
