import {expect,test} from '@playwright/test';

const routes=[
  ['/home','Find your next rehearsal room.'],
  ['/search','Search music spaces'],
  ['/planner','Say what the band needs.'],
  ['/onboarding','What are you here to do?'],
  ['/provider','Today at OneVibe Studiox'],
  ['/studio/onevibe-studiox','OneVibe Studiox'],
  ['/booking/onevibe-studiox','Choose a session.'],
  ['/session/uat-session-1','OneVibe Studiox'],
  ['/corporate-critical','Urgent actions, not the desktop control plane.'],
];

function captureRuntimeFailures(page){
  const failures=[];
  page.on('pageerror',error=>failures.push(`pageerror: ${error.message}`));
  page.on('console',message=>{
    if(message.type()==='error')failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(overflow.scrollWidth,`horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.width+2);
}

for(const [route,heading] of routes){
  test(`${route} renders without browser/runtime regressions`,async({page})=>{
    const failures=captureRuntimeFailures(page);
    await page.goto(route,{waitUntil:'networkidle'});
    await expect(page.getByText(heading,{exact:false}).first()).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(failures,failures.join('\n')).toEqual([]);
  });
}

test('customer home exposes native-first discovery and AI without desktop navigation artifacts',async({page})=>{
  const failures=captureRuntimeFailures(page);
  await page.goto('/home');
  await expect(page.getByText('SESSIONS.',{exact:true})).toBeVisible();
  await expect(page.getByText('AI · INTENT, NOT INVENTION',{exact:false})).toBeVisible();
  await expect(page.getByText('Plan with AI or guided filters',{exact:true})).toBeVisible();
  await expect(page.getByText('Home',{exact:true})).toBeVisible();
  await expect(page.getByText('Search',{exact:true})).toBeVisible();
  await expect(page.getByText('Sessions',{exact:true})).toBeVisible();
  await expect(page.getByText('Profile',{exact:true})).toBeVisible();
  await expect(page.getByText(/sidebar/i)).toHaveCount(0);
  await page.getByText('Plan with AI or guided filters',{exact:true}).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByText('AI is an intent interpreter, not a booking agent.',{exact:false})).toBeVisible();
  expect(failures,failures.join('\n')).toEqual([]);
});

test('AI planner is consented, editable and never presented as booking authority',async({page})=>{
  await page.goto('/planner');
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.getByText('AI never submits a booking.',{exact:false})).toBeVisible();
  await expect(page.getByText(/AI cannot invent .*price.*availability.*verification.*equipment/i)).toBeVisible();
  await expect(page.getByLabel('Date · YYYY-MM-DD')).toBeVisible();
  await expect(page.getByLabel('People')).toBeVisible();
  await expect(page.getByLabel('Minutes')).toBeVisible();
  await expect(page.getByLabel('Neighbourhood')).toBeVisible();
  await expect(page.getByLabel('Total budget · USD')).toBeVisible();
});

test('public onboarding has only customer and provider intent, never corporate self-selection',async({page})=>{
  await page.goto('/onboarding');
  const radios=page.getByRole('radio');
  await expect(radios).toHaveCount(2);
  await expect(page.getByText('Find a rehearsal space',{exact:true})).toBeVisible();
  await expect(page.getByText('Manage a rehearsal space',{exact:true})).toBeVisible();
  await expect(page.getByText('Corporate/Sessions-team is intentionally absent.',{exact:false})).toBeVisible();
  await expect(page.getByText('Sessions team member?',{exact:true})).toHaveCount(0);
});

test('booking screen communicates real inventory state instead of generic appointment buttons',async({page})=>{
  await page.goto('/booking/onevibe-studiox');
  await expect(page.getByText('Available',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Unavailable',{exact:true}).first()).toBeVisible();
  const disabled=page.getByRole('radio',{disabled:true});
  await expect(disabled).toHaveCount(2);
  await expect(page.getByText('Server quote remains authoritative.',{exact:false})).toBeVisible();
  const review=page.getByRole('button',{name:/Review request/i});
  const box=await review.boundingBox();
  expect(box?.height||0).toBeGreaterThanOrEqual(44);
});

test('provider phone surface stays bounded to daily actions',async({page})=>{
  await page.goto('/provider');
  await expect(page.getByText('Fast actions on mobile. Dense setup stays on desktop/PWA.',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:/Requests/i}).click();
  await expect(page.getByText(/booking requests/i)).toBeVisible();
  await page.getByRole('tab',{name:'Rooms'}).click();
  await expect(page.getByText('What is running',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'More'}).click();
  await expect(page.getByText('Today’s tools, not a desktop clone.',{exact:true})).toBeVisible();
});

test('corporate critical mobile is visibly isolated and cannot masquerade as full corporate',async({page})=>{
  await page.goto('/corporate-critical');
  await expect(page.getByText(/DEMO ONLY/).first()).toBeVisible();
  await expect(page.getByText(/no production Corporate authority/i).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Acknowledge'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Assign'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Add authorized note/i})).toBeDisabled();
  await expect(page.getByText(/Restricted evidence.*desktop\/tablet/i)).toBeVisible();
});

test('session detail provides mobile repeat/share actions and a resilient reference',async({page})=>{
  await page.goto('/session/uat-session-1');
  await expect(page.getByText('SES-UAT-1842',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Book this room again'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Start a weekly repeat'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Share session details'})).toBeVisible();
});
