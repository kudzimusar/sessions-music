# Sessions Phase 1–5 Surface Separation Amendment

Status: BINDING IMPLEMENTATION AMENDMENT
Date: 13 September 2026
Applies to: all Phase 1–5 code, documentation, UAT and future phases built on this baseline.

## Purpose

Version 17 confirmed that the Phase 1–5 architecture and security model are strong, but it also exposed a product-surface ambiguity: responsive/PWA composition had begun to stand in for a native customer/provider mobile product, and Corporate onboarding appeared too close to public customer/provider onboarding.

This amendment corrects that ambiguity without changing the canonical backend, identity authority, booking truth, D1/R2 boundaries or corporate authorization model.

The principle is simple:

> Sessions is one backend platform with multiple deliberately different product surfaces. Shared data and shared APIs do not require shared page composition.

Where this amendment conflicts with older wording such as "PWA/mobile-first", generic "responsive" requirements, or public "Sessions team member" entry, this amendment supersedes that wording.

## Surface taxonomy

Every implementation task must declare one or more of these surfaces before code is changed:

1. `customer-native` — customer iOS/Android interaction model and its web-based prototype equivalent.
2. `provider-native` — provider daily-operations mobile interaction model and its web-based prototype equivalent.
3. `provider-web` — provider desktop/web management portal.
4. `corporate-desktop` — internal Sessions corporate desktop/tablet operating console.
5. `corporate-critical-mobile` — deliberately bounded internal mobile actions only.
6. `shared-backend` — APIs, database, auth, domain logic, events, migrations and policy shared by surfaces.

A pull request that changes UI without identifying its surface is incomplete.

## Native-mobile implementation rule

For `customer-native` and `provider-native`, "responsive" is not an acceptance criterion. The product must be designed from a phone application interaction model first.

Required characteristics include:

- edge-to-edge app screens;
- native-style navigation stacks;
- bottom-tab navigation where appropriate;
- full-screen search/discovery/detail/checkout/account workflows;
- single-purpose screens rather than desktop multi-panel layouts;
- native list/row patterns and strong media hierarchy;
- bottom sheets/drawers for filters and contextual actions where appropriate;
- one dominant primary action per screen;
- safe-area-aware bottom/top chrome;
- 44px minimum touch targets, 48px preferred for primary actions;
- no hover-only interactions;
- no desktop sidebar as the main mobile navigation;
- no mechanically collapsed desktop tables;
- no default card-inside-card dashboard stacking;
- no assumption that the mobile product is complete because the desktop page fits at a narrow breakpoint;
- loading, empty, error and offline states that feel like an app rather than a document page.

The existing PWA/web runtime may be used to prototype these screens before native runtime migration, but the prototype must model the intended native architecture rather than a responsive website.

## Desktop/PWA implementation rule

The web/PWA surface remains valid and important. It is the natural product surface for:

- Corporate operations;
- provider desktop management;
- account/security management where appropriate;
- internal/admin UAT;
- browser continuity and fallback workflows.

Desktop may use tables, dense filters, multi-column layouts, master-detail views, keyboard workflows and information-dense dashboards where those patterns serve the task.

Do not force native mobile composition onto desktop merely for visual consistency. Shared brand tokens and domain semantics are sufficient; composition can differ.

## Corporate entry rule

Corporate is internal business infrastructure, not a public marketplace persona.

Public/customer onboarding may show:

- customer/personal onboarding;
- provider intent such as "Manage a studio".

Public/customer onboarding must not show:

- Corporate;
- Admin;
- Sessions team member;
- internal staff registration;
- any choice that suggests a normal user can self-select company authority.

Corporate entry is allowed only when the server has trusted proof of an identity-bound invitation, staff assignment, accepted corporate journey or active corporate context.

Appropriate entry paths include:

- a trusted corporate invitation/deep link;
- `/corporate/access` or equivalent internal entry route that still requires staff proof;
- direct `/corporate` for an already-authorized staff context;
- a server-derived workspace switcher after authorization exists.

The customer/provider product should not advertise these internal routes.

## Corporate UAT/reviewer access rule

The private product owner and designated UAT reviewers must be able to inspect Corporate without weakening the invitation model.

Preferred method:

1. create/seed a legitimate corporate staff record for the review identity;
2. assign bounded review/admin permissions explicitly;
3. complete the same invitation/policy/device/security journey expected of staff;
4. record the access in the audit model;
5. revoke or adjust the review assignment when no longer required.

A hard-coded bypass, shared admin account or "if owner then allow everything" rule is forbidden.

An isolated `/demo/corporate` surface may be maintained for visual review and screenshots if it:

- uses fixture/demo data only;
- is visibly marked as demo;
- cannot write production state;
- cannot grant authority;
- cannot be mistaken for production authorization testing.

## Phase corrections

### Phase 1 — Design system and navigation

Correction:

- Brand tokens remain shared across surfaces.
- Composition is surface-specific from this phase onward.
- Customer/provider mobile navigation is defined as native app navigation, not desktop navigation with responsive CSS.
- Corporate/web navigation may remain desktop/PWA oriented.
- Mobile preview acceptance must include native-feeling screen hierarchy, touch targets, safe areas and app chrome.

Phase 1 completion is not satisfied by a narrow desktop viewport alone.

### Phase 2 — Corporate organization/workforce

Correction:

- Departments, positions, reporting lines, workforce records and internal organization language belong to Corporate.
- These concepts must not leak into customer/provider onboarding.
- Workforce records may create an invitation journey but may not create public discoverability of Corporate.

### Phase 3 — IAM/RBAC/privileged access

Correction:

- Corporate access remains deny-by-default and staff-bound.
- Owner/private-UAT access must use a real attributable staff/reviewer identity or isolated demo surface.
- Review convenience must never become a production authorization bypass.
- Public role selection never maps to corporate roles or scoped roles.

### Phase 4 — Corporate control plane

Correction:

- Corporate is `corporate-desktop` first.
- Tables, queues, master-detail, advanced filters, audit panels and dense operational controls are expected on desktop/tablet.
- Corporate mobile is not full feature parity. Only explicitly chosen critical workflows should be built for `corporate-critical-mobile`.
- Responsive collapse of every Corporate module into stacked blocks is prohibited as a default strategy.

### Phase 4.5 — Identity, onboarding and workspace gateway

Correction:

Public onboarding:

`Identity -> customer profile/consent -> personal workspace`

Optional provider path:

`Identity -> provider intention -> claim/register -> verification -> provider membership`

Corporate path:

`trusted invitation/staff relationship -> identity match -> policy acceptance -> device/security setup -> active corporate context`

The public "Sessions team member" choice is removed. An already-authorized multi-context user may still see Corporate in the workspace switcher because authority already exists.

The mobile onboarding preview must follow native screen patterns. Desktop onboarding may use a wider web presentation over the same state machine.

### Phase 5 — Booking Operations and Cases

Correction:

`corporate-desktop` remains the primary product for Booking Operations and Cases:

- dense queue/table;
- filters/search;
- master-detail;
- timeline;
- assignment;
- SLA;
- linked records;
- restricted evidence;
- permission-gated commands.

`corporate-critical-mobile` is a separately designed subset, for example:

- urgent queue;
- case/booking summary;
- acknowledgement;
- assignment;
- status/next-action update;
- escalation;
- concise case note;
- permitted communication handoff.

It must not be implemented by simply stacking every desktop section into a long mobile page.

## Phase 6+ rule

No future phase may reintroduce the old ambiguity.

When adding a feature, agents/admins must decide:

- which surface owns the workflow;
- whether another surface needs the same capability or only a subset;
- which APIs/domain objects are shared;
- whether UI composition must differ by surface.

Phase 10 remains the production native-runtime/iOS/Android architecture and migration milestone, but it consumes a native interaction model that is already established. It must not trigger a second redesign because Phases 1–9 were built as a PWA.

## Review rejection criteria

Reviewers must reject or request redesign when any of these are true:

- customer/provider mobile is described only as "responsive";
- desktop cards/tables are merely stacked into a phone layout;
- public onboarding exposes Corporate/Admin/Team-member self-selection;
- Corporate review access is implemented with a global bypass or shared admin identity;
- a single component/page architecture is forced across desktop and native mobile despite incompatible interaction needs;
- a mobile flow depends on hover, tiny controls or desktop sidebars;
- Phase 10 is used as justification to postpone native-mobile interaction architecture.

## UAT acceptance

Private UAT must review surfaces separately:

### Customer/provider mobile UAT

- native-feeling navigation and screen hierarchy;
- touch ergonomics;
- app chrome and safe areas;
- booking/provider task completion without desktop artifacts;
- no card-stack/PWA feel dominating the interface.

### Corporate desktop UAT

- information density;
- keyboard/mouse usability;
- filters/tables/master-detail behavior;
- correct permission visibility;
- review access through real corporate authority.

### Corporate mobile UAT

- only the explicitly approved critical subset;
- no expectation of full desktop parity.

A green build does not certify these product qualities; visual/interaction UAT remains required.
