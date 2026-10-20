import React from 'react';

/**
 * 투표 버튼 글자. 작성자가 역할을 적었으면 '니 편' 아래 작은 글씨로 역할을 붙인다
 * (예: 니 편 / 직장동료). 역할이 없으면 지금까지와 똑같이 '니 편'만 쓴다.
 */
export const SideVoteLabel: React.FC<{ side: '니 편' | '내 편'; role?: string | null }> = ({ side, role }) => {
  const trimmed = role?.trim();
  if (!trimmed) return <>{side}</>;
  return (
    <>
      <span className="block">{side}</span>
      <span className="block mt-0.5 text-[11px] font-medium opacity-80 truncate">{trimmed}</span>
    </>
  );
};
