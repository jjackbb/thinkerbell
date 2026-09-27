import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Sparkles, Pin, MoreVertical, ShieldAlert, Trash2, X } from 'lucide-react';
import { AIPersona, ChatMessage, ChatSession } from '../types';
import { SessionSummaryCard } from './SessionSummaryCard';
import { detectSimEnd, stripSimEnd } from '../lib/prompts';
import { track, trackOnce } from '../lib/events';
import { supabase } from '../lib/supabase';
import { submitAiFeedback } from '../lib/aiFeedback';
import { messagesBeforeRetry } from '../lib/chatRetry';

const FEEDBACK_CHOICES = [
  '전혀 도움 안 됨', '별로 도움 안 됨', '보통', '조금 도움 됨', '매우 도움 됨',
] as const;

interface AIChatViewProps {
  /** 위기 표현이 감지되면 알린다 (전송은 막지 않는다) */
  onCrisisDetected?: (text: string) => void;
  /** 이 대화가 붙어 있는 사연에서 '내 편'을 고른 사람 수 */
  supporterCount?: number;
  personas: AIPersona[];
  activeSession: ChatSession | null;
  onStartSession: (persona: AIPersona) => void;
  onEndSession: (sessionId: string) => void;
  onUpdateSession?: (sessionId: string, personaId: string, updates: Partial<ChatSession>) => void;
  onSaveTurn?: (personaId: string, messages: ChatMessage[]) => Promise<boolean>;
  onQuotaChanged?: () => void;
  onOpenSettings?: () => void;
  onTogglePinPersona?: (personaId: string) => void;
  onDeletePersona?: (personaId: string) => Promise<boolean> | boolean;
  onReportErrorPersona?: (personaId: string) => void;
  /** 대화가 하나도 없을 때 사연을 보러 가는 길 */
  onGoToFeed?: () => void;
  /**
   * 대화를 마쳤을 때 원래 보던 사연으로 돌려보낸다.
   *
   * AI 대화는 사연 상세에서 시작되는데, 들어오는 순간 그 사연이 닫힌다.
   * 돌아갈 길이 없으면 "사연 → AI → 다시 사연"이라는 5분짜리 흐름이 끊긴다.
   */
  onReturnToStory?: (storyId: string) => void;
  /** 로그인 없이 둘러보는 중인가. 넘어오지 않으면 로그인한 사용자로 본다 */
  isGuest?: boolean;
  /**
   * 로그인이 필요한 자리에서 부른다.
   * 이 컴포넌트가 자기 모달을 따로 띄우면 같은 상황인데도 화면마다 다른 안내가
   * 나오므로, 앱이 한 곳에서 띄우도록 위로 올려 보낸다.
   */
  onRequireLogin?: (message: string) => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  onCrisisDetected,
  supporterCount,
  personas,
  onGoToFeed,
  onReturnToStory,
  activeSession,
  onStartSession,
  onEndSession,
  onUpdateSession,
  onSaveTurn,
  onQuotaChanged,
  onOpenSettings,
  onTogglePinPersona,
  onDeletePersona,
  onReportErrorPersona,
  isGuest = false,
  onRequireLogin,
}) => {
  const [showChat, setShowChat] = useState<boolean>(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // 아직 대화를 시작하지 않은 채 나갈 때, 지울지 남길지 사용자가 고르게 한다
  const [showExitChoice, setShowExitChoice] = useState(false);
  const [simEndResult, setSimEndResult] = useState<'success' | 'fail' | null>(null);
  // 요약 카드에서 되짚어 온 말풍선을 잠깐 표시해 둔다
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  /** 답장을 못 받아서 되돌려줄 내 말. 있으면 '다시 보내기'가 뜬다 */
  const [failedText, setFailedText] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const successfulTurns = useRef(0);
  const episodeKey = useRef(crypto.randomUUID());
  const pendingRequestId = useRef<string | null>(null);

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
      const persona = personas.find(p => p.id === activeSession.personaId) ?? null;
      setSelectedPersona(persona);
    }
  }, [activeSession?.personaId, activeSession?.explanationRatio, personas]);

  useEffect(() => {
    if (activeSession) {
      setShowChat(true);
      setMessages(activeSession.messages || []);
      setSimEndResult(null);
      setSaveFailed(false);
      setShowFeedback(false);
      setFeedbackError(false);
      successfulTurns.current = 0;
      episodeKey.current = crypto.randomUUID();
    }
  }, [activeSession?.id]);

  /**
   * 주고받은 대화만 위(App)로 올려 보관한다.
   *
   * 여기서 다른 값까지 같이 올리지 말 것. App이 소유한 값을 위 effect가
   * 내려받고 이 effect가 다시 올려보내면 두 값이 서로를 계속 덮어써서
   * 렌더가 무한히 반복된다. 실제로 empathyScore가 그 사고를 냈다.
   */
  useEffect(() => {
    if (activeSession && onUpdateSession) {
      onUpdateSession(activeSession.id, activeSession.personaId, { messages });
    }
  }, [messages, activeSession?.id, activeSession?.personaId, onUpdateSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /**
   * 카드/버튼에서 같은 대화방으로 들어가는 길.
   *
   * 이미 열려 있는 대화방이면 그 화면으로 돌아가고, 아니면 새로 시작한다.
   */
  const openPersona = (persona: AIPersona) => {
    if (!isGuest) track('ai_chat_open', {
      mode: persona.opening ? 'simulation' : persona.ratio ? 'explanation' : 'legacy',
    });
    if (activeSession && activeSession.personaId === persona.id) {
      setShowChat(true);
    } else {
      onStartSession(persona);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    // 게스트에게는 입력창 자체를 내주지 않지만, 다른 길로 이 함수가 불려도
    // 대화가 나가지 않게 여기서 한 번 더 막는다
    if (isGuest) return;
    if (!inputText.trim() || isLoading || isSaving || failedText || !selectedPersona) return;

    const userMsgText = inputText.trim();
    setInputText('');
    await sendMessage(userMsgText);
  };

  /**
   * 실제로 한 마디를 보내는 곳. 입력창에서도, 실패 후 '다시 보내기'에서도
   * 같은 길을 쓰도록 분리해 두었다.
   */
  const sendMessage = async (userMsgText: string, retry = false) => {
    if (!selectedPersona || isLoading || isSaving || (saveFailed && !retry) || (failedText && !retry)) return;

    // 실패한 전송의 말풍선과 안내를 교체한다. 그대로 덧붙이면 재시도 한 번이
    // 두 번의 사용자 발언처럼 저장되고 다음 AI 요청의 이력에도 중복된다.
    const retryBase = retry ? messagesBeforeRetry(messages, userMsgText) : messages;
    const requestId = pendingRequestId.current ?? crypto.randomUUID();
    pendingRequestId.current = requestId;
    setFailedText(null);
    setSaveFailed(false);
    onCrisisDetected?.(userMsgText);

    const newUserMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...retryBase, newUserMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    let aiMsgId: string | null = null;
    let saveErrorOccurred = false;
    let quotaReached = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        onRequireLogin?.('AI 대화를 하려면 로그인해 주세요.');
        throw new Error('auth_required');
      }
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: userMsgText,
          personaId: selectedPersona.id,
          requestId,
        })
      });

      if (!response.ok || !response.body) {
        const failure = await response.json().catch(() => ({}));
        quotaReached = failure.error === 'AI_QUOTA_REACHED';
        if (failure.error !== 'AI_REQUEST_IN_PROGRESS') pendingRequestId.current = null;
        throw new Error(typeof failure.error === 'string' ? failure.error : 'Server response error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';
      let completed = false;
      let persistedByServer = false;
      let counted = false;

      const markAnswerComplete = () => {
        if (counted || !stripSimEnd(aiResponseText).trim()) return;
        counted = true;
        successfulTurns.current += 1;
        if (successfulTurns.current === 1) {
          trackOnce(`ai_chat_turn1:${episodeKey.current}`, 'ai_chat_turn1', { mode: activeSession?.chatMode });
        }
        if (successfulTurns.current === 3) {
          trackOnce(`ai_chat_turn3:${episodeKey.current}`, 'ai_chat_turn3', { mode: activeSession?.chatMode });
        }
      };

      aiMsgId = `ai-${Date.now()}`;
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: '',
          timestamp: aiTimestamp
        }
      ]);

      let buffer = '';
      const handleStreamLine = (line: string) => {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data: ')) return;
        if (trimmedLine === 'data: [DONE]') {
          completed = true;
          return;
        }
        let data: { type?: string; text?: string; error?: string; persisted?: boolean };
        try { data = JSON.parse(trimmedLine.slice(6)); }
        catch { throw new Error('invalid_stream_event'); }
        if (data.type === 'error') {
          saveErrorOccurred = data.error === 'ai_save_failed';
          pendingRequestId.current = null;
          throw new Error(data.error || 'ai_unavailable');
        }
        if (data.type === 'provider_done') markAnswerComplete();
        if (data.type === 'done') {
          completed = true;
          persistedByServer = data.persisted === true;
          markAnswerComplete();
        }
        if (data.type === 'text' && data.text) {
          aiResponseText += data.text;
          const displayText = stripSimEnd(aiResponseText);
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: displayText } : m));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) handleStreamLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleStreamLine(buffer);

      if (completed && stripSimEnd(aiResponseText).trim()) {
        const ended = detectSimEnd(aiResponseText);
        const finalText = stripSimEnd(aiResponseText);
        const finalMessages: ChatMessage[] = [...updatedMessages, { id: aiMsgId, sender: 'ai', text: finalText, timestamp: aiTimestamp, requestId }];
        setMessages(finalMessages);
        setIsLoading(false);

        pendingRequestId.current = null;
        if (persistedByServer) onQuotaChanged?.();

        let saved = persistedByServer;
        if (!persistedByServer) {
          setIsSaving(true);
          try { saved = await onSaveTurn?.(selectedPersona.id, finalMessages) ?? false; }
          catch { saved = false; }
          setIsSaving(false);
        }
        setSaveFailed(!saved);
        if (saved && ended) setSimEndResult(ended);
        track(saved ? 'operation_success' : 'operation_error', {
          operation: 'ai_reply_save',
          ...(saved ? { outcome: 'completed' } : { error_code: 'save_failed' }),
        });
      } else {
        throw new Error(completed ? 'empty_response' : 'incomplete_response');
      }

    } catch (err) {
      /*
        예전에는 여기서 페르소나 대사를 하나 지어내 붙였다. 사용자는 AI가
        대답한 줄 알고, 우리는 AI가 멈춘 줄 모른다. 둘 다 최악이다.
      */
      if (saveErrorOccurred) {
        track('operation_error', { operation: 'ai_reply_save', error_code: 'save_failed' });
      }
      setMessages(prev => [
        ...(saveErrorOccurred ? prev : prev.filter(m => m.id !== aiMsgId)),
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: saveErrorOccurred
            ? '답변이 나왔지만 저장되지 않았어요. 입력은 남아 있어요. 다시 보내면 새 답변을 받습니다.'
            : quotaReached
              ? '오늘 새 AI 대화 이용 횟수를 모두 썼어요. 기존 대화는 이어갈 수 있습니다.'
              : '답장을 받지 못했어요. 잠시 뒤 다시 보내주세요.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setFailedText(userMsgText);
    } finally {
      setIsLoading(false);
    }
  };

  const retrySave = () => {
    if (!saveFailed || isLoading || isSaving) return;
    const lastInput = [...messages].reverse().find(m => m.sender === 'user')?.text;
    if (lastInput) void sendMessage(lastInput, true);
  };

  /**
   * 요약 카드의 인용 줄에서 원문 말풍선으로 되돌아간다.
   * 인용만 보여주면 맥락이 잘려 보이므로, 그때 무슨 대화였는지 확인할 길을 남긴다.
   */
  const jumpToMessage = (messageId: string) => {
    setHighlightedId(messageId);
    // 요약 카드가 접히면서 대화 영역이 늘어난 뒤에 스크롤해야 위치가 맞는다
    window.setTimeout(() => {
      document.getElementById(`bubble-${messageId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    window.setTimeout(() => setHighlightedId(prev => (prev === messageId ? null : prev)), 2400);
  };

  /** AI 인사말만 있고 내가 아직 아무 말도 안 한 상태인가 */
  const notStartedYet = !messages.some(m => m.sender === 'user');

  /** 대화창을 나갈 때. 아직 시작 전이면 지울지 남길지 물어본다 */
  const handleLeave = () => {
    if (notStartedYet) {
      setShowExitChoice(true);
      return;
    }
    setShowChat(false);
  };

  /** 세션은 남기고 화면만 닫는다 (AI 대화 탭에 그대로 보관) */
  const keepAndClose = () => {
    setShowExitChoice(false);
    setShowChat(false);
  };

  /** 세션과 페르소나를 지우고 닫는다 */
  const discardAndClose = async () => {
    if (!onDeletePersona || !selectedPersona) return;
    const deleted = await onDeletePersona(selectedPersona.id);
    if (!deleted) return;
    setShowExitChoice(false);
    if (activeSession) onEndSession(activeSession.id);
    setShowChat(false);
  };

  /**
   * 요약 카드의 `여기서 마무리`.
   *
   * 예전에는 이 버튼이 대화방과 대화 내용을 **경고 없이 영구 삭제**했다.
   * '마무리'는 끝내고 나간다는 말이지 지운다는 말이 아니다. 눌러본 사람은
   * 방금 나눈 대화가 통째로 사라진 걸 나중에야 알게 된다.
   *
   * 이제는 화면만 닫고 대화는 남긴다. 정말 지우고 싶은 사람에게는
   * 카드 ⋮ 메뉴의 '삭제'가 따로 있고, 그쪽은 확인 창이 뜬다.
   */
  const finishAndKeep = () => {
    setShowFeedback(false);
    setSimEndResult(null);
    setShowChat(false);

    /* 왔던 사연으로 돌려보낸다. 거기에 투표 결과와 댓글이 있다 */
    const storyId = selectedPersona?.storyId;
    if (storyId && onReturnToStory) onReturnToStory(storyId);
  };

  // A historical bubble has no reliable completion marker. It qualifies after
  // this room receives a new, server-saved answer with a request ID.
  const latestCompletedAnswer = [...messages].reverse().find(
    m => m.sender === 'ai' && Boolean(m.requestId) && Boolean(m.text.trim()),
  );
  // Two historical rooms have neither mode field. They can still be finished
  // and kept, but a rating must not be attributed to an invented AI mode.
  const feedbackModeKnown = Boolean(selectedPersona?.opening || selectedPersona?.ratio);
  const canFinish = !isGuest && !isLoading && !isSaving && !failedText && !saveFailed &&
    Boolean(latestCompletedAnswer);

  const beginFinish = () => {
    if (!canFinish) return;
    track('ai_chat_finish', { mode: activeSession?.chatMode });
    if (!feedbackModeKnown) {
      finishAndKeep();
      return;
    }
    track('ai_feedback_view', { mode: activeSession?.chatMode });
    setFeedbackError(false);
    setShowFeedback(true);
  };

  const finishWithFeedback = async (score: 1 | 2 | 3 | 4 | 5 | null) => {
    if (!selectedPersona || !feedbackModeKnown ||
        !latestCompletedAnswer?.requestId || feedbackSaving) return;
    setFeedbackSaving(true);
    setFeedbackError(false);
    try {
      await submitAiFeedback(selectedPersona.id, latestCompletedAnswer.requestId, score);
      track('ai_feedback_submit', {
        mode: activeSession?.chatMode,
        outcome: score === null ? 'skipped' : 'submitted',
      });
      finishAndKeep();
    } catch {
      setFeedbackError(true);
    } finally {
      setFeedbackSaving(false);
    }
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
            <span className="w-2 h-2 rounded-full bg-[#FF6B5A]"></span> 내 대화 상대
          </h3>

          {/*
            기본 제공 페르소나가 없으므로 처음 온 사람은 이 탭이 비어 있다.
            빈 화면만 두면 고장 난 것처럼 보이므로, 대화가 어디서 시작되는지
            알려주고 곧장 갈 길을 준다.
          */}
          {personas.length === 0 ? (
            <div className="bg-white border border-dashed border-[#E5E7EB] rounded-lg px-6 py-12 text-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-[#FF6B5A]">
                forum
              </span>
              {/*
                게스트와 로그인한 사람에게 다른 말을 한다.
                로그인한 사람은 시작한 대화가 여기 쌓여 이어서 할 수 있지만,
                게스트는 AI가 거는 첫 마디까지만 볼 수 있다. 같은 문구를 쓰면
                게스트에게는 지키지 못할 약속이 된다.
              */}
              <h4 className="font-headline-md text-base font-bold text-[#1C1C1C] mt-3">
                {isGuest ? '대화는 사연에서 시작해요' : '아직 나눈 대화가 없어요'}
              </h4>
              <p className="font-body-sm text-xs text-[#5f5e5e] leading-relaxed mt-2">
                {isGuest ? (
                  <>
                    사연을 열고 <span className="font-bold text-[#1C1C1C]">'AI로 이 상황을 다시 겪어보기'</span>를
                    누르면
                    <br />
                    그 사연 속 상대방이 먼저 말을 거는 것까지 볼 수 있습니다.
                    <br />
                    답장을 주고받는 건 로그인 후에 할 수 있어요.
                  </>
                ) : (
                  <>
                    사연을 열고 <span className="font-bold text-[#1C1C1C]">'AI로 이 상황을 다시 겪어보기'</span>를
                    누르면
                    <br />
                    그 사연 속 상대방과의 대화가 여기에 쌓입니다.
                  </>
                )}
              </p>
              {onGoToFeed && (
                <button
                  onClick={onGoToFeed}
                  className="mt-5 px-5 py-3 bg-[#FF6B5A] text-[#1C1C1C] font-bold text-xs rounded-lg hover:bg-[#FF6B5A]/90 transition-colors cursor-pointer shadow-md"
                >
                  사연 보러 가기
                </button>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => openPersona(persona)}
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
                            {/*
                              고정은 서버에 저장돼야 다음에 와서 의미가 있고,
                              오류 신고도 접수될 계정이 있어야 한다. 게스트에게는
                              둘 다 눌러도 남는 게 없으므로 감춘다.
                              삭제는 이 자리에서 카드가 실제로 사라지므로 남긴다.
                            */}
                            {!isGuest && onTogglePinPersona && (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onTogglePinPersona(persona.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#1C1C1C] flex items-center gap-2 cursor-pointer">
                                <Pin className="w-3.5 h-3.5" /> {persona.isPinned ? '고정 해제' : '고정'}
                              </button>
                            )}
                            {!isGuest && onReportErrorPersona && (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onReportErrorPersona(persona.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#1C1C1C] flex items-center gap-2 cursor-pointer border-t border-[#E5E7EB]">
                                <ShieldAlert className="w-3.5 h-3.5" /> 오류 신고
                              </button>
                            )}
                            {onDeletePersona && (
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void onDeletePersona(persona.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#ba1a1a] flex items-center gap-2 cursor-pointer border-t border-[#E5E7EB]">
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

                {/*
                  버튼에 자기 핸들러를 준다.

                  예전에는 이 버튼이 아무 일도 하지 않고, 뒤에 있는 카드의
                  클릭이 대신 처리했다. 화면상으로는 눌리니까 문제를 못 느끼지만,
                  카드 쪽에 stopPropagation이 하나 생기는 순간 조용히 죽는 버튼이다.
                  AI 대화는 이 서비스의 핵심 경로라 그런 우연에 기대면 안 된다.
                */}
                <button
                  onClick={(e) => { e.stopPropagation(); openPersona(persona); }}
                  className="w-full py-3 bg-[#1C1C1C] group-hover:bg-[#FF6B5A] text-white group-hover:text-[#1C1C1C] font-mono font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{activeSession && activeSession.personaId === persona.id ? '이어서 대화하기' : '대화 시작하기'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /**
   * 대화방 화면.
   *
   * 높이를 vh 어림값으로 잡으면 안 된다. 예전에는 h-[82vh]에 mb-24까지 붙어
   * 있었는데, 상단 헤더(64px)·main의 상하 패딩(각 32px)·하단 네비게이션(80px)을
   * 계산에 넣지 않아 입력창이 네비게이션에 가렸다. 타자를 치려면 페이지 전체를
   * 스크롤해야 했고, 스크롤하면 대화 헤더가 상단 헤더 밑으로 말려 들어갔다.
   *
   * 빼는 값: 헤더 64 + 위 패딩 32 + 네비 80 = 176, 여기에 여백 8을 더해 184.
   * dvh를 쓰는 건 모바일에서 주소창이 접히고 펴져도 맞추기 위해서다.
   */
  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-184px)] bg-white border border-[#E5E7EB] rounded-lg overflow-hidden relative shadow-sm">
      {/* Header */}
      <header className="bg-[#1C1C1C] text-white px-6 py-4 flex items-center justify-between z-50 border-b border-[#1C1C1C]">
        <div className="flex items-center gap-3">
          <button aria-label="대화창 나가기" onClick={handleLeave} className="material-symbols-outlined text-[#FF6B5A] cursor-pointer hover:opacity-80">
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
          {/* 공감 비율은 다음 답장부터 반영되는 값이다. 답장을 보낼 수 없는
              게스트에게는 바꿔도 달라지는 게 없어 감춘다 */}
          {!isGuest && (activeSession.chatMode === 'explanation' || ['내 편 100%', '반반', '상대편 100%', '상대편 입장 100%'].includes(selectedPersona.role)) && onOpenSettings && (
            <button aria-label="공감 비율 설정 변경" onClick={onOpenSettings} className="material-symbols-outlined text-[#5f5e5e] hover:text-[#FF6B5A] cursor-pointer transition-colors" title="공감 비율 설정 변경">
              settings
            </button>
          )}
          <button
            aria-label="대화창 닫기"
            onClick={handleLeave}
            className="material-symbols-outlined text-[#5f5e5e] hover:text-white cursor-pointer"
          >
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
            {/* 게스트에게는 입력창이 없다. 없는 것을 가리키는 안내는 빼둔다 */}
            {!isGuest && (
              <p className="font-mono text-[11px] text-[#5f5e5e] pt-4">
                👇 하단 입력창에 편하게 메시지를 적고 <span className="text-[#FF6B5A] font-bold bg-[#1C1C1C] px-1.5 py-0.5 rounded">보내기</span> 를 누르세요!
              </p>
            )}
          </div>
        )}

        {messages.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="w-full flex flex-col items-center space-y-2 py-2">
                <div className="bg-[#f3f4f5] border border-[#E5E7EB] rounded-lg px-4 py-3 max-w-[85%] text-center">
                  <p className="font-body-sm text-xs sm:text-sm font-medium text-[#A32E1D] leading-relaxed">
                    {msg.text}
                  </p>
                </div>
                {failedText && msg.id === messages[messages.length - 1]?.id && (
                  <button
                    type="button"
                    onClick={() => { void sendMessage(failedText, true); }}
                    disabled={isLoading}
                    className="font-mono text-xs font-bold text-[#FF6B5A] border border-[#FF6B5A] rounded-lg px-4 py-2 hover:bg-[#FF6B5A] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    다시 보내기
                  </button>
                )}
              </div>
            );
          }
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} id={`bubble-${msg.id}`} className="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
                <div className={`bg-[#1C1C1C] text-white p-4 rounded-lg shadow-2xs transition-all ${
                  highlightedId === msg.id ? 'ring-2 ring-[#FF6B5A] ring-offset-2' : ''
                }`}>
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
                  <span className="text-[#5f5e5e] font-medium">{selectedPersona.name}</span>
                </div>
                <div className="bg-white border border-[#E5E7EB] text-[#1C1C1C] p-4 rounded-lg shadow-2xs">
                  <p className="font-body-sm text-xs sm:text-sm font-medium leading-relaxed">
                    {stripSimEnd(msg.text || '...')}
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
            충분한 대화가 오갔어요. 여기서 한번 정리해볼까요?
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
        <SessionSummaryCard
          result={simEndResult}
          messages={messages}
          supporterCount={supporterCount}
          onJumpToMessage={jumpToMessage}
          onContinue={() => setSimEndResult(null)}
          onFinish={beginFinish}
        />
      ) : isGuest ? (
        /*
          게스트에게는 입력 수단을 아예 내주지 않는다.
          입력은 되는데 보낼 때 막으면 다 써놓고 튕기는 꼴이 된다.
          여기가 이 화면의 유일한 입력 수단이라 이 자리만 바꾸면 된다.
        */
        <footer className="bg-white border-t border-[#E5E7EB] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#f3f4f5] border border-[#E5E7EB] rounded-lg px-4 py-3">
            <p className="flex-1 font-body-sm text-xs text-[#5f5e5e] leading-relaxed">
              여기까지는 로그인 없이 볼 수 있어요.
              <br />
              <span className="font-bold text-[#1C1C1C]">답장을 보내려면 로그인이 필요합니다.</span>
            </p>
            {/* 로그인 안내를 띄울 길이 없으면 버튼도 내지 않는다. 눌러도 아무
                일 없는 버튼을 만드느니 안내 문구만 두는 게 낫다 */}
            {onRequireLogin && (
              <button
                type="button"
                onClick={() => onRequireLogin('AI와 대화를 이어가려면 로그인이 필요해요.')}
                className="shrink-0 bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] px-5 py-3 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer"
              >
                로그인하고 대화 이어가기
              </button>
            )}
          </div>
        </footer>
      ) : (
        <footer className="bg-white border-t border-[#E5E7EB] p-4">
          {canFinish && (
            <button type="button" onClick={beginFinish}
              className="mb-3 w-full rounded-lg border border-[#FF6B5A] px-4 py-2.5 text-xs font-bold text-[#1C1C1C] hover:bg-[#FF6B5A]/10 cursor-pointer">
              대화 마무리
            </button>
          )}
          {isSaving && <p className="mb-2 text-xs text-[#5f5e5e]" role="status">대화를 저장하는 중입니다…</p>}
          {saveFailed && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
              <p className="text-xs font-bold text-[#A32E1D]">답변은 받았지만 대화를 저장하지 못했습니다. 입력은 이 화면에 남아 있습니다. 다시 요청하면 새 답변을 받습니다.</p>
              <button type="button" onClick={retrySave} disabled={isSaving || isLoading} className="rounded-lg border border-[#A32E1D] px-3 py-1.5 text-xs font-bold text-[#A32E1D] cursor-pointer disabled:opacity-50">새 답변 요청</button>
            </div>
          )}
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
              disabled={!inputText.trim() || isLoading || isSaving || saveFailed || Boolean(failedText)}
              className="bg-[#1C1C1C] hover:bg-black text-[#FF6B5A] px-5 py-3 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              보내기
            </button>
          </form>
        </footer>
      )}

      {/* 대화를 시작하기 전에 나갈 때: 지울지 남길지 고르게 한다 */}
      {showExitChoice && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowExitChoice(false)}
        >
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            {/* 취소는 우측 상단 X 로 처리한다 */}
            <button
              onClick={() => setShowExitChoice(false)}
              className="absolute top-3 right-3 text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors p-1 cursor-pointer"
              aria-label="취소"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pt-12">
              <h2 className="text-lg font-bold text-[#1C1C1C] mb-2">이 대화, 어떻게 할까요?</h2>
              {/* 게스트의 대화는 서버에 저장되지 않는다. 로그인한 사람과 같은
                  말을 하면 새로고침 뒤 사라졌을 때 잃어버린 것처럼 느낀다 */}
              <p className="text-sm text-[#5f5e5e] mb-5 leading-relaxed">
                {isGuest
                  ? "남겨두면 'Ai 대화' 탭에서 다시 열어볼 수 있어요. 다만 로그인 전까지는 이 브라우저에만 남습니다."
                  : "아직 대화를 시작하지 않았어요. 남겨두면 'Ai 대화' 탭에서 이어서 할 수 있습니다."}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={keepAndClose}
                  className="w-full py-3 bg-[#1C1C1C] text-white rounded-lg font-bold text-sm hover:bg-black transition-colors cursor-pointer"
                >
                  남겨두고 닫기
                </button>
                <button
                  onClick={() => { void discardAndClose(); }}
                  className="w-full py-3 bg-white border border-[#E5E7EB] text-[#ba1a1a] rounded-lg font-bold text-sm hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                >
                  대화 삭제하고 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-labelledby="ai-feedback-title">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <h2 id="ai-feedback-title" className="text-lg font-bold text-[#1C1C1C]">이 AI 대화가 도움이 되었나요?</h2>
            <p className="mt-2 text-xs text-[#5f5e5e]">평가를 남겨도 대화는 보관됩니다. 답변 내용은 평가에 저장하지 않습니다.</p>
            <div className="mt-5 grid gap-2">
              {FEEDBACK_CHOICES.map((label, index) => (
                <button key={label} type="button" disabled={feedbackSaving}
                  onClick={() => { void finishWithFeedback((index + 1) as 1 | 2 | 3 | 4 | 5); }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-left text-sm hover:border-[#FF6B5A] cursor-pointer disabled:opacity-50">
                  {label}
                </button>
              ))}
            </div>
            {feedbackError && <p role="alert" className="mt-3 text-xs text-[#A32E1D]">평가를 저장하지 못했습니다. 다시 시도하거나 평가 없이 닫을 수 있습니다.</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" disabled={feedbackSaving} onClick={() => { void finishWithFeedback(null); }}
                className="text-xs text-[#5f5e5e] underline cursor-pointer disabled:opacity-50">건너뛰기</button>
              {feedbackError && <button type="button" onClick={finishAndKeep}
                className="text-xs text-[#5f5e5e] underline cursor-pointer">평가 없이 닫기</button>}
              <button type="button" disabled={feedbackSaving} onClick={() => setShowFeedback(false)}
                className="text-xs text-[#1C1C1C] underline cursor-pointer disabled:opacity-50">대화로 돌아가기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
