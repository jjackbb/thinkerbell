import React, { useEffect, useRef } from 'react';

/** Review-only component. Not mounted by the app until processing facts and legal basis are approved. */
export function PrivacyNoticeDraft({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node || !isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.showModal();
    close.current?.focus();
    return () => { node.close(); previous?.focus(); };
  }, [isOpen]);
  return <dialog ref={dialog} aria-labelledby="privacy-draft-title" onCancel={event => { event.preventDefault(); onClose(); }} data-analytics-exclude="true" className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-[#1C1C1C] bg-white p-6 text-[#1C1C1C] backdrop:bg-black/50">
    <p className="text-xs font-bold text-[#5F5E5E]">검토 초안 · 운영 미적용</p>
    <h2 id="privacy-draft-title" className="mt-2 text-xl font-bold">가입 정보 처리 안내</h2>
    <p className="mt-4 text-sm">현재 가입 화면에서 이메일, 비밀번호, 닉네임을 입력합니다. 인증 서비스와 계정 생성 경로에서 처리합니다. 비밀번호의 저장 방식과 전체 보유기간은 이 초안으로 확정하지 않습니다.</p>
    <p className="mt-3 text-sm">사연은 작성자 계정 ID와 연결됩니다. 공개 화면의 표시 이름과 계정 연결은 별개이며, 본문에 적은 식별 정보는 다른 이용자가 볼 수 있습니다.</p>
    <p className="mt-3 text-sm">선택적 이용 분석 동의는 별도이며 거부해도 기본 이용이 가능합니다.</p>
    <p className="mt-3 text-sm">사용자 확인: 운영 주체·문의 책임자는 변종현 개인(현재 비사업자), 문의처는 ds5305naver@gmail.com, 만 14세 이상이며 성인 전용 콘텐츠는 지원하지 않습니다. 게시 전 확인: 항목별 처리 목적과 근거, 보유·파기 기준, 수탁 및 국외이전 여부와 범위, AI 입력 처리 조건. 동의가 필요한 항목은 목적·항목·보유기간·거부권과 불이익을 확정한 뒤 분리합니다.</p>
    <p className="mt-3 text-sm font-bold">이 초안은 법적 동의를 받거나 가입을 완료하지 않습니다.</p>
    <button ref={close} type="button" onClick={onClose} className="mt-6 min-h-11 w-full rounded-xl bg-[#1C1C1C] px-4 py-3 font-bold text-white">검토 닫기</button>
  </dialog>;
}
