import React from 'react';
import { Home, Bot, User } from 'lucide-react';

interface NavbarProps {
  activeTab: 'feed' | 'ai-chat' | 'mypage';
  onTabChange: (tab: 'feed' | 'ai-chat' | 'mypage') => void;
  unreadAICount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#fffaf0]/95 backdrop-blur-md border-t border-[#ebe6d6] px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Feed Tab */}
        <button
          onClick={() => onTabChange('feed')}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'feed'
              ? 'text-[#0a0a0a] bg-[#f5f0e0] font-bold shadow-xs'
              : 'text-[#6a6a6a] hover:text-[#0a0a0a] font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'feed' ? 'text-[#ff4d8b]' : ''}`} />
          <span className="text-xs">사연 피드</span>
        </button>

        {/* AI Simulation Tab */}
        <button
          onClick={() => onTabChange('ai-chat')}
          className={`relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'ai-chat'
              ? 'text-[#0a0a0a] bg-[#f5f0e0] font-bold shadow-xs'
              : 'text-[#6a6a6a] hover:text-[#0a0a0a] font-medium'
          }`}
        >
          <div className="relative">
            <Bot className={`w-5 h-5 ${activeTab === 'ai-chat' ? 'text-[#b8a4ed]' : ''}`} />
            <span className="absolute -top-1 -right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4d8b] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4d8b]"></span>
            </span>
          </div>
          <span className="text-xs">AI 시뮬레이션</span>
        </button>

        {/* MyPage Tab */}
        <button
          onClick={() => onTabChange('mypage')}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'mypage'
              ? 'text-[#0a0a0a] bg-[#f5f0e0] font-bold shadow-xs'
              : 'text-[#6a6a6a] hover:text-[#0a0a0a] font-medium'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'mypage' ? 'text-[#1a3a3a]' : ''}`} />
          <span className="text-xs">마이페이지</span>
        </button>
      </div>
    </nav>
  );
};
