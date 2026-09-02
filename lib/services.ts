/** Replace these ports with server-side adapters when launching live services. */
export interface PaymentGateway {charge(input:{amount:number;currency:'USD'|'ZiG';approvalRequired:boolean;simulateFailure?:boolean}):Promise<{state:'paid'|'authorized';providerReference:string}>}
export const demoPayments:PaymentGateway={async charge(input){if(input.simulateFailure)throw new Error('Demo payment declined. No slot was reserved and no money was charged. Please try again.');return {state:input.approvalRequired?'authorized':'paid',providerReference:`DEMO-${crypto.randomUUID()}`}}};
export interface SearchInterpreter {interpret(text:string):Promise<{filters:Record<string,unknown>;mode:'rules'|'ai'}>}
export interface NotificationGateway {send(input:{channel:'email'|'whatsapp';recipient:string;message:string}):Promise<{status:'sent'|'not_configured'}>}
export interface MapGateway {location(area:string):{url:string;precision:'neighbourhood'}}
export const maps:MapGateway={location:area=>({url:`https://www.openstreetmap.org/search?query=${encodeURIComponent(area+', Harare, Zimbabwe')}`,precision:'neighbourhood'})};
