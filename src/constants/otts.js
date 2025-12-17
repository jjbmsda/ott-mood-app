export const OTTS_KR = [
  {
    id: "netflix",
    name: "넷플릭스",
    providerId: 8,
    watchRegion: "KR",
    logo: require("../../assets/logos/netflix.png"),
  },
  {
    id: "tving",
    name: "티빙",
    providerId: 97,
    watchRegion: "KR",
    logo: require("../../assets/logos/tving.png"),
  },
  {
    id: "wavve",
    name: "웨이브",
    providerId: 356,
    watchRegion: "KR",
    logo: require("../../assets/logos/wavve.png"),
  },
  {
    id: "watcha",
    name: "왓챠",
    providerId: 97,
    watchRegion: "KR",
    logo: require("../../assets/logos/watcha.png"),
  },
  {
    id: "disney",
    name: "디즈니플러스",
    providerId: 337,
    watchRegion: "KR",
    logo: require("../../assets/logos/disney.png"),
  },
];

// ✅ 문자열 변형(+, plus, 공백, 기호) 흡수
export const normalizeProviderName = (name = "") =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ✅ US에서 노출하고 싶은 OTT (정규화된 이름 기준)
export const WANT_US_PROVIDERS = new Set([
  "netflix",
  "disney plus",
  "hulu",
  "amazon prime video",
  "max",
  "apple tv plus", // Apple TV+ 표기들을 여기로 모으기
  "paramount plus",
  "peacock",
  // 변형들
  "peacock premium",
  "paramount",
  "paramount plus essential",
]);

// ✅ 중복 제거용 “정규화 키 → 표준 표시 이름” 맵
export const CANONICAL_US_NAME = {
  "apple tv": "Apple TV+",
  "apple tv plus": "Apple TV+",
  "apple tvplus": "Apple TV+",
  paramount: "Paramount+",
  "paramount plus": "Paramount+",
  peacock: "Peacock",
  "peacock premium": "Peacock",
  "disney plus": "Disney+",
};
