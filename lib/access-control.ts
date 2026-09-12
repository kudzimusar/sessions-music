import type {OrganizationMembership,PlatformRole,ScopedPlatformRole,PlatformScopeType} from './identity-core';

export const platformPermissions=[
 'platform:overview',
 'platform:roles.manage',
 'platform:read',
 'platform:integrations.manage',
 'security:read',
 'organization:read',
 'organization:manage',
 'bookings:read',
 'customers:read',
 'memberships:oversight',
 'incidents:read',
 'analytics:read',
 'analytics:executive.read',
 'analytics:finance.read',
 'analytics:growth.read',
 'analytics:product.read',
 'growth:read',
 'corporate_settings:read',
 'corporate_settings:manage',
 'audit:read',
 'audit:export',
 'registry:read',
 'registry:write',
 'claims:review',
 'verification:review',
 'providers:oversight',
 'settlements:review',
 'fees:manage',
 'loyalty:manage',
 'support:read',
 'support:manage',
] as const;
export type PlatformPermission=(typeof platformPermissions)[number];
export type AccessSurface='customer'|'provider'|'corporate';

type PrincipalLike={roles:readonly PlatformRole[];scopedRoles?:readonly ScopedPlatformRole[];memberships?:readonly OrganizationMembership[]}|null|undefined;

const supportBase:readonly PlatformPermission[]=['platform:overview','organization:read','bookings:read','customers:read','incidents:read','registry:read','support:read','support:manage'];
const trustBase:readonly PlatformPermission[]=['platform:overview','organization:read','bookings:read','incidents:read','registry:read','registry:write','claims:review','verification:review','providers:oversight'];
const financeBase:readonly PlatformPermission[]=['platform:overview','organization:read','bookings:read','memberships:oversight','analytics:read','analytics:finance.read','registry:read','settlements:review','fees:manage','loyalty:manage'];
const providerOpsBase:readonly PlatformPermission[]=['platform:overview','organization:read','bookings:read','incidents:read','registry:read','providers:oversight'];
const rolePermissions:Record<PlatformRole,readonly PlatformPermission[]>={
 musician:[],
 provider_owner:[],
 provider_manager:[],
 provider_staff:[],
 support_agent:supportBase,
 support_manager:[...supportBase,'audit:read'],
 trust_safety:trustBase,
 trust_safety_manager:[...trustBase,'audit:read'],
 finance_admin:financeBase,
 finance_manager:[...financeBase,'audit:read','audit:export'],
 provider_operations:providerOpsBase,
 provider_operations_manager:[...providerOpsBase,'registry:write','claims:review','verification:review','audit:read'],
 growth_analyst:['platform:overview','organization:read','analytics:read','analytics:growth.read','growth:read'],
 growth_manager:['platform:overview','organization:read','analytics:read','analytics:growth.read','growth:read','audit:read'],
 data_analyst:['platform:overview','organization:read','analytics:read','analytics:growth.read','analytics:product.read'],
 data_admin:['platform:overview','organization:read','analytics:read','analytics:executive.read','analytics:finance.read','analytics:growth.read','analytics:product.read','audit:read'],
 product_operations:['platform:overview','organization:read','platform:read','analytics:read','analytics:product.read'],
 governance_reviewer:['platform:overview','organization:read','security:read','incidents:read','audit:read'],
 operations_admin:['platform:overview','organization:read','bookings:read','customers:read','memberships:oversight','incidents:read','analytics:read','analytics:executive.read','analytics:finance.read','registry:read','registry:write','claims:review','verification:review','providers:oversight','settlements:review','support:read','support:manage','audit:read'],
 corporate_admin:['platform:overview','platform:read','security:read','organization:read','organization:manage','bookings:read','customers:read','memberships:oversight','incidents:read','analytics:read','analytics:executive.read','analytics:finance.read','analytics:growth.read','analytics:product.read','growth:read','corporate_settings:read','corporate_settings:manage','audit:read','registry:read','registry:write','claims:review','verification:review','providers:oversight','settlements:review','fees:manage','loyalty:manage','support:read','support:manage'],
 super_admin_eligible:['platform:overview','security:read','organization:read'],
 super_admin:platformPermissions,
};

export const corporateRoles:readonly PlatformRole[]=['support_agent','support_manager','trust_safety','trust_safety_manager','finance_admin','finance_manager','provider_operations','provider_operations_manager','growth_analyst','growth_manager','data_analyst','data_admin','product_operations','governance_reviewer','operations_admin','corporate_admin','super_admin_eligible','super_admin'];
export const providerRoles:readonly PlatformRole[]=['provider_owner','provider_manager','provider_staff'];

export function permissionsForRoles(roles:readonly PlatformRole[]){
 return [...new Set(roles.flatMap(role=>rolePermissions[role]||[]))] as PlatformPermission[];
}

export function hasPermission(actor:PrincipalLike,permission:PlatformPermission){
 return !!actor&&permissionsForRoles(actor.roles).includes(permission);
}

/** Scoped assignments never become global permission grants. */
export function hasScopedPlatformRole(actor:PrincipalLike,role:PlatformRole,scopeType:PlatformScopeType,scopeId:string){
 return !!actor?.scopedRoles?.some(value=>value.role===role&&value.scopeType===scopeType&&value.scopeId===scopeId);
}

export function scopedRolesFor(actor:PrincipalLike,scopeType:PlatformScopeType,scopeId:string){
 return actor?.scopedRoles?.filter(value=>value.scopeType===scopeType&&value.scopeId===scopeId)||[];
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
export function canActivatePrivilegedAdmin(actor:PrincipalLike){return !!actor&&actor.roles.some(role=>role==='super_admin'||role==='super_admin_eligible')}

export function roleLabel(role:PlatformRole){
 return ({
  musician:'Customer / musician',
  provider_owner:'Provider owner',
  provider_manager:'Provider manager',
  provider_staff:'Provider staff',
  support_agent:'Customer support agent',
  support_manager:'Customer support manager',
  trust_safety:'Trust & safety',
  trust_safety_manager:'Trust & safety manager',
  finance_admin:'Finance administrator',
  finance_manager:'Finance manager',
  provider_operations:'Provider operations',
  provider_operations_manager:'Provider operations manager',
  growth_analyst:'Growth analyst',
  growth_manager:'Growth manager',
  data_analyst:'Data analyst',
  data_admin:'Data administrator',
  product_operations:'Product operations',
  governance_reviewer:'Governance reviewer',
  operations_admin:'Marketplace operations',
  corporate_admin:'Corporate administrator',
  super_admin_eligible:'Super administrator eligible',
  super_admin:'Legacy super administrator',
 } as Record<PlatformRole,string>)[role];
}
