import {test,expect} from '@playwright/test';
const enabled=process.env.ADULT_TEST_ENABLED==='true';
const email=process.env.ADULT_TEST_EMAIL==='true';
const status=(eligible=false)=>({enabled,eligible,policyVersion:'adult-self-attestation-v1',attestedAt:null});
test('signup age assertion is opt-in, separate from consent, and resets on login switch',async({page})=>{
 const unexpected:string[]=[];
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname==='/api/account/adult-eligibility')return route.fulfill({json:status()});if(u.hostname!=='127.0.0.1'||u.pathname.startsWith('/api/')){unexpected.push(u.pathname);return route.abort();}return route.continue();});
 await page.goto('/adult.html');await page.getByRole('button',{name:'가입 보기',exact:true}).click();await page.getByRole('button',{name:'회원가입',exact:true}).click();
 // Banner checkbox is outside the signup panel; scope to its full signup label.
 const signup=page.getByRole('checkbox',{name:/가입 후 로그인하여/});
 await expect(signup).toHaveCount(enabled?1:0);
 if(enabled){await expect(signup).not.toBeChecked();await signup.check();await expect(signup).toBeChecked();await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'회원가입',exact:true}).click();await expect(signup).not.toBeChecked();}
 if(email)await expect(page.locator('#signup-check-email')).toBeVisible();else await expect(page.getByRole('button',{name:'니편내편 시작하기'})).toBeVisible();
 expect(unexpected).toEqual([]);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('adult-self-attestation');
});
test('existing account gate is default-off and requires explicit assertion; repeated clicks do not duplicate POST',async({page})=>{
 let posts=0;let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
 await page.route('**/api/account/adult-eligibility',async route=>{if(route.request().method()==='POST'){posts++;expect(route.request().postDataJSON()).toEqual({isAdult:true,policyVersion:'adult-self-attestation-v1'});await gate;return route.fulfill({json:status(true)});}return route.fulfill({json:status()});});
 await page.goto('/adult.html');const banner=page.getByRole('region',{name:'이용 연령 확인'});
 if(!enabled){await expect(banner).toHaveCount(0);expect(posts).toBe(0);return;}
 await expect(banner).toBeVisible();await expect(banner.getByRole('button',{name:'이용 연령 확인',exact:true})).toBeDisabled();await expect(banner).toContainText('개인정보 처리 동의가 아닙니다');await banner.getByRole('checkbox').check();await banner.getByRole('button',{name:'이용 연령 확인',exact:true}).click();await expect(banner.getByRole('button',{name:'확인 중…'})).toBeDisabled();expect(posts).toBe(1);release();await expect(banner).toHaveCount(0);
});
test('failed status does not imply eligible and can retry; old account response cannot hide new gate',async({page})=>{
 test.skip(!enabled);let failed=true;let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let held=false;
 await page.route('**/api/account/adult-eligibility',async route=>{if(failed){failed=false;return route.fulfill({status:503,json:{error:'unavailable'}});}if(route.request().method()==='POST'){held=true;await gate;return route.fulfill({json:status(true)});}return route.fulfill({json:status()});});
 await page.goto('/adult.html');await expect(page.getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'다시 불러오기'}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'이용 연령 확인',exact:true}).click();await expect.poll(()=>held).toBe(true);await page.getByRole('button',{name:'계정 전환'}).click();await expect(page.getByRole('checkbox')).not.toBeChecked();release();await expect(page.getByRole('region',{name:'이용 연령 확인'})).toBeVisible();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('region',{name:'이용 연령 확인'})).toHaveCount(0);
});

test('default-off production App never probes eligibility or shows outage age UI',async({page})=>{
 test.skip(enabled);
 const {mockApi}=await import('./support/mockApi');await mockApi(page);let calls=0;
 await page.route('**/api/account/adult-eligibility',route=>{calls++;return route.fulfill({status:503,json:{error:'unavailable'}});});
 await page.goto('/app.html');await expect(page.getByRole('button',{name:'마이',exact:true})).toBeVisible();
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 expect(calls).toBe(0);await expect(page.getByRole('region',{name:'이용 연령 확인'})).toHaveCount(0);
});
