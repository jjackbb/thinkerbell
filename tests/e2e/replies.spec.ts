import { test, expect } from '@playwright/test';
import { mockApi, deferred } from './support/mockApi';

test('multiple replies keep the root group and actual addressee; repeated submit saves once',async({page},info)=>{
 const api=await mockApi(page);api.commentGate=deferred();await page.goto('/');await page.getByRole('button',{name:'사연 화면',exact:true}).click();
 await page.getByRole('button',{name:'답글 2개 보기'}).click();
 await expect(page.getByText('↳ 익명 2님에게 답글',{exact:true})).toBeVisible();
 await page.locator('#comment-reply-2').getByRole('button',{name:'답글 달기',exact:true}).click();
 await expect(page.getByText('익명 3님에게 답글',{exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'답글 내용'}).fill('새로운 합성 답글');
 const submit=page.getByRole('button',{name:'등록',exact:true});
 // Rapid DOM clicks model duplicate submit without Playwright waiting for disabled controls.
 await submit.evaluate(element=>{(element as HTMLButtonElement).click();(element as HTMLButtonElement).click();});
 await expect.poll(()=>api.comments.length).toBe(1);await expect(page.getByRole('button',{name:'확인 중…'})).toBeDisabled();
 api.commentGate.resolve();await expect(page.getByText('새로운 합성 답글',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'답글 3개 접기'})).toBeVisible();
 expect(api.comments[0].replyToId).toBe('reply-2');await expect(page.getByTestId('submission-count')).toHaveText('1');
 await page.locator('#comment-root').getByRole('button',{name:'답글 달기',exact:true}).click();
 await page.getByRole('textbox',{name:'답글 내용'}).fill('취소해도 남는 초안');await page.getByRole('button',{name:'답글 취소'}).click();
 await expect(page.getByRole('textbox',{name:'댓글 내용'})).toHaveValue('취소해도 남는 초안');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('multiple-replies.png'),fullPage:true});
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});

test('guest reply click requests login without a composer or network mutation',async({page})=>{
 const api=await mockApi(page);await page.goto('/');await page.getByRole('button',{name:'게스트',exact:true}).click();
 await page.getByRole('button',{name:'답글 달기',exact:true}).click();
 await expect(page.getByText('답글을 남기려면 로그인이 필요해요.',{exact:true})).toBeAttached();
 await expect(page.getByRole('textbox',{name:'답글 내용'})).toHaveCount(0);
 expect(api.comments).toHaveLength(0);expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});
