import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('desktop root and mobile app use separate compositions',()=>{
 const root=read('app/page.tsx');
 const routes=read('app/[...slug]/page.tsx');
 assert.match(root,/return <RegistryApp path="\/"\/>/);
 assert.doesNotMatch(root,/CustomerV5 path="\/mobile"/);
 assert.match(routes,/import CustomerNative from '\.\.\/customer-native'/);
 assert.match(routes,/import ProviderNative from '\.\.\/provider-native'/);
 assert.match(routes,/const providerNativePath=slug\[0\]==='mobile'&&slug\[1\]==='provider'/);
 assert.match(routes,/providerNativePath&&!hasWorkspaceContext\(snapshot,'provider'\)/);
 assert.match(routes,/const customerNativePath=slug\[0\]==='mobile'&&!providerNativePath/);
 assert.match(routes,/return <ProviderNative path=\{path\}\/>/);
 assert.match(routes,/return <CustomerNative path=\{path\}\/>/);
});

test('customer mobile keeps discovery booking sessions and notifications inside a persistent native navigation stack',()=>{
 const native=read('app/customer-native.tsx');
 const css=read('app/customer-native.css');
 assert.match(native,/data-sessions-surface="customer-native"/);
 assert.match(native,/href=\{'\/mobile\/studio\/'\+studio\.id\}/);
 assert.match(native,/href=\{'\/mobile\/studio\/'\+studio\.id\+'\/book'\}/);
 assert.match(native,/<BookingRequestV3 studio=\{studio\}/);
 assert.match(native,/href=\{'\/mobile\/session\/'\+item\.id\}/);
 assert.match(native,/path==='\/mobile\/notifications'/);
 assert.match(native,/href="\/mobile\/notifications"/);
 assert.doesNotMatch(native,/href="\/requests"/);
 assert.match(native,/<NativeTabBar path=\{path\}\/?>/);
 assert.doesNotMatch(native,/tabs\?\s*<NativeTabBar/);
 assert.match(native,/path\.startsWith\('\/mobile\/studio\/'\)\?'\/mobile\/search'/);
 assert.match(native,/path\.startsWith\('\/mobile\/session\/'\)\?'\/mobile\/sessions'/);
 assert.match(native,/path==='\/mobile\/notifications'\?'\/mobile\/profile'/);
 assert.match(native,/\['\/mobile','Home',Home\]/);
 assert.match(native,/\['\/mobile\/search','Search',Search\]/);
 assert.match(native,/\['\/mobile\/sessions','Sessions',CalendarDays\]/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/\.cn-tabbar\{[^}]*position:fixed[^}]*bottom:0/s);
 assert.match(css,/\.cn-sticky-cta\{[^}]*bottom:calc\(68px \+ env\(safe-area-inset-bottom\)\)/s);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/\.cn-book-screen \.r-panel\{border:0!important/);
});

test('native customer uses canonical identity workspaces media and booking state instead of parallel mobile truth',()=>{
 const native=read('app/customer-native.tsx');
 assert.match(native,/type:'bookingStatus',studioId:booking\.studioId,id:booking\.id,status:'cancelled'/);
 assert.match(native,/const items=\[\.\.\.\(data\.notifications\|\|\[\]\)\]/);
 assert.match(native,/studio\.rooms\.flatMap\(room=>room\.photos\|\|\[\]\)\.find\(Boolean\)/);
 assert.doesNotMatch(native,/\/images\/(?:hall|studio|intimate)\.webp/);
 assert.match(native,/sessionFetch\('\/api\/onboarding'/);
 assert.match(native,/YOUR SESSIONS IDENTITY/);
 assert.match(native,/One account, authorized contexts/);
 assert.match(native,/Same resources, different composition\./);
 assert.match(native,/src="\/favicon\.svg"/);
 assert.doesNotMatch(native,/aria-label="Save studio"/);
});

test('provider native is bounded daily operations over the same registry backend and uses the canonical brand mark',()=>{
 const native=read('app/provider-native.tsx');
 const css=read('app/provider-native.css');
 assert.match(native,/data-sessions-surface="provider-native"/);
 assert.match(native,/sessionFetch\('\/api\/registry'/);
 assert.match(native,/type:'bookingStatus'/);
 assert.match(native,/status\(booking,'confirmed'\)/);
 assert.match(native,/status\(booking,'declined'\)/);
 assert.match(native,/href=\{studio\?'\/manage\/'\+studio\.id:'\/manage'\}/);
 assert.match(native,/Full administration remains intentionally desktop\/PWA/);
 assert.match(css,/background:url\('\/favicon\.svg'\) center\/cover no-repeat/);
 assert.match(css,/\.pn-tabs\{[^}]*position:fixed[^}]*bottom:0/s);
});

test('private PWA manifest is requested with credentials without weakening protected app routes',()=>{
 const layout=read('app/layout.tsx');
 assert.doesNotMatch(layout,/manifest:'\/manifest\.webmanifest'/);
 assert.match(layout,/<link rel="manifest" href="\/manifest\.webmanifest" crossOrigin="use-credentials"\/>/);
});

test('mobile onboarding removes desktop framing without changing desktop rules',()=>{
 const css=read('app/surface-corrections.css');
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(css,/\.onb-shell:not\(\.onb-landing\) \.onb-story\{display:none\}/);
 assert.match(css,/\.onb-card\{border:0;border-radius:0;box-shadow:none/);
 assert.match(css,/\.prov-grid\{display:flex;flex-direction:column/);
});

test('Phase 5 release remains Phase 5 while visual revision records Version 18 UAT corrections',()=>{
 const release=read('lib/release-info.ts');
 assert.match(release,/id: 'unified-platform-v1-phase5'/);
 assert.match(release,/phase: 5/);
 assert.match(release,/visualRevision: 'phase1-5-native-desktop-v2'/);
});
