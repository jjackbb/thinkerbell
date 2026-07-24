import React from 'react';
import { UserProfile } from '../types';
import { Key, User, PlusCircle } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-[#e21500] text-white px-4 py-3 flex items-center justify-between border-b-4 border-black">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="w-9 h-9 bg-black flex items-center justify-center border-2 border-white shadow-[2px_2px_0px_#000]">
          <span className="material-symbols-outlined text-[#e21500] text-[20px] font-extrabold" style={{ fontVariationSettings: "'FILL' 1" }}>flame</span>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter italic uppercase text-white flex items-center gap-2">
            니편내편 <span className="text-[10px] not-italic px-2 py-0.5 bg-black text-white font-mono border border-white uppercase tracking-widest font-bold">RENEGADE RED</span>
          </h1>
          <p className="text-[10px] text-white/90 font-mono tracking-widest uppercase hidden sm:block">
            100% ANONYMOUS VERDICT • AI SIMULATION
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Write Button */}
        <button
          onClick={onOpenCreateStory}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-black/80 text-white font-mono text-xs font-black border-2 border-black active:translate-y-0.5 shadow-[2px_2px_0px_#fff] transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[#e21500]" />
          <span className="hidden sm:inline">글쓰기</span>
        </button>

        {/* API Key Modal Button */}
        <button
          onClick={onOpenApiKeyModal}
          className="p-1.5 bg-white text-black border-2 border-black active:translate-y-0.5 shadow-[2px_2px_0px_#000] transition-colors cursor-pointer"
          title="Potens AI API Key 설정"
        >
          <Key className="w-4 h-4 text-[#e21500]" />
        </button>

        {/* User Nickname Button */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black border-2 border-black font-mono text-xs font-black active:translate-y-0.5 shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
        >
          <User className="w-4 h-4 text-[#e21500]" />
          <span className="max-w-[100px] truncate">{user.nickname}</span>
        </button>
      </div>
    </header>
  );
};

