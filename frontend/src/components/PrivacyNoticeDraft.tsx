import React, { useEffect, useId, useRef, useState } from 'react';
import { privacyNoticeDraft as notice } from '../lib/privacyNoticeDraft';

/** Not imported by a production entry. Only the isolated review fixture mounts this. */
export function PrivacyNoticeDraftContent() {
  return <div data-privacy-version={notice.version} className="space-y-5 text-sm leading-relaxed">
    <p className="font-bold">{notice.status} · {notice.version}</p>
    <p>{notice.age}</p>
    {notice.sections.map(section => <section key={section.title}>
      <h3 className="mb-2 font-bold">{section.title}</h3>
      {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-2">{paragraph}</p>)}
    </section>)}
    <p>운영자: {notice.operator}<br />문의: <a className="underline break-all" href={`mailto:${notice.contact}`}>{notice.contact}</a></p>
  </div>;
}

export function PrivacyNoticeDraft({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;
  const id = useId();
  const closing = useRef(false);
  const effectGeneration = useRef(0);
  const requestClose = () => {
    if (closing.current) return;
    if (window.history.state?.privacyDraft === `privacy-draft-${id}`) {
      closing.current = true;
      window.history.back();
    } else closeHandler.current();
  };
  const containTab = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const node = dialog.current;
    if (!node?.open) return;
    // Native modal inertness blocks background controls, but Tab may still move
    // to browser chrome. Keep the review's keyboard cycle within its controls.
    const controls = Array.from<HTMLElement>(node.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]'
    )).filter(control => control.tabIndex >= 0 && !control.matches(':disabled') &&
      !control.closest('[hidden], [inert]') && control.getClientRects().length > 0 &&
      getComputedStyle(control).visibility !== 'hidden');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) {
      event.preventDefault();
      heading.current?.focus();
    } else if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  useEffect(() => {
    const node = dialog.current;
    if (!node || !isOpen) return;
    const generation = ++effectGeneration.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    const marker = `privacy-draft-${id}`;
    if (window.history.state?.privacyDraft !== marker) {
      window.history.pushState({ ...window.history.state, privacyDraft: marker }, '', window.location.href);
    }
    closing.current = false;
    const onPopState = () => { closing.current = false; closeHandler.current(); };
    window.addEventListener('popstate', onPopState);
    document.body.style.overflow = 'hidden';
    node.showModal();
    node.scrollTop = 0;
    heading.current?.focus();
    return () => {
      window.removeEventListener('popstate', onPopState);
      // StrictMode replays setup immediately: only a genuine close/unmount removes the entry.
      queueMicrotask(() => {
        if (effectGeneration.current === generation && window.history.state?.privacyDraft === marker) window.history.back();
      });
      node.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen, id]);
  return <dialog ref={dialog} onKeyDown={containTab} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); requestClose(); }} data-analytics-exclude="true" className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto overscroll-contain rounded-2xl border border-[#1C1C1C] bg-white p-5 sm:p-6 text-left text-[#1C1C1C] backdrop:bg-black/50">
    <h2 ref={heading} tabIndex={-1} id={`${id}-title`} className="mb-4 text-xl font-bold">개인정보 처리 안내 검토</h2>
    <PrivacyNoticeDraftContent />
    <button type="button" onClick={requestClose} className="mt-6 min-h-11 w-full rounded-xl bg-[#1C1C1C] px-4 py-3 font-bold text-white">안내 닫기</button>
  </dialog>;
}

/** No checkbox: reading a notice must not become blanket processing consent. */
export function SignupPrivacyNoticeDraft() {
  const [open, setOpen] = useState(false);
  return <aside data-analytics-exclude="true" className="space-y-2 rounded-xl border border-[#E5E7EB] p-3 text-left text-xs text-[#1C1C1C]">
    <p className="font-bold">{notice.status}</p>
    <p>{notice.age}</p>
    <p>가입 정보 처리 안내와 선택적 이용 분석은 별개입니다. 분석을 거부해도 기본 서비스를 이용할 수 있습니다.</p>
    <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="min-h-11 underline font-bold">개인정보 처리 안내 보기</button>
    <PrivacyNoticeDraft isOpen={open} onClose={() => setOpen(false)} />
  </aside>;
}
