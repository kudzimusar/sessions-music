import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const planner=fs.readFileSync(new URL('../native/sessions-native/app/planner.js',import.meta.url),'utf8');

test('native planner exposes checked state to both native accessibility and web projection',()=>{
  assert.match(planner,/accessibilityRole="checkbox"\s+accessibilityState=\{\{checked:consent\}\}\s+aria-checked=\{consent\}/);
  assert.match(planner,/accessibilityRole="checkbox"\s+accessibilityState=\{\{checked:selected\}\}\s+aria-checked=\{selected\}/);
  assert.equal((planner.match(/aria-checked=/g)||[]).length,2,'consent and equipment controls must both expose semantic checked state');
});
