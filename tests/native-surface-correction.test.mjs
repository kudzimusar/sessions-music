import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('desktop PWA customer native and desktop account use separate intentional compositions',()=>{
 const root=read('app/page.tsx');
 const routes=read('app/[...slug]/page.tsx');
 assert.match(root,/return <RegistryApp path="\/"\/>/);
 assert.match(routes,/import CustomerNative from '\.\.\/customer-native'/);
 assert.match(routes,/import ProviderNative from '\.\.\/provider-native'/);
 assert.match(routes,/import AccountSurface from '\.\.\/account-surface'/);
 assert.doesNotMatch(routes,/CustomerV5/);
 assert.match(routes,/const providerNativePath=slug\[0\]==='mobile'&&slug\[1\]==='provider'/);
 assert.match(routes,/const customerNativePath=slug\[0\]==='mobile'&&!providerNativePath/);
 assert.match(routes,/if\(providerNativePath\)return <ProviderNative path=\{path\}\/>/);
 assert.match(routes,/if\(customerNativePath\)return <CustomerNative path=\{path\}\/>/);
 assert.match(routes,/if\(path==='\/account'\)return <AccountSurface\/>/);
 assert.match(routes,/if\(path==='\/profile'\)redirect\('\/mobile\/profile'\)/);
 assert.match(routes,/if\(path==='\/mobile\/saved'\)redirect\('\/mobile\/search'\)/);
});

test('customer native owns one four-tab navigation vocabulary and keeps nested work inside that shell',()=>{
 const native=read('app/customer-native.tsx');
 const css=read('app/customer-native.css');
 assert.match(native,/data-customer-shell="consolidated-v20"/);
 assert.match(native,/href=\{'\/mobile\/studio\/'\+studio\.id\}/);
 assert.match(native,/href=\{'\/mobile\/studio\/'\+studio\.id\+'\/book'\}/);
 assert.match(native,/<BookingRequestV3 studio=\{studio\}/);
 assert.match(native,/href=\{'\/mobile\/session\/'\+item\.id\}/);
 assert.match(native,/path==='\/mobile\/notifications'/);
 assert.match(native,/path==='\/mobile\/profile\/security'/);
 assert.match(native,/path==='\/mobile\/profile\/help'/);
 assert.doesNotMatch(native,/href="\/requests"/);
 assert.doesNotMatch(native,/href="\/account"/);
 assert.match(native,/\['\/mobile','Home',Home\]/);
 assert.match(native,/\['\/mobile\/search','Search',Search\]/);
 assert.match(native,/\['\/mobile\/sessions','Sessions',CalendarDays\]/);
 assert.match(native,/\['\/mobile\/profile','Profile',UserRound\]/);
 assert.doesNotMatch(native,/\['\/mobile\/saved'/);
 assert.match(css,/\.cn-tabbar\{[^}]*grid-template-columns:repeat\(4,1fr\)/s);
 assert.match(css,/\.cn-tabbar\{[^}]*position:fixed[^}]*bottom:0/s);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});

test('customer native uses real workspace mutation rather than a link pretending to switch context',()=>{
 const native=read('app/customer-native.tsx');
 assert.match(native,/action:'setLastContext',contextType:context\.type,contextId:context\.id/);
 assert.match(native,/window\.location\.assign\(contextTarget\(context\.type\)\)/);
 assert.match(native,/contexts\.length>1/);
 assert.doesNotMatch(native,/One account, authorized contexts/);
 assert.doesNotMatch(native,/Same resources, different composition/);
 assert.match(native,/Sign-in, MFA, devices and recovery/);
});

test('customer native restores visual storytelling without claiming editorial art is provider media',()=>{
 const native=read('app/customer-native.tsx');
 const css=read('app/customer-native.css');
 assert.match(native,/studio\.rooms\.flatMap\(room=>room\.photos\|\|\[\]\)\.find\(Boolean\)/);
 assert.match(native,/data-media-source="provider"/);
 assert.match(native,/data-media-source="editorial"/);
 assert.match(native,/SESSIONS GUIDE IMAGE/);
 assert.match(native,/\/images\/hall\.webp/);
 assert.match(native,/\/images\/intimate-card\.webp/);
 assert.match(native,/\/images\/studio-card\.webp/);
 assert.match(css,/\.cn-poster\{width:250px;flex:0 0 250px/);
 assert.match(css,/scroll-snap-align:center/);
 assert.match(css,/scroll-padding-inline:calc\(50% - 125px\)/);
 assert.match(css,/\.cn-media-label/);
});

test('customer and provider native use the Sessions audio mark rather than the favicon as a universal logo',()=>{
 const customer=read('app/customer-native.tsx');
 const provider=read('app/provider-native.tsx');
 const providerCss=read('app/provider-native.css');
 assert.match(customer,/AudioLines/);
 assert.match(customer,/cn-brand-symbol/);
 assert.doesNotMatch(customer,/src="\/favicon\.svg"/);
 assert.match(provider,/AudioLines/);
 assert.match(provider,/pn-provider-mark/);
 assert.doesNotMatch(providerCss,/background:url\('\/favicon\.svg'/);
});

test('native history controls expose back and forward while preserving a deep-link fallback',()=>{
 const native=read('app/customer-native.tsx');
 assert.match(native,/window\.history\.back\(\)/);
 assert.match(native,/window\.history\.forward\(\)/);
 assert.match(native,/window\.location\.assign\(href\)/);
 assert.match(native,/aria-label="Go back"/);
 assert.match(native,/aria-label="Go forward"/);
});

test('provider native remains bounded daily operations and returns account security to native profile',()=>{
 const native=read('app/provider-native.tsx');
 const css=read('app/provider-native.css');
 assert.match(native,/data-sessions-surface="provider-native"/);
 assert.match(native,/sessionFetch\('\/api\/registry'/);
 assert.match(native,/type:'bookingStatus'/);
 assert.match(native,/status\(booking,'confirmed'\)/);
 assert.match(native,/status\(booking,'declined'\)/);
 assert.match(native,/href="\/mobile\/profile\/security"/);
 assert.match(native,/Full administration remains intentionally desktop\/PWA/);
 assert.match(css,/\.pn-tabs\{[^}]*position:fixed[^}]*bottom:0/s);
});

test('legacy Registry phone navigation is disabled by the explicit surface boundary',()=>{
 const boundary=read('app/surface-boundaries.css');
 const guard=read('app/production-route-guard.tsx');
 assert.match(boundary,/\.registry-app \.r-bottom-nav\{display:none!important\}/);
 assert.match(boundary,/\.registry-app\.phone-mode\{max-width:none!important/);
 assert.match(guard,/sessionStorage\.removeItem\('sessions-phone-view'\)/);
 assert.match(guard,/'\/profile':'\/mobile\/profile'/);
});

test('private PWA manifest is credentialed without weakening protected application routes',()=>{
 const layout=read('app/layout.tsx');
 assert.match(layout,/<link rel="manifest" href="\/manifest\.webmanifest" crossOrigin="use-credentials"\/>/);
});

test('mobile onboarding removes desktop framing without changing desktop rules',()=>{
 const css=read('app/surface-corrections.css');
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(css,/\.onb-shell:not\(\.onb-landing\) \.onb-story\{display:none\}/);
 assert.match(css,/\.onb-card\{border:0;border-radius:0;box-shadow:none/);
 assert.match(css,/\.prov-grid\{display:flex;flex-direction:column/);
});

test('Phase 5 stays Phase 5 while release provenance records the Version 20 consolidation',()=>{
 const release=read('lib/release-info.ts');
 assert.match(release,/id: 'unified-platform-v1-phase5'/);
 assert.match(release,/phase: 5/);
 assert.match(release,/visualRevision: 'phase1-5-surface-consolidated-v20'/);
});
