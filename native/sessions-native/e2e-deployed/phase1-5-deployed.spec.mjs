import {expect,test} from '@playwright/test';

const RELEASE={id:'unified-platform-v1-phase5',phase:5,visualRevision:'phase1-5-native-desktop-v2'};
const PROJECT_REF='ennfiyxlkvlmtkmibltz';

function captureRuntimeFailures(page){
  const failures=[];
  page.on('pageerror',error=>failures.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')failures.push(`console.error: ${message.text()}`)});
  return failures;
}

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(overflow.scrollWidth,`horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.width+2);
}

test('deployed release, identity authority and protected endpoint are Phase 1–5 safe',async({request})=>{
  const release=await request.get('/api/release');
  expect(release.status()).toBe(200);
  const releaseBody=await release.json();
  expect(releaseBody.id).toBe(RELEASE.id);
  expect(releaseBody.phase).toBe(RELEASE.phase);
  expect(releaseBody.visualRevision).toBe(RELEASE.visualRevision);

  const auth=await request.get('/api/auth/config');
  expect(auth.status()).toBe(200);
  const authBody=await auth.json();
  expect(authBody.mode).toBe('supabase');
  expect(authBody.enabled).toBe(true);
  expect(authBody.projectRef).toBe(PROJECT_REF);
  expect(authBody.url).toBe(`https://${PROJECT_REF}.supabase.co`);
  expect(String(authBody.url)).not.toContain('svhxjfearcuqxikzvlyb');

  const corporate=await request.get('/api/corporate/overview');
  expect([401,403]).toContain(corporate.status());
});

test('deployed PWA assets expose a real installable browser client',async({request})=>{
  const manifest=await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  const manifestBody=await manifest.json();
  expect(manifestBody.name).toBe('Sessions');
  expect(manifestBody.start_url).toBe('/mobile');
  expect(manifestBody.scope).toBe('/');
  expect(['standalone','minimal-ui']).toContain(manifestBody.display);
  expect(Array.isArray(manifestBody.icons)&&manifestBody.icons.length>0).toBeTruthy();

  const worker=await request.get('/sw.js');
  expect(worker.status()).toBe(200);
  expect(await worker.text()).toContain('self.addEventListener');
});

test('public welcome is responsive and keeps corporate access out of public onboarding',async({page},testInfo)=>{
  const failures=captureRuntimeFailures(page);
  await page.goto('/welcome',{waitUntil:'networkidle'});
  await expect(page.getByText('Your music needs a place.',{exact:true})).toBeVisible();
  await expect(page.getByText('Find & book a studio',{exact:true})).toBeVisible();
  await expect(page.getByText('Manage a studio',{exact:true})).toBeVisible();
  await expect(page.getByText(/Internal Sessions company access is invitation-only/i)).toBeVisible();
  await expect(page.getByText(/Corporate|Sessions team member/i)).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  if(testInfo.project.name.startsWith('desktop')){
    await page.keyboard.press('Tab');
    const interactive=await page.evaluate(()=>{
      const el=document.activeElement;
      return Boolean(el&&['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName));
    });
    expect(interactive).toBe(true);
  }
  expect(failures,failures.join('\n')).toEqual([]);
});

test('unauthenticated protected customer route returns to the production welcome boundary',async({page})=>{
  await page.goto('/mobile',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
  await expect(page.getByText('Your music needs a place.',{exact:true})).toBeVisible();
});
