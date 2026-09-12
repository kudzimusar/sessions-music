export const platformRoles=[
 'musician',
 'provider_owner',
 'provider_manager',
 'provider_staff',
 'support_agent',
 'support_manager',
 'trust_safety',
 'trust_safety_manager',
 'finance_admin',
 'finance_manager',
 'provider_operations',
 'provider_operations_manager',
 'growth_analyst',
 'growth_manager',
 'data_analyst',
 'data_admin',
 'product_operations',
 'governance_reviewer',
 'operations_admin',
 'corporate_admin',
 'super_admin_eligible',
 'super_admin',
] as const;
export type PlatformRole=(typeof platformRoles)[number];
export type OrganizationRole='owner'|'manager'|'staff';
export type IdentityMethod='phone_otp'|'email_otp'|'google'|'apple'|'chatgpt_demo';
export type PlatformScopeType='organization'|'department'|'provider'|'region'|'case'|'team';
export type ScopedPlatformRole={role:PlatformRole;scopeType:PlatformScopeType;scopeId:string};

export type OrganizationMembership={organizationId:string;role:OrganizationRole;active:boolean};
export type IdentityPrincipal={
 userId:string;
 sessionId:string;
 expiresAt:number;
 revoked:boolean;
 method:IdentityMethod;
 verifiedPhone:string|null;
 verifiedEmail:string|null;
 roles:PlatformRole[];
 /** Additive Phase 3 scope model. Absence is treated as no scoped grants. */
 scopedRoles?:ScopedPlatformRole[];
 memberships:OrganizationMembership[];
};

export class IdentityFault extends Error{
 constructor(message:string,public readonly status:401|403){super(message)}
}

/** Normalize a Zimbabwe number to E.164. This deliberately accepts mobile-capable national numbers only. */
export function normalizeZimbabwePhone(value:string){
 const compact=value.trim().replace(/[\s()-]/g,'').replace(/^00/,'+');
 const candidate=compact.startsWith('+')?compact:compact.startsWith('263')?'+'+compact:compact.startsWith('0')?'+263'+compact.slice(1):'';
 if(!/^\+263[1-9]\d{8}$/.test(candidate))throw new Error('Enter a valid Zimbabwe phone number, for example +263 77 123 4567.');
 return candidate;
}

export function isSixDigitOtp(value:string){return /^\d{6}$/.test(value)}

export function requireActiveSession(actor:IdentityPrincipal|null,now=Date.now()){
 if(!actor||actor.revoked||!actor.sessionId||actor.expiresAt<=now)throw new IdentityFault('Your session has expired. Sign in again.',401);
 return actor;
}

export function hasPlatformRole(actor:IdentityPrincipal,role:PlatformRole){return actor.roles.includes(role)}

export function requirePlatformRole(actor:IdentityPrincipal|null,allowed:readonly PlatformRole[],now=Date.now()){
 const active=requireActiveSession(actor,now);
 if(!allowed.some(role=>hasPlatformRole(active,role)))throw new IdentityFault('This account does not have permission for that action.',403);
 return active;
}

export function requireOrganizationAccess(actor:IdentityPrincipal|null,organizationId:string,allowed:readonly OrganizationRole[]=['owner','manager','staff'],now=Date.now()){
 const active=requireActiveSession(actor,now);
 if(active.roles.some(role=>['super_admin','corporate_admin','operations_admin'].includes(role)))return active;
 const membership=active.memberships.find(value=>value.organizationId===organizationId&&value.active);
 if(!membership||!allowed.includes(membership.role))throw new IdentityFault('This organization belongs to another account.',403);
 return active;
}

export function hasVerifiedContact(actor:IdentityPrincipal){return !!(actor.verifiedPhone||actor.verifiedEmail)}
