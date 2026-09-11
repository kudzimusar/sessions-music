import type {OrganizationMembership,PlatformRole} from './identity-core';

export const platformPermissions=[
 'platform:overview',
 'platform:roles.manage',
 'registry:read',
 'registry:write',
 'claims:review',
 'verification:review',
 'providers:oversight',
 'settlements:review',
 'fees:manage',
 'loyalty:manage',
 'support:read',
] as const;
export type PlatformPermission=(typeof platformPermissions)[number];
export type AccessSurface='customer'|'provider'|'corporate';

type PrincipalLike={roles:readonly PlatformRole[];memberships?:readonly OrganizationMembership[]}|null|undefined;

const rolePermissions:Record<PlatformRole,readonly PlatformPermission[]>={
 musician:[],
 provider_owner:[],
 provider_manager:[],
 provider_staff:[],
 support_agent:['platform:overview','registry:read','support:read'],
 trust_safety:['platform:overview','registry:read','registry:write','claims:review','verification:review','providers:oversight'],
 finance_admin:['platform:overview','registry:read','settlements:review','fees:manage','loyalty:manage'],
 operations_admin:['platform:overview','registry:read','registry:write','claims:review','verification:review','providers:oversight','settlements:review','support:read'],
 corporate_admin:['platform:overview','registry:read','registry:write','claims:review','verification:review','providers:oversight','settlements:review','fees:manage','loyalty:manage','support:read'],
 super_admin:platformPermissions,
};

export const corporateRoles:readonly PlatformRole[]=['support_agent','trust_safety','finance_admin','operations_admin','corporate_admin','super_admin'];
export const providerRoles:readonly PlatformRole[]=['provider_owner','provider_manager','provider_staff'];

export function permissionsForRoles(roles:readonly PlatformRole[]){
 return [...new Set(roles.flatMap(role=>rolePermissions[role]||[]))] as PlatformPermission[];
}

export function hasPermission(actor:PrincipalLike,permission:PlatformPermission){
 return !!actor&&permissionsForRoles(actor.roles).includes(permission);
}

export function canAccessSurface(actor:PrincipalLike,surface:AccessSurface){
 if(surface==='customer')return !!actor;
 if(!actor)return false;
 if(surface==='corporate')return actor.roles.some(role=>corporateRoles.includes(role));
 return actor.roles.some(role=>providerRoles.includes(role)||role==='super_admin'||role==='corporate_admin')||!!actor.memberships?.some(value=>value.active);
}

export function canReviewRegistry(actor:PrincipalLike){
 return hasPermission(actor,'claims:review')||hasPermission(actor,'verification:review')||hasPermission(actor,'registry:write');
}

export function canManagePlatformRoles(actor:PrincipalLike){return hasPermission(actor,'platform:roles.manage')}

export function roleLabel(role:PlatformRole){
 return ({
  musician:'Customer / musician',
  provider_owner:'Provider owner',
  provider_manager:'Provider manager',
  provider_staff:'Provider staff',
  support_agent:'Customer support',
  trust_safety:'Trust & safety',
  finance_admin:'Finance administrator',
  operations_admin:'Marketplace operations',
  corporate_admin:'Corporate administrator',
  super_admin:'Super administrator',
 } as Record<PlatformRole,string>)[role];
}
