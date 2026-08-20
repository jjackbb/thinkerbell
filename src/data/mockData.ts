import { Story, Comment } from '../types';


export const INITIAL_STORIES: Story[] = [
  {
    id: 'story-work-1',
    authorId: 'user-101',
    authorNickname: '퇴근희망자',
    title: '부장님이 또 갈궈요...',
    body: '오늘 점심시간에도 밥 먹는데 옆에서 계속 업무 얘기만 하시고, 제 밥 먹는 속도까지 참견하시더니 오후 되니까 서류 작성 잘못되었다고 팀원들 다 보는 앞에서 소리 지르시네요. 저 진짜 멘탈 나갈 것 같습니다...',
    category: '직장',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3분 전
    votesA: 867, // 퇴사가 답 (72%)
    votesB: 337, // 좀 더 참아보자 (28%)
    commentCount: 84,
    viewCount: 1204,
    isHot: true,
    isWeeklyTop: true,
    weeklyRank: 1,
    personaName: 'Angry Boss (직장 상사)',
    personaInstruction: '너는 무서운 직장 상사 Angry Boss다. 직원의 작은 실수에도 큰소리를 치며 꼰대 발언을 퍼붓는 인물이다.',
    reportsCount: 0,
    isBlind: false,
    cardColor: 'teal'
  },
  {
    id: 'story-dating-1',
    authorId: 'user-102',
    authorNickname: '고민중인여친',
    title: '남친의 여사친 문제, 제가 예민한가요?',
    body: '둘이서만 심야 영화 보는 걸 이해해달라는데... 제가 속이 좁은 건지 아니면 이게 정상인 건지 도무지 감이 안 잡히네요. 말로는 단둘이 오랫동안 봐온 불알친구라 상관없다고 하는데, 전 너무 스트레스 받아요.',
    category: '연애',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12분 전
    votesA: 381, // 예민함 (15%)
    votesB: 2159, // 남친이 잘못 (85%)
    commentCount: 215,
    viewCount: 2540,
    isHot: true,
    isWeeklyTop: true,
    weeklyRank: 2,
    personaName: '민우 (회피형 애인)',
    personaInstruction: '너는 여사친과 단둘이 심야 영화를 보는 게 당연하다고 주장하는 뻔뻔한 남친이다.',
    reportsCount: 0,
    isBlind: false,
    cardColor: 'pink'
  },
  {
    id: 'story-friends-1',
    authorId: 'user-103',
    authorNickname: '억울한야옹이',
    title: '돈 안 갚는 친구 손절할까요?',
    body: '10만원 빌려가놓고 인스타에는 매일 오마카세 사진 올라와요. 말하기 치사해서 가만히 있는 중인데 연락도 잘 안 받고 속 터집니다...',
    category: '친구',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45분 전
    votesA: 820, // 당장 손절 (92%)
    votesB: 72,  // 한번 더 기회 (8%)
    commentCount: 42,
    viewCount: 892,
    isHot: true,
    isWeeklyTop: true,
    weeklyRank: 3,
    personaName: '지은 (체리피커 친구)',
    personaInstruction: '너는 돈을 안 갚으면서 인스타에 오마카세 사진을 올리는 뻔뻔한 친구다.',
    reportsCount: 0,
    isBlind: false,
    cardColor: 'lavender'
  },
  {
    id: 'story-family-1',
    authorId: 'user-104',
    authorNickname: '자유로운새',
    title: '명절에 시댁 안 가면 불효인가요?',
    body: '이번 명절에는 저희 친정 부모님이랑 해외여행 가기로 했는데, 시어머니가 서운해하시네요. 남편도 옆에서 은근 눈치 주는데 제 권리 아닌가요?',
    category: '가족',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1시간 전
    votesA: 998, // 내 권리 (64%)
    votesB: 562, // 그래도 불효 (36%)
    commentCount: 128,
    viewCount: 1560,
    isHot: false,
    reportsCount: 0,
    isBlind: false,
    cardColor: 'peach'
  },
  {
    id: 'story-detail-sample',
    authorId: 'user-105',
    authorNickname: '속뚫리는고구마',
    title: '데이트 비용 7:3, 이게 맞나요?',
    body: '안녕하세요, 20대 후반 직장인입니다. 현재 남자친구와 1년 정도 사귀고 있는데, 요즘 데이트 비용 때문에 고민이 많아요. 저는 대기업에 다니고 있고 남자친구는 중소기업에 다니고 있어서 제가 수입이 좀 더 많긴 합니다. 그래서 자연스럽게 7:3 정도로 제가 더 많이 내고 있는데, 남자친구는 이게 당연하다고 생각하는 것 같아요. 기념일에도 제가 더 비싼 선물을 챙겨주고... 가끔은 서운한 마음이 드는데, 제가 속이 좁은 건가요? 여러분은 어떻게 생각하시나요? 제 편인가요, 아니면 제가 이해해야 하는 남자친구 편인가요?',
    category: '연애',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3시간 전
    votesA: 342, // 내편 "이해해요"
    votesB: 120, // 니편 "이해부족"
    commentCount: 42,
    viewCount: 1890,
    isHot: true,
    reportsCount: 0,
    isBlind: false,
    cardColor: 'cream'
  }
];

export const INITIAL_COMMENTS: Record<string, Comment[]> = {
  'story-detail-sample': [
    {
      id: 'c-301',
      storyId: 'story-detail-sample',
      authorId: 'u-901',
      anonymousId: 'Anonymous 1',
      content: '저도 비슷한 상황이었는데, 딱 잘라서 데이트 통장 제안해봤어요. 수입 비례해서 넣는 걸로 하니까 훨씬 마음 편하더라구요!',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10분 전
      likeCount: 12,
      reportsCount: 0,
      authorVoted: 'A'
    },
    {
      id: 'c-302',
      storyId: 'story-detail-sample',
      authorId: 'u-902',
      anonymousId: 'Anonymous 2',
      content: '니편 들어보자면... 남자친구분도 나름대로 선물이나 다른 쪽에서 노력하고 있는 부분은 없나요? 그런 것도 한번 잘 따져보세요.',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25분 전
      likeCount: 3,
      reportsCount: 0,
      authorVoted: 'B'
    }
  ],
  'story-work-1': [
    {
      id: 'c-101',
      storyId: 'story-work-1',
      authorId: 'u-901',
      anonymousId: '익명 1',
      content: '밥 먹는 속도까지 참견하는 부장님이라니 진짜 스트레스 크시겠네요. 직장 상사 꼰대 대처법 공유해드립니다!',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      likeCount: 15,
      reportsCount: 0,
      authorVoted: 'A'
    }
  ]
};
