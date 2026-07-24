import React, { useState, useEffect } from 'react';
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
import { MyPageView } from './components/MyPageView';
import { ReportModal } from './components/ReportModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { WelcomeModal } from './components/WelcomeModal';
import { Flame, Clock, Filter, Sparkles, MessageSquareHeart } from 'lucide-react';

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

  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    return !localStorage.getItem('nipyeon_user');
  });

  // Potens API Key
  const [potensApiKey, setPotensApiKey] = useState<string>(() => {
    return localStorage.getItem('potens_api_key') || '';
  });

  // Main Feed State
  const [stories, setStories] = useState<Story[]>(() => {
    const saved = localStorage.getItem('nipyeon_stories');
    return saved ? JSON.parse(saved) : INITIAL_STORIES;
  });

  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(() => {
    const saved = localStorage.getItem('nipyeon_comments');
    return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
  });

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

  useEffect(() => {
    localStorage.setItem('nipyeon_stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('nipyeon_comments', JSON.stringify(commentsMap));
  }, [commentsMap]);

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
    };
    setUser(updatedUser);
    setShowWelcomeModal(false);
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

  const handleVote = (storyId: string, option: 'A' | 'B') => {
    setStories(prev => prev.map(story => {
      if (story.id === storyId) {
        if (story.userVoted) return story;
        const updated = {
          ...story,
          userVoted: option,
          votesA: option === 'A' ? story.votesA + 1 : story.votesA,
          votesB: option === 'B' ? story.votesB + 1 : story.votesB,
        };
        // Track vote in my activity
        setMyVotes(mv => [...mv, { storyId: story.id, title: story.title, option }]);
        if (selectedStory?.id === storyId) setSelectedStory(updated);
        return updated;
      }
      return story;
    }));
  };

  const handleAddComment = (storyId: string, content: string) => {
    const storyComments = commentsMap[storyId] || [];
    const anonNumber = storyComments.length + 1;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      storyId,
      authorId: user.id,
      anonymousId: `익명 ${anonNumber}`,
      content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      reportsCount: 0,
    };

    setCommentsMap(prev => ({
      ...prev,
      [storyId]: [...(prev[storyId] || []), newComment]
    }));

    // Increment story comment count
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, commentCount: s.commentCount + 1 } : s));
  };

  const handleLikeComment = (commentId: string) => {
    setCommentsMap(prev => {
      const updatedMap = { ...prev };
      Object.keys(updatedMap).forEach(storyId => {
        updatedMap[storyId] = updatedMap[storyId].map(c => {
          if (c.id === commentId) {
            const userLiked = !c.userLiked;
            return {
              ...c,
              userLiked,
              likeCount: userLiked ? c.likeCount + 1 : c.likeCount - 1
            };
          }
          return c;
        });
      });
      return updatedMap;
    });
  };

  const handleCreateStory = (storyData: {
    title: string;
    category: Exclude<StoryCategory, '전체'>;
    body: string;
    createAIPersona: boolean;
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
      votesA: 1, // initial author vote
      votesB: 0,
      userVoted: 'A',
      commentCount: 0,
      viewCount: 1,
      reportsCount: 0,
      isBlind: false,
      cardColor: randomColor,
    };

    setStories(prev => [newStory, ...prev]);

    // If auto persona creation requested
    if (storyData.createAIPersona) {
      const newPersona: AIPersona = {
        id: `persona-${Date.now()}`,
        name: `사연 상대방 (${storyData.title.slice(0, 10)}...)`,
        role: `${storyData.category} 갈등 상대`,
        category: storyData.category,
        avatarIcon: 'Bot',
        description: `사연: "${storyData.title}" 의 상대방 AI 페르소나입니다.`,
        systemInstruction: `너는 사용자가 올린 다음 사연의 갈등 상대방이다: "${storyData.body}". 뻔뻔하게 본인의 입장을 변명하거나 도리어 서운해하며 대화해라.`,
        cardColor: randomColor,
        sampleFirstMessage: `너 나한테 사연 올린 거 진짜 너무하다... 내가 그렇게 잘못했다고 생각해?`
      };
      setPersonas(prev => [newPersona, ...prev]);
    }
  };

  const handleStartAIChatWithStory = (story: Story) => {
    // Find matching persona or create temporary session
    let persona = personas.find(p => p.category === story.category) || personas[0];
    
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      personaId: persona.id,
      personaName: persona.name,
      personaRole: persona.role,
      storyId: story.id,
      messages: [
        {
          id: `msg-1`,
          sender: 'ai',
          text: `[${persona.name}] 네가 커뮤니티에 올린 사연 봤는데... 진짜 내가 그렇게 이상해? 나한테 직접 말해봐.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      empathyScore: 30,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    setActiveChatSession(newSession);
    setActiveTab('ai-chat');
  };

  const handleReport = (targetId: string) => {
    setReportTargetId(targetId);
    setIsReportOpen(true);
  };

  const handleSubmitReport = (targetId: string, reason: string) => {
    setStories(prev => prev.map(s => {
      if (s.id === targetId) {
        const reportsCount = s.reportsCount + 1;
        return {
          ...s,
          reportsCount,
          isBlind: reportsCount >= 5 // Auto blind policy after 5 reports
        };
      }
      return s;
    }));
  };

  // Filtered & Sorted stories
  const filteredStories = stories.filter(s => {
    if (s.isBlind) return false;
    if (selectedCategory === '전체') return true;
    return s.category === selectedCategory;
  }).sort((a, b) => {
    if (sortBy === 'votes') {
      return (b.votesA + b.votesB) - (a.votesA + a.votesB);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const weeklyTopStories = [...stories]
    .filter(s => !s.isBlind)
    .sort((a, b) => (b.votesA + b.votesB) - (a.votesA + a.votesB));

  // My Written Stories & Comments
  const myStories = stories.filter(s => s.authorId === user.id);
  const myComments = (Object.values(commentsMap) as Comment[][]).flat().filter(c => c.authorId === user.id);

  return (
    <div className="min-h-screen bg-white text-[#151515] flex flex-col font-sans selection:bg-[#e21500] selection:text-white">
      
      {/* Header */}
      <Header
        user={user}
        onOpenProfile={() => setActiveTab('mypage')}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenCreateStory={() => setIsCreateStoryOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-6">
        
        {/* TAB 1: FEED VIEW */}
        {activeTab === 'feed' && (
          <div className="space-y-6 pb-24">
            
            {/* Weekly Top Banner */}
            <WeeklyTopBanner
              weeklyTopStories={weeklyTopStories}
              onSelectStory={(story) => setSelectedStory(story)}
            />

            {/* Today's Balance Game */}
            <BalanceGameSection />

            {/* Category Filter & Sorting Bar */}
            <div className="bg-white border-2 border-black p-3 flex flex-col sm:flex-row items-center justify-between gap-3 elevated-tile">
              
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scroll-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-mono font-black transition-all cursor-pointer whitespace-nowrap border-2 ${
                      selectedCategory === cat
                        ? 'bg-[#e21500] text-white border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-white text-black border-black hover:bg-[#e21500] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort Switch */}
              <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border-2 border-black shrink-0 font-mono">
                <button
                  onClick={() => setSortBy('latest')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black transition-all cursor-pointer ${
                    sortBy === 'latest'
                      ? 'bg-[#e21500] text-white shadow-[2px_2px_0px_#000]'
                      : 'text-black hover:text-[#e21500]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> LATEST
                </button>
                <button
                  onClick={() => setSortBy('votes')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black transition-all cursor-pointer ${
                    sortBy === 'votes'
                      ? 'bg-black text-white shadow-[2px_2px_0px_#e21500]'
                      : 'text-black hover:text-[#e21500]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#fffa82]" /> HOT
                </button>
              </div>
            </div>

            {/* Feed Story Cards List */}
            <div className="space-y-4">
              {filteredStories.length === 0 ? (
                <div className="text-center py-16 bg-white border-4 border-black p-6 space-y-3 elevated-tile">
                  <MessageSquareHeart className="w-10 h-10 text-[#e21500] mx-auto" />
                  <h3 className="text-base font-black text-black">
                    등록된 사연이 없습니다.
                  </h3>
                  <p className="font-mono text-xs text-[#5e5e5e] font-bold">첫 번째 사연을 등록해 내편을 만들어보세요!</p>
                  <button
                    onClick={() => setIsCreateStoryOpen(true)}
                    className="mt-2 px-4 py-2 bg-[#e21500] text-white font-mono font-black text-xs border-2 border-black uppercase shadow-[2px_2px_0px_#000] cursor-pointer"
                  >
                    CREATE STORY
                  </button>
                </div>
              ) : (
                filteredStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onSelect={(s) => setSelectedStory(s)}
                    onVote={handleVote}
                    onStartAIChatWithStory={handleStartAIChatWithStory}
                    onReport={handleReport}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI SIMULATION CHAT VIEW */}
        {activeTab === 'ai-chat' && (
          <AIChatView
            personas={personas}
            activeSession={activeChatSession}
            onStartSession={(persona) => {
              const newSession: ChatSession = {
                id: `session-${Date.now()}`,
                personaId: persona.id,
                personaName: persona.name,
                personaRole: persona.role,
                messages: [
                  {
                    id: `msg-0`,
                    sender: 'ai',
                    text: persona.sampleFirstMessage,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ],
                empathyScore: 30,
                createdAt: new Date().toISOString(),
                status: 'active'
              };
              setActiveChatSession(newSession);
            }}
            onEndSession={() => setActiveChatSession(null)}
            potensApiKey={potensApiKey}
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

      {/* Floating Write Button (Mobile Quick Access) */}
      <button
        onClick={() => setIsCreateStoryOpen(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-[#e21500] text-white flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 transition-all cursor-pointer md:hidden"
        title="익명 사연 쓰기"
      >
        <MessageSquareHeart className="w-7 h-7" />
      </button>

      {/* Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
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
        onStartAIChat={(story) => {
          setSelectedStory(null);
          handleStartAIChatWithStory(story);
        }}
        onReportStory={handleReport}
        onReportComment={handleReport}
      />

      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onSubmit={handleCreateStory}
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
    </div>
  );
}

