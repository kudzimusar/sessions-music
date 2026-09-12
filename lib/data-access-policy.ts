import {hasPermission} from './access-control';
import type {OrganizationMembership,PlatformRole} from './identity-core';

export type DataClassification='public'|'internal'|'confidential'|'restricted';
export type SensitiveResource='workforce_directory'|'workforce_identity'|'customer_directory'|'studio_verification_evidence'|'settlement_proof'|'booking_message_attachment'|'case_evidence'|'private_upload';
export type WorkforceField='directory'|'identity_user_id'|'work_email'|'employment_type';
export type CustomerField='reference'|'activity'|'contact';
export type CaseCategory='customer_support'|'booking_operations'|'provider_operations'|'trust_safety'|'finance'|'general_incident';

type PrincipalLike={id?:string;roles:readonly PlatformRole[];memberships?:readonly OrganizationMembership[]}|null|undefined;
export type PrivateMediaContext={uploadOwner?:boolean;studioOwner?:boolean;studioManager?:boolean;bookingCustomer?:boolean;bookingParticipantRole?:'musician'|'studio'|'operations'|null;caseAuthorized?:boolean};

export const resourceClassification:Record<SensitiveResource,DataClassification>={
 workforce_directory:'internal',workforce_identity:'restricted',customer_directory:'internal',studio_verification_evidence:'restricted',settlement_proof:'restricted',booking_message_attachment:'confidential',case_evidence:'restricted',private_upload:'confidential',
};

export function canReadWorkforceField(actor:PrincipalLike,field:WorkforceField){if(!actor)return false;if(field==='directory')return hasPermission(actor,'organization:read');return hasPermission(actor,'organization:manage')}
export function canReadCustomerField(actor:PrincipalLike,field:CustomerField){if(!actor)return false;if(field==='contact')return hasPermission(actor,'support:manage');return hasPermission(actor,'customers:read')}
export function canReadPrivateMedia(actor:PrincipalLike,resource:Exclude<SensitiveResource,'workforce_directory'|'workforce_identity'|'customer_directory'>,context:PrivateMediaContext={}){
 if(!actor)return false;
 if(resource==='studio_verification_evidence')return !!context.studioOwner||hasPermission(actor,'verification:review');
 if(resource==='settlement_proof')return !!(context.bookingCustomer||context.studioOwner||context.studioManager)||hasPermission(actor,'settlements:review');
 if(resource==='booking_message_attachment')return context.bookingParticipantRole==='musician'||context.bookingParticipantRole==='studio';
 if(resource==='case_evidence')return !!context.caseAuthorized&&hasPermission(actor,'cases:restricted.read');
 return !!context.uploadOwner;
}

export function canReadCaseCategory(actor:PrincipalLike,category:CaseCategory,classification:DataClassification='internal'){
 if(!actor||!hasPermission(actor,'cases:read'))return false;
 if((classification==='restricted'||classification==='confidential')&&!hasPermission(actor,'cases:restricted.read'))return false;
 if(category==='customer_support')return hasPermission(actor,'support:read');
 if(category==='booking_operations')return hasPermission(actor,'bookings:read');
 if(category==='provider_operations')return hasPermission(actor,'providers:oversight');
 if(category==='trust_safety')return hasPermission(actor,'claims:review')||hasPermission(actor,'verification:review')||hasPermission(actor,'cases:restricted.read');
 if(category==='finance')return hasPermission(actor,'settlements:review');
 return hasPermission(actor,'incidents:read');
}

export function canManageCaseCategory(actor:PrincipalLike,category:CaseCategory){
 if(!actor||!hasPermission(actor,'cases:manage'))return false;
 if(category==='customer_support')return hasPermission(actor,'support:manage');
 if(category==='booking_operations')return hasPermission(actor,'bookings:manage');
 if(category==='provider_operations')return hasPermission(actor,'providers:oversight');
 if(category==='trust_safety')return hasPermission(actor,'verification:review')||hasPermission(actor,'claims:review');
 if(category==='finance')return hasPermission(actor,'settlements:review');
 return hasPermission(actor,'incidents:read')&&hasPermission(actor,'bookings:manage');
}

export function studioMembershipRole(actor:PrincipalLike,studioId:string){if(!actor)return null;return actor.memberships?.find(value=>value.organizationId===studioId&&value.active)?.role||null}
