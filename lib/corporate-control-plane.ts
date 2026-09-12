import type {PlatformPermission} from './access-control';

export type CorporateModuleId='organization'|'access'|'bookings'|'customers'|'providers'|'memberships'|'incidents'|'finance'|'support'|'trust'|'growth'|'analytics'|'platform'|'audit'|'settings';
export type CorporateReadModule='bookings'|'customers'|'memberships'|'incidents'|'growth'|'analytics'|'platform'|'audit'|'settings';
export type CorporateModule={
 id:CorporateModuleId;
 title:string;
 shortTitle:string;
 description:string;
 href:string;
 requiredPermissions:readonly PlatformPermission[];
 kind:'directory'|'operations'|'governance'|'insight'|'configuration';
 ownerDepartment:string;
 supportingDepartments?:readonly string[];
 mobilePriority:number;
};

/**
 * One registry drives corporate navigation, route contracts and operating ownership.
 * It deliberately contains no authorization grants: permissions still come from access-control.
 * Department ownership answers who is accountable; it never answers who is authorized.
 */
export const corporateModules:readonly CorporateModule[]=[
 {id:'organization',title:'Organization & people',shortTitle:'Organization',description:'Departments, positions, reporting lines, leadership, deputies and acting responsibility.',href:'/corporate/organization',requiredPermissions:['organization:read'],kind:'directory',ownerDepartment:'Executive Office / Governance',supportingDepartments:['Product & Technology'],mobilePriority:1},
 {id:'access',title:'Access & security',shortTitle:'Security',description:'Access reviews, privileged-session posture and auditable authority governance.',href:'/corporate/access',requiredPermissions:['security:read'],kind:'governance',ownerDepartment:'Governance / Security',supportingDepartments:['Product & Technology'],mobilePriority:2},
 {id:'bookings',title:'Booking operations',shortTitle:'Bookings',description:'Marketplace-wide booking state projected from the canonical booking ledger.',href:'/corporate/bookings',requiredPermissions:['bookings:read'],kind:'operations',ownerDepartment:'Marketplace Operations',supportingDepartments:['Customer Support','Trust & Safety','Finance'],mobilePriority:3},
 {id:'customers',title:'Customers',shortTitle:'Customers',description:'Privacy-minimized customer activity and service context without exposing contact fields.',href:'/corporate/customers',requiredPermissions:['customers:read'],kind:'operations',ownerDepartment:'Customer Support',supportingDepartments:['Marketplace Operations'],mobilePriority:4},
 {id:'providers',title:'Provider operations',shortTitle:'Providers',description:'Provider onboarding, registrations and marketplace readiness.',href:'/corporate/providers',requiredPermissions:['providers:oversight'],kind:'operations',ownerDepartment:'Provider Operations',supportingDepartments:['Trust & Safety','Marketplace Operations'],mobilePriority:5},
 {id:'memberships',title:'Membership oversight',shortTitle:'Memberships',description:'Provider-owned membership activity, lifecycle and retention oversight.',href:'/corporate/memberships',requiredPermissions:['memberships:oversight'],kind:'operations',ownerDepartment:'Memberships & Retention',supportingDepartments:['Finance','Provider Operations'],mobilePriority:6},
 {id:'incidents',title:'Incidents & cases',shortTitle:'Incidents',description:'Current operational risk signals without pre-empting the canonical Phase 5 case workflow.',href:'/corporate/incidents',requiredPermissions:['incidents:read'],kind:'operations',ownerDepartment:'Marketplace Operations',supportingDepartments:['Trust & Safety','Customer Support','Finance'],mobilePriority:7},
 {id:'finance',title:'Finance',shortTitle:'Finance',description:'Settlement exceptions, invoices, fee governance and reconciliation.',href:'/corporate/finance',requiredPermissions:['settlements:review'],kind:'operations',ownerDepartment:'Finance',mobilePriority:8},
 {id:'support',title:'Customer support',shortTitle:'Support',description:'Customer-facing issues and service health without private message access.',href:'/corporate/support',requiredPermissions:['support:read'],kind:'operations',ownerDepartment:'Customer Support',supportingDepartments:['Marketplace Operations'],mobilePriority:9},
 {id:'trust',title:'Trust & safety',shortTitle:'Trust',description:'Ownership claims, provider verification and marketplace integrity.',href:'/corporate/trust',requiredPermissions:['claims:review','verification:review'],kind:'governance',ownerDepartment:'Trust & Safety',supportingDepartments:['Provider Operations'],mobilePriority:10},
 {id:'growth',title:'Marketing & growth',shortTitle:'Growth',description:'Governed marketplace growth snapshot and measurement readiness without fabricated attribution data.',href:'/corporate/growth',requiredPermissions:['growth:read'],kind:'insight',ownerDepartment:'Growth & Marketing',supportingDepartments:['Data & Analytics','Product & Technology'],mobilePriority:11},
 {id:'analytics',title:'Corporate analytics',shortTitle:'Analytics',description:'Operational aggregate snapshot from canonical marketplace data; no uncontrolled PII reporting.',href:'/corporate/analytics',requiredPermissions:['analytics:read'],kind:'insight',ownerDepartment:'Data & Analytics',supportingDepartments:['Product & Technology'],mobilePriority:12},
 {id:'platform',title:'Platform',shortTitle:'Platform',description:'Non-secret production capability and integration readiness for product and operations.',href:'/corporate/platform',requiredPermissions:['platform:read'],kind:'configuration',ownerDepartment:'Product & Technology',supportingDepartments:['Marketplace Operations','Governance / Security'],mobilePriority:13},
 {id:'audit',title:'Audit & governance',shortTitle:'Audit',description:'Authorized operational and organizational audit streams with source-specific redaction.',href:'/corporate/audit',requiredPermissions:['audit:read'],kind:'governance',ownerDepartment:'Governance / Compliance',supportingDepartments:['Product & Technology'],mobilePriority:14},
 {id:'settings',title:'Corporate settings',shortTitle:'Settings',description:'Non-secret organization-wide policy and runtime posture; sensitive changes remain separately authorized.',href:'/corporate/settings',requiredPermissions:['corporate_settings:read'],kind:'configuration',ownerDepartment:'Executive Office / Governance',supportingDepartments:['Product & Technology','Finance'],mobilePriority:15},
];

export const corporateReadModules:readonly CorporateReadModule[]=['bookings','customers','memberships','incidents','growth','analytics','platform','audit','settings'];
export function isCorporateReadModule(value:string):value is CorporateReadModule{return (corporateReadModules as readonly string[]).includes(value)}
export function moduleForId(id:string){return corporateModules.find(module=>module.id===id)||null}
export function canOpenCorporateModule(permissions:Iterable<string>,module:CorporateModule){const granted=new Set(permissions);return module.requiredPermissions.every(permission=>granted.has(permission))}
export function visibleCorporateModules(permissions:Iterable<string>){return corporateModules.filter(module=>canOpenCorporateModule(permissions,module)).sort((a,b)=>a.mobilePriority-b.mobilePriority)}
export function departmentContextsForModules(modules:readonly CorporateModule[]){
 const grouped=new Map<string,CorporateModule[]>();for(const module of modules){const current=grouped.get(module.ownerDepartment)||[];current.push(module);grouped.set(module.ownerDepartment,current)}
 return [...grouped.entries()].map(([department,ownedModules])=>({department,modules:ownedModules}));
}
