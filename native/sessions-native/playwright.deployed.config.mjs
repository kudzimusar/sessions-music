import {defineConfig} from '@playwright/test';

const baseURL=process.env.SESSIONS_DEPLOYED_ORIGIN||'https://sessions-music.kudzimusar.chatgpt.site';

export default defineConfig({
  testDir:'./e2e-deployed',
  timeout:45_000,
  expect:{timeout:10_000},
  fullyParallel:false,
  retries:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report-deployed',open:'never'}]],
  use:{
    baseURL,
    browserName:'chromium',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure',
  },
  projects:[
    {name:'pwa-mobile-390',use:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}},
    {name:'desktop-1440',use:{viewport:{width:1440,height:1000},deviceScaleFactor:1,isMobile:false,hasTouch:false}},
  ],
});
