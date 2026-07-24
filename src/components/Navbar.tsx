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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white border-t-4 border-black pb-safe pt-1 h-20 shadow-[0px_-4px_0px_#000]">
      <button
        onClick={() => onTabChange('feed')}
        className={`flex flex-col items-center justify-center h-full px-6 py-1 transition-all cursor-pointer active:scale-95 ${
          activeTab === 'feed'
            ? 'bg-[#e21500] text-white border-2 border-black -translate-y-1 shadow-[2px_2px_0px_#000]'
            : 'text-black hover:text-[#e21500]'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">home</span>
        <span className="font-mono text-[10px] mt-0.5 font-black uppercase">FEED</span>
      </button>

      <button
        onClick={() => onTabChange('ai-chat')}
        className={`flex flex-col items-center justify-center h-full px-6 py-1 transition-all cursor-pointer active:scale-95 ${
          activeTab === 'ai-chat'
            ? 'bg-[#e21500] text-white border-2 border-black -translate-y-1 shadow-[2px_2px_0px_#000]'
            : 'text-black hover:text-[#e21500]'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]">smart_toy</span>
        <span className="font-mono text-[10px] mt-0.5 font-black uppercase">AI SIM</span>
      </button>

      <button
        onClick={() => onTabChange('mypage')}
        className={`flex flex-col items-center justify-center h-full px-6 py-1 transition-all cursor-pointer active:scale-95 ${
          activeTab === 'mypage'
            ? 'bg-[#e21500] text-white border-2 border-black -translate-y-1 shadow-[2px_2px_0px_#000]'
            : 'text-black hover:text-[#e21500]'
        }`}
      >
        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        <span className="font-mono text-[10px] mt-0.5 font-black uppercase">MY PAGE</span>
      </button>
    </nav>
  );
};

