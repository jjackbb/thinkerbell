import { beginTask, blockedAction } from '../lib/taskAnalytics';
import React, { useState } from 'react';
import { Share2, ImageDown, Check } from 'lucide-react';
import { shareResult, downloadShareCard, ShareCardInput } from '../lib/shareCard';

interface ShareResultBarProps {
  input: ShareCardInput;
  /** 공유 링크. 이 사연으로 바로 열리는 주소여야 한다 */
  url: string;
  /**
   * 이미지 저장 전에 카드를 먼저 보여준다. 넘어오면 '이미지 저장'이 미리보기를 열고,
   * 실제 저장은 미리보기 화면의 저장 버튼에서 한다. 없으면 바로 저장한다.
   */
  onPreview?: () => void;
}

/**
 * 결과 공유는 하단 고정 바에 둔다.
 *
 * 공유 버튼을 본문 상단에 두면 대부분 읽기 전에 지나쳐 버린다. 공유는
 * 결과를 확인한 직후에 하고 싶어지는 행동이라, 그 자리에 계속 붙어 있는
 * 편이 맞다. 그리고 카톡 같은 특정 앱 버튼을 박는 대신 OS 공유시트를
 * 부른다 — 어디로 보낼지는 사용자가 이미 알고 있다.
 */
export const ShareResultBar: React.FC<ShareResultBarProps> = ({ input, url, onPreview }) => {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(prev => (prev === msg ? null : prev)), 2000);
  };

  const handleShare = async () => {
    if (busy) { blockedAction('share', 'busy'); return; }
    setBusy(true);
    const task = beginTask('share');
    try {
      const outcome = await shareResult(input, url);
      task.finish(outcome === 'failed' ? 'error' : outcome === 'cancelled' ? 'cancelled' : 'success');
      if (outcome === 'copied') flash('링크를 복사했어요');
      else if (outcome === 'failed') flash('공유에 실패했어요');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    const task = beginTask('share_download');
    try {
      const outcome = await downloadShareCard(input);
      task.finish(outcome === 'downloaded' ? 'success' : 'error');
      flash(outcome === 'downloaded' ? '이미지를 저장했어요' : '이미지를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  /*
    한 줄로 둔다: 왼쪽은 공유 카드에 무엇이 들어가는지 알리는 작은 설명(버튼처럼 보이지 않게),
    오른쪽은 '이미지 저장' → '결과 공유하기'. 하단 바 높이를 줄이려고 설명을 버튼 옆에 둔다.
    '이미지 저장'은 저장될 카드를 먼저 보여주고(미리보기), 그 화면에서 저장을 확정한다.
  */
  return (
    <div aria-label="투표 결과 공유" className="shrink-0 sticky bottom-0 z-30 bg-[#1C1C1C] border-t border-[#E5E7EB] px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {/* 무엇이 공유되는지 알리는 안내라 잘라내지 않는다. 좁은 화면에서는 단어 단위로 두 줄이 된다 */}
        <div className="flex-1 min-w-0">
          {note ? (
            <p role="status" className="flex items-center gap-1.5 text-[11px] text-[#FF6B5A] font-bold">
              <Check className="w-3.5 h-3.5 shrink-0" /> {note}
            </p>
          ) : (
            <p className="text-[11px] leading-snug text-[var(--color-secondary-on-dark)] break-keep">
              제목·투표 결과{input.myChoice ? '·내 선택' : ''} 카드와 사연 링크
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button data-button-id="share-result-bar-button-02"
            type="button"
            onClick={onPreview ?? handleDownload}
            disabled={busy}
            aria-label="결과 카드 이미지 저장"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/25 text-xs font-bold text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ImageDown className="w-4 h-4" aria-hidden="true" /> 이미지 저장
          </button>

          <button data-button-id="share-result-bar-button-03"
            type="button"
            onClick={handleShare}
            disabled={busy}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF6B5A] text-[#1C1C1C] text-xs font-bold hover:bg-[#FF6B5A]/90 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" /> 결과 공유하기
          </button>
        </div>
      </div>
    </div>
  );
};
