import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const nativeSource=()=>[
 read('native/sessions-native/App.js'),
 read('native/sessions-native/src/api.js'),
 read('native/sessions-native/src/styles.js'),
 read('native/sessions-native/src/uat-data.js'),
].join('\n');

test('native Phase 1-5 JavaScript and JSX sources are syntactically valid before simulator handoff',()=>{
  for(const path of ['native/sessions-native/App.js','native/sessions-native/src/api.js','native/sessions-native/src/styles.js','native/sessions-native/src/uat-data.js']){
    const result=ts.transpileModule(read(path),{
      fileName:path.endsWith('App.js')?'App.jsx':path,
      reportDiagnostics:true,
      compilerOptions:{allowJs:true,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
    });
    const errors=(result.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(item=>ts.flattenDiagnosticMessageText(item.messageText,'\n')),[],`${path} must parse before Work/Desktop native execution`);
  }
});

test('native Phase 1-5 client is an actual React Native runtime, not a WebView/PWA wrapper',()=>{
  const pkg=JSON.parse(read('native/sessions-native/package.json'));
  const app=read('native/sessions-native/App.js');
  const source=nativeSource();
  assert.match(pkg.dependencies.expo,/^~57\./);
  assert.match(pkg.dependencies['react-native'],/^0\.86\./);
  assert.equal(pkg.dependencies['react-native-webview'],undefined);
  assert.doesNotMatch(source,/from\s+['"]react-native-webview['"]|require\(['"]react-native-webview['"]\)|<WebView\b|<iframe\b/i);
  assert.match(app,/Platform\.OS/);
  assert.match(source,/\/api\/release/);
  assert.match(app,/BackHandler/);
  assert.match(app,/KeyboardAvoidingView/);
  assert.match(app,/RefreshControl/);
  assert.match(app,/Modal/);
  assert.match(app,/TextInput/);
});

test('native safe areas use the Expo SDK 57 supported context instead of deprecated core SafeAreaView or hard-coded Android inset',()=>{
  const pkg=JSON.parse(read('native/sessions-native/package.json'));
  const app=read('native/sessions-native/App.js');
  const styles=read('native/sessions-native/src/styles.js');
  assert.equal(pkg.dependencies['react-native-safe-area-context'],'~5.7.0');
  assert.match(app,/from 'react-native-safe-area-context'/);
  assert.match(app,/SafeAreaProvider/);
  assert.match(app,/initialWindowMetrics/);
  assert.match(app,/edges=\{\['top','right','bottom','left'\]\}/);
  const reactNativeImports=app.match(/import \{[\s\S]*?\} from 'react-native';/)?.[0]||'';
  assert.doesNotMatch(reactNativeImports,/\bSafeAreaView\b/);
  assert.doesNotMatch(styles,/paddingTop:Platform\.OS==='android'\?24:0/);
});

test('native client consumes the shared Sessions product core and mobile interaction contracts',()=>{
  const pkg=JSON.parse(read('native/sessions-native/package.json'));
  const app=read('native/sessions-native/App.js');
  const styles=read('native/sessions-native/src/styles.js');
  assert.equal(pkg.dependencies['@sessions/product-core'],'file:../../packages/product-core');
  assert.match(app,/from '@sessions\/product-core'/);
  assert.match(app,/CUSTOMER_TABS/);
  assert.match(app,/PROVIDER_TABS/);
  assert.match(styles,/touchTarget\.ios/);
  assert.match(styles,/touchTarget\.android/);
  assert.match(app,/Corporate is never public self-selection/);
  assert.match(app,/will not send a privileged mutation without Sessions native authentication/);
});

test('native UAT identifiers and Phase 5 provenance are explicit',()=>{
  const config=JSON.parse(read('native/sessions-native/app.json')).expo;
  assert.equal(config.ios.bundleIdentifier,'com.sessionstech.sessions.uat');
  assert.equal(config.android.package,'com.sessionstech.sessions.uat');
  assert.equal(config.extra.sessionsPhase,5);
  assert.equal(config.extra.sessionsReleaseId,'unified-platform-v1-phase5');
  assert.equal(config.extra.sessionsVisualRevision,'phase1-5-native-desktop-v2');
});

test('native diagnostics verify release provenance and protected endpoint without auth bypass',()=>{
  const api=read('native/sessions-native/src/api.js');
  const app=read('native/sessions-native/App.js');
  assert.match(api,/\/api\/corporate\/overview/);
  assert.match(api,/response\.status===401\|\|response\.status===403/);
  assert.match(api,/Never attach browser audience cookies or synthetic credentials/);
  assert.doesNotMatch(api,/Cookie|Authorization/);
  assert.match(app,/probeProtectedEndpoint/);
  assert.match(app,/ChatGPT Sites audience cookies are not native authentication/);
});

test('native harness documentation preserves the authentication boundary',()=>{
  const doc=read('docs/NATIVE-PHASE1-5-SIMULATOR-HARNESS.md');
  const cross=read('docs/PHASE-1-5-CROSS-PLATFORM-EXECUTION.md');
  const nativeReadme=read('native/sessions-native/README.md');
  assert.match(doc,/ChatGPT Sites `\/welcome` audience session is not a native authentication API/);
  assert.match(doc,/Supabase Auth/);
  assert.match(doc,/must never be used for Sessions testing/);
  assert.match(doc,/no WebView/i);
  assert.match(doc,/Stage N0/);
  assert.match(doc,/Stage N5/);
  assert.match(cross,/Work\/Desktop is the execution boundary/);
  assert.match(nativeReadme,/Never use or modify `church-os-dev` \/ `svhxjfearcuqxikzvlyb`/);
});
