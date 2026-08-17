export type StoryCategory = '전체' | '연애' | '직장' | '친구' | '가족' | '기타';

export interface UserProfile {
  id: string;
  nickname: string;
  socialProvider?: 'kakao' | 'apple' | 'google' | 'guest';
  createdAt: string;
  isAdultVerified?: boolean;
}

export interface Story {
  id: string;
  authorId: string;
  authorNickname: string;
  title: string;
  body: string;
  category: Exclude<StoryCategory, '전체'>;
  createdAt: string;
  votesA: number; // 내편 (A)
  votesB: number; // 상대편 (B)
  userVoted?: 'A' | 'B';
  commentCount: number;
  viewCount: number;
  isHot?: boolean;
  isWeeklyTop?: boolean;
  weeklyRank?: number;
  personaName?: string;
  personaInstruction?: string;
  reportsCount: number;
  isBlind: boolean;
  isAdult?: boolean;
  voteChanged?: boolean;
  /** 신고로 가려진 글에 작성자가 낸 이의 제기 상태 */
  appealStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  appealText?: string;
  isHidden?: boolean;
  cardColor: 'pink' | 'teal' | 'lavender' | 'peach' | 'ochre' | 'cream';
}

export interface Comment {
  id: string;
  storyId: string;
  authorId: string;
  anonymousId: string; // e.g., '익명 1', '익명 2'
  content: string;
  createdAt: string;
  likeCount: number;
  userLiked?: boolean;
  reportsCount: number;
  isBlind?: boolean;
  authorVoted?: 'A' | 'B';
  isEdited?: boolean;
}

export interface AIPersona {
  id: string;
  name: string;
  role: string;
  category: string;
  avatarIcon: string; // Lucide icon identifier or emoji
  description: string;
  systemInstruction: string;
  isPinned?: boolean;
  createdAt?: string;
  cardColor: 'pink' | 'teal' | 'lavender' | 'peach' | 'ochre' | 'cream';
  sampleFirstMessage: string;
  chatHistory?: ChatMessage[];
  empathyScore?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  personaId: string;
  personaName: string;
  personaRole: string;
  storyId?: string;
  storyTitle?: string;
  messages: ChatMessage[];
  empathyScore: number; // 내편지수 0~100%
  createdAt: string;
  status: 'active' | 'ended';
  chatMode?: 'simulation' | 'explanation';
  explanationRatio?: 'High' | 'Middle' | 'Low';
}

export interface ReportItem {
  id: string;
  targetType: 'story' | 'comment';
  targetId: string;
  reason: string;
  reportedAt: string;
}
