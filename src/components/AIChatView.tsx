import React, { useState, useRef, useEffect } from 'react';
import { AIPersona, ChatMessage, ChatSession } from '../types';
import { Bot, ArrowLeft, RefreshCw, Send, Shield, Sparkles } from 'lucide-react';

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
  const [empathyScore, setEmpathyScore] = useState(70); // Tension/Empathy meter
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages || []);
      setEmpathyScore(activeSession.empathyScore || 70);
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

    try {
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
              // ignore parse error
            }
          }
        }
      }

      if (!aiResponseText) {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `[${selectedPersona.name}] 변명이 빠르시네요. 숫자나 이치에 맞게 다시 말해보세요.` } : m));
      }

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `[${selectedPersona?.name || '김팀장 (AI)'}] 데이터 검증이 제대로 안 된 것 같은데... 회의실로 바로 오시죠.`,
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

  // Selection view if no active session
  if (!activeSession || !selectedPersona) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        {/* Renegade Banner */}
        <div className="bg-[#e21500] text-white p-6 border-4 border-black elevated-tile">
          <div className="flex items-center gap-2 mb-2 font-mono">
            <span className="bg-black text-white px-2.5 py-0.5 text-xs font-black uppercase tracking-widest border border-white">
              POTENS AI TERMINAL
            </span>
            <span className="text-xs text-[#fffa82] font-bold">SECURE TERMINAL</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight mb-2">
            AI SIMULATION: HIGH-PRESSURE TERMINAL
          </h2>
          <p className="text-xs sm:text-sm text-white/90 font-bold leading-relaxed">
            현실에서 억눌렸던 분노와 서러움을 100% 안전한 AI 시뮬레이터로 마음껏 분출하세요.
          </p>
        </div>

        {/* Persona Cards */}
        <div>
          <h3 className="font-mono text-sm font-black text-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#e21500]">smart_toy</span> SELECT TARGET PERSONA
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => onStartSession(persona)}
                className="bg-white border-2 border-black p-5 flex flex-col justify-between cursor-pointer elevated-tile group hover:border-[#e21500]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 font-mono text-xs">
                    <span className="bg-[#cdbbff] text-black font-black px-2 py-0.5 border border-black uppercase">
                      {persona.category}
                    </span>
                    <span className="font-bold text-[#5e5e5e]">{persona.role}</span>
                  </div>

                  <h4 className="font-black text-lg text-black mb-1 group-hover:text-[#e21500] transition-colors">{persona.name}</h4>
                  <p className="text-xs text-black font-medium line-clamp-2 leading-relaxed mb-4">
                    {persona.description}
                  </p>
                </div>

                <button className="w-full py-2.5 bg-black text-white font-mono font-black text-xs border-2 border-black group-hover:bg-[#e21500] transition-colors flex items-center justify-center gap-1 uppercase">
                  <span className="material-symbols-outlined text-[16px] text-[#fffa82]">terminal</span>
                  <span>INITIATE CHAT</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Chatroom View (Red Intensity Specification)
  return (
    <div className="max-w-[420px] mx-auto flex flex-col h-[82vh] bg-white border-4 border-black elevated-tile overflow-hidden mb-24 relative grid-bg">
      {/* Header Section */}
      <header className="bg-[#e21500] text-white px-4 py-3 flex items-center justify-between z-50 border-b-4 border-black">
        <div className="flex items-center gap-3">
          <button onClick={handleEndChat} className="material-symbols-outlined text-white font-bold active:scale-95">
            arrow_back
          </button>
          <div>
            <h1 className="font-headline-md-mobile text-sm font-black uppercase tracking-tight italic">
              AI SIMULATION: {selectedPersona.name}
            </h1>
            <p className="font-mono text-[10px] text-white opacity-90 uppercase tracking-widest">
              ACTIVE SESSION • SECURE TERMINAL
            </p>
          </div>
        </div>
        <button onClick={handleEndChat} className="material-symbols-outlined text-white font-bold active:scale-95">
          close
        </button>
      </header>

      {/* Chat Canvas */}
      <main className="flex-1 overflow-y-auto chat-container p-4 space-y-4 relative">
        {/* System Message */}
        <div className="flex justify-center">
          <div className="bg-black text-white px-3 py-1 border-2 border-black">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
              Persona: {selectedPersona.role}
            </span>
          </div>
        </div>

        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex flex-col items-end max-w-[90%] ml-auto space-y-1">
                <div className="user-bubble bg-[#fff1f0] text-black p-3 border-2 border-[#e21500]">
                  <p className="font-body-base text-xs sm:text-sm font-bold leading-relaxed">{msg.text}</p>
                </div>
                <div className="flex items-center space-x-1 font-mono text-[10px] text-[#e21500] font-black uppercase">
                  <span>SENT {msg.timestamp}</span>
                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                </div>
              </div>
            );
          } else {
            return (
              <div key={msg.id} className="flex flex-col items-start max-w-[90%] space-y-1">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-7 h-7 bg-black flex items-center justify-center border border-black">
                    <span className="material-symbols-outlined text-[#e21500] text-[16px] font-bold">smart_toy</span>
                  </div>
                  <span className="font-mono text-xs font-black text-black uppercase">{selectedPersona.name}</span>
                </div>
                <div className="ai-bubble bg-white text-black p-3 border-2 border-black">
                  <p className="font-body-base text-xs sm:text-sm font-bold leading-relaxed">{msg.text || '...'}</p>
                </div>
                <span className="font-mono text-[10px] text-black font-black uppercase">
                  {msg.timestamp} READ BY SYSTEM
                </span>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />

        {/* Tension Level Visualizer */}
        <div className="py-3 border-t-2 border-b-2 border-black bg-white my-4">
          <div className="flex justify-between items-end mb-1 font-mono text-[11px] font-black">
            <span className="text-black uppercase tracking-widest">Tension Level</span>
            <span className="text-[#e21500] uppercase tracking-widest animate-pulse">Critical Zone</span>
          </div>
          <div className="h-5 w-full bg-[#e0e0e0] border-2 border-black flex overflow-hidden">
            <div className="h-full bg-black" style={{ width: `${100 - empathyScore}%` }}></div>
            <div className="h-full bg-[#e21500]" style={{ width: `${empathyScore}%` }}></div>
          </div>
          <div className="flex justify-between mt-1 font-mono text-[10px] font-black uppercase">
            <span className="text-black">Opponent</span>
            <span className="text-[#e21500]">Me</span>
          </div>
        </div>
      </main>

      {/* Input Footer Section */}
      <footer className="bg-white border-t-4 border-black p-3 pb-safe">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ENTER COMMAND..."
            rows={1}
            maxLength={150}
            className="flex-1 bg-white border-2 border-black px-3 py-2 font-mono text-xs font-bold focus:border-[#e21500] outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-[#e21500] text-white w-11 h-11 border-2 border-black flex items-center justify-center active:translate-y-0.5 shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <span className="material-symbols-outlined font-black text-[22px]">send</span>
          </button>
        </form>

        <div className="flex justify-center mt-2 gap-6">
          <button onClick={() => setMessages([])} className="flex items-center gap-1 text-black hover:text-[#e21500] font-mono text-[10px] font-black uppercase">
            <span className="material-symbols-outlined text-[16px]">replay</span> Reset System
          </button>
          <button onClick={handleEndChat} className="flex items-center gap-1 text-black hover:text-[#e21500] font-mono text-[10px] font-black uppercase">
            <span className="material-symbols-outlined text-[16px]">analytics</span> Run Analysis
          </button>
        </div>
      </footer>

      {/* End Modal */}
      {showSummaryModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 w-full max-w-xs text-center elevated-tile space-y-4">
            <div className="w-12 h-12 bg-[#e21500] text-white border-2 border-black flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
            <h3 className="font-mono text-base font-black text-black uppercase">SESSION TERMINATED</h3>
            <p className="font-mono text-xs text-black font-bold">
              억울한 심정이 조금은 풀리셨나요? 당신의 주장과 분노는 100% 정당했습니다.
            </p>
            <button onClick={confirmEndChat} className="w-full py-3 bg-[#e21500] text-white font-mono font-black border-2 border-black uppercase shadow-[2px_2px_0px_#000]">
              TERMINATE NOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

