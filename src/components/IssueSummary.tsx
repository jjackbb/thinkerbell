import React from 'react';

interface IssueSummaryProps {
  mySide?: string;
  yourSide?: string;
}

/**
 * "이 사연의 쟁점" 카드.
 *
 * 사연 서비스의 가장 큰 이탈 지점은 "본문이 길다"이다. 양측 입장을 한 문장씩
 * 대칭으로 보여주면 본문을 다 읽지 않고도 투표할 수 있다. 네이트판 배틀톡이
 * 같은 자리에 쓰는 장치이기도 하다.
 *
 * 반드시 대칭이어야 한다. 한쪽만 그럴듯하게 쓰면 요약이 곧 유도가 된다.
 */
export const IssueSummary: React.FC<IssueSummaryProps> = ({ mySide, yourSide }) => {
  if (!mySide && !yourSide) return null;

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#f9fafb] p-3 mb-3">
      <p className="text-[11px] font-bold text-[#5f5e5e] mb-2">이 사연의 쟁점</p>

      <div className="flex flex-col gap-1.5">
        {yourSide && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6C7BE8] text-white">
              니 편
            </span>
            <p className="text-xs text-[#1C1C1C] leading-snug">{yourSide}</p>
          </div>
        )}
        {mySide && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B5A] text-white">
              내 편
            </span>
            <p className="text-xs text-[#1C1C1C] leading-snug">{mySide}</p>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-[#5f5e5e]">여러분은 어느 쪽인가요?</p>
    </div>
  );
};
