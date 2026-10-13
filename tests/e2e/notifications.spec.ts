import { test, expect } from '@playwright/test';
import { mockApi, deferred } from './support/mockApi';

test('loading, read one, read all, pagination and responsive keyboard controls',async({page},info)=>{
 const gate=deferred(), api=await mockApi(page,{initialGate:gate});
 await page.goto('/');await expect(page.getByText('알림을 불러오는 중…')).toBeVisible();gate.resolve();
 await expect(page.getByText('읽지 않은 알림 3개')).toBeVisible();
 await page.getByRole('button',{name:/내 사연에 새 댓글/}).click();
 await expect(page.getByTestId('opened-target')).toHaveText('story:story');
 await expect(page.getByText('읽지 않은 알림 2개')).toBeVisible();
 await page.getByRole('button',{name:'이전 알림 더 보기'}).click();
 await expect(page.getByRole('button',{name:/100표에 도달/})).toBeVisible();
 await page.getByRole('button',{name:'모두 읽음'}).focus();await page.keyboard.press('Enter');
 await expect(page.getByText('읽지 않은 알림 0개')).toBeVisible();
 await expect(page.getByRole('button',{name:'모두 읽음'})).toBeDisabled();
 expect(api.readCalls).toEqual(['/api/notifications/n1/read','/api/notifications/read-all']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('notifications.png'),fullPage:true});
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});

test('read failure preserves unread status, and pagination retry repeats the failed cursor',async({page})=>{
 const api=await mockApi(page);await page.goto('/');await expect(page.getByText('읽지 않은 알림 3개')).toBeVisible();
 api.failNextRead=true;await page.getByRole('button',{name:'모두 읽음'}).click();
 await expect(page.getByText('처리하지 못했어요. 잠시 후 다시 시도해 주세요.')).toBeVisible();
 await expect(page.getByText('읽지 않은 알림 3개')).toBeVisible();
 api.failNextList=true;await page.getByRole('button',{name:'이전 알림 더 보기'}).click();
 await expect(page.getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'다시 시도'}).click();
 await expect(page.getByRole('button',{name:/100표에 도달/})).toBeVisible();
 expect(api.listCalls.slice(-2)).toEqual(['owner-a:older','owner-a:older']);
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});

test('account switch discards a delayed prior-account notification list',async({page})=>{
 const gate=deferred(),api=await mockApi(page,{initialGate:gate});await page.goto('/');
 await expect(page.getByText('알림을 불러오는 중…')).toBeVisible();await page.getByRole('button',{name:'계정 B',exact:true}).click();
 await expect(page.getByText('아직 받은 알림이 없어요')).toBeVisible();gate.resolve();
 await expect.poll(()=>api.releasedLists.includes('owner-a:first')).toBe(true);
 await expect.poll(()=>api.finishedRequests.includes('Bearer fixture:owner-a:/api/notifications')).toBe(true);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect(page.getByRole('button',{name:/내 사연에 새 댓글/})).toHaveCount(0);
 await expect(page.getByText('읽지 않은 알림 0개')).toBeVisible();
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});

test('closing notification list aborts a pending target and cannot reopen it',async({page})=>{
 const api=await mockApi(page);api.openGate=deferred();await page.goto('/');
 await page.getByRole('button',{name:/내 사연에 새 댓글/}).click();await expect.poll(()=>api.openCalls.length).toBe(1);
 await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.getByTestId('aborted-open')).toHaveText('true');
  api.openGate.resolve();
 await expect.poll(()=>api.releasedOpens.includes('/fixture/open/n1')).toBe(true);
 await expect.poll(()=>api.finishedRequests.includes(':/fixture/open/n1')).toBe(true);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect(page.getByRole('region',{name:'내 알림'})).toHaveCount(0);await expect(page.getByTestId('opened-target')).toHaveText('');
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});

test('AI expiry warning opens only a matching owned room and shows server expiry',async({page},info)=>{
 const api=await mockApi(page,{ai:true});await page.goto('/');
 await expect(page.getByText('보관 기한: 2027년 4월 13일 10:30 (한국시간)')).toBeVisible();
 await page.getByRole('button',{name:/AI 대화방의 보관 기한이 곧 끝나요/}).click();
 await expect(page.getByTestId('opened-target')).toHaveText('ai:room');
 await expect(page.getByText('합성 AI 상대',{exact:true})).toBeVisible();
 await expect(page.getByText(/마지막으로 정상 저장된 AI 답변/)).toBeVisible();
 await page.screenshot({path:info.outputPath('ai-expiry.png'),fullPage:true});
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});

for(const condition of ['renewed','other-owner','expired'] as const) test(`AI ${condition} target is rejected; stale warnings refresh away`,async({page})=>{
 const api=await mockApi(page,{ai:true});await page.goto('/');
 await expect(page.getByRole('button',{name:/AI 대화방의 보관 기한이 곧 끝나요/})).toBeVisible();
 if(condition==='renewed'){api.targetRoom.retentionVersion=5;api.targetRoom.expiresAt='2027-10-13T01:30:00Z';}
 if(condition==='other-owner')api.targetRoom.userId='owner-b';
 if(condition==='expired')api.targetStatus=404;
 // List/count are authoritative after renewal/deletion; this is a synthetic server transition.
 api.items=[];
 await page.getByRole('button',{name:/AI 대화방의 보관 기한이 곧 끝나요/}).click();
 await expect(page.getByText('아직 받은 알림이 없어요')).toBeVisible();await expect(page.getByTestId('opened-target')).toHaveText('');
 expect(api.unexpected).toEqual([]);expect(api.errors).toEqual([]);
});
