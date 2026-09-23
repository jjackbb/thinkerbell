import React, { useState } from 'react';
import { Share2, ImageDown, Check } from 'lucide-react';
import { shareResult, downloadShareCard, ShareCardInput } from '../lib/shareCard';

interface ShareResultBarProps {
  input: ShareCardInput;
  /** 공유 링크. 이 사연으로 바로 열리는 주소여야 한다 */
  url: string;
  /** 카드 미리보기를 열고 싶을 때 */
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
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await shareResult(input, url);
      if (outcome === 'copied') flash('링크를 복사했어요');
      else if (outcome === 'failed') flash('공유에 실패했어요');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await downloadShareCard(input);
      flash(outcome === 'downloaded' ? '이미지를 저장했어요' : '이미지를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-30 bg-[#1C1C1C] border-t border-[#E5E7EB] px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {note ? (
            <p className="flex items-center gap-1.5 text-xs text-[#FF6B5A] font-bold">
              <Check className="w-3.5 h-3.5" /> {note}
            </p>
          ) : (
            <button
              type="button"
              onClick={onPreview}
              disabled={!onPreview}
              className="text-[11px] text-[#8b8b8b] hover:text-white transition-colors disabled:hover:text-[#8b8b8b] disabled:cursor-default cursor-pointer text-left"
            >
              닉네임 없이 결과만 담긴 카드로 나갑니다{onPreview ? ' · 미리보기' : ''}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          aria-label="결과 카드 이미지 저장"
          className="shrink-0 p-2.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ImageDown className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={busy}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FF6B5A] text-[#1C1C1C] text-xs font-bold hover:bg-[#FF6B5A]/90 transition-colors cursor-pointer disabled:opacity-60"
        >
          <Share2 className="w-4 h-4" /> 결과 공유하기
        </button>
      </div>
    </div>
  );
};
