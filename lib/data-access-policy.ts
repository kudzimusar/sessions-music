import {hasPermission} from './access-control';
import type {OrganizationMembership,PlatformRole} from './identity-core';

export type DataClassification='public'|'internal'|'confidential'|'restricted';
export type SensitiveResource='workforce_directory'|'workforce_identity'|'studio_verification_evidence'|'settlement_proof'|'booking_message_attachment'|'private_upload';
export type WorkforceField='directory'|'identity_user_id'|'work_email'|'employment_type';

type PrincipalLike={id?:string;roles:readonly PlatformRole[];memberships?:readonly OrganizationMembership[]}|null|undefined;
export type PrivateMediaContext={
 uploadOwner?:boolean;
 studioOwner?:boolean;
 studioManager?:boolean;
 bookingCustomer?:boolean;
 bookingParticipantRole?:'musician'|'studio'|'operations'|null;
};

/**
 * Data classification is descriptive. Access still requires the resource-specific
 * permission/relationship checks below; classification alone never grants access.
 */
export const resourceClassification:Record<SensitiveResource,DataClassification>={
 workforce_directory:'internal',
 workforce_identity:'restricted',
 studio_verification_evidence:'restricted',
 settlement_proof:'restricted',
 booking_message_attachment:'confidential',
 private_upload:'confidential',
};

export function canReadWorkforceField(actor:PrincipalLike,field:WorkforceField){
 if(!actor)return false;
 if(field==='directory')return hasPermission(actor,'organization:read');
 return hasPermission(actor,'organization:manage');
}

export function canReadPrivateMedia(actor:PrincipalLike,resource:Exclude<SensitiveResource,'workforce_directory'|'workforce_identity'>,context:PrivateMediaContext={}){
 if(!actor)return false;
 if(resource==='studio_verification_evidence')return !!context.studioOwner||hasPermission(actor,'verification:review');
 if(resource==='settlement_proof')return !!(context.bookingCustomer||context.studioOwner||context.studioManager)||hasPermission(actor,'settlements:review');
 if(resource==='booking_message_attachment')return context.bookingParticipantRole==='musician'||context.bookingParticipantRole==='studio';
 return !!context.uploadOwner;
}

export function studioMembershipRole(actor:PrincipalLike,studioId:string){
 if(!actor)return null;
 return actor.memberships?.find(value=>value.organizationId===studioId&&value.active)?.role||null;
}
