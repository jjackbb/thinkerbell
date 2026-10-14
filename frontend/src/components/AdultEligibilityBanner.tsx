import React, { useEffect, useRef, useState } from 'react';
import { requestAdultEligibility, type AdultEligibilityStatus } from '../lib/adultEligibility';

/** Non-modal: recovery, logout and account deletion remain accessible. */
export function AdultEligibilityBanner({ userId }: { userId: string; key?: string }) {
  const [status, setStatus] = useState<AdultEligibilityStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    void requestAdultEligibility(userId).then(value => { if (generation.current === current) setStatus(value); })
      .catch(() => { if (generation.current === current) setError('이용 연령 확인 상태를 불러오지 못했습니다.'); });
    return () => { generation.current += 1; };
  }, [userId]);

  async function submit(attest: boolean) {
    if (pending.current || (attest && !checked)) return;
    const current = generation.current;
    pending.current = true;
    setBusy(true); setError('');
    try {
      const result = await requestAdultEligibility(userId, attest);
      if (generation.current === current) { setStatus(result); setChecked(false); }
    } catch { if (generation.current === current) setError('이용 연령 확인을 완료하지 못했습니다. 다시 시도해 주세요.'); }
    finally { pending.current = false; if (generation.current === current) setBusy(false); }
  }
  if (status?.enabled === false || status?.eligible) return null;
  if (!status && !error) return null;
  return <section aria-label="이용 연령 확인" data-analytics-exclude="true" className="mx-auto mt-20 max-w-xl rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm">
    <p>AI 기능은 만 18세 이상만 이용할 수 있습니다. 로그인, 계정 관리와 탈퇴는 계속 이용할 수 있습니다.</p>
    {status?.enabled && <>
      <label className="my-3 flex gap-2"><input type="checkbox" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} />저는 만 18세 이상입니다.</label>
      <p className="mb-3 text-xs">본인의 연령에 대한 확인이며 신분증 인증이나 개인정보 처리 동의가 아닙니다. 생년월일이나 신분증은 수집하지 않습니다.</p>
      <button type="button" disabled={!checked || busy} onClick={() => void submit(true)} className="rounded-lg bg-[#1C1C1C] px-4 py-2 text-white disabled:opacity-50">{busy ? '확인 중…' : '이용 연령 확인'}</button>
    </>}
    {error && <p role="alert">{error} <button type="button" disabled={busy} onClick={() => void submit(false)} className="underline">다시 불러오기</button></p>}
  </section>;
}
