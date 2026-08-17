import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Sparkles, Pin, MoreVertical, ShieldAlert, Trash2, X } from 'lucide-react';
import { AIPersona, ChatMessage, ChatSession } from '../types';

interface AIChatViewProps {
  personas: AIPersona[];
  activeSession: ChatSession | null;
  onStartSession: (persona: AIPersona) => void;
  onEndSession: (sessionId: string) => void;
  onUpdateSession?: (sessionId: string, personaId: string, updates: Partial<ChatSession>) => void;
  potensApiKey?: string;
  onOpenSettings?: () => void;
  onTogglePinPersona?: (personaId: string) => void;
  onDeletePersona?: (personaId: string) => void;
  onReportErrorPersona?: (personaId: string) => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  personas,
  activeSession,
  onStartSession,
  onEndSession,
  onUpdateSession,
  potensApiKey,
  onOpenSettings,
  onTogglePinPersona,
  onDeletePersona,
  onReportErrorPersona,
}) => {
  const [showChat, setShowChat] = useState<boolean>(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [empathyScore, setEmpathyScore] = useState(64);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [simEndResult, setSimEndResult] = useState<'success' | 'fail' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    if (activeSession) {
      const persona = personas.find(p => p.id === activeSession.personaId) || personas[0];
      setSelectedPersona(persona);
      if (activeSession.empathyScore !== undefined) {
        setEmpathyScore(activeSession.empathyScore);
      }
    }
  }, [activeSession?.personaId, activeSession?.empathyScore, activeSession?.explanationRatio, personas]);

  useEffect(() => {
    if (activeSession) {
      setShowChat(true);
      setMessages(activeSession.messages || []);
      setEmpathyScore(activeSession.empathyScore || 64);
      setSimEndResult(null);
    }
  }, [activeSession?.id]);

  useEffect(() => {
    if (activeSession && onUpdateSession) {
      onUpdateSession(activeSession.id, activeSession.personaId, { messages, empathyScore });
    }
  }, [messages, empathyScore, activeSession?.id, activeSession?.personaId, onUpdateSession]);

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
          systemInstruction: selectedPersona.systemInstruction,
          history: messages.slice(-8)
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

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.type === 'text' && data.text) {
                aiResponseText += data.text;
                let displayText = aiResponseText;
                if (displayText.includes('[SIM_END:SUCCESS]')) {
                  setSimEndResult('success');
                } else if (displayText.includes('[SIM_END:FAIL]')) {
                  setSimEndResult('fail');
                }
                displayText = displayText.replace(/\[SIM_END:(SUCCESS|FAIL)\]/g, '').trim();
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: displayText } : m));
              }
            } catch (err) {
              // ignore parse error for incomplete JSON if any
            }
          }
        }
      }

      if (aiResponseText) {
        let finalText = aiResponseText;
        if (finalText.includes('[SIM_END:SUCCESS]')) {
          setSimEndResult('success');
        } else if (finalText.includes('[SIM_END:FAIL]')) {
          setSimEndResult('fail');
        }
        finalText = finalText.replace(/\[SIM_END:(SUCCESS|FAIL)\]/g, '').trim();
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: finalText } : m));
      } else {
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
    setShowDeleteModal(true);
  };

  const confirmEndChat = () => {
    if (activeSession) {
      if (onDeletePersona && selectedPersona) {
        onDeletePersona(selectedPersona.id);
      }
      onEndSession(activeSession.id);
    }
    setShowDeleteModal(false);
  };

  // Persona Selection View
  if (!activeSession || !selectedPersona || !showChat) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        {/* Banner */}
        <div className="bg-[#1C1C1C] text-white p-8 rounded-lg border border-[#1C1C1C] relative overflow-hidden">
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
            <span className="w-2 h-2 rounded-full bg-[#FF6B5A]"></span> SELECT PERSONA
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => {
                  if (activeSession && activeSession.personaId === persona.id) {
                    setShowChat(true);
                  } else {
                    onStartSession(persona);
                  }
                }}
                className="bg-white border border-[#E5E7EB] hover:border-[#FF6B5A] p-6 rounded-lg flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#f3f4f5] text-[#1C1C1C] font-semibold rounded">
                        {persona.category}
                      </span>
                      {persona.isPinned && (
                        <span className="px-2.5 py-0.5 bg-[#FF6B5A] text-white font-semibold rounded flex items-center gap-1">
                          <Pin className="w-3 h-3" /> 고정
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 relative">
                      <span className="text-[#5f5e5e] font-medium">{persona.role}</span>
                      <div ref={openMenuId === persona.id ? menuRef : null}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === persona.id ? null : persona.id);
                          }}
                          className="text-[#5f5e5e] hover:text-[#1C1C1C] cursor-pointer p-0.5"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === persona.id && (
                          <div className="absolute right-0 top-6 w-32 bg-white rounded-md shadow-lg border border-[#E5E7EB] z-50 py-1 font-body-sm text-xs">
                            {onTogglePinPersona && (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onTogglePinPersona(persona.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#1C1C1C] flex items-center gap-2 cursor-pointer">
                                <Pin className="w-3.5 h-3.5" /> {persona.isPinned ? '고정 해제' : '고정'}
                              </button>
                            )}
                            {onReportErrorPersona && (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onReportErrorPersona(persona.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#1C1C1C] flex items-center gap-2 cursor-pointer border-t border-[#E5E7EB]">
                                <ShieldAlert className="w-3.5 h-3.5" /> 오류 신고
                              </button>
                            )}
                            {onDeletePersona && (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDeletePersona(persona.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#ba1a1a] flex items-center gap-2 cursor-pointer border-t border-[#E5E7EB]">
                                <Trash2 className="w-3.5 h-3.5" /> 삭제
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-base text-[#1C1C1C] mb-2 group-hover:text-[#FF6B5A] transition-colors">{persona.name}</h4>
                  <p className="text-xs text-[#5f5e5e] line-clamp-2 leading-relaxed mb-6">
                    {persona.description}
                  </p>
                </div>

                <button className="w-full py-3 bg-[#1C1C1C] group-hover:bg-[#FF6B5A] text-white group-hover:text-[#1C1C1C] font-mono font-bold text-xs rounded transition-colors flex items-center justify-center gap-2">
                  <span>시작하기</span>
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
          <button onClick={() => {
            if (activeSession.messages.length <= 1 && onDeletePersona) {
              onDeletePersona(selectedPersona.id);
            }
            setShowChat(false);
          }} className="material-symbols-outlined text-[#FF6B5A] cursor-pointer hover:opacity-80">
            arrow_back
          </button>
          <div>
            <h1 className="font-headline-md text-base font-bold text-white flex items-center gap-2 max-w-[200px] sm:max-w-xs md:max-w-md">
              <span className="truncate">{activeSession.storyTitle || selectedPersona.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FF6B5A]/20 text-[#FF6B5A] rounded border border-[#FF6B5A]/30 font-semibold shrink-0">
                {selectedPersona.role}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(activeSession.chatMode === 'explanation' || ['내 편 100%', '반반', '상대편 100%', '상대편 입장 100%'].includes(selectedPersona.role)) && onOpenSettings && (
            <button onClick={onOpenSettings} className="material-symbols-outlined text-[#5f5e5e] hover:text-[#FF6B5A] cursor-pointer transition-colors" title="공감 비율 설정 변경">
              settings
            </button>
          )}
          <button onClick={() => setShowDeleteModal(true)} className="material-symbols-outlined text-[#5f5e5e] hover:text-white cursor-pointer">
            close
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto chat-container p-6 space-y-4 bg-[#f8f9fa] flex flex-col">
        {messages.length === 0 && (
          <div className="my-auto max-w-md mx-auto text-center py-12 px-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-[#FF6B5A]/20 text-[#FF6B5A] flex items-center justify-center mx-auto mb-2 font-mono text-xl border border-[#FF6B5A]/30 font-bold">
              {activeSession?.chatMode === 'explanation' ? '☕' : '💬'}
            </div>
            <h3 className="font-headline-md font-bold text-base sm:text-lg text-[#1C1C1C]">
              {activeSession?.chatMode === 'explanation' 
                ? `${selectedPersona.role || '공감'} 1:1 라운지`
                : `${selectedPersona.name}와의 1:1 대화 시뮬레이션`}
            </h3>
            <p className="font-body-sm text-xs sm:text-sm text-[#5f5e5e] leading-relaxed">
              {activeSession?.chatMode === 'explanation' ? (
                <>
                  사연 속 속상하고 답답했던 마음을 편안하게 털어놓아 보세요.
                  <br />
                  <span className="font-semibold text-[#1C1C1C]">친구와 카톡하듯</span> 온전한 공감과 따뜻한 위로를 나눌 수 있습니다.
                </>
              ) : (
                <>
                  사연 속 상대방 페르소나와 실전 대화를 시작해보세요!
                  <br />
                  <span className="font-semibold text-[#1C1C1C]">"내 입장을 명확히 전달"</span>하거나, <span className="font-semibold text-[#FF6B5A] bg-[#1C1C1C] px-1.5 py-0.5 rounded text-xs ml-0.5">화해와 타협안</span>을 이끌어내보세요.
                </>
              )}
            </p>
            <p className="font-mono text-[11px] text-[#5f5e5e] pt-4">
              👇 하단 입력창에 편하게 메시지를 적고 <span className="text-[#FF6B5A] font-bold bg-[#1C1C1C] px-1.5 py-0.5 rounded">보내기</span> 를 누르세요!
            </p>
          </div>
        )}

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
                  <span className="w-2 h-2 rounded-full bg-[#FF6B5A]"></span>
                  <span className="text-[#5f5e5e] font-medium">{selectedPersona.role}</span>
                </div>
                <div className="bg-white border border-[#E5E7EB] text-[#1C1C1C] p-4 rounded-lg shadow-2xs">
                  <p className="font-body-sm text-xs sm:text-sm font-medium leading-relaxed">
                    {(msg.text || '...').replace(/\[SIM_END:(SUCCESS|FAIL)\]/g, '').trim()}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[#5f5e5e] px-1">{msg.timestamp}</span>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* 4턴 이상 오갔을 때 사용자 직접 종결 유도 바 (시뮬레이션 모드에서만 동작) */}
      {!simEndResult && activeSession?.chatMode !== 'explanation' && messages.filter(m => m.sender === 'user').length >= 4 && !isLoading && (
        <div className="bg-[#f3f4f5] border-t border-[#E5E7EB] p-3 px-6 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <span className="text-xs text-[#5f5e5e] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B5A] animate-ping"></span>
            충분한 대화가 오갔습니다. 대화를 이만 매듭짓고 결과를 결정하시겠습니까?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimEndResult('success')}
              className="px-3 py-1.5 bg-[#FF6B5A] text-[#1C1C1C] text-xs font-bold font-mono rounded hover:bg-[#FF6B5A]/90 transition-all cursor-pointer shadow-2xs"
            >
              🤝 화해로 끝내기
            </button>
            <button
              type="button"
              onClick={() => setSimEndResult('fail')}
              className="px-3 py-1.5 bg-[#1C1C1C] text-white text-xs font-bold font-mono rounded hover:bg-[#1C1C1C]/90 transition-all cursor-pointer shadow-2xs"
            >
              ⚡ 결렬로 끝내기
            </button>
          </div>
        </div>
      )}

      {/* Input / Simulation Result Footer */}
      {simEndResult ? (
        <footer className="bg-[#1C1C1C] text-white p-6 border-t border-[#E5E7EB] transition-all animate-fadeIn">
          <div className="max-w-xl mx-auto flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2">
              {simEndResult === 'success' ? (
                <span className="px-3.5 py-1.5 bg-[#FF6B5A] text-[#1C1C1C] rounded-full text-xs font-bold font-mono shadow-md flex items-center gap-1.5">
                  🎉 SIMULATION RESOLVED : 대화 화해 & 합의 성공!
                </span>
              ) : (
                <span className="px-3.5 py-1.5 bg-[#ba1a1a] text-white rounded-full text-xs font-bold font-mono shadow-md flex items-center gap-1.5">
                  ⚡ SIMULATION ENDED : 평행선 & 협상 결렬
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-body-sm text-[#E5E7EB] leading-relaxed">
              {simEndResult === 'success' 
                ? '합리적이고 따뜻한 설득으로 갈등이 아름답게 해소되었습니다. 오늘의 시뮬레이션 경험을 실전에서도 십분 발휘해보세요!'
                : '서로의 확고한 입장 차이를 확인하고 대화가 마무리되었습니다. 때로는 적당한 간격을 두는 것이 지혜로운 해답이 될 수 있습니다.'}
            </p>
            <div className="flex gap-3 w-full justify-center pt-2">
              <button
                type="button"
                onClick={() => setSimEndResult(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-white/20"
              >
                🔄 종결 취소하고 계속 대화
              </button>
              <button
                type="button"
                onClick={confirmEndChat}
                className="px-5 py-2 bg-[#FF6B5A] text-[#1C1C1C] rounded-lg text-xs font-bold hover:bg-[#FF6B5A]/90 transition-colors cursor-pointer shadow-md font-mono"
              >
                ✨ 시뮬레이션 완료 및 닫기
              </button>
            </div>
          </div>
        </footer>
      ) : (
        <footer className="bg-white border-t border-[#E5E7EB] p-4">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-[#f8f9fa] border border-[#E5E7EB] rounded-lg px-4 py-3 font-body-sm text-xs sm:text-sm focus:outline-none focus:border-[#FF6B5A]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] px-5 py-3 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              보내기
            </button>
          </form>
        </footer>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-[#1C1C1C] font-headline-md">삭제 하시겠습니까?</h2>
                <button onClick={() => setShowDeleteModal(false)} className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#5f5e5e] mb-6 font-body-sm">
                지금까지 대화한 내용이 전부 삭제됩니다
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 bg-white border border-[#E5E7EB] text-[#1C1C1C] rounded-lg font-bold text-sm hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button 
                  onClick={confirmEndChat}
                  className="flex-1 py-2.5 bg-[#ba1a1a] text-white rounded-lg font-bold text-sm hover:bg-[#ba1a1a]/90 transition-colors cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


