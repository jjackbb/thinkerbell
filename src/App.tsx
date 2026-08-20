import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { buildSimulationPrompt, buildEmpathyPrompt, OPENING_SCRIPTS, EMPATHY_OPENERS, EMPATHY_PERSONA_NAMES, ratioLabel } from './lib/prompts';
import { detectCrisis } from './lib/crisis';
import { DAILY_AI_QUOTA, fetchAiQuotaUsed, consumeAiQuota } from './lib/aiQuota';

const CATEGORIES: StoryCategory[] = ['전체', '연애', '직장', '친구', '가족', '기타'];

// 사연 기반 AI 시뮬레이션에서 대화 상대를 부르는 호칭
const OPPONENT_LABELS: Partial<Record<StoryCategory, string>> = {
  '연애': '연인',
  '직장': '직장 상대',
  '친구': '친구',
  '가족': '가족',
  '기타': '상대방',
};

/** 공감 모드 페르소나가 쓰는 역할 라벨 3종 */
const EMPATHY_ROLE_LABELS: string[] = (['High', 'Middle', 'Low'] as const).map(ratioLabel);
const EMPATHY_NAMES: string[] = Object.values(EMPATHY_PERSONA_NAMES);

/**
 * 옛날 공감 페르소나를 걸러낸다.
 *
 * 예전에는 공감 모드 페르소나의 이름을 사연 제목으로 달았다. 그래서 목록에서
 * "명절마다 차별하시는 부모님"이 위로를 건네는 것처럼 보였다. 지금은 비율별
 * 호칭(내 편 친구 / 들어주는 친구 / 짚어주는 친구)을 쓰는데, 예전 카드가 남아
 * 있으면 두 규칙이 섞여 더 헷갈린다.
 *
 * 대화 내용까지 같이 사라지므로 되돌릴 수 없다. 지금은 실제 사용자가 없는
 * 단계라 한 번 정리하고 넘어간다.
 */
const dropLegacyEmpathyPersonas = (list: AIPersona[]): AIPersona[] =>
  list.filter(p => !(EMPATHY_ROLE_LABELS.includes(p.role) && !EMPATHY_NAMES.includes(p.name)));

/**
 * 남의 사연으로 AI 대화를 열 수 있는 하루 무료 횟수.
 *
 * 평생 1회로 막으면 맛도 보기 전에 벽을 만나 아예 안 쓰게 된다. 매일 조금씩
 * 열어줘야 "이거 더 하고 싶다"는 마음이 생기고, 그때 구독이 의미가 생긴다.
 * 내가 쓴 사연은 횟수를 쓰지 않는다.
 *
 * 세는 일 자체는 src/lib/aiQuota.ts 가 한다. 로그인했으면 서버(Supabase),
 * 로그인 전이면 예전처럼 로컬에서 센다.
 */


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

  // 로그인 상태가 바뀌면 오늘 쓴 무료 횟수를 서버에서 다시 받아온다
  useEffect(() => {
    let alive = true;
    fetchAiQuotaUsed().then(used => { if (alive) setAiQuotaUsed(used); });
    return () => { alive = false; };
  }, [user.id]);

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
    if (!saved) return INITIAL_PERSONAS;
    try {
      return dropLegacyEmpathyPersonas(JSON.parse(saved));
    } catch {
      return INITIAL_PERSONAS;
    }
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
  /** 오늘 쓴 무료 AI 대화 횟수. 실제 판정은 열기 직전에 다시 조회한다 */
  const [aiQuotaUsed, setAiQuotaUsed] = useState<number>(0);
  const freeChatsLeft = Math.max(0, DAILY_AI_QUOTA - aiQuotaUsed);

  /** 한 번 쓰고 나면 서버가 세어준 숫자로 화면을 맞춘다 */
  const spendAiQuota = (storyId: string) => {
    setAiQuotaUsed(prev => prev + 1);
    consumeAiQuota(storyId).then(setAiQuotaUsed);
  };
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

  // 공유 링크(?story=)로 들어온 경우 해당 사연을 연다. 사연이 다 불러와진
  // 뒤에 한 번만 시도한다
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || stories.length === 0) return;
    const id = new URLSearchParams(window.location.search).get('story');
    if (!id) { deepLinkHandled.current = true; return; }
    const target = stories.find(s => s.id === id);
    deepLinkHandled.current = true;
    if (target) openStoryDetail(target);
    else syncStoryUrl(null);
  }, [stories]);

  /**
   * 열려 있는 사연 상세를 목록의 최신 값과 맞춰둔다.
   *
   * selectedStory는 목록에서 복사해 온 스냅샷이라 목록이 갱신돼도 따라가지
   * 않았다. 특히 공유 링크(?story=)로 들어오면 투표 기록이 반영되기 전에
   * 스냅샷이 떠서, **이미 투표한 사람에게도 "투표하면 결과가 열려요"가**
   * 뜨고 공유 바도 나타나지 않았다.
   *
   * 값이 그대로면 prev를 그대로 돌려준다. 매번 새 객체를 만들면 렌더가
   * 계속 돈다.
   */
  useEffect(() => {
    setSelectedStory(prev => {
      if (!prev) return prev;
      const fresh = stories.find(s => s.id === prev.id);
      if (!fresh) return prev;
      const same =
        fresh.userVoted === prev.userVoted &&
        fresh.voteChanged === prev.voteChanged &&
        fresh.votesA === prev.votesA &&
        fresh.votesB === prev.votesB &&
        fresh.isBlind === prev.isBlind &&
        fresh.commentCount === prev.commentCount;
      return same ? prev : { ...prev, ...fresh };
    });
  }, [stories]);

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

    /**
     * 판정을 먼저 하고, 그 다음에 화면을 바꾼다.
     *
     * 예전에는 setStories 콜백 안에서 '보낼 필요 있음' 플래그를 세우고 바로
     * 다음 줄에서 읽었다. 그 콜백은 렌더 때 실행되므로 읽는 시점에는 늘
     * false였고, 결과적으로 **투표가 화면에만 반영되고 서버로는 한 번도
     * 가지 않았다.** 새로고침하면 표가 사라졌다.
     */
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    if (story.userVoted === option) return; // 같은 쪽에 다시 누른 경우

    const isChange = Boolean(story.userVoted);
    if (isChange && story.voteChanged) {
      setToastMessage('투표는 최대 1번만 변경할 수 있습니다.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const updated: Story = isChange
      ? {
          ...story,
          userVoted: option,
          votesA: option === 'A' ? story.votesA + 1 : story.votesA - 1,
          votesB: option === 'B' ? story.votesB + 1 : story.votesB - 1,
          voteChanged: true,
        }
      : {
          ...story,
          userVoted: option,
          votesA: option === 'A' ? story.votesA + 1 : story.votesA,
          votesB: option === 'B' ? story.votesB + 1 : story.votesB,
        };

    setStories(prev => prev.map(s => (s.id === storyId ? updated : s)));
    if (selectedStory?.id === storyId) setSelectedStory(updated);

    if (isChange) {
      setToastMessage('투표를 변경했습니다. 변경은 한 번뿐이라 이제 확정됩니다.');
      setTimeout(() => setToastMessage(null), 3000);
    }

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

    /**
     * 투표와 같은 이유로 판정을 먼저 한다.
     *
     * setCommentsMap 콜백은 렌더 시점에 실행되므로, 그 안에서 세운 값을 바로
     * 아래에서 읽으면 늘 초기값이다. 그래서 **공감 수가 화면에만 오르고 서버로는
     * 한 번도 가지 않았다.**
     */
    const storyId = Object.keys(commentsMap).find(sid =>
      commentsMap[sid].some(c => c.id === commentId)
    );
    if (!storyId) return;

    const target = commentsMap[storyId].find(c => c.id === commentId);
    if (!target) return;

    const userLiked = !target.userLiked;
    const delta = userLiked ? 1 : -1;

    setCommentsMap(prev => ({
      ...prev,
      [storyId]: prev[storyId].map(c =>
        c.id === commentId
          ? { ...c, userLiked, likeCount: Math.max(0, c.likeCount + delta) }
          : c
      ),
    }));

    // 남의 댓글을 수정하는 동작이라 서버 함수를 통해서만 증감한다
    await supabase.rpc('like_comment', { p_comment_id: commentId, p_delta: delta });
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
      // 작성자가 적어둔 상대방 성격. 저장해 두어야 나중에 AI 대화를 열 때
      // 그 성격대로 상대를 연기시킬 수 있다
      personaInstruction: storyData.opponentPersonality || undefined,
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
        systemInstruction: buildSimulationPrompt({
          storyBody: storyData.body,
          opponentPersonality: storyData.opponentPersonality,
        }),
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

    // 값이 그대로면 배열/객체를 새로 만들지 않는다. 새로 만들면 personas가
    // 매번 새 참조가 되어 자식 effect가 다시 돌고, 그게 불필요한 렌더로 이어진다.
    setPersonas(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (p.id !== personaId) return p;
        const chatHistory = updates.messages !== undefined ? updates.messages : p.chatHistory;
        if (p.chatHistory === chatHistory) return p;
        changed = true;
        return { ...p, chatHistory };
      });
      return changed ? next : prev;
    });
  }, []);

  const handleStartAIChatWithStory = async (story: Story, bypassPremium: boolean = false) => {
    if (story.authorId === user.id || bypassPremium) {
      setAiChatModeStory(story);
      setSelectedStory(null);
      return;
    }

    // 다른 기기에서 썼거나 탭을 켜둔 채 자정을 넘겼을 수 있으므로 열기 직전에 다시 센다
    const used = await fetchAiQuotaUsed();
    setAiQuotaUsed(used);

    if (used < DAILY_AI_QUOTA) {
      setAiChatModeStory(story);
      setSelectedStory(null);
    } else {
      setPremiumModalStory(story);
    }
  };

  const handleSelectAiChatMode = (mode: 'simulation' | 'explanation', opening: ChatOpening = 'oblivious') => {
    if (!aiChatModeStory) return;
    const story = aiChatModeStory;

    if (mode === 'simulation') {
      // 같은 사연을 같은 시작점으로 다시 열면 새로 만들지 않고 이어서 한다.
      // 매번 새로 만들면 AI 대화 탭이 똑같은 카드로 뒤덮인다.
      const existing = personas.find(p => p.storyId === story.id && p.opening === opening);
      const persona: AIPersona = existing ?? {
        id: `persona-${Date.now()}`,
        name: OPPONENT_LABELS[story.category] ?? '상대방',
        role: '상황',
        category: story.category,
        avatarIcon: 'Bot',
        description: `사연: "${story.title}" 의 상대방 AI 페르소나입니다.`,
        systemInstruction: buildSimulationPrompt({
          storyBody: story.body,
          opponentPersonality: story.personaInstruction,
          opening,
        }),
        createdAt: new Date().toISOString(),
        cardColor: 'pink',
        sampleFirstMessage: OPENING_SCRIPTS[opening].first ?? '너 나한테 사연 올린 거 진짜 너무하다...',
        storyId: story.id,
        opening,
      };

      if (!existing) {
        setPersonas(prev => [persona, ...prev]);
        // 내 사연은 무료 횟수를 쓰지 않는다. 이어하기도 마찬가지다.
        if (story.authorId !== user.id) spendAiQuota(story.id);
      }

      // AI가 먼저 말을 건다. 빈 입력창으로 시작하면 "뭐라고 하지"에서 멈춘다.
      const opener = OPENING_SCRIPTS[opening].first;
      const messages = existing?.chatHistory?.length
        ? existing.chatHistory
        : opener
        ? [{
            id: `msg-${Date.now()}`,
            sender: 'ai' as const,
            text: opener,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]
        : [];

      setActiveChatSession({
        id: `session-${Date.now()}`,
        personaId: persona.id,
        personaName: persona.name,
        personaRole: persona.role,
        storyId: story.id,
        storyTitle: story.title,
        messages,
        createdAt: new Date().toISOString(),
        status: 'active',
        chatMode: 'simulation'
      });
      setActiveTab('ai-chat');
      setAiChatModeStory(null);
    } else if (mode === 'explanation') {
      setAiExplainSettingsStory(story);
      setIsExplainSettingsModalOpen(true);
      setAiChatModeStory(null);
    }
  };

  const handleConfirmExplainSettings = (ratio: ExplainRatio) => {
    const story = aiExplainSettingsStory || (activeChatSession ? stories.find(s => s.id === activeChatSession.storyId) : null);
    const systemInstruction = buildEmpathyPrompt({
      storyBody: story?.body || '',
      opponentPersonality: story?.personaInstruction,
      ratio,
    });
    const roleLabel = ratioLabel(ratio);
    const personaName = EMPATHY_PERSONA_NAMES[ratio];
    // 목록에서 어느 사연의 대화인지 구분되도록 제목은 설명에 둔다 (상황 모드와 같은 구조)
    const describe = story ? `사연: "${story.title}" 의 공감 대화 상대입니다.` : '사연을 함께 읽어주는 AI입니다.';

    // 사연 피드나 모달에서 신규 공감 모드를 시작한 경우 (우선 처리)
    if (aiExplainSettingsStory) {
      const target = aiExplainSettingsStory;
      // 같은 사연을 같은 비율로 다시 열면 이어서 한다
      const existing = personas.find(p => p.storyId === target.id && p.ratio === ratio);
      const persona: AIPersona = existing ?? {
        id: `persona-${Date.now()}`,
        name: personaName,
        role: roleLabel,
        category: target.category,
        avatarIcon: 'ListTree',
        description: describe,
        systemInstruction,
        createdAt: new Date().toISOString(),
        cardColor: 'teal',
        sampleFirstMessage: EMPATHY_OPENERS[ratio],
        storyId: target.id,
        ratio,
      };

      if (!existing) {
        setPersonas(prev => [persona, ...prev]);
        if (target.authorId !== user.id) spendAiQuota(target.id);
      }

      // 공감 모드도 AI가 먼저 말을 건다. 빈 화면에 대고 먼저 털어놓기는 어렵다.
      const messages = existing?.chatHistory?.length
        ? existing.chatHistory
        : [{
            id: `msg-${Date.now()}`,
            sender: 'ai' as const,
            text: EMPATHY_OPENERS[ratio],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }];

      setActiveChatSession({
        id: `session-${Date.now()}`,
        personaId: persona.id,
        personaName: persona.name,
        personaRole: persona.role,
        storyId: target.id,
        storyTitle: target.title,
        messages,
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
        personaName,
        personaRole: roleLabel,
      } : null);

      setPersonas(prev => prev.map(p =>
        p.id === activeChatSession.personaId
          ? { ...p, name: personaName, role: roleLabel, description: describe, systemInstruction, ratio }
          : p
      ));
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
  /**
   * 공유 링크가 해당 사연으로 바로 열려야 공유가 의미를 갖는다.
   * 라우터를 들이지 않고 쿼리 하나(?story=)만 주소에 남긴다.
   */
  const syncStoryUrl = (storyId: string | null) => {
    const url = new URL(window.location.href);
    if (storyId) url.searchParams.set('story', storyId);
    else url.searchParams.delete('story');
    window.history.replaceState(null, '', url.toString());
  };

  const closeStoryDetail = () => {
    setSelectedStory(null);
    syncStoryUrl(null);
  };

  const openStoryDetail = (story: Story) => {
    if (blockedForGuest('사연 전체 내용을 보려면 로그인이 필요해요.')) return;
    setSelectedStory(story);
    syncStoryUrl(story.id);

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

      {/*
        사연 쓰기 플로팅 버튼 (모바일)

        피드에서만 띄운다. 다른 탭에도 떠 있으면 그 탭과 상관없는 동작인 데다,
        AI 대화 탭에서는 페르소나 카드의 '시작하기' 버튼을 실제로 덮고 있었다.
      */}
      {activeTab === 'feed' && (
        <button
          onClick={openCreateStory}
          aria-label="익명 사연 쓰기"
          className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-[#FF6B5A] text-[#1C1C1C] flex items-center justify-center shadow-lg hover:bg-[#FF6B5A]/90 active:scale-95 transition-all cursor-pointer md:hidden"
          title="익명 사연 쓰기"
        >
          <MessageSquareHeart className="w-7 h-7" aria-hidden="true" />
        </button>
      )}

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
        onClose={closeStoryDetail} 
        onVote={handleVote}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        onStartAIChat={handleStartAIChatWithStory}
        freeChatsLeft={freeChatsLeft}
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
        dailyQuota={DAILY_AI_QUOTA}
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
