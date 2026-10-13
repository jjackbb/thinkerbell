import { test, expect } from '@playwright/test';
import { mockApi, deferred } from './support/mockApi';

for(const interruption of ['account-switch','access-invalidation','comment-invalidation'] as const)test(`real App rejects stale notification story after ${interruption}`,async({page})=>{
 const api=await mockApi(page);
 await page.goto('/app.html');
 await expect(page.getByRole('button',{name:'마이',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'마이',exact:true}).click();
 await page.locator('[data-button-id="my-page-view-button-33"]').click();
 await expect(page.getByRole('button',{name:/내 사연에 새 댓글/})).toBeVisible();
 api.storyGate=deferred();api.holdNextStory=true;
 await page.getByRole('button',{name:/내 사연에 새 댓글/}).click();
 await expect.poll(()=>api.heldStoryStarted).toBe(true);
 if(interruption==='account-switch'){
   await page.getByRole('button',{name:'시험 계정 B 전환'}).click();
   await page.getByRole('button',{name:'마이',exact:true}).click();
   await expect(page.getByRole('heading',{name:'owner-b',level:2,exact:true})).toBeVisible();
 }else{
   if(interruption==='access-invalidation')api.storyVisible=false;
   await page.getByRole('button',{name:interruption==='access-invalidation'?'시험 접근 제한':'시험 댓글 변경'}).click();
   await expect(page.getByTestId('app-invalidation')).toHaveText(/complete:[1-9]/);
 }
 api.storyGate.resolve();await expect.poll(()=>api.heldStoryReleased).toBe(true);
 // RPC promises are not AbortSignal-based. Wait for transport completion and React rendering.
 await expect.poll(()=>api.finishedUrls.includes(api.heldStoryUrl)).toBe(true);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect(page.locator('[data-action-id="story-detail-modal-action-01"]')).toHaveCount(0);
 expect(new URL(page.url()).searchParams.has('story')).toBe(false);
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});
