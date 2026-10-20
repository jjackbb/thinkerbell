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
  /**
   * 두 선택지의 이름. 왼쪽이 b, 오른쪽이 a다(사연에서는 왼쪽 '니 편', 오른쪽 '내 편').
   * 밸런스 게임처럼 진영 이름이 다른 곳에서 갈아끼운다.
   */
  labels?: { a: string; b: string };
  /**
   * 이 게이지가 얹히는 배경. 글자·바탕색만 바뀌고 규칙은 그대로다.
   * 실제 색은 index.css의 .vote-surface-* 가 들고 있다.
   */
  surface?: 'light' | 'onyx';
}

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
 * 3) 표가 적어도 같은 막대로 보여준다.
 *    예전에는 5표 미만이면 점으로 셌지만, 화면마다 모양이 달라져 헷갈렸다.
 *    대신 2)의 표수와 '총 N명 참여'로 표가 적다는 것을 알린다.
 *
 * 사연 카드와 밸런스 게임 배너가 이 한 벌을 같이 쓴다. 규칙을 두 곳에
 * 복사해두면 한쪽만 고치고 넘어가게 된다 — 실제로 그런 적이 있다.
 */
export const VoteResult: React.FC<VoteResultProps> = ({
  votesA,
  votesB,
  hasVoted,
  isMyStory = false,
  compact = false,
  labels = { a: '내 편', b: '니 편' },
  surface = 'light',
}) => {
  const total = votesA + votesB;
  const percentA = total > 0 ? Math.round((votesA / total) * 100) : 0;
  const percentB = total > 0 ? 100 - percentA : 0;

  const revealed = hasVoted || isMyStory;

  // 색은 이 클래스가 들고 있는 변수로만 들어온다. 컴포넌트는 hex를 모른다
  const rootClass = [
    surface === 'onyx' ? 'vote-surface-onyx' : 'vote-surface-light',
    compact ? '' : 'mb-3',
  ]
    .filter(Boolean)
    .join(' ');

  // ── 투표 전: 실제 비율과 무관한 중립 표시 ──────────────────────────────────
  if (!revealed) {
    // 실제 표 비율과 무관한 중립 막대만 표시한다. 흐림 처리로도 우세한 쪽이
    // 드러날 수 있으므로 투표 전 렌더링에는 득표 비율을 사용하지 않는다.

    // ??% 대신 막대 자체를 잠긴 상자로 보여주고, 왜 가려졌는지·어떻게 하면
    // 보이는지를 그 안에 적는다. 처음 온 사람이 "오류인가?" 하고 헷갈리지 않게 한다.
    // 막대 모양은 투표 후 결과 막대와 같은 자리에 두어 열리는 변화가 자연스럽다.
    return (
      <div className={rootClass}>
        <div className="flex justify-between font-label-sm text-xs mb-2 font-bold">
          <span className="text-[var(--vote-ink-b)]">{labels.b}</span>
          <span className="text-[var(--vote-ink-a)]">{labels.a}</span>
        </div>
        <div
          className="w-full h-7 rounded-full bg-[var(--vote-track)] flex items-center justify-center gap-1.5 px-3 text-[11px] font-bold text-[var(--vote-emphasis)]"
          style={{
            backgroundImage: 'linear-gradient(90deg, var(--vote-seal-b), var(--vote-seal-a))',
          }}
        >
          <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className="truncate">투표하면 결과가 열려요</span>
        </div>
        <p className="mt-2 text-xs text-[var(--vote-caption)] text-center">
          {total > 0 ? (
            <span>
              벌써 <span className="font-bold text-[var(--vote-emphasis)]">{total}명</span>이 편을 골랐어요
            </span>
          ) : (
            <span>
              아직 아무도 안 골랐어요 · <span className="font-bold text-[var(--vote-emphasis)]">첫 번째가 되어보세요</span>
            </span>
          )}
        </p>
      </div>
    );
  }

  // ── 표가 0일 때 ───────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className={rootClass}>
        <div className="flex justify-between font-label-sm text-xs mb-2">
          <span className="text-[var(--vote-caption)]">{labels.b}</span>
          <span className="text-[var(--vote-caption)]">{labels.a}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--vote-track-empty)]" />
        <p className="mt-2 text-xs text-[var(--vote-caption)] text-center">
          아직 투표가 없어요
        </p>
      </div>
    );
  }

  // ── 일반 ─────────────────────────────────────────────────────────────
  return (
    <div className={rootClass}>
      <div className="flex justify-between font-label-sm text-xs mb-2">
        <span className="text-[var(--vote-ink-b)] font-bold">
          {labels.b} {percentB}% <span className="font-normal text-[var(--vote-caption)]">({votesB}표)</span>
        </span>
        <span className="text-[var(--vote-ink-a)] font-bold">
          <span className="font-normal text-[var(--vote-caption)]">({votesA}표)</span> {labels.a} {percentA}%
        </span>
      </div>
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-[var(--vote-track)]">
        <div
          className="bg-[var(--vote-fill-b)] h-full transition-all duration-500"
          style={{ width: `${percentB}%` }}
        />
        <div
          className="bg-[var(--vote-fill-a)] h-full transition-all duration-500"
          style={{ width: `${percentA}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-[var(--vote-caption)] text-center">
        총 {total}명 참여
      </p>
    </div>
  );
};
