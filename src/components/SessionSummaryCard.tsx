import React, { useState } from 'react';
import { ChatMessage } from '../types';

/** 기분 칩. 이모지는 라벨을 거드는 용도로만 쓴다 */
const MOODS = [
  { id: 'stuck',  emoji: '😖', label: '답답함' },
  { id: 'angry',  emoji: '😤', label: '화남' },
  { id: 'sad',    emoji: '😔', label: '서운함' },
  { id: 'calm',   emoji: '😌', label: '차분함' },
  { id: 'clear',  emoji: '😮‍💨', label: '후련함' },
] as const;

type MoodId = typeof MOODS[number]['id'];

const moodOf = (id: MoodId | null) => MOODS.find(m => m.id === id);

interface SessionSummaryCardProps {
  result: 'success' | 'fail';
  /** 대화 전체. 여기서 내가 한 말만 뽑아 쓴다 */
  messages: ChatMessage[];
  /** 이 대화가 붙어 있는 사연에서 '내 편'을 고른 사람 수 (없으면 숨김) */
  supporterCount?: number;
  /** 요약 줄을 눌렀을 때 원문 말풍선으로 이동 */
  onJumpToMessage: (messageId: string) => void;
  onContinue: () => void;
  onFinish: () => void;
}

/**
 * 대화가 끝난 자리를 '판정'이 아니라 '변화'로 돌려준다.
 *
 * 기존 종료 화면은 SIMULATION RESOLVED / ENDED 라는 승패 배지였다. 사연을
 * 털어놓으러 온 사람에게 승패를 통보하면, 결렬로 끝났을 때 이 서비스는
 * 실패를 확인시켜 주는 곳이 된다. 그래서 남는 건 결과가 아니라
 * "무엇이 달라졌는가"여야 한다.
 *
 * 기분 전/후는 AI가 추정하지 않고 본인이 직접 고른다. 감정 추정은 틀렸을 때
 * 대가가 크고, 고르는 행위 자체가 되돌아보는 장치가 된다.
 * 털어놓은 내용도 요약을 만들어내지 않고 내가 실제로 쓴 문장을 그대로 인용한다.
 */
export const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({
  result,
  messages,
  supporterCount,
  onJumpToMessage,
  onContinue,
  onFinish,
}) => {
  const [moodBefore, setMoodBefore] = useState<MoodId | null>(null);
  const [moodAfter, setMoodAfter] = useState<MoodId | null>(null);
  const [takeaway, setTakeaway] = useState('');
  const [step, setStep] = useState<'before' | 'after'>('before');
  // 원문을 보러 갈 때는 카드를 접는다. 카드가 화면을 덮은 채로 스크롤하면
  // 정작 그때 무슨 대화였는지가 안 보인다.
  const [collapsed, setCollapsed] = useState(false);

  /** 내가 한 말 중 긴 순으로 3개. 짧은 맞장구보다 실제로 털어놓은 문장이 남는다 */
  const myLines = messages
    .filter(m => m.sender === 'user' && m.text.trim().length > 0)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 3)
    .sort((a, b) => messages.indexOf(a) - messages.indexOf(b));

  const before = moodOf(moodBefore);
  const after = moodOf(moodAfter);

  const MoodRow: React.FC<{ value: MoodId | null; onPick: (id: MoodId) => void }> = ({ value, onPick }) => (
    <div className="flex flex-wrap gap-1.5">
      {MOODS.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m.id)}
          className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            value === m.id
              ? 'bg-[#FF6B5A] text-[#1C1C1C] border-[#FF6B5A] font-bold'
              : 'bg-white/5 text-[#E5E7EB] border-white/20 hover:bg-white/10'
          }`}
        >
          {m.emoji} {m.label}
        </button>
      ))}
    </div>
  );

  if (collapsed) {
    return (
      <footer className="bg-[#1C1C1C] text-white border-t border-[#E5E7EB] animate-fadeIn">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold hover:bg-white/5 transition-colors cursor-pointer"
        >
          <span className="text-[#FF6B5A]">↑</span> 오늘의 대화 요약으로 돌아가기
        </button>
      </footer>
    );
  }

  return (
    <footer className="bg-[#1C1C1C] text-white border-t border-[#E5E7EB] max-h-[70vh] overflow-y-auto animate-fadeIn">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {/* 승패가 아니라 대화가 어디에 도착했는지를 말한다 */}
        <div className="text-center space-y-1.5">
          <p className="text-[11px] font-mono text-[#5f5e5e] tracking-wider">오늘의 대화</p>
          <h3 className="font-headline-md font-bold text-base sm:text-lg">
            {result === 'success'
              ? '서로 한 발씩 물러난 자리에서 멈췄어요'
              : '끝내 접점은 없었어요. 그것도 알아낸 거예요'}
          </h3>
          <p className="text-xs text-[#5f5e5e] leading-relaxed">
            {result === 'success'
              ? '여기까지 온 말들이 실제 대화에서도 쓸 수 있는 말이에요.'
              : '어디서 부딪히는지 확인한 것만으로 다음 대화가 짧아집니다.'}
          </p>
        </div>

        {/* 1. 기분 전 → 후. 본인이 직접 고른다 */}
        <section className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-bold text-white">마음이 좀 달라졌나요?</p>
            {before && after && (
              <p className="font-mono text-sm font-bold text-[#FF6B5A] shrink-0">
                {before.emoji} {before.label} → {after.emoji} {after.label}
              </p>
            )}
          </div>

          {step === 'before' ? (
            <div className="space-y-2">
              <p className="text-[11px] text-[#5f5e5e]">대화를 시작하기 전 마음은</p>
              <MoodRow value={moodBefore} onPick={(id) => { setMoodBefore(id); setStep('after'); }} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#5f5e5e]">그리고 지금은</p>
                <button
                  type="button"
                  onClick={() => setStep('before')}
                  className="text-[11px] text-[#5f5e5e] hover:text-white underline underline-offset-2 cursor-pointer"
                >
                  이전 기분 다시 고르기
                </button>
              </div>
              <MoodRow value={moodAfter} onPick={setMoodAfter} />
            </div>
          )}
        </section>

        {/* 2. 내가 실제로 한 말. 누르면 그 자리로 올라간다 */}
        {myLines.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-bold text-white">이런 이야기를 털어놨어요</p>
            <div className="space-y-1.5">
              {myLines.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setCollapsed(true); onJumpToMessage(m.id); }}
                  className="w-full text-left flex items-start gap-2 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer group"
                >
                  <span className="shrink-0 self-stretch w-1 rounded bg-[#FF6B5A]" />
                  <span className="text-xs text-[#E5E7EB] leading-snug line-clamp-2">
                    “{m.text.length > 70 ? `${m.text.slice(0, 70)}…` : m.text}”
                  </span>
                  <span className="shrink-0 ml-auto text-[10px] font-mono text-[#5f5e5e] group-hover:text-[#FF6B5A] transition-colors">
                    보러가기
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3. 한 줄로 남기기. 비워두면 표시하지 않는다 */}
        <section className="space-y-2">
          <label htmlFor="takeaway" className="text-xs font-bold text-white block">
            한 줄로 남긴다면
          </label>
          <input
            id="takeaway"
            type="text"
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
            maxLength={60}
            placeholder="예: 화가 난 게 아니라 서운했던 거였다"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-[#5f5e5e] focus:outline-none focus:border-[#FF6B5A]"
          />
        </section>

        {/* 4. 혼자가 아니라는 사실. 투표가 있을 때만 */}
        {typeof supporterCount === 'number' && supporterCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[#FF6B5A]/10 border border-[#FF6B5A]/30 p-3">
            <span className="text-lg">🫂</span>
            <p className="text-xs text-[#E5E7EB]">
              이 사연에서 <span className="font-bold text-[#FF6B5A]">{supporterCount}명</span>이 당신 편에 섰어요.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-white/20"
          >
            더 이야기할래요
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="flex-1 px-4 py-2.5 bg-[#FF6B5A] text-[#1C1C1C] rounded-lg text-xs font-bold hover:bg-[#FF6B5A]/90 transition-colors cursor-pointer shadow-md"
          >
            여기서 마무리
          </button>
        </div>
      </div>
    </footer>
  );
};
