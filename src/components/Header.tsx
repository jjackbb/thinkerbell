import React from 'react';
import { UserProfile } from '../types';
import { Key, User, Sparkles, MessageCircleHeart } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onOpenProfile: () => void;
  onOpenApiKeyModal: () => void;
  onOpenCreateStory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenProfile,
  onOpenApiKeyModal,
  onOpenCreateStory,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fffaf0]/90 backdrop-blur-md border-b border-[#ebe6d6] px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-lg shadow-md transform -rotate-2">
            <span className="text-[#ff4d8b]">니</span>편
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#0a0a0a] flex items-center gap-1 font-display">
              니편내편 <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ff4d8b] text-white">100% 익명</span>
            </h1>
            <p className="text-[11px] text-[#6a6a6a] font-medium hidden sm:block">
              억울할 땐 내 편 만들기 · 1초 투표 & AI 감정배출
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Write Button */}
          <button
            onClick={onOpenCreateStory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff4d8b] hover:bg-[#e03d78] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <MessageCircleHeart className="w-4 h-4" />
            <span>글쓰기</span>
          </button>

          {/* API Key Modal Button */}
          <button
            onClick={onOpenApiKeyModal}
            className="p-2 rounded-xl bg-[#f5f0e0] hover:bg-[#ebe6d6] text-[#0a0a0a] border border-[#e8e2d0] transition-colors cursor-pointer"
            title="Potens AI API Key 설정"
          >
            <Key className="w-4 h-4 text-[#ff4d8b]" />
          </button>

          {/* User Nickname Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f0e0] hover:bg-[#ebe6d6] border border-[#e8e2d0] rounded-xl text-xs sm:text-sm font-semibold text-[#0a0a0a] transition-all cursor-pointer"
          >
            <User className="w-4 h-4 text-[#1a3a3a]" />
            <span className="max-w-[100px] truncate">{user.nickname}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
