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
import { AIChatModeSelectionModal, ChatOpening } from './components/AIChatModeSelectionModal';
import { AIExplainSettingsModal, ExplainRatio } from './components/AIExplainSettingsModal';
import { AIErrorReportModal } from './components/AIErrorReportModal';
import { MyPageView } from './components/MyPageView';
import { ReportModal } from './components/ReportModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { WelcomeModal } from './components/WelcomeModal';
import { LoginPromptModal } from './components/LoginPromptModal';
import { CrisisSupportModal } from './components/CrisisSupportModal';
import { AdultVerificationModal } from './components/AdultVerificationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { PremiumModal } from './components/PremiumModal';
import { Flame, Clock, Filter, Sparkles, MessageSquareHeart } from 'lucide-react';
import { supabase } from './lib/supabase';
import { detectCrisis } from './lib/crisis';

const CATEGORIES: StoryCategory[] = ['전체', '연애', '직장', '친구', '가족', '기타'];

// 사연 기반 AI 시뮬레이션에서 대화 상대를 부르는 호칭
const OPPONENT_LABELS: Partial<Record<StoryCategory, string>> = {
  '연애': '연인',
  '직장': '직장 상대',
  '친구': '친구',
  '가족': '가족',
  '기타': '상대방',
};

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

  // 로그인 없이 둘러보기: 홈 피드 탐색만 허용하고 나머지는 로그인 유도
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(null);

  // 위기 표현이 감지되면 상담 안내를 띄운다. 글쓰기나 대화는 막지 않는다 —
  // 막으면 다른 앱으로 옮겨갈 뿐이라, 리소스만 보여주고 흐름은 그대로 둔다.
  const [isCrisisOpen, setIsCrisisOpen] = useState<boolean>(false);
  const [appealTargetId, setAppealTargetId] = useState<string | null>(null);
  const notifyIfCrisis = (...texts: (string | undefined)[]) => {
    if (texts.some(t => detectCrisis(t ?? ''))) setIsCrisisOpen(true);
  };

  const handleGuestBrowse = () => {
    setIsGuest(true);
    setShowWelcomeModal(false);
    setShowLandingPage(false);
  };

  const handleGoToLogin = () => {
    setLoginPromptMessage(null);
    setIsGuest(false);
    setShowWelcomeModal(true);
  };

  // 게스트가 막힌 기능을 누르면 안내 팝업을 띄우고 true를 반환한다
  const blockedForGuest = (message: string) => {
    if (!isGuest) return false;
    setLoginPromptMessage(message);
    return true;
  };

  // Initialize Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setShowWelcomeModal(false);
        setShowLandingPage(false);
        setIsGuest(false);
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
        setIsGuest(false);
        setUser(prev => ({
          ...prev,
          id: session.user.id,
          nickname: session.user.user_metadata?.nickname || prev.nickname,
        }));
        loadMyVotes();
      } else if (event === 'SIGNED_OUT') {
        setShowWelcomeModal(true);
        setMyVoteRecords([]);
        setStories(prev => prev.map(s => ({ ...s, userVoted: undefined, voteChanged: false })));
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
        loadMyVotes();
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

  // My Activity Trackers — 투표 기록은 서버(votes 테이블)가 원본이다
  const [myVoteRecords, setMyVoteRecords] = useState<{ storyId: string; option: 'A' | 'B' }[]>([]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('nipyeon_user', JSON.stringify(user));
  }, [user]);

  // (Removed stories localStorage sync as it is now in Supabase)

  // (Removed comments localStorage sync as it is now in Supabase)

  useEffect(() => {
    localStorage.setItem('nipyeon_personas', JSON.stringify(personas));
  }, [personas]);

  // 내 투표 기록을 서버에서 불러와 화면 상태에 반영한다.
  // (RLS가 본인 행만 내려주므로 별도 필터가 필요 없다)
  const loadMyVotes = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      setMyVoteRecords([]);
      return;
    }

    const { data, error } = await supabase.from('votes').select('storyId, option, changeCount');
    if (error || !data) return;

    const voteByStory = new Map<string, { option: 'A' | 'B'; changeCount: number }>(
      data.map((v: any) => [v.storyId, { option: v.option, changeCount: v.changeCount }])
    );

    setStories(prev =>
      prev.map(s => {
        const v = voteByStory.get(s.id);
        return v
          ? { ...s, userVoted: v.option, voteChanged: v.changeCount >= 1 }
          : { ...s, userVoted: undefined, voteChanged: false };
      })
    );

    setMyVoteRecords(data.map((v: any) => ({ storyId: v.storyId, option: v.option as 'A' | 'B' })));
  }, []);

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
    if (blockedForGuest('투표에 참여하려면 로그인이 필요해요.')) return;

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
          
          setToastMessage('투표를 변경했습니다. 변경은 한 번뿐이라 이제 확정됩니다.');
          setTimeout(() => setToastMessage(null), 3000);

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
        if (selectedStory?.id === storyId) setSelectedStory(updated);

        updateNeeded = true;
        return updated;
      }
      return story;
    }));

    if (!updateNeeded) return;

    // 중복·재투표 판정은 서버의 votes 테이블이 최종 결정한다.
    // 화면은 먼저 바꿔두고, 거절당하면 서버 기준으로 되돌린다.
    const { error } = await supabase.rpc('vote_story', {
      p_story_id: storyId,
      p_option: option,
    });

    if (error) {
      setToastMessage(error.message || '투표를 처리하지 못했습니다.');
      setTimeout(() => setToastMessage(null), 3000);

      const { data: fresh } = await supabase.from('stories').select('*').eq('id', storyId).single();
      if (fresh) {
        setStories(prev => prev.map(s => (s.id === storyId ? { ...s, ...(fresh as Story) } : s)));
      }
    }

    await loadMyVotes();
  };

  // 화면에 즉시 보여줄 익명 표기. 최종 확정은 서버 트리거(assign_comment_anon_id)가 하고,
  // 여기서는 같은 규칙으로 미리 계산해 낙관적 업데이트가 어긋나지 않게 한다.
  const previewAnonymousId = (storyId: string): string => {
    const story = stories.find(s => s.id === storyId);
    if (story && story.authorId === user.id) return '글쓴이';

    const storyComments = commentsMap[storyId] || [];

    // 이 사연에 이미 단 적이 있으면 그때 번호를 유지한다
    const mine = storyComments.find(c => c.authorId === user.id && /^익명 \d+$/.test(c.anonymousId));
    if (mine) return mine.anonymousId;

    // 없으면 현재 최대 번호 + 1 (댓글 '개수'가 아니라 '최대 번호' 기준)
    const maxNo = storyComments.reduce((max, c) => {
      const m = /^익명 (\d+)$/.exec(c.anonymousId);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `익명 ${maxNo + 1}`;
  };

  const handleAddComment = async (storyId: string, content: string) => {
    if (blockedForGuest('댓글을 남기려면 로그인이 필요해요.')) return;

    notifyIfCrisis(content);

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      storyId,
      authorId: user.id,
      anonymousId: previewAnonymousId(storyId),
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

    // 화면에는 즉시 반영하고, DB의 commentCount는 트리거가 동기화한다
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, commentCount: s.commentCount + 1 } : s));

    const { userLiked, ...dbComment } = newComment;
    await supabase.from('comments').insert(dbComment);
  };

  const handleLikeComment = async (commentId: string) => {
    if (blockedForGuest('공감을 누르려면 로그인이 필요해요.')) return;

    let updateNeeded = false;
    let delta = 0;

    setCommentsMap(prev => {
      const updatedMap = { ...prev };
      Object.keys(updatedMap).forEach(storyId => {
        updatedMap[storyId] = updatedMap[storyId].map(c => {
          if (c.id === commentId) {
            const userLiked = !c.userLiked;
            delta = userLiked ? 1 : -1;
            updateNeeded = true;
            return {
              ...c,
              userLiked,
              likeCount: Math.max(0, c.likeCount + delta)
            };
          }
          return c;
        });
      });
      return updatedMap;
    });

    if (updateNeeded) {
      // 남의 댓글을 수정하는 동작이라 서버 함수를 통해서만 증감한다
      await supabase.rpc('like_comment', { p_comment_id: commentId, p_delta: delta });
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
    
    // 화면에는 즉시 반영하고, DB의 commentCount는 트리거가 동기화한다
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, commentCount: Math.max(0, s.commentCount - 1) } : s));

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
    issueMySide?: string;
    issueYourSide?: string;
  }) => {
    notifyIfCrisis(storyData.title, storyData.body);

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
      issueMySide: storyData.issueMySide || undefined,
      issueYourSide: storyData.issueYourSide || undefined,
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

      // 등록한 사연을 바로 확인할 수 있도록 홈 피드 상세를 연다
      setActiveTab('feed');
      setSelectedStory(newStory);

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
3. [상대방 본인 연기 & 50:50 화해·결렬 심사 수칙]:
   - 초반 1~2턴은 네 입장을 방어하고 서운함이나 억울함을 항변해라.
   - [🟢 화해 수용 조건]: 유저가 ① 구체적인 해결·타협 대안을 제시하거나, ② 네 입장을 조금이라도 먼저 공감·인정해주거나, ③ 감정적인 비난 없이 차분하고 온화한 근거로 설득할 때에만 서서히 마음을 풀고 화해/수용의 태도로 변경해라.
   - [🔴 결렬 거부 조건]: 유저가 본인의 서운함만 일방적으로 주장하거나, 너의 핑계를 비난하며 자존심을 건드리면 끝까지 양보 없이 단호하게 맞서라.
4. [출력 지침]: 인사말이나 설명, 부연 텍스트 없이 오직 상대방의 실제 대사만 출력해라.
5. [대화 종결 기호 (최중요)]: 대화가 3~5턴 내외로 이어지며 🟢 화해 조건이 충족되어 화기애애하거나 원만히 합의될 때 오직 답변 끝에 [SIM_END:SUCCESS] 를 붙여라. 🔴 결렬 조건에 해당되어 도저히 협상 여지가 없는 평행선 상태로 결렬 선언할 때는 오직 답변 끝에 [SIM_END:FAIL] 을 붙여라. 아직 판단하기 이르다면 아무 기호도 쓰지 마라.`,
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

  /** 시작점별 첫 대사와 태도 지시. 같은 갈등을 다른 온도로 재생하게 한다 */
  const OPENING_SCRIPTS: Record<ChatOpening, { scene: string; first: string | null; stance: string }> = {
    apology: {
      scene: '상대가 먼저 연락해 사과를 건네온 참이다.',
      first: '저기… 그때 일은 내가 좀 심했던 것 같아. 미안해.',
      stance: '너는 이미 한 번 사과를 건넨 상태다. 다만 완전히 수긍한 것은 아니어서, 유저가 몰아붙이면 방어적으로 돌아설 수 있다.',
    },
    oblivious: {
      scene: '상대는 아무 일도 없었다는 듯 평소처럼 굴고 있다.',
      first: '어 왔어? 별일 없지?',
      stance: '너는 갈등이 있었다는 사실 자체를 대수롭지 않게 여긴다. 유저가 문제를 꺼내면 처음엔 "그게 그렇게 기분 나빴어?" 하는 식으로 반응한다.',
    },
    meFirst: {
      scene: '아직 아무 말도 오가지 않았다. 유저가 먼저 말을 꺼내려는 참이다.',
      first: null,
      stance: '유저가 먼저 말을 꺼낼 때까지 기다린다. 첫 마디에 담긴 어조를 그대로 받아 반응해라.',
    },
  };

  const handleSelectAiChatMode = (mode: 'simulation' | 'explanation', opening: ChatOpening = 'oblivious') => {
    if (!aiChatModeStory) return;
    
    if (mode === 'simulation') {
      const newPersona: AIPersona = {
        id: `persona-${Date.now()}`,
        name: OPPONENT_LABELS[aiChatModeStory.category] ?? '상대방',
        role: '상황',
        category: aiChatModeStory.category,
        avatarIcon: 'Bot',
        description: `사연: "${aiChatModeStory.title}" 의 상대방 AI 페르소나입니다.`,
        systemInstruction: `[역할 몰입 시뮬레이션 - 절대 이탈 금지]

너는 아래 사연 속 작성자(유저)와 실제로 갈등을 겪고 있는 '상대방 본인'이다.
너는 AI나 챗봇이 아니며, 지금 유저와 1:1 카카오톡/문자로 대화하고 있는 실제 사람이다.

■ 사연 내용 (네가 유저에게 한 행동/상황):
"${aiChatModeStory.body}"

■ 지금 상황 (대화가 시작되는 지점):
${OPENING_SCRIPTS[opening].scene}

■ 이 상황에서 너의 태도:
${OPENING_SCRIPTS[opening].stance}

■ 너의 성격 및 특징:
사연 내용과 상대방 성격을 기반으로 성격을 분석하여 적용된 인물

■ 대화 수칙 (반드시 준수):
1. [AI 정체 완벽 차단]: 너는 절대로 'AI', '챗봇', '인공지능', '모델'이라는 단어를 언급하거나 인정해서는 안 된다.
2. [메타 발언 금지]: "사연에서 지시된 바와 같이", "상처를 줄 수 있어서" 같은 지시문 인용이나 윤리적 조언을 일절 하지 마라.
3. [상대방 본인 연기 & 50:50 화해·결렬 심사 수칙]:
   - 초반 1~2턴은 네 입장을 방어하고 서운함이나 억울함을 항변해라.
   - [🟢 화해 수용 조건]: 유저가 ① 구체적인 해결·타협 대안을 제시하거나, ② 네 입장을 조금이라도 먼저 공감·인정해주거나, ③ 감정적인 비난 없이 차분하고 온화한 근거로 설득할 때에만 서서히 마음을 풀고 화해/수용의 태도로 변경해라.
   - [🔴 결렬 거부 조건]: 유저가 본인의 서운함만 일방적으로 주장하거나, 너의 핑계를 비난하며 자존심을 건드리면 끝까지 양보 없이 단호하게 맞서라.
4. [출력 지침]: 인사말이나 설명, 부연 텍스트 없이 오직 상대방의 실제 대사만 출력해라.
5. [대화 종결 기호 (최중요)]: 대화가 3~5턴 내외로 이어지며 🟢 화해 조건이 충족되어 화기애애하거나 원만히 합의될 때 오직 답변 끝에 [SIM_END:SUCCESS] 를 붙여라. 🔴 결렬 조건에 해당되어 도저히 협상 여지가 없는 평행선 상태로 결렬 선언할 때는 오직 답변 끝에 [SIM_END:FAIL] 을 붙여라. 아직 판단하기 이르다면 아무 기호도 쓰지 마라.`,
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
        // AI가 먼저 말을 건다. 빈 입력창으로 시작하면 "뭐라고 하지"에서 멈춘다.
        messages: OPENING_SCRIPTS[opening].first
          ? [{
              id: `msg-${Date.now()}`,
              sender: 'ai' as const,
              text: OPENING_SCRIPTS[opening].first as string,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]
          : [],
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

    const stanceInstruction = ratio === 'High' 
      ? `[공감 스탠스 지침: '내 편 100%']
- 무조건 유저의 편이 되어준다. 유저가 힘들어하거나 서운해할 때 200% 격하게 공감해 주며 든든한 아군이 되어라.
- 단, 사연 본문의 세부 사항을 한꺼번에 쏟아내며 나열하지 말고, 현재 유저가 던진 말의 감정에 먼저 집중해서 따뜻하게 공감해라.
- 유저의 속상함을 달래주는 맞장구와 함께 "진짜 고생 많았어 ㅠㅠ 지금 기분은 어때?", "무슨 일 있었길래 그렇게까지 지쳤어..." 같이 부드러운 핑퐁(반문)으로 대화를 이끌어라.`
      : ratio === 'Middle' 
      ? `[공감 스탠스 지침: '반반 (공감 50% + 중립 50%)']
- ① 첫 1~2문장은 유저의 마음에 다정하고 친근하게 충분히 공감하며 다독여주어라.
- ② 이어서 "하지만 그 사람 입장에서도 그런 마음이나 사정이 있었을 수 있어"라고 객관적·중립적 시선을 1문장 내외로 간결히 짚어주어라.
- [분량 압축 및 TMI 금지]: 사연 내용을 통째로 길게 요약하거나 주저리주저리 설명하지 마라. 답변 전체를 딱 2~3문장(최대 4문장) 이내의 깔끔하고 짧은 호흡으로 압축하여 친구랑 카톡하듯 간결하게 답해라.
- 어느 한쪽으로 치우치지 않는 균형(50:50)을 지키며 부드러운 반문으로 부담 없이 대화해라.`
      : `[공감 스탠스 지침: '상대편 입장 100% (다정한 해설 및 상대 속마음 대변)']
- [최중요 금지 수칙]: 절대로 "얄밉다", "어이없다", "말이 안 된다", "이기적이다", "편리하게 쓴다"처럼 상대방을 욕하거나 깎아내려 유저 맞장구만 치지 마라! 너는 '상대편 100%' 스탠스다!
- 유저를 공격하지는 않되, 차분하고 지혜로운 조언자로서 오직 '상대방이 왜 그랬을지 의도와 속마음, 그리고 업무적 고충'을 100% 진심으로 대변하고 통역해주듯 풀어주어라.
- "부장님(상대방) 입장에서는 퇴근 직전에 본인도 급하게 지시를 받았거나, 가장 신뢰하는 사람에게 맡겨야 했던 사정이 있었을 수 있어"처럼 상대 입장의 배경을 다정히 설명해라.
- [분량 압축 및 TMI 금지]: 주저리주저리 설교하거나 훈계하듯 길게 늘어놓지 마라! 답변 전체를 딱 2~3문장(최대 4문장) 이내로 깔끔하게 축약해서, 실제 카톡처럼 부담 없이 짧은 호흡으로 전달해라.
- 설명 후에는 "물론 네 마음이 화날 만해 ㅠㅠ 내일 출근해서 조심스럽게 이야기해 볼 생각 있어?" 같은 부드러운 질문으로 끝내라.`;

    const systemInstruction = `[상황 이해 & 위로 대화 시뮬레이션 - 절대 이탈 금지]

너는 아래 사연을 읽고 유저의 이야기를 진심으로 들어주며, 지정된 '공감 스탠스'에 맞춰 대화를 나누는 솔직하고 지혜로운 대화 상대(친구 또는 조언자)이다.
너는 AI나 챗봇이 아니며, 지금 유저의 고민을 1:1 카카오톡/문자로 함께 나누고 있는 실제 사람이다.

■ 사연 내용:
"${storyBody}"

■ 갈등 상대방의 특징/성격 (참고용):
${personalityText}

■ 적용해야 할 절대 스탠스:
"${empathyRatioStr}"

■ 스탠스별 대화 필수 지침 (엄격히 준수):
${stanceInstruction}

■ 대화 수칙 (반드시 준수):
1. [AI 정체 완벽 차단]: 너는 절대로 'AI', '챗봇', '인공지능', '모델'이라는 단어를 언급하거나 인정해서는 안 된다.
2. [메타 발언 및 교조적 태도 금지]: "지침에 따라", "공감 모드로서" 같은 메타 발언이나, 가르치려 드는 훈계조의 말을 일절 하지 마라.
3. [카톡 호흡 & 분량 압축 수칙 (최중요)]: 
   - 주저리주저리 길게 설명하거나 연극 대본 같은 장황한 글(TMI)은 절대 금지된다. 무조건 간결하게 압축해라!
   - 실제 친구나 선배와 1:1 카카오톡을 나눌 때처럼 딱 2~3문장(최대 4문장) 이내로 편안하고 부담 없는 단문 호흡을 사용해라.
   - 사연의 세부 사항을 한 번에 다 쏟아내지 말고, 유저의 발언 분량과 흐름에 맞춰 자연스럽게 짧게 대응해라.
4. [출력 지침]: 인사말, 설명, 부연 텍스트 없이 오직 유저에게 보낼 실제 대사 메시지만을 출력해라.`;

    // 사연 피드나 모달에서 신규 공감 모드를 시작한 경우 (우선 처리)
    if (aiExplainSettingsStory) {
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
      setAiExplainSettingsStory(null);
    } else if (activeChatSession && activeChatSession.chatMode === 'explanation') {
      // 기존 채팅 세션 진행 도중 비율만 변경한 경우
      setActiveChatSession(prev => prev ? {
        ...prev,
        explanationRatio: ratio,
        personaRole: ratio === 'High' ? '내 편 100%' : ratio === 'Middle' ? '반반' : '상대편 100%',
        empathyScore: ratio === 'High' ? 90 : ratio === 'Middle' ? 50 : 10,
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
    }
    
    setIsExplainSettingsModalOpen(false);
  };

  const handleReport = (targetId: string) => {
    setReportTargetId(targetId);
    setIsReportOpen(true);
  };

  const handleSubmitReport = async (targetId: string, reason: string) => {
    if (blockedForGuest('신고하려면 로그인이 필요해요.')) return;

    const isStory = stories.some(s => s.id === targetId);

    // 중복 신고 차단, 1일 한도, 블라인드 판정은 전부 서버가 결정한다.
    // 거절될 수 있으므로 화면을 먼저 바꾸지 않고 결과를 받아 반영한다.
    const { data, error } = await supabase.rpc('submit_report', {
      p_target_type: isStory ? 'story' : 'comment',
      p_target_id: targetId,
      p_reason: reason,
    });

    if (error) {
      setToastMessage(error.message || '신고를 처리하지 못했습니다.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const result = data as { reports: number; blinded: boolean };

    if (isStory) {
      setStories(prev => prev.map(s =>
        s.id === targetId ? { ...s, reportsCount: result.reports, isBlind: result.blinded } : s
      ));
    } else {
      setCommentsMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(sid => {
          updated[sid] = updated[sid].map(c =>
            c.id === targetId ? { ...c, reportsCount: result.reports, isBlind: result.blinded } : c
          );
        });
        return updated;
      });
    }

    setToastMessage(result.blinded
      ? '신고가 접수되었고, 검토를 위해 가려졌습니다.'
      : '신고가 접수되었습니다.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 가려진 글의 작성자가 이의를 제기한다
  const handleSubmitAppeal = async (targetId: string, text: string) => {
    const { error } = await supabase.rpc('submit_appeal', {
      p_target_type: 'story',
      p_target_id: targetId,
      p_text: text,
    });

    if (error) {
      setToastMessage(error.message || '이의 제기를 접수하지 못했습니다.');
    } else {
      setStories(prev => prev.map(s =>
        s.id === targetId ? { ...s, appealStatus: 'pending', appealText: text } : s
      ));
      setToastMessage('이의 제기가 접수되었습니다. 검토 후 안내드릴게요.');
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const baseFilteredStories = stories.filter(s => {
    // 가려진 글도 작성자에게는 보인다. 왜 가려졌는지 모르는 채로 사라지면
    // 이의를 제기할 방법이 없기 때문 — 본문 대신 상태 카드가 뜬다.
    if (s.isBlind && s.authorId !== user.id) return false;
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

  // 마이페이지에 보여줄 내 투표 목록 (제목은 현재 사연 목록에서 가져온다)
  const myVotes = myVoteRecords.map(v => ({
    storyId: v.storyId,
    option: v.option,
    title: stories.find(s => s.id === v.storyId)?.title ?? '삭제된 사연',
  }));

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

  // 게스트는 홈 피드 탐색만 가능하므로, 나머지 진입점은 로그인 안내로 대체한다
  const openStoryDetail = (story: Story) => {
    if (blockedForGuest('사연 전체 내용을 보려면 로그인이 필요해요.')) return;
    setSelectedStory(story);

    // 조회수는 신고 비율 판정의 분모라서 실제로 늘어나야 한다.
    // 본인 글은 세지 않는다.
    if (story.authorId !== user.id) {
      supabase.rpc('increment_story_view', { p_story_id: story.id });
      setStories(prev => prev.map(s =>
        s.id === story.id ? { ...s, viewCount: (s.viewCount ?? 0) + 1 } : s
      ));
    }
  };

  const openCreateStory = () => {
    if (blockedForGuest('사연을 등록하려면 로그인이 필요해요.')) return;
    setIsCreateStoryOpen(true);
  };


  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex flex-col font-sans selection:bg-[#FF6B5A] selection:text-[#1C1C1C]">
      
      {/* Header */}
      <Header
        user={user}
        onOpenProfile={() => setActiveTab('mypage')}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenCreateStory={openCreateStory}
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
              onSelectStory={openStoryDetail}
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
                        ? 'bg-[#FF6B5A] text-[#1C1C1C] shadow-xs'
                        : 'bg-white border border-[#E5E7EB] text-[#5f5e5e] hover:border-[#FF6B5A] hover:text-[#FF6B5A]'
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
                      ? 'bg-[#1C1C1C] text-[#FF6B5A]'
                      : 'bg-white border border-[#E5E7EB] text-[#5f5e5e] hover:text-[#1C1C1C]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> 최신순
                </button>
                <button
                  onClick={() => setSortBy('votes')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    sortBy === 'votes'
                      ? 'bg-[#1C1C1C] text-[#FF6B5A]'
                      : 'bg-white border border-[#E5E7EB] text-[#5f5e5e] hover:text-[#1C1C1C]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#FF6B5A]" /> HOT
                </button>
              </div>
            </div>

            {/* Story Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStories.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-3">
                  <MessageSquareHeart className="w-10 h-10 text-[#FF6B5A] mx-auto opacity-80" />
                  <h3 className="text-base font-bold text-[#1C1C1C]">
                    등록된 사연이 없습니다.
                  </h3>
                  <p className="font-mono text-xs text-[#5f5e5e]">첫 번째 사연을 등록해 논리 대결을 시작해보세요!</p>
                  <button
                    onClick={openCreateStory}
                    className="mt-2 px-6 py-2.5 bg-[#FF6B5A] text-[#1C1C1C] font-mono font-bold text-xs rounded-lg hover:bg-[#FF6B5A]/90 cursor-pointer"
                  >
                    사연 등록하기
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
                    onSelect={openStoryDetail}
                    onVote={handleVote}
                    onStartAIChatWithStory={handleStartAIChatWithStory}
                    onReport={handleReport}
                    onEdit={handleEditStory}
                    onDelete={handleDeleteStory}
                    onHide={handleHideStory}
                    comments={commentsMap[story.id] || []}
                    isGuest={isGuest}
                    onAppeal={(id) => setAppealTargetId(id)}
                  />
                ))
              )}
            </div>

            {/* Create Story Prompt Section */}
            <div className="mt-16 p-8 border border-[#FF6B5A] bg-[#FF6B5A]/5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-[#FF6B5A] flex items-center justify-center text-[#1C1C1C]">
                  <MessageSquareHeart className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-headline-md text-base sm:text-lg font-bold text-[#1C1C1C] mb-1">당신의 고민을 나눠보세요</h3>
                  <p className="text-[#5f5e5e] font-body-md text-xs sm:text-sm">세상의 모든 갈등과 고민은 명확한 논리로 해답을 찾을 수 있습니다.</p>
                </div>
              </div>
              <button
                onClick={openCreateStory}
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
            onCrisisDetected={(t) => notifyIfCrisis(t)}
            supporterCount={
              activeChatSession?.storyId
                ? stories.find(s => s.id === activeChatSession.storyId)?.votesA
                : undefined
            }
            personas={[...personas].sort((a, b) => {
              if (b.isPinned !== a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            })}
            activeSession={activeChatSession}
            onStartSession={(persona) => {
              const isExplanation = ['내 편 100%', '반반', '상대편 100%', '상대편 입장 100%'].includes(persona.role) || (persona.description && persona.description.includes('공감하며 위로'));
              const ratio: ExplainRatio | undefined = persona.role === '내 편 100%' ? 'High' : persona.role === '반반' ? 'Middle' : (persona.role === '상대편 100%' || persona.role === '상대편 입장 100%') ? 'Low' : undefined;
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
                        text: persona.sampleFirstMessage || (isExplanation ? `상황에 대한 이야기를 들려주세요. 편하게 감정을 털어놓으셔도 좋습니다.` : `말해보세요. 제 이야기도 들어보실래요?`),
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ],
                empathyScore: persona.empathyScore !== undefined ? persona.empathyScore : (ratio === 'High' ? 90 : ratio === 'Middle' ? 50 : ratio === 'Low' ? 10 : 50),
                createdAt: new Date().toISOString(),
                status: 'active',
                chatMode: isExplanation ? 'explanation' : 'simulation',
                explanationRatio: ratio
              };
              setActiveChatSession(newSession);
              setAiExplainSettingsStory(null);
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
        onClick={openCreateStory}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-[#FF6B5A] text-[#1C1C1C] flex items-center justify-center shadow-lg hover:bg-[#FF6B5A]/90 active:scale-95 transition-all cursor-pointer md:hidden"
        title="익명 사연 쓰기"
      >
        <MessageSquareHeart className="w-7 h-7" />
      </button>

      {/* Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'ai-chat' && blockedForGuest('AI와 대화하려면 로그인이 필요해요.')) return;
          if (tab === 'mypage' && blockedForGuest('마이페이지는 로그인 후 이용하실 수 있어요.')) return;

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
        onGuestBrowse={handleGuestBrowse}
      />

      <CrisisSupportModal
        isOpen={isCrisisOpen}
        onClose={() => setIsCrisisOpen(false)}
      />

      {/* 이의 제기 입력 */}
      {appealTargetId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 flex flex-col gap-3">
            <h2 className="text-base font-bold text-[#1C1C1C]">이의 제기</h2>
            <p className="text-xs text-[#5f5e5e] leading-relaxed">
              이 글이 왜 규칙에 어긋나지 않는지 알려주세요. 검토 후 다시 공개될 수 있습니다.
            </p>
            <textarea
              id="appeal-text"
              rows={4}
              maxLength={300}
              placeholder="예: 특정인을 비방한 내용이 아니라 제 상황을 설명한 글입니다."
              className="w-full p-3 text-xs border border-[#E5E7EB] rounded-lg resize-none focus:outline-none focus:border-[#FF6B5A]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAppealTargetId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#5f5e5e] hover:bg-[#f3f4f5] cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('appeal-text') as HTMLTextAreaElement | null;
                  const text = el?.value.trim() ?? '';
                  if (!text) return;
                  handleSubmitAppeal(appealTargetId, text);
                  setAppealTargetId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#1C1C1C] text-white text-sm font-bold hover:bg-black cursor-pointer"
              >
                제출하기
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginPromptModal
        isOpen={loginPromptMessage !== null}
        message={loginPromptMessage ?? undefined}
        onClose={() => setLoginPromptMessage(null)}
        onGoToLogin={handleGoToLogin}
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
          opponentLabel={OPPONENT_LABELS[aiChatModeStory.category] ?? '상대방'}
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
          <MessageSquareHeart className="w-4 h-4 text-[#FF6B5A]" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
