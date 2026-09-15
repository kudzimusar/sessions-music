import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('Expo prebuild adopts the iOS 27 UIScene lifecycle before installed UAT',async()=>{
  const config=JSON.parse(await read('native/sessions-native/app.json')).expo;
  const plugin=await read('native/sessions-native/plugins/with-ios-scene-lifecycle.js');
  assert.ok(config.plugins.includes('./plugins/with-ios-scene-lifecycle'));
  assert.match(plugin,/UIApplicationSceneManifest/);
  assert.match(plugin,/configurationForConnecting connectingSceneSession/);
  assert.match(plugin,/class SceneDelegate: UIResponder, UIWindowSceneDelegate/);
  assert.match(plugin,/factory\.startReactNative\(withModuleName: "main", in: sceneWindow/);
  assert.match(plugin,/appDelegate\.application\(UIApplication\.shared, open: context\.url/);
  assert.match(plugin,/could not find the Expo React Native startup block/,'template drift must fail prebuild rather than silently shipping an unmigrated binary');
});

test('installed smoke UAT may recover from Android Quickstep crash UI without weakening product assertions',async()=>{
  const flow=await read('native/sessions-native/.maestro/phase1-5-smoke.yml');
  assert.match(flow,/text: "Wait"\n\s+optional: true/);
  for(const assertion of [
    'One identity. Your music spaces.',
    'Continue with phone or email',
    'ennfiyxlkvlmtkmibltz',
    'Find your next rehearsal room.',
    'AI is an intent interpreter'
  ])assert.match(flow,new RegExp(assertion.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
