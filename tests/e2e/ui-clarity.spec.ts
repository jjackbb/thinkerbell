import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort('blockedbyclient'));
 await page.goto('/ui.html');
});
test('ranking keyboard entry, vote explanation and sharing remain visible at this viewport',async({page})=>{
 const visibleRank=page.locator('[data-action-id="weekly-top-banner-action-01"]:visible').first();
 await expect(visibleRank).toContainText('투표하면 결과를 볼 수 있어요');
 await expect(visibleRank).not.toContainText('80%');
 await visibleRank.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'사연 닫기',exact:true})).toBeVisible();
 await expect(page.locator('[data-button-id="share-result-bar-button-03"]')).toHaveCount(0);
 await expect(page.getByText('투표한 뒤 화면 아래의', {exact:false})).toBeVisible();
 await page.locator('[data-button-id="story-detail-modal-button-10"]').click();
 await expect(page.locator('[data-button-id="story-detail-modal-button-10"]')).toContainText('사연 작성자');
 await expect(page.locator('[data-button-id="story-detail-modal-button-09"]')).toContainText('사연 속 상대방');
 const share=page.getByRole('button',{name:'결과 공유하기',exact:true});await expect(share).toBeInViewport();
 const close=page.getByRole('button',{name:'사연 닫기',exact:true});await expect(close).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('voted-detail.png'),fullPage:true});
 await close.click();await expect(visibleRank).toContainText('80%');
 await visibleRank.click();await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'사연 닫기',exact:true})).toHaveCount(0);
});
test('guest cannot reveal results or share; author can share only while public',async({page})=>{
 await page.getByRole('button',{name:'시험 guest',exact:true}).click();
 await page.locator('[data-action-id="weekly-top-banner-action-01"]:visible').first().click();
 await page.locator('[data-button-id="story-detail-modal-button-10"]').click();
 await expect(page.getByRole('status')).toHaveText('시험 로그인 안내');
 await expect(page.locator('[data-button-id="share-result-bar-button-03"]')).toHaveCount(0);
 await page.getByRole('button',{name:'시험 author',exact:true}).click();
 await page.locator('[data-action-id="weekly-top-banner-action-01"]:visible').first().click();
 await expect(page.getByRole('button',{name:'결과 공유하기',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'시험 비공개',exact:true}).click();
 await expect(page.locator('[data-button-id="share-result-bar-button-03"]')).toHaveCount(0);
});
test('native image share carries URL; repeat clicks and cancellation do not create extra shares',async({page})=>{
 await page.getByRole('button',{name:'시험 author',exact:true}).click();
 await page.locator('[data-action-id="weekly-top-banner-action-01"]:visible').first().click();
 await page.evaluate(()=>{
  const state=window as any;state.shares=[];
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'share',{configurable:true,value:(data:ShareData)=>{state.shares.push({url:data.url,files:data.files?.length});return new Promise((_resolve,reject)=>{state.cancelShare=()=>reject(new DOMException('cancelled','AbortError'));});}});
 });
 const share=page.getByRole('button',{name:'결과 공유하기',exact:true});await share.click();
 await expect(share).toBeDisabled();
 await expect.poll(()=>page.evaluate(()=>(window as any).shares)).toEqual([{url:'http://127.0.0.1:4178/ui.html?story=ui-synthetic',files:1}]);
 await page.evaluate(()=>{(document.querySelector('[data-button-id="share-result-bar-button-03"]') as HTMLButtonElement).click();(window as any).cancelShare();});
 await expect(share).toBeEnabled();expect(await page.evaluate(()=>(window as any).shares.length)).toBe(1);
 await page.getByRole('button',{name:/미리보기/}).click();await expect(page.getByRole('img',{name:'공유 카드 미리보기'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('img',{name:'공유 카드 미리보기'})).toHaveCount(0);await expect(share).toBeVisible();
});
