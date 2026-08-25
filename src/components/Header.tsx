import React from 'react';
import { UserProfile } from '../types';
import { User, PlusCircle } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onOpenProfile: () => void;
  onOpenCreateStory: () => void;
  onGoHome: () => void;
  /**
   * 오른쪽 버튼(사연 등록·닉네임)을 보일지.
   *
   * 홈 탭에서는 감춘다. 사연 등록은 화면 하단에 계속 떠 있는 안내 바(데스크톱)와
   * 플로팅 버튼(모바일)이 이미 맡고 있고, 닉네임 버튼은 하단 '마이' 탭과
   * 완전히 같은 곳으로 가는 중복 진입점이었다.
   */
  showActions: boolean;

  /**
   * 로그인 없이 둘러보는 중인가.
   *
   * 게스트도 계정처럼 생긴 임시 정보를 들고 다니는데, 그 닉네임을 그대로
   * 띄우면 가입하지도 않은 사람에게 남의 이름표를 달아주는 꼴이 된다.
   */
  isGuest?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenProfile,
  onOpenCreateStory,
  onGoHome,
  showActions,
  isGuest = false,
}) => {
  return (
    <header className="w-full top-0 sticky z-50 bg-[#1C1C1C] flex items-center justify-between px-4 sm:px-8 h-16 border-b border-[#1C1C1C] shadow-sm">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onGoHome(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <span aria-hidden="true" className="material-symbols-outlined text-[#FF6B5A] text-2xl font-bold">terminal</span>
        <div>
          <h1 className="font-headline-lg text-xl sm:text-2xl font-black tracking-tighter text-[#FF6B5A] flex items-center gap-2">
            니편내편
          </h1>
        </div>
      </div>

      {/* Action Controls */}
      {showActions && (
      <div className="flex items-center gap-3">
        {/* Write Button */}
        <button
          onClick={onOpenCreateStory}
          /* 좁은 화면에서는 옆의 '사연 등록' 글자가 숨겨져 아이콘만 남는다.
             그때 이름 없는 버튼이 되지 않도록 aria-label을 따로 준다 */
          aria-label="사연 등록"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B5A] hover:bg-[#FF6B5A]/90 text-[#1C1C1C] font-mono text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">사연 등록</span>
        </button>


        {/* User Nickname Button */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-[#FF6B5A] rounded-lg font-mono text-xs font-medium text-white transition-all cursor-pointer"
        >
          <User className="w-4 h-4 text-[#FF6B5A]" aria-hidden="true" />
          <span className="max-w-[100px] truncate">
            {isGuest ? '둘러보는 중' : user.nickname}
          </span>
        </button>
      </div>
      )}
    </header>
  );
};


