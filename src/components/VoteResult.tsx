import React from 'react';
import { Lock } from 'lucide-react';

interface VoteResultProps {
  votesA: number;
  votesB: number;
  /** 내가 투표했는가 */
  hasVoted: boolean;
  /** 내 사연인가 — 작성자는 투표할 수 없으므로 결과를 항상 본다 */
  isMyStory?: boolean;
  /** 작게 쓰는 곳(랭킹 배너 등) */
  compact?: boolean;
}

/** 이 수 미만이면 퍼센트 대신 점으로 표를 센다 */
const SMALL_SAMPLE = 5;

/**
 * 투표 결과 표시. 세 가지 원칙을 담는다.
 *
 * 1) 투표 전에는 가린다.
 *    미리 보여주면 앞서는 쪽이 평균 7%p를 더 가져간다(밴드왜건). 가리는 건
 *    공정성 장치이면서 동시에 참여를 만드는 후크이기도 하다.
 *
 * 2) 퍼센트만 쓰지 않고 표수를 함께 쓴다. 소수점은 쓰지 않는다.
 *    3표 대 1표가 75%로 보이면 그건 여론이 아니라 착시다.
 *
 * 3) 표가 적으면 막대 대신 점을 찍는다.
 *    "아직 적다"가 숫자를 읽지 않아도 눈에 보여야 한다.
 */
export const VoteResult: React.FC<VoteResultProps> = ({
  votesA,
  votesB,
  hasVoted,
  isMyStory = false,
  compact = false,
}) => {
  const total = votesA + votesB;
  const percentA = total > 0 ? Math.round((votesA / total) * 100) : 0;
  const percentB = total > 0 ? 100 - percentA : 0;

  const revealed = hasVoted || isMyStory;

  // ── 투표 전: 결과를 가린다 ────────────────────────────────────────────
  if (!revealed) {
    return (
      <div className={compact ? '' : 'mb-3'}>
        <div className="flex justify-between font-label-sm text-xs mb-2">
          <span className="text-[#5f5e5e]">니 편</span>
          <span className="text-[#5f5e5e]">내 편</span>
        </div>
        {/*
          투표 전에는 색을 아예 쓰지 않는다.

          예전에는 45:55로 칠한 막대에 blur만 걸었다. 작게 보면 흐릿한 진짜
          결과처럼 읽혀서, 가리려던 밴드왜건이 오히려 생겼다. 지금은 빈 회색
          막대와 자물쇠로 '아직 아무것도 안 열렸다'만 말한다.
        */}
        <div className="w-full h-2 rounded-full bg-[#E5E7EB]" />
        <p className="mt-2 text-[11px] text-[#5f5e5e] text-center flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" aria-hidden="true" />
          투표하면 결과가 열려요
        </p>
      </div>
    );
  }

  // ── 표가 아직 적을 때: 점으로 센다 ────────────────────────────────────
  if (total > 0 && total < SMALL_SAMPLE) {
    return (
      <div className={compact ? '' : 'mb-3'}>
        <div className="flex justify-between font-label-sm text-xs mb-2">
          <span className="text-[#4553C4] font-bold">니 편 {votesB}표</span>
          <span className="text-[#D6452F] font-bold">내 편 {votesA}표</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 h-2">
          {Array.from({ length: votesB }).map((_, i) => (
            <span key={`b${i}`} className="w-2 h-2 rounded-full bg-[#6C7BE8]" />
          ))}
          {Array.from({ length: votesA }).map((_, i) => (
            <span key={`a${i}`} className="w-2 h-2 rounded-full bg-[#FF6B5A]" />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[#5f5e5e] text-center">
          아직 {total}명이 투표했어요
        </p>
      </div>
    );
  }

  // ── 표가 0일 때 ───────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className={compact ? '' : 'mb-3'}>
        <div className="flex justify-between font-label-sm text-xs mb-2">
          <span className="text-[#5f5e5e]">니 편</span>
          <span className="text-[#5f5e5e]">내 편</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#E5E7EB]" />
        <p className="mt-2 text-[11px] text-[#5f5e5e] text-center">
          아직 투표가 없어요
        </p>
      </div>
    );
  }

  // ── 일반 ─────────────────────────────────────────────────────────────
  return (
    <div className={compact ? '' : 'mb-3'}>
      <div className="flex justify-between font-label-sm text-xs mb-2">
        <span className="text-[#4553C4] font-bold">
          니 편 {percentB}% <span className="font-normal text-[#5f5e5e]">({votesB}표)</span>
        </span>
        <span className="text-[#D6452F] font-bold">
          <span className="font-normal text-[#5f5e5e]">({votesA}표)</span> 내 편 {percentA}%
        </span>
      </div>
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-[#f3f4f5]">
        <div
          className="bg-[#6C7BE8] h-full transition-all duration-500"
          style={{ width: `${percentB}%` }}
        />
        <div
          className="bg-[#FF6B5A] h-full transition-all duration-500"
          style={{ width: `${percentA}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[#5f5e5e] text-center">
        총 {total}명 참여
      </p>
    </div>
  );
};
