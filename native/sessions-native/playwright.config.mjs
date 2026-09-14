import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  timeout:45_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  retries:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:8081',
    browserName:'chromium',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  projects:[
    {name:'chromium-ios-390',use:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}},
    {name:'chromium-android-412',use:{viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true}},
    {name:'chromium-small-320',use:{viewport:{width:320,height:568},deviceScaleFactor:2,isMobile:true,hasTouch:true}},
  ],
  webServer:{
    command:'CI=1 npx expo start --web --port 8081',
    url:'http://127.0.0.1:8081',
    reuseExistingServer:false,
    timeout:120_000,
    stdout:'pipe',
    stderr:'pipe',
  },
});
