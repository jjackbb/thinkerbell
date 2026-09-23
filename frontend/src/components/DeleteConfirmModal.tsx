import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '삭제 하시겠습니까?'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col p-6 text-center">
        <h2 className="text-xl font-bold text-[#1C1C1C] mb-6 mt-4">{title}</h2>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white text-[#5f5e5e] font-bold rounded-xl active:scale-95 transition-all cursor-pointer border border-[#E5E7EB] hover:bg-[#f3f4f5]"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-[#ba1a1a] text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-md hover:bg-[#901414]"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};
