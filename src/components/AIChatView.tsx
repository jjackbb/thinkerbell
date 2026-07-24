import React, { useState, useRef, useEffect } from 'react';
import { AIPersona, ChatMessage, ChatSession } from '../types';

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
  const [empathyScore, setEmpathyScore] = useState(64); // 0 ~ 100%
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages || []);
      setEmpathyScore(activeSession.empathyScore || 64);
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
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `[${selectedPersona.name}] 논리적으로 다시 설명해 보세요.` } : m));
      }

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `[${selectedPersona?.name || '상대방'}] 그 논리가 정말 맞다고 생각하시나요? 제 입장도 들어보세요.`,
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

  // Persona Selection View
  if (!activeSession || !selectedPersona) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        {/* Banner */}
        <div className="bg-[#1C1C1C] text-white p-8 rounded-lg border border-[#1C1C1C] relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 font-mono text-xs">
            <span className="bg-[#3ECF8E]/20 text-[#3ECF8E] px-2.5 py-0.5 rounded font-bold border border-[#3ECF8E]/30">
              AI SIMULATION ENGINE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-headline-lg mb-2 text-white">
            1:1 AI 대화 시뮬레이션
          </h2>
          <p className="text-[#5f5e5e] font-body-sm text-xs sm:text-sm max-w-xl">
            갈등 상대방의 페르소나와 안전하고 이성적인 1:1 디베이트를 진행하세요.
          </p>
        </div>

        {/* Persona Cards */}
        <div>
          <h3 className="font-label-md text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3ECF8E]"></span> SELECT PERSONA
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => onStartSession(persona)}
                className="bg-white border border-[#E5E7EB] hover:border-[#3ECF8E] p-6 rounded-lg flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="px-2.5 py-0.5 bg-[#f3f4f5] text-[#1C1C1C] font-semibold rounded">
                      {persona.category}
                    </span>
                    <span className="text-[#5f5e5e] font-medium">{persona.role}</span>
                  </div>

                  <h4 className="font-bold text-base text-[#1C1C1C] mb-2 group-hover:text-[#3ECF8E] transition-colors">{persona.name}</h4>
                  <p className="text-xs text-[#5f5e5e] line-clamp-2 leading-relaxed mb-6">
                    {persona.description}
                  </p>
                </div>

                <button className="w-full py-3 bg-[#1C1C1C] group-hover:bg-[#3ECF8E] text-white group-hover:text-[#1C1C1C] font-mono font-bold text-xs rounded transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">memory</span>
                  <span>SIMULATION START</span>
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
    <div className="max-w-2xl mx-auto flex flex-col h-[82vh] bg-white border border-[#E5E7EB] rounded-lg overflow-hidden mb-24 relative shadow-sm">
      {/* Header */}
      <header className="bg-[#1C1C1C] text-white px-6 py-4 flex items-center justify-between z-50 border-b border-[#1C1C1C]">
        <div className="flex items-center gap-3">
          <button onClick={handleEndChat} className="material-symbols-outlined text-[#3ECF8E] cursor-pointer hover:opacity-80">
            arrow_back
          </button>
          <div>
            <h1 className="font-headline-md text-base font-bold text-white flex items-center gap-2">
              AI SIM: {selectedPersona.name}
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#3ECF8E]/20 text-[#3ECF8E] rounded border border-[#3ECF8E]/30 font-semibold">
                {selectedPersona.role}
              </span>
            </h1>
          </div>
        </div>
        <button onClick={handleEndChat} className="material-symbols-outlined text-[#5f5e5e] hover:text-white cursor-pointer">
          close
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto chat-container p-6 space-y-4 bg-[#f8f9fa]">
        <div className="text-center py-2">
          <span className="font-mono text-[11px] px-3 py-1 bg-white border border-[#E5E7EB] rounded text-[#5f5e5e]">
            🔒 SECURE TERMINAL • EXPLICIT LOGIC ENGINE ACTIVE
          </span>
        </div>

        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
                <div className="bg-[#1C1C1C] text-white p-4 rounded-lg shadow-2xs">
                  <p className="font-body-sm text-xs sm:text-sm font-medium leading-relaxed">{msg.text}</p>
                </div>
                <span className="font-mono text-[10px] text-[#5f5e5e] px-1">{msg.timestamp}</span>
              </div>
            );
          } else {
            return (
              <div key={msg.id} className="flex flex-col items-start max-w-[85%] space-y-1">
                <div className="flex items-center space-x-2 mb-1 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#3ECF8E]"></span>
                  <span className="font-bold text-[#1C1C1C]">{selectedPersona.name}</span>
                </div>
                <div className="bg-white border border-[#E5E7EB] text-[#1C1C1C] p-4 rounded-lg shadow-2xs">
                  <p className="font-body-sm text-xs sm:text-sm font-medium leading-relaxed">{msg.text || '...'}</p>
                </div>
                <span className="font-mono text-[10px] text-[#5f5e5e] px-1">{msg.timestamp}</span>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="bg-white border-t border-[#E5E7EB] p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Share your logic..."
            disabled={isLoading}
            className="flex-1 bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg px-4 py-3 font-body-sm text-xs sm:text-sm focus:outline-none focus:border-[#3ECF8E]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-[#1C1C1C] hover:bg-black text-[#3ECF8E] px-5 py-3 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            EXECUTE
          </button>
        </form>
      </footer>

      {/* End Modal */}
      {showSummaryModal && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 w-full max-w-sm text-center shadow-lg space-y-4">
            <h3 className="font-mono text-base font-bold text-[#1C1C1C] uppercase">SIMULATION CONCLUDED</h3>
            <p className="font-body-sm text-xs text-[#5f5e5e] leading-relaxed">
              서로의 입장을 논리적으로 전달하고 대화를 마쳤습니다.
            </p>
            <button
              onClick={confirmEndChat}
              className="w-full py-3 bg-[#1C1C1C] text-[#3ECF8E] font-mono font-bold text-xs rounded hover:bg-black transition-colors"
            >
              CLOSE TERMINAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


