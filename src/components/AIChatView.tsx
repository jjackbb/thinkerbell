import React, { useState, useRef, useEffect } from 'react';
import { AIPersona, ChatMessage, ChatSession } from '../types';
import { Bot, Send, ArrowLeft, RefreshCw, Sparkles, HeartHandshake, Shield, MessageCircle, AlertCircle } from 'lucide-react';

interface AIChatViewProps {
  personas: AIPersona[];
  activeSession: ChatSession | null;
  onStartSession: (persona: AIPersona) => void;
  onEndSession: (sessionId: string) => void;
  potensApiKey: string;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  personas,
  activeSession,
  onStartSession,
  onEndSession,
  potensApiKey,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [empathyScore, setEmpathyScore] = useState(30); // 0 ~ 100%
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages || []);
      setEmpathyScore(activeSession.empathyScore || 35);
      const persona = personas.find(p => p.id === activeSession.personaId) || personas[0];
      setSelectedPersona(persona);
    }
  }, [activeSession, personas]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || !selectedPersona) return;

    const userMsgText = inputText.trim();
    setInputText('');

    const newUserMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Increase empathy meter gradually as conversation progresses
    setEmpathyScore(prev => Math.min(100, prev + Math.floor(Math.random() * 12) + 8));

    try {
      // Call streaming backend endpoint `/api/chat-stream`
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsgText,
          model: 'claude-4-6-sonnet',
          apiKey: potensApiKey,
          persona: selectedPersona.name,
          systemInstruction: selectedPersona.systemInstruction
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Server response error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      const aiMsgId = `ai-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text' && data.text) {
                aiResponseText += data.text;
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiResponseText } : m));
              }
            } catch (err) {
              // ignore parse errors for partial json
            }
          }
        }
      }

      if (!aiResponseText) {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `[${selectedPersona.name}] 야, 내 말 아직 안 끝났다. 네 말도 일리가 있긴 한데...` } : m));
      }

    } catch (err) {
      console.error('Chat error:', err);
      // Fallback message
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `[${selectedPersona?.name || '상대방'}] 너 진짜 말 다 했어? 내 입장에서도 변명할 기회는 줘야지! 내가 뭐 처음부터 작정하고 괴롭혔냐?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndChat = () => {
    setShowSummaryModal(true);
  };

  const confirmEndChat = () => {
    if (activeSession) {
      onEndSession(activeSession.id);
    }
    setShowSummaryModal(false);
  };

  // Clay styling
  const cardBgClasses: Record<string, string> = {
    pink: 'bg-[#ff4d8b] text-white',
    teal: 'bg-[#1a3a3a] text-white',
    lavender: 'bg-[#b8a4ed] text-[#0a0a0a]',
    peach: 'bg-[#ffb084] text-[#0a0a0a]',
    ochre: 'bg-[#e8b94a] text-[#0a0a0a]',
    cream: 'bg-[#f5f0e0] text-[#0a0a0a]',
  };

  // If no active session, show Persona Selection View
  if (!activeSession || !selectedPersona) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        {/* Banner Header */}
        <div className="bg-[#1a3a3a] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#ff4d8b] text-white text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI 1:1 대화 시뮬레이터
            </span>
            <span className="text-xs text-[#a4d4c5]">Potens AI (claude-4-6-sonnet) 탑재</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-2 font-display">
            갈등 상대방과 안전하게 1:1로 한판 붙으세요!
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-xl">
            현실에서 억눌렸던 분노와 서러움을 100% 안전한 AI 시뮬레이션으로 마음껏 분출하세요. 상대방 페르소나가 실제처럼 응대합니다.
          </p>
        </div>

        {/* Persona Grid */}
        <div>
          <h3 className="text-base font-bold text-[#0a0a0a] mb-3 flex items-center gap-1.5 font-display">
            <Bot className="w-5 h-5 text-[#ff4d8b]" /> 대화 상대 페르소나 선택
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => onStartSession(persona)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-1 flex flex-col justify-between ${
                  cardBgClasses[persona.cardColor] || cardBgClasses.cream
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-black/20 text-white">
                      {persona.category}
                    </span>
                    <span className="text-xs font-bold opacity-80">{persona.role}</span>
                  </div>

                  <h4 className="text-base font-bold mb-1 font-display">{persona.name}</h4>
                  <p className="text-xs opacity-90 line-clamp-2 leading-relaxed mb-4">
                    {persona.description}
                  </p>
                </div>

                <button className="w-full py-2.5 px-3 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                  <MessageCircle className="w-4 h-4 text-[#ff4d8b]" />
                  <span>1:1 대화 시작하기</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Chatroom View
  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[82vh] bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl shadow-xl overflow-hidden mb-20 relative">
      
      {/* Chat Top Header */}
      <div className="px-4 py-3 bg-[#1a3a3a] text-white flex items-center justify-between border-b border-[#2a4a4a]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndChat}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="대화 나가기"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <span>{selectedPersona.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff4d8b] text-white">
                {selectedPersona.role}
              </span>
            </h3>
            <p className="text-[11px] text-[#a4d4c5] font-medium">100% 익명 안전 대화 시뮬레이션</p>
          </div>
        </div>

        {/* Empathy Meter (내편지수) */}
        <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-2xl border border-white/10">
          <HeartHandshake className="w-4 h-4 text-[#ff4d8b]" />
          <div className="text-right">
            <div className="text-[10px] text-gray-300 font-bold">내편 지수</div>
            <div className="text-xs font-black text-[#ff4d8b]">{empathyScore}%</div>
          </div>
        </div>
      </div>

      {/* Empathy Progress Bar */}
      <div className="w-full bg-[#ebe6d6] h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#ff4d8b] to-[#b8a4ed] h-full transition-all duration-500"
          style={{ width: `${empathyScore}%` }}
        />
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#faf5e8]">
        <div className="text-center py-2">
          <span className="text-[11px] px-3 py-1 bg-[#f5f0e0] border border-[#e8e2d0] rounded-full text-[#6a6a6a] font-medium">
            🔒 본 대화는 세션 종료 시 휘발성으로 안전하게 삭제됩니다.
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-[10px] text-[#6a6a6a] mb-1 font-medium px-1">
              {msg.sender === 'user' ? '나 (익명)' : selectedPersona.name}
            </span>

            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-[#0a0a0a] text-white rounded-tr-none'
                  : 'bg-[#fffaf0] border border-[#e8e2d0] text-[#0a0a0a] rounded-tl-none font-medium'
              }`}
            >
              {msg.text || (
                <span className="inline-flex items-center gap-1.5 text-gray-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> 생각 중...
                </span>
              )}
            </div>

            <span className="text-[10px] text-gray-400 mt-0.5 px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#fffaf0] border-t border-[#ebe6d6] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="속마음을 거침없이 털어놓으세요 (최대 150자)"
          maxLength={150}
          disabled={isLoading}
          className="flex-1 p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-3 bg-[#0a0a0a] disabled:bg-gray-300 text-white rounded-2xl transition-all hover:bg-[#1f1f1f] active:scale-95 cursor-pointer"
        >
          <Send className="w-4 h-4 text-[#ff4d8b]" />
        </button>
        <button
          type="button"
          onClick={handleEndChat}
          className="px-3 py-3 bg-[#ff4d8b] text-white font-bold text-xs rounded-2xl hover:bg-[#e03d78] cursor-pointer whitespace-nowrap"
        >
          종료
        </button>
      </form>

      {/* Session End / Emotional Release Summary Modal */}
      {showSummaryModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff4d8b] text-white flex items-center justify-center mx-auto text-xl font-bold">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-[#0a0a0a] font-display">
              오늘의 감정 해소 완료! 🎉
            </h3>

            <div className="bg-[#f5f0e0] border border-[#e8e2d0] p-4 rounded-2xl text-left space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>최종 내편 지수:</span>
                <span className="text-base text-[#ff4d8b] font-black">{empathyScore}%</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#6a6a6a]">
                <span>대화한 메시지:</span>
                <span className="font-bold text-[#0a0a0a]">{messages.length}개</span>
              </div>
              <p className="text-xs text-[#3a3a3a] pt-2 border-t border-[#e8e2d0] leading-relaxed">
                속상했던 마음이 한결 가벼워지셨나요? 현실에서는 참았지만 당신의 판단과 서러움은 100% 정당했습니다!
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2.5 bg-[#f5f0e0] hover:bg-[#ebe6d6] text-[#0a0a0a] font-bold text-xs rounded-xl border border-[#e8e2d0] cursor-pointer"
              >
                대화 계속하기
              </button>
              <button
                onClick={confirmEndChat}
                className="flex-1 py-2.5 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                대화 완전히 끝내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
