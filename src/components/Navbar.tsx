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
            ? 'text-white font-bold'
            : 'text-[#9CA3AF] hover:text-[#3ECF8E] font-medium'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">home_storage</span>
        <span className="font-label-sm text-[11px]">Home</span>
      </button>

      <button
        onClick={() => onTabChange('ai-chat')}
        className={`flex flex-col items-center justify-center gap-1 font-mono transition-all cursor-pointer ${
          activeTab === 'ai-chat'
            ? 'text-white font-bold'
            : 'text-[#9CA3AF] hover:text-[#3ECF8E] font-medium'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">memory</span>
        <span className="font-label-sm text-[11px]">Ai 대화</span>
      </button>

      <button
        onClick={() => onTabChange('mypage')}
        className={`flex flex-col items-center justify-center gap-1 font-mono transition-all cursor-pointer ${
          activeTab === 'mypage'
            ? 'text-white font-bold'
            : 'text-[#9CA3AF] hover:text-[#3ECF8E] font-medium'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">person_pin</span>
        <span className="font-label-sm text-[11px]">마이</span>
      </button>
    </nav>
  );
};


