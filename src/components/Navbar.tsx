import React from 'react';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1C1C] flex justify-around items-center h-20 px-4 border-t border-[#1C1C1C]">
      <button
        onClick={() => onTabChange('feed')}
        className={`flex flex-col items-center justify-center gap-1 font-mono transition-all cursor-pointer ${
          activeTab === 'feed'
            ? 'text-[#3ECF8E] font-bold'
            : 'text-[#5f5e5e] hover:text-white font-medium'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">home_storage</span>
        <span className="font-label-sm text-[11px]">Home Feed</span>
      </button>

      <button
        onClick={() => onTabChange('ai-chat')}
        className={`flex flex-col items-center justify-center gap-1 font-mono transition-all cursor-pointer ${
          activeTab === 'ai-chat'
            ? 'text-[#3ECF8E] font-bold'
            : 'text-[#5f5e5e] hover:text-white font-medium'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">memory</span>
        <span className="font-label-sm text-[11px]">AI Simulation</span>
      </button>

      <button
        onClick={() => onTabChange('mypage')}
        className={`flex flex-col items-center justify-center gap-1 font-mono transition-all cursor-pointer ${
          activeTab === 'mypage'
            ? 'text-[#3ECF8E] font-bold'
            : 'text-[#5f5e5e] hover:text-white font-medium'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">person_pin</span>
        <span className="font-label-sm text-[11px]">My Page</span>
      </button>
    </nav>
  );
};


