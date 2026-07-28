import React, { useState, useEffect, useCallback } from 'react';
import { StoryCategory, Story, Comment, AIPersona, UserProfile, ChatSession } from './types';
import { INITIAL_STORIES, INITIAL_PERSONAS, INITIAL_COMMENTS } from './data/mockData';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { WeeklyTopBanner } from './components/WeeklyTopBanner';
import { BalanceGameSection } from './components/BalanceGameSection';
import { StoryCard } from './components/StoryCard';
import { StoryDetailModal } from './components/StoryDetailModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { AIChatView } from './components/AIChatView';
import { AIChatModeSelectionModal } from './components/AIChatModeSelectionModal';
import { AIExplainSettingsModal, ExplainRatio } from './components/AIExplainSettingsModal';
import { AIErrorReportModal } from './components/AIErrorReportModal';
import { MyPageView } from './components/MyPageView';
import { ReportModal } from './components/ReportModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { WelcomeModal } from './components/WelcomeModal';
import { AdultVerificationModal } from './components/AdultVerificationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { PremiumModal } from './components/PremiumModal';
import { Flame, Clock, Filter, Sparkles, MessageSquareHeart } from 'lucide-react';
import { supabase } from './lib/supabase';

const CATEGORIES: StoryCategory[] = ['전체', '연애', '직장', '친구', '가족', '기타'];

export default function App() {
  // User Profile State
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('nipyeon_user');
    return saved ? JSON.parse(saved) : {
      id: `usr-${Date.now()}`,
      nickname: '속뚫리는고구마',
      socialProvider: 'kakao',
      createdAt: new Date().toISOString()
    };
  });

  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);

  // Initialize Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setShowWelcomeModal(false);
        setShowLandingPage(false);
        setUser(prev => ({
          ...prev,
          id: session.user.id,
          nickname: session.user.user_metadata?.nickname || prev.nickname,
        }));
      } else {
        setShowWelcomeModal(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setShowWelcomeModal(false);
        setShowLandingPage(false);
        setUser(prev => ({
          ...prev,
          id: session.user.id,
          nickname: session.user.user_metadata?.nickname || prev.nickname,
        }));
      } else if (event === 'SIGNED_OUT') {
        setShowWelcomeModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Potens API Key
  const [potensApiKey, setPotensApiKey] = useState<string>(() => {
    return localStorage.getItem('potens_api_key') || '';
  });

  // Main Feed State
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase.from('stories').select('*').order('createdAt', { ascending: false }).then(({ data, error }) => {
      if (data && !error) {
        setStories(data);
      }
    });

    // Realtime subscription
    const channel = supabase
      .channel('public:stories')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, payload => {
        setStories(prev => {
          // Prevent duplicates if local insert happened first
          if (prev.some(s => s.id === payload.new.id)) return prev;
          return [payload.new as Story, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories' }, payload => {
        setStories(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
        setSelectedStory(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, payload => {
        setStories(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});

  useEffect(() => {
    // Initial fetch
    supabase.from('comments').select('*').order('createdAt', { ascending: true }).then(({ data, error }) => {
      if (data && !error) {
        const newMap: Record<string, Comment[]> = {};
        data.forEach(c => {
          if (!newMap[c.storyId]) newMap[c.storyId] = [];
          newMap[c.storyId].push(c as Comment);
        });
        setCommentsMap(newMap);
      }
    });

    // Realtime subscription
    const channel = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
        setCommentsMap(prev => {
          const comment = payload.new as Comment;
          const storyComments = prev[comment.storyId] || [];
          if (storyComments.some(c => c.id === comment.id)) return prev;
          return { ...prev, [comment.storyId]: [...storyComments, comment] };
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, payload => {
        setCommentsMap(prev => {
          const comment = payload.new as Comment;
          const storyComments = prev[comment.storyId] || [];
          return {
            ...prev,
            [comment.storyId]: storyComments.map(c => c.id === comment.id ? { ...c, ...comment } : c)
          };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, payload => {
        setCommentsMap(prev => {
          const updatedMap = { ...prev };
          let found = false;
          for (const sId in updatedMap) {
            if (updatedMap[sId].some(c => c.id === payload.old.id)) {
              updatedMap[sId] = updatedMap[sId].filter(c => c.id !== payload.old.id);
              found = true;
              break;
            }
          }
          return found ? updatedMap : prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [personas, setPersonas] = useState<AIPersona[]>(() => {
    const saved = localStorage.getItem('nipyeon_personas');
    return saved ? JSON.parse(saved) : INITIAL_PERSONAS;
  });

  // Filters & Tabs
  const [selectedCategory, setSelectedCategory] = useState<StoryCategory>('전체');
  const [sortBy, setSortBy] = useState<'latest' | 'votes'>('latest');
  const [activeTab, setActiveTab] = useState<'feed' | 'ai-chat' | 'mypage'>('feed');

  // Active Modals & Selected Items
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAdultVerificationOpen, setIsAdultVerificationOpen] = useState(false);
  const [premiumModalStory, setPremiumModalStory] = useState<Story | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiChatModeStory, setAiChatModeStory] = useState<Story | null>(null);
  const [aiExplainSettingsStory, setAiExplainSettingsStory] = useState<Story | null>(null);
  const [isExplainSettingsModalOpen, setIsExplainSettingsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [errorReportPersona, setErrorReportPersona] = useState<AIPersona | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  // Active AI Chat Session
  const [activeChatSession, setActiveChatSession] = useState<ChatSession | null>(null);

  // My Activity Trackers
  const [myVotes, setMyVotes] = useState<{ storyId: string; title: string; option: 'A' | 'B' }[]>(() => {
    const saved = localStorage.getItem('nipyeon_my_votes');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('nipyeon_user', JSON.stringify(user));
  }, [user]);

  // (Removed stories localStorage sync as it is now in Supabase)

  // (Removed comments localStorage sync as it is now in Supabase)

  useEffect(() => {
    localStorage.setItem('nipyeon_personas', JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem('nipyeon_my_votes', JSON.stringify(myVotes));
  }, [myVotes]);

  useEffect(() => {
    localStorage.setItem('potens_api_key', potensApiKey);
  }, [potensApiKey]);

  // Handlers
  const handleCompleteWelcome = (nickname: string, provider: 'kakao' | 'apple' | 'google') => {
    const updatedUser: UserProfile = {
      ...user,
      nickname,
      socialProvider: provider,
      isAdultVerified: user.isAdultVerified,
    };
    setUser(updatedUser);
    setShowWelcomeModal(false);
        setShowLandingPage(false);
  };

  const handleVerifyAdult = () => {
    setUser(prev => ({ ...prev, isAdultVerified: true }));
  };

  const handleUpdateNickname = (newNickname: string) => {
    setUser(prev => ({ ...prev, nickname: newNickname }));
  };

  const handleGenerateRandomNickname = async () => {
    try {
      const res = await fetch('/api/nickname/random');
      if (res.ok) {
        const data = await res.json();
        setUser(prev => ({ ...prev, nickname: data.nickname }));
      }
    } catch {
      setUser(prev => ({ ...prev, nickname: '사이다마신곰99' }));
    }
  };

  const handleVote = async (storyId: string, option: 'A' | 'B') => {
    let newVotesA = 0;
    let newVotesB = 0;
    let updateNeeded = false;

    setStories(prev => prev.map(story => {
      if (story.id === storyId) {
        // 이미 같은 옵션에 투표했다면 무시
        if (story.userVoted === option) return story;

        // 이미 다른 옵션에 투표한 적이 있다면 (투표 변경 시도)
        if (story.userVoted) {
          if (story.voteChanged) {
            setToastMessage('투표는 최대 1번만 변경할 수 있습니다.');
            setTimeout(() => setToastMessage(null), 3000);
            return story;
          }
          // 변경 허용 (기존표 -1, 새 표 +1, 변경 상태 true)
          const updated = {
            ...story,
            userVoted: option,
            votesA: option === 'A' ? story.votesA + 1 : story.votesA - 1,
            votesB: option === 'B' ? story.votesB + 1 : story.votesB - 1,
            voteChanged: true,
          };
          if (selectedStory?.id === storyId) setSelectedStory(updated);
          
          setToastMessage('투표가 변경되었습니다.');
          setTimeout(() => setToastMessage(null), 3000);
          
          newVotesA = updated.votesA;
          newVotesB = updated.votesB;
          updateNeeded = true;
          return updated;
        }

        // 최초 투표
        const updated = {
          ...story,
          userVoted: option,
          votesA: option === 'A' ? story.votesA + 1 : story.votesA,
          votesB: option === 'B' ? story.votesB + 1 : story.votesB,
        };
        // Track vote in my activity
        setMyVotes(mv => [...mv, { storyId: story.id, title: story.title, option }]);
        if (selectedStory?.id === storyId) setSelectedStory(updated);
        
        newVotesA = updated.votesA;
        newVotesB = updated.votesB;
        updateNeeded = true;
        return updated;
      }
      return story;
    }));

    if (updateNeeded) {
      await supabase.from('stories').update({ votesA: newVotesA, votesB: newVotesB }).eq('id', storyId);
    }
  };

  const handleAddComment = async (storyId: string, content: string, isAnonymous: boolean) => {
    const storyComments = commentsMap[storyId] || [];
    const anonNumber = storyComments.length + 1;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      storyId,
      authorId: user.id,
      anonymousId: isAnonymous ? `익명 ${anonNumber}` : user.nickname,
      content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      reportsCount: 0,
      isBlind: false,
      isEdited: false
    };

    setCommentsMap(prev => ({
      ...prev,
      [storyId]: [...(prev[storyId] || []), newComment]
    }));

    // Increment story comment count
    const story = stories.find(s => s.id === storyId);
    if (story) {
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, commentCount: s.commentCount + 1 } : s));
      await supabase.from('stories').update({ commentCount: story.commentCount + 1 }).eq('id', storyId);
    }
    
    const { userLiked, ...dbComment } = newComment;
    await supabase.from('comments').insert(dbComment);
  };

  const handleLikeComment = async (commentId: string) => {
    let updateNeeded = false;
    let newLikeCount = 0;

    setCommentsMap(prev => {
      const updatedMap = { ...prev };
      Object.keys(updatedMap).forEach(storyId => {
        updatedMap[storyId] = updatedMap[storyId].map(c => {
          if (c.id === commentId) {
            const userLiked = !c.userLiked;
            newLikeCount = userLiked ? c.likeCount + 1 : c.likeCount - 1;
            updateNeeded = true;
            return {
              ...c,
              userLiked,
              likeCount: newLikeCount
            };
          }
          return c;
        });
      });
      return updatedMap;
    });

    if (updateNeeded) {
      await supabase.from('comments').update({ likeCount: newLikeCount }).eq('id', commentId);
    }
  };
  const handleEditComment = async (storyId: string, commentId: string, newContent: string) => {
    setCommentsMap(prev => {
      const updatedMap = { ...prev };
      if (updatedMap[storyId]) {
        updatedMap[storyId] = updatedMap[storyId].map(c => 
          c.id === commentId ? { ...c, content: newContent, isEdited: true } : c
        );
      }
      return updatedMap;
    });
    
    await supabase.from('comments').update({ content: newContent, isEdited: true }).eq('id', commentId);
  };

  const handleDeleteComment = async (storyId: string, commentId: string) => {
    setCommentsMap(prev => {
      const updatedMap = { ...prev };
      if (updatedMap[storyId]) {
        updatedMap[storyId] = updatedMap[storyId].filter(c => c.id !== commentId);
      }
      return updatedMap;
    });
    
    const story = stories.find(s => s.id === storyId);
    if (story) {
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, commentCount: Math.max(0, s.commentCount - 1) } : s));
      await supabase.from('stories').update({ commentCount: Math.max(0, story.commentCount - 1) }).eq('id', storyId);
    }
    
    await supabase.from('comments').delete().eq('id', commentId);
  };

  const handleEditStory = (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (story) {
      setEditingStory(story);
      setIsCreateStoryOpen(true);
    }
  };

  const handleHideStory = async (storyId: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, isHidden: true } : s));
    if (selectedStory?.id === storyId) {
      setSelectedStory(null);
    }
    setToastMessage('해당 사연을 숨겼습니다.');
    setTimeout(() => setToastMessage(null), 3000);
    
    await supabase.from('stories').update({ isHidden: true }).eq('id', storyId);
  };

  const handleDeleteStory = (storyId: string) => {
    setStoryToDelete(storyId);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;
    const storyId = storyToDelete;

    setStories(prev => prev.filter(s => s.id !== storyId));
    if (selectedStory?.id === storyId) {
      setSelectedStory(null);
    }
    setToastMessage('사연이 삭제되었습니다.');
    setTimeout(() => setToastMessage(null), 3000);
    
    await supabase.from('stories').delete().eq('id', storyId);
    setStoryToDelete(null);
  };


  const handleTogglePinPersona = (personaId: string) => {
    setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, isPinned: !p.isPinned } : p));
  };

  const handleDeletePersona = (personaId: string) => {
    setPersonas(prev => prev.filter(p => p.id !== personaId));
    setToastMessage('AI 대화가 삭제되었습니다.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReportErrorPersona = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setErrorReportPersona(persona);
    }
  };

  const handleSubmitAIError = (personaId: string, errorContent: string) => {
    console.log('Reported AI Error for Persona ID:', personaId, errorContent);
    setErrorReportPersona(null);
    setToastMessage('오류 신고가 접수되었습니다. 신속히 확인하겠습니다.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateStory = async (storyData: {
    title: string;
    category: Exclude<StoryCategory, '전체'>;
    body: string;
    opponentPersonality?: string;
    createAIPersona: boolean;
    isAdult: boolean;
  }) => {
    const cardColors: ('pink' | 'teal' | 'lavender' | 'peach' | 'ochre' | 'cream')[] = ['pink', 'teal', 'lavender', 'peach', 'ochre'];
    const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];

    const newStory: Story = {
      id: `story-${Date.now()}`,
      authorId: user.id,
      authorNickname: user.nickname,
      title: storyData.title,
      body: storyData.body,
      category: storyData.category,
      createdAt: new Date().toISOString(),
      votesA: 0,
      votesB: 0,
      userVoted: undefined,
      commentCount: 0,
      viewCount: 1,
      reportsCount: 0,
      isBlind: false,
      isAdult: storyData.isAdult,
      cardColor: editingStory ? editingStory.cardColor : randomColor,
    };

    if (editingStory) {
      const updatedStory = { ...newStory, id: editingStory.id, createdAt: editingStory.createdAt, votesA: editingStory.votesA, votesB: editingStory.votesB, userVoted: editingStory.userVoted, commentCount: editingStory.commentCount, viewCount: editingStory.viewCount };
      setStories(prev => prev.map(s => s.id === editingStory.id ? updatedStory : s));
      setEditingStory(null);
      setToastMessage('사연이 성공적으로 수정되었습니다.');
      setTimeout(() => setToastMessage(null), 3000);
      
      const { userVoted, voteChanged, ...dbStory } = updatedStory;
      await supabase.from('stories').update(dbStory).eq('id', updatedStory.id);
    } else {
      setStories(prev => [newStory, ...prev]);
      setToastMessage('사연 등록이 완료되었습니다.');
      setTimeout(() => setToastMessage(null), 3000);
      
      const { userVoted, voteChanged, ...dbStory } = newStory;
      await supabase.from('stories').insert([dbStory]);
    }

    // If auto persona creation requested
    if (storyData.createAIPersona) {
      const newPersona: AIPersona = {
        id: `persona-${Date.now()}`,
        name: `사연 상대방 (${storyData.title.slice(0, 10)}...)`,
        role: `${storyData.category} 갈등 상대`,
        category: storyData.category,
        avatarIcon: 'Bot',
        description: `사연: "${storyData.title}" 의 상대방 AI 페르소나입니다.${storyData.opponentPersonality ? ` (성격: ${storyData.opponentPersonality})` : ''}`,
        systemInstruction: `[역할 몰입 시뮬레이션 - 절대 이탈 금지]

너는 아래 사연 속 작성자(유저)와 실제로 갈등을 겪고 있는 '상대방 본인'이다.
너는 AI나 챗봇이 아니며, 지금 유저와 1:1 카카오톡/문자로 대화하고 있는 실제 사람이다.

■ 사연 내용 (네가 유저에게 한 행동/상황):
"${storyData.body}"

■ 너의 성격 및 특징:
${storyData.opponentPersonality || '사연 내용과 상대방 성격을 기반으로 성격을 분석하여 적용된 인물'}

■ 대화 수칙 (반드시 준수):
1. [AI 정체 완벽 차단]: 너는 절대로 'AI', '챗봇', '인공지능', '모델'이라는 단어를 언급하거나 인정해서는 안 된다.
2. [메타 발언 금지]: "사연에서 지시된 바와 같이", "상처를 줄 수 있어서" 같은 지시문 인용이나 윤리적 조언을 일절 하지 마라.
3. [상대방 본인 연기]: 작성자가 항의하거나 화를 내면, 쉽게 사과하기보다 "아니 나도 어쩔 수 없었어", "네가 너무 예민한 거 아니야?", "왜 매번 나만 나쁜 사람 만들어?" 라며 변명하거나 본인의 억울함을 주장해라.
4. [출력 지침]: 인사말이나 설명, 부연 텍스트 없이 오직 상대방의 실제 대사만 출력해라.`,
        cardColor: randomColor,
        sampleFirstMessage: `너 나한테 사연 올린 거 진짜 너무하다... 내가 그렇게 잘못했다고 생각해?`
      };
      setPersonas(prev => [newPersona, ...prev]);
    }
  };

  const handleUpdateSession = useCallback((sessionId: string, personaId: string, updates: Partial<ChatSession>) => {
    setActiveChatSession(prev => {
      if (prev && prev.id === sessionId) {
        return { ...prev, ...updates };
      }
      return prev;
    });

    setPersonas(prev => prev.map(p => {
      if (p.id === personaId) {
        return {
          ...p,
          chatHistory: updates.messages !== undefined ? updates.messages : p.chatHistory,
          empathyScore: updates.empathyScore !== undefined ? updates.empathyScore : p.empathyScore
        };
      }
      return p;
    }));
  }, []);

  const handleStartAIChatWithStory = (story: Story, bypassPremium: boolean = false) => {
    if (story.authorId === user.id || bypassPremium) {
      setAiChatModeStory(story);
      setSelectedStory(null);
    } else {
      setPremiumModalStory(story);
    }
  };

  const handleSelectAiChatMode = (mode: 'simulation' | 'explanation') => {
    if (!aiChatModeStory) return;
    
    if (mode === 'simulation') {
      const newPersona: AIPersona = {
        id: `persona-${Date.now()}`,
        name: aiChatModeStory.title,
        role: '상황',
        category: aiChatModeStory.category,
        avatarIcon: 'Bot',
        description: `사연: "${aiChatModeStory.title}" 의 상대방 AI 페르소나입니다.`,
        systemInstruction: `[역할 몰입 시뮬레이션 - 절대 이탈 금지]

너는 아래 사연 속 작성자(유저)와 실제로 갈등을 겪고 있는 '상대방 본인'이다.
너는 AI나 챗봇이 아니며, 지금 유저와 1:1 카카오톡/문자로 대화하고 있는 실제 사람이다.

■ 사연 내용 (네가 유저에게 한 행동/상황):
"${aiChatModeStory.body}"

■ 너의 성격 및 특징:
사연 내용과 상대방 성격을 기반으로 성격을 분석하여 적용된 인물

■ 대화 수칙 (반드시 준수):
1. [AI 정체 완벽 차단]: 너는 절대로 'AI', '챗봇', '인공지능', '모델'이라는 단어를 언급하거나 인정해서는 안 된다.
2. [메타 발언 금지]: "사연에서 지시된 바와 같이", "상처를 줄 수 있어서" 같은 지시문 인용이나 윤리적 조언을 일절 하지 마라.
3. [상대방 본인 연기]: 작성자가 항의하거나 화를 내면, 쉽게 사과하기보다 "아니 나도 어쩔 수 없었어", "네가 너무 예민한 거 아니야?", "왜 매번 나만 나쁜 사람 만들어?" 라며 변명하거나 본인의 억울함을 주장해라.
4. [출력 지침]: 인사말이나 설명, 부연 텍스트 없이 오직 상대방의 실제 대사만 출력해라.`,
        createdAt: new Date().toISOString(),
        cardColor: 'pink',
        sampleFirstMessage: `너 나한테 사연 올린 거 진짜 너무하다... 내가 그렇게 잘못했다고 생각해?`
      };
      setPersonas(prev => [newPersona, ...prev]);
      setActiveChatSession({
        id: `session-${Date.now()}`,
        personaId: newPersona.id,
        personaName: newPersona.name,
        personaRole: newPersona.role,
        storyId: aiChatModeStory.id,
        storyTitle: aiChatModeStory.title,
        messages: [],
        empathyScore: 50,
        createdAt: new Date().toISOString(),
        status: 'active',
        chatMode: 'simulation'
      });
      setActiveTab('ai-chat');
      setAiChatModeStory(null);
    } else if (mode === 'explanation') {
      setAiExplainSettingsStory(aiChatModeStory);
      setIsExplainSettingsModalOpen(true);
      setAiChatModeStory(null);
    }
  };

  const handleConfirmExplainSettings = (ratio: ExplainRatio) => {
    const empathyRatioStr = ratio === 'High' ? '내 편 100%' : ratio === 'Middle' ? '반반' : '상대편 입장 100%';
    
    // Fallback if aiExplainSettingsStory is somehow null in activeChatSession case
    const story = aiExplainSettingsStory || (activeChatSession ? stories.find(s => s.id === activeChatSession.storyId) : null);
    const storyBody = story?.body || '';
    const personalityText = story?.opponentPersonality || '사연 속 상대방의 성격 및 행동 특성';

    const systemInstruction = `[상황 이해 & 위로 대화 시뮬레이션 - 절대 이탈 금지]

너는 아래 사연을 읽고 유저의 이야기를 진심으로 들어주며, 지정된 '공감 스탠스'에 맞춰 대화를 나누는 따뜻하고 솔직한 대화 상대(친구 또는 조언자)이다.
너는 AI나 챗봇이 아니며, 지금 유저의 억울함과 고민을 1:1 카카오톡/문자로 함께 나누고 있는 실제 사람이다.

■ 사연 내용:
"${storyBody}"

■ 갈등 상대방의 특징/성격 (참고용):
${personalityText}

■ 설정된 공감 스탠스 (필수 적용):
"${empathyRatioStr}" 
(값 유형: '내 편 100%' / '반반' / '상대편 입장 100%')

■ 공감 스탠스별 대화 지침:
1. ['내 편 100%' 선택 시]:
   - 무조건 유저의 편이 되어준다. 유저가 느꼈을 감정(억울함, 상처, 분노)에 200% 격하게 공감하고 맞장구쳐라.
   - 상대방의 잘못된 행동이나 태도를 함께 비판해주며 유저의 답답한 마음을 시원하게 뚫어줘라.

2. ['반반' 선택 시]:
   - 먼저 유저의 속상한 마음에 충분히 공감해 주며 마음을 다독여라.
   - 이후 객관적이고 중립적인 시각에서 "상대방도 이런 마음이나 사정이 있어서 그랬을 수 있겠다"라는 점을 부드럽게 짚어주며, 양쪽 입장을 균형 있게 다루어라.

3. ['상대편 입장 100%' 선택 시]:
   - 유저를 비난하거나 공격하지 않는 선에서, '상대방의 서운함이나 의도'를 대변해 주는 조언자 역할을 해라.
   - "상대방 입장에서는 너의 행동이 이렇게 느껴졌을 수도 있어", "그 사람 마음은 이런 상태였을 거야"처럼 상대방의 시점을 설명하여 유저가 상황을 다각도로 이해할 수 있도록 돕는다.

■ 대화 수칙 (반드시 준수):
1. [AI 정체 완벽 차단]: 너는 절대로 'AI', '챗봇', '인공지능', '모델'이라는 단어를 언급하거나 인정해서는 안 된다.
2. [메타 발언 및 교조적 태도 금지]: "지침에 따라", "공감 모드로서" 같은 메타 발언이나, 가르치려 드는 훈계조의 말을 일절 하지 마라.
3. [자연스러운 대화 톤]: 딱딱한 보고서 스타일이 아닌, 실제로 친한 친구나 믿음직한 선배와 대화하듯 자연스럽고 따뜻한 구어체(반말 또는 존댓말 등 맥락에 맞는 구어체)를 사용해라.
4. [출력 지침]: 인사말, 설명, 부연 텍스트 없이 오직 유저에게 보낼 실제 대사 메시지 만을 출력해라.`;

    if (activeChatSession && activeChatSession.chatMode === 'explanation') {
      setActiveChatSession(prev => prev ? {
        ...prev,
        explanationRatio: ratio
      } : null);
      
      setPersonas(prev => prev.map(p => {
        if (p.id === activeChatSession.personaId) {
          return {
            ...p,
            role: ratio === 'High' ? '내 편 100%' : ratio === 'Middle' ? '반반' : '상대편 100%',
            description: `사연에 대해 ${ratio === 'High' ? '내 편 100%로' : ratio === 'Middle' ? '반반으로' : '상대편 100%로'} 공감하며 위로하는 AI입니다.`,
            systemInstruction
          };
        }
        return p;
      }));
    } else if (aiExplainSettingsStory) {
      const newPersona: AIPersona = {
        id: `persona-${Date.now()}`,
        name: aiExplainSettingsStory.title,
        role: ratio === 'High' ? '내 편 100%' : ratio === 'Middle' ? '반반' : '상대편 100%',
        category: aiExplainSettingsStory.category,
        avatarIcon: 'ListTree',
        description: `사연에 대해 ${ratio === 'High' ? '내 편 100%로' : ratio === 'Middle' ? '반반으로' : '상대편 100%로'} 공감하며 위로하는 AI입니다.`,
        systemInstruction,
        createdAt: new Date().toISOString(),
        cardColor: 'teal',
        sampleFirstMessage: `상황에 대한 이야기를 들려주세요. 편하게 감정을 털어놓으셔도 좋습니다.`
      };
      setPersonas(prev => [newPersona, ...prev]);
      setActiveChatSession({
        id: `session-${Date.now()}`,
        personaId: newPersona.id,
        personaName: newPersona.name,
        personaRole: newPersona.role,
        storyId: aiExplainSettingsStory.id,
        storyTitle: aiExplainSettingsStory.title,
        messages: [],
        empathyScore: ratio === 'High' ? 90 : ratio === 'Middle' ? 50 : 10,
        createdAt: new Date().toISOString(),
        status: 'active',
        chatMode: 'explanation',
        explanationRatio: ratio
      });
      setActiveTab('ai-chat');
    }
    
    setIsExplainSettingsModalOpen(false);
  };

  const handleReport = (targetId: string) => {
    setReportTargetId(targetId);
    setIsReportOpen(true);
  };

  const handleSubmitReport = async (targetId: string, reason: string) => {
    let storyUpdateNeeded = false;
    let newReportsCount = 0;
    let newIsBlind = false;

    // Check if it's a story
    setStories(prev => prev.map(s => {
      if (s.id === targetId) {
        const reportsCount = s.reportsCount + 1;
        storyUpdateNeeded = true;
        newReportsCount = reportsCount;
        newIsBlind = reportsCount >= 5;
        return {
          ...s,
          reportsCount,
          isBlind: newIsBlind // Auto blind policy after 5 reports
        };
      }
      return s;
    }));

    if (storyUpdateNeeded) {
      await supabase.from('stories').update({ reportsCount: newReportsCount, isBlind: newIsBlind }).eq('id', targetId);
    }
    
    // Check if it's a comment
    let commentUpdateNeeded = false;
    let commentNewReportsCount = 0;
    let commentNewIsBlind = false;

    setCommentsMap(prev => {
      const updatedMap = { ...prev };
      Object.keys(updatedMap).forEach(storyId => {
        updatedMap[storyId] = updatedMap[storyId].map(c => {
          if (c.id === targetId) {
            const reportsCount = c.reportsCount + 1;
            commentUpdateNeeded = true;
            commentNewReportsCount = reportsCount;
            commentNewIsBlind = reportsCount >= 5;
            return {
              ...c,
              reportsCount,
              isBlind: commentNewIsBlind
            };
          }
          return c;
        });
      });
      return updatedMap;
    });

    if (commentUpdateNeeded) {
      await supabase.from('comments').update({ reportsCount: commentNewReportsCount, isBlind: commentNewIsBlind }).eq('id', targetId);
    }
  };

  const baseFilteredStories = stories.filter(s => {
    if (s.isBlind) return false;
    if (s.isHidden) return false;
    if (selectedCategory === '전체') return true;
    return s.category === selectedCategory;
  }).sort((a, b) => {
    if (sortBy === 'votes') {
      return (b.votesA + b.votesB) - (a.votesA + a.votesB);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pin user's most recent written story to the top of feed if present
  const myStoriesFiltered = baseFilteredStories
    .filter(s => s.authorId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latestMyStory = myStoriesFiltered.length > 0 ? myStoriesFiltered[0] : null;

  const filteredStories = latestMyStory
    ? [latestMyStory, ...baseFilteredStories.filter(s => s.id !== latestMyStory.id)]
    : baseFilteredStories;

  // Current week date calculation (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - distanceToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const weeklyTopStories = [...stories]
    .filter(s => !s.isBlind && new Date(s.createdAt) >= currentMonday)
    .sort((a, b) => (b.votesA + b.votesB) - (a.votesA + a.votesB));

  const realtimeTopStories = [...stories]
    .filter(s => !s.isBlind)
    .sort((a, b) => (b.votesA + b.votesB) - (a.votesA + a.votesB));

  // My Written Stories & Comments
  const myStories = stories.filter(s => s.authorId === user.id);
  const myComments = (Object.values(commentsMap) as Comment[][]).flat().filter(c => c.authorId === user.id);


  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex flex-col font-sans selection:bg-[#3ECF8E] selection:text-[#1C1C1C]">
      
      {/* Header */}
      <Header
        user={user}
        onOpenProfile={() => setActiveTab('mypage')}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenCreateStory={() => setIsCreateStoryOpen(true)}
        onGoHome={() => setActiveTab('feed')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        
        {/* TAB 1: FEED VIEW */}
        {activeTab === 'feed' && (
          <div className="space-y-8 pb-24">
            
            {/* Today's Balance Game (Hot Logic Hero) */}
            <BalanceGameSection />

            {/* Weekly Top Banner */}
            <WeeklyTopBanner
              weeklyTopStories={weeklyTopStories}
              realtimeTopStories={realtimeTopStories}
              onSelectStory={(story) => setSelectedStory(story)}
            />

            {/* Feed Category & Search Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scroll-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-5 py-2 rounded-full font-mono text-xs font-bold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#3ECF8E] text-[#1C1C1C] shadow-xs'
                        : 'bg-white border border-[#E5E7EB] text-[#5f5e5e] hover:border-[#3ECF8E] hover:text-[#3ECF8E]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort Switch */}
              <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                <button
                  onClick={() => setSortBy('latest')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    sortBy === 'latest'
                      ? 'bg-[#1C1C1C] text-[#3ECF8E]'
                      : 'bg-white border border-[#E5E7EB] text-[#5f5e5e] hover:text-[#1C1C1C]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> 최신순
                </button>
                <button
                  onClick={() => setSortBy('votes')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    sortBy === 'votes'
                      ? 'bg-[#1C1C1C] text-[#3ECF8E]'
                      : 'bg-white border border-[#E5E7EB] text-[#5f5e5e] hover:text-[#1C1C1C]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#3ECF8E]" /> HOT
                </button>
              </div>
            </div>

            {/* Story Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStories.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-3">
                  <MessageSquareHeart className="w-10 h-10 text-[#3ECF8E] mx-auto opacity-80" />
                  <h3 className="text-base font-bold text-[#1C1C1C]">
                    등록된 사연이 없습니다.
                  </h3>
                  <p className="font-mono text-xs text-[#5f5e5e]">첫 번째 사연을 등록해 논리 대결을 시작해보세요!</p>
                  <button
                    onClick={() => setIsCreateStoryOpen(true)}
                    className="mt-2 px-6 py-2.5 bg-[#3ECF8E] text-[#1C1C1C] font-mono font-bold text-xs rounded-lg hover:bg-[#3ECF8E]/90 cursor-pointer"
                  >
                    CREATE STORY
                  </button>
                </div>
              ) : (
                filteredStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    currentUser={user}
                    isUserAdultVerified={user.isAdultVerified}
                    onRequireAdultVerification={() => setIsAdultVerificationOpen(true)}
                    onSelect={(s) => setSelectedStory(s)}
                    onVote={handleVote}
                    onStartAIChatWithStory={handleStartAIChatWithStory}
                    onReport={handleReport}
                    onEdit={handleEditStory}
                    onDelete={handleDeleteStory}
                    onHide={handleHideStory}
                    comments={commentsMap[story.id] || []}
                  />
                ))
              )}
            </div>

            {/* Create Story Prompt Section */}
            <div className="mt-16 p-8 border border-[#3ECF8E] bg-[#3ECF8E]/5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-[#3ECF8E] flex items-center justify-center text-[#1C1C1C]">
                  <MessageSquareHeart className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-headline-md text-base sm:text-lg font-bold text-[#1C1C1C] mb-1">당신의 고민을 나눠보세요</h3>
                  <p className="text-[#5f5e5e] font-body-md text-xs sm:text-sm">세상의 모든 갈등과 고민은 명확한 논리로 해답을 찾을 수 있습니다.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateStoryOpen(true)}
                className="w-full md:w-auto bg-[#1C1C1C] text-white hover:bg-black px-8 py-3.5 rounded font-mono font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
              >
                사연 올리기
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: AI SIMULATION CHAT VIEW */}
        {activeTab === 'ai-chat' && (
          <AIChatView
            personas={[...personas].sort((a, b) => {
              if (b.isPinned !== a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            })}
            activeSession={activeChatSession}
            onStartSession={(persona) => {
              const newSession: ChatSession = {
                id: `session-${Date.now()}`,
                personaId: persona.id,
                personaName: persona.name,
                personaRole: persona.role,
                messages: persona.chatHistory && persona.chatHistory.length > 0 
                  ? persona.chatHistory 
                  : [
                      {
                        id: `msg-0`,
                        sender: 'ai',
                        text: persona.sampleFirstMessage,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ],
                empathyScore: persona.empathyScore !== undefined ? persona.empathyScore : 64,
                createdAt: new Date().toISOString(),
                status: 'active'
              };
              setActiveChatSession(newSession);
            }}
            onEndSession={() => setActiveChatSession(null)}
            onUpdateSession={handleUpdateSession}
            potensApiKey={potensApiKey}
            onOpenSettings={() => setIsExplainSettingsModalOpen(true)}
            onTogglePinPersona={handleTogglePinPersona}
            onDeletePersona={handleDeletePersona}
            onReportErrorPersona={handleReportErrorPersona}
          />
        )}

        {/* TAB 3: MY PAGE VIEW */}
        {activeTab === 'mypage' && (
          <MyPageView
            user={user}
            myStories={myStories}
            myVotes={myVotes}
            myComments={myComments}
            onUpdateNickname={handleUpdateNickname}
            onGenerateRandomNickname={handleGenerateRandomNickname}
            onSelectStory={(s) => setSelectedStory(s)}
          />
        )}
      </main>

      {/* Floating Write Button (Mobile) */}
      <button
        onClick={() => setIsCreateStoryOpen(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-[#3ECF8E] text-[#1C1C1C] flex items-center justify-center shadow-lg hover:bg-[#3ECF8E]/90 active:scale-95 transition-all cursor-pointer md:hidden"
        title="익명 사연 쓰기"
      >
        <MessageSquareHeart className="w-7 h-7" />
      </button>

      {/* Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'ai-chat') {
            setActiveChatSession(null);
          }
        }}
      />

      {/* Modals */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onComplete={handleCompleteWelcome}
      />

      <StoryDetailModal 
        story={selectedStory} 
        comments={selectedStory ? (commentsMap[selectedStory.id] || []) : []}
        currentUser={user}
        onClose={() => setSelectedStory(null)} 
        onVote={handleVote}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        onStartAIChat={handleStartAIChatWithStory}
        onReportStory={handleReport}
        onEditStory={handleEditStory}
        onDeleteStory={handleDeleteStory}
        onHideStory={handleHideStory}
        onReportComment={handleReport}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Create Story Modal */}
      <CreateStoryModal 
        isOpen={isCreateStoryOpen} 
        onClose={() => {
          setIsCreateStoryOpen(false);
          setEditingStory(null);
        }} 
        onSubmit={handleCreateStory} 
        initialData={editingStory}
      />

      <ReportModal
        isOpen={isReportOpen}
        targetId={reportTargetId}
        onClose={() => setIsReportOpen(false)}
        onSubmitReport={handleSubmitReport}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        apiKey={potensApiKey}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaveKey={(key) => setPotensApiKey(key)}
      />

      <AdultVerificationModal
        isOpen={isAdultVerificationOpen}
        onClose={() => setIsAdultVerificationOpen(false)}
        onVerify={handleVerifyAdult}
      />

      <DeleteConfirmModal
        isOpen={!!storyToDelete}
        onClose={() => setStoryToDelete(null)}
        onConfirm={confirmDeleteStory}
        title="삭제 하시겠습니까?"
      />

      <PremiumModal
        isOpen={!!premiumModalStory}
        onClose={() => setPremiumModalStory(null)}
        onDemoClick={() => {
          if (premiumModalStory) {
            handleStartAIChatWithStory(premiumModalStory, true);
            setPremiumModalStory(null);
          }
        }}
      />

      {/* AI Chat Mode Selection Modal */}
      {aiChatModeStory && (
        <AIChatModeSelectionModal
          onClose={() => setAiChatModeStory(null)}
          onSelectMode={handleSelectAiChatMode}
        />
      )}

      {/* AI Explain Settings Modal */}
      {isExplainSettingsModalOpen && (
        <AIExplainSettingsModal
          initialRatio={activeChatSession?.chatMode === 'explanation' ? activeChatSession.explanationRatio : 'Middle'}
          onClose={() => {
            setIsExplainSettingsModalOpen(false);
            if (!activeChatSession && aiExplainSettingsStory) {
              setAiExplainSettingsStory(null);
            }
          }}
          onConfirm={handleConfirmExplainSettings}
        />
      )}

      {/* AI Error Report Modal */}
      {errorReportPersona && (
        <AIErrorReportModal
          persona={errorReportPersona}
          onClose={() => setErrorReportPersona(null)}
          onSubmit={handleSubmitAIError}
        />
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-[#1C1C1C] text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 text-sm font-bold">
          <MessageSquareHeart className="w-4 h-4 text-[#3ECF8E]" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
