export const MOOD_LABELS = {
  행복해요: { "ko-KR": "행복해요", "en-US": "Happy" },
  우울해요: { "ko-KR": "우울해요", "en-US": "Blue" },
  설레요: { "ko-KR": "설레요", "en-US": "Excited" },
  신나요: { "ko-KR": "신나요", "en-US": "Hyped" },
  아무거나: { "ko-KR": "아무거나", "en-US": "Anything" },
};

export const MOOD_GENRES = {
  행복해요: [35, 10751],
  우울해요: [18],
  설레요: [10749],
  신나요: [28, 12],
  아무거나: [],
};

export const MOOD_QUESTIONS_KO = [
  {
    id: "q1",
    text: "지금 영화 볼 때, 어떤 느낌이 가장 끌려요?",
    options: [
      {
        id: "q1_o1",
        text: "가볍게 웃으면서 리프레시 하고 싶어요",
        weights: { 행복해요: 3, 신나요: 1 },
      },
      {
        id: "q1_o2",
        text: "감정에 푹 빠지는 진지한 영화요",
        weights: { 우울해요: 2, 설레요: 1 },
      },
      {
        id: "q1_o3",
        text: "심장 쿵쾅, 스릴 넘치는 영화요",
        weights: { 신나요: 3 },
      },
      {
        id: "q1_o4",
        text: "아무 생각 없이 그냥 보고 싶어요",
        weights: { 아무거나: 2 },
      },
    ],
  },
  {
    id: "q2",
    text: "오늘 하루를 한 줄로 말하면 어떤 느낌에 가까워요?",
    options: [
      {
        id: "q2_o1",
        text: "뭔가 잘 풀려서 기분이 좋아요",
        weights: { 행복해요: 3 },
      },
      {
        id: "q2_o2",
        text: "조금 지치고 다운된 날이에요",
        weights: { 우울해요: 3 },
      },
      {
        id: "q2_o3",
        text: "설레는 일이 있거나 기대되는 게 있어요",
        weights: { 설레요: 3 },
      },
      {
        id: "q2_o4",
        text: "별 감정 없이 그냥 평범했어요",
        weights: { 아무거나: 2 },
      },
    ],
  },
  {
    id: "q3",
    text: "함께 보는 사람을 떠올리면 어떤 영화가 어울릴까요?",
    options: [
      {
        id: "q3_o1",
        text: "같이 크게 웃을 수 있는 영화",
        weights: { 행복해요: 2, 신나요: 1 },
      },
      {
        id: "q3_o2",
        text: "얘기 많이 나눌 수 있는 진지한 영화",
        weights: { 우울해요: 2 },
      },
      {
        id: "q3_o3",
        text: "둘만의 분위기 살리는 로맨스 영화",
        weights: { 설레요: 3 },
      },
      {
        id: "q3_o4",
        text: "그냥 재밌으면 뭐든 좋아요",
        weights: { 아무거나: 2 },
      },
    ],
  },
];

export const MOOD_QUESTIONS_EN = [
  {
    id: "q1",
    text: "What kind of movie do you want right now?",
    options: [
      {
        id: "q1_o1",
        text: "Something light and funny",
        weights: { 행복해요: 3, 신나요: 1 },
      },
      {
        id: "q1_o2",
        text: "Something deep and emotional",
        weights: { 우울해요: 2, 설레요: 1 },
      },
      { id: "q1_o3", text: "Thrilling and intense", weights: { 신나요: 3 } },
      {
        id: "q1_o4",
        text: "Anything, I just want to watch",
        weights: { 아무거나: 2 },
      },
    ],
  },
  {
    id: "q2",
    text: "How was your day overall?",
    options: [
      {
        id: "q2_o1",
        text: "Pretty good — things went well",
        weights: { 행복해요: 3 },
      },
      { id: "q2_o2", text: "I feel tired or down", weights: { 우울해요: 3 } },
      {
        id: "q2_o3",
        text: "I feel excited about something",
        weights: { 설레요: 3 },
      },
      { id: "q2_o4", text: "Just an ordinary day", weights: { 아무거나: 2 } },
    ],
  },
  {
    id: "q3",
    text: "Who are you watching with?",
    options: [
      {
        id: "q3_o1",
        text: "Friends — laugh together",
        weights: { 행복해요: 2, 신나요: 1 },
      },
      {
        id: "q3_o2",
        text: "Someone to talk deeply with",
        weights: { 우울해요: 2 },
      },
      { id: "q3_o3", text: "A date / romantic vibe", weights: { 설레요: 3 } },
      {
        id: "q3_o4",
        text: "Anyone — fun is what matters",
        weights: { 아무거나: 2 },
      },
    ],
  },
];
