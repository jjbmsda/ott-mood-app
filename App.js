import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Linking,
  StatusBar,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import * as Localization from "expo-localization";

import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE } from "./config/tmdb";

// =========================
// 지역/언어 감지 + 문자열
// =========================
const STRINGS = {
  "ko-KR": {
    moodTopLabel: "오늘의 기분",
    next: "다음",
    prev: "이전",
    viewResult: "결과 보기",
    whereToWatch: "어디에서 볼까요?",
    whereToWatchDesc:
      "지금 가입해 둔 OTT를 선택하면,\n그 안에서 볼 수 있는 작품만 골라 드릴게요.",
    resultsTitleSuffix: "에서 볼 수 있는 작품",
    recommendLinePrefix: "",
    recommendLineSuffix: " 기분에 맞는 작품을 추천했어요.",
    moodReset: "기분 다시선택",
    ottReset: "OTT 다시선택",
    favoritesTitle: "내가 저장한 작품",
    loading: "추천 작품을 불러오는 중입니다...",
    notFound: "조건에 맞는 작품을 찾지 못했어요.",
    noOverview: "줄거리 정보가 없습니다.",
    yearNA: "연도 정보 없음",
    trailerNotFound: "예고편을 찾지 못했어요.",
    trailerOpenFail: "예고편 링크를 여는 중 문제가 발생했어요.",
    youtubeTrailer: "▶ YouTube 예고편",
    close: "닫기",
    baseInfo: "기본 정보",
    releaseDate: "개봉일",
    rating: "평점",
    overview: "줄거리",
    infoNA: "정보 없음",
    favoriteOn: "★ 즐겨찾기",
    favoriteOff: "☆ 즐겨찾기",
  },
  "en-US": {
    moodTopLabel: "Today's Mood",
    next: "Next",
    prev: "Back",
    viewResult: "See results",
    whereToWatch: "Where will you watch?",
    whereToWatchDesc:
      "Pick a streaming service you use,\nthen I'll recommend titles available there.",
    resultsTitleSuffix: " titles available",
    recommendLinePrefix: 'Recommended for a "',
    recommendLineSuffix: '" mood.',
    moodReset: "Change mood",
    ottReset: "Change OTT",
    favoritesTitle: "Saved titles",
    loading: "Loading recommendations...",
    notFound: "No titles found for these filters.",
    noOverview: "No overview available.",
    yearNA: "Year N/A",
    trailerNotFound: "No trailer found.",
    trailerOpenFail: "Could not open the trailer link.",
    youtubeTrailer: "▶ YouTube Trailer",
    close: "Close",
    baseInfo: "Info",
    releaseDate: "Release date",
    rating: "Rating",
    overview: "Overview",
    infoNA: "N/A",
    favoriteOn: "★ Saved",
    favoriteOff: "☆ Save",
  },
};

const MOOD_LABELS = {
  행복해요: { "ko-KR": "행복해요", "en-US": "Happy" },
  우울해요: { "ko-KR": "우울해요", "en-US": "Blue" },
  설레요: { "ko-KR": "설레요", "en-US": "Excited" },
  신나요: { "ko-KR": "신나요", "en-US": "Hyped" },
  아무거나: { "ko-KR": "아무거나", "en-US": "Anything" },
};

const t = (lang, key) => STRINGS[lang]?.[key] ?? STRINGS["en-US"][key] ?? key;

// =========================
// KR 고정 OTT(로컬 로고)
// =========================
const OTTS_KR = [
  {
    id: "netflix",
    name: "넷플릭스",
    providerId: 8,
    watchRegion: "KR",
    logo: require("./assets/logos/netflix.png"),
  },
  {
    id: "tving",
    name: "티빙",
    providerId: 97,
    watchRegion: "KR",
    logo: require("./assets/logos/tving.png"),
  },
  {
    id: "wavve",
    name: "웨이브",
    providerId: 356,
    watchRegion: "KR",
    logo: require("./assets/logos/wavve.png"),
  },
  {
    id: "watcha",
    name: "왓챠",
    // ⚠️ 예: Watcha providerId는 TMDB에서 지역별로 다를 수 있음 (필요하면 확인해서 수정)
    providerId: 97,
    watchRegion: "KR",
    logo: require("./assets/logos/watcha.png"),
  },
  {
    id: "disney",
    name: "디즈니플러스",
    providerId: 337,
    watchRegion: "KR",
    logo: require("./assets/logos/disney.png"),
  },
];

// =========================
// 설문(ko/en)
// 내부 mood key는 그대로(행복해요/우울해요/설레요/신나요/아무거나)
// =========================
const MOOD_QUESTIONS_KO = [
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

const MOOD_QUESTIONS_EN = [
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

const MOOD_GENRES = {
  행복해요: [35, 10751],
  우울해요: [18],
  설레요: [10749],
  신나요: [28, 12],
  아무거나: [],
};

// =========================
// TMDB 호출 헬퍼 (언어/지역 주입)
// =========================
const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

async function fetchOttMovies(ott, mood, { language }) {
  const genres = MOOD_GENRES[mood] || [];
  const params = [
    `api_key=${TMDB_API_KEY}`,
    `language=${encodeURIComponent(language)}`,
    "sort_by=popularity.desc",
    `with_watch_providers=${ott.providerId}`,
    `watch_region=${ott.watchRegion || "KR"}`,
    "include_adult=false",
    "page=1",
  ];
  if (genres.length > 0) params.push(`with_genres=${genres.join(",")}`);

  const url = `${TMDB_BASE_URL}/discover/movie?${params.join("&")}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}

async function fetchMovieDetail(movieId, { language }) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=${encodeURIComponent(
    language
  )}`;
  const res = await fetch(url);
  return await res.json();
}

async function fetchBestTrailer(movieId, { language }) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=${encodeURIComponent(
    language
  )}`;
  const res = await fetch(url);
  const json = await res.json();
  const results = json.results || [];
  if (!results.length) return null;

  const score = (v) => {
    let s = 0;
    const name = (v.name || "").toLowerCase();
    const type = (v.type || "").toLowerCase();

    if (v.site === "YouTube") s += 5;
    if (type.includes("trailer")) s += 5;
    if (type.includes("teaser")) s += 3;
    if (name.includes("official") || name.includes("공식")) s += 2;
    if (name.includes("teaser") || name.includes("티저")) s += 1;
    if (name.includes("trailer")) s += 1;
    return s;
  };

  const sorted = [...results].sort((a, b) => score(b) - score(a));
  const best = sorted[0];

  if (!best || !best.key || best.site !== "YouTube") return null;
  return `https://www.youtube.com/watch?v=${best.key}`;
}

async function fetchWatchProvidersMovie({ region, language }) {
  const url = `${TMDB_BASE_URL}/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=${encodeURIComponent(
    region
  )}&language=${encodeURIComponent(language)}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}

// =========================
// 1. 기분 설문 화면
// =========================
function MoodScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { language = "ko-KR" } = route.params || {};

  const MOOD_QUESTIONS = language.startsWith("en")
    ? MOOD_QUESTIONS_EN
    : MOOD_QUESTIONS_KO;

  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");

  const totalQuestions = MOOD_QUESTIONS.length;
  const question = MOOD_QUESTIONS[currentIndex];
  const selectedOptionId = answers[question.id];

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setError("");
  };

  const allAnswered = MOOD_QUESTIONS.every((q) => answers[q.id]);

  const calculateMood = () => {
    const scores = {
      행복해요: 0,
      우울해요: 0,
      설레요: 0,
      신나요: 0,
      아무거나: 0,
    };

    MOOD_QUESTIONS.forEach((q) => {
      const selectedId = answers[q.id];
      const option = q.options.find((opt) => opt.id === selectedId);
      if (!option?.weights) return;
      Object.entries(option.weights).forEach(([moodKey, weight]) => {
        if (scores[moodKey] != null) scores[moodKey] += weight;
      });
    });

    let bestMood = "아무거나";
    let bestScore = -Infinity;
    Object.entries(scores).forEach(([moodKey, score]) => {
      if (
        score > bestScore ||
        (score === bestScore &&
          bestMood === "아무거나" &&
          moodKey !== "아무거나")
      ) {
        bestMood = moodKey;
        bestScore = score;
      }
    });

    if (bestScore <= 0) bestMood = "아무거나";
    return bestMood;
  };

  const handleNext = () => {
    if (!selectedOptionId) {
      setError(
        language.startsWith("en")
          ? "Please select an answer."
          : "현재 질문에 대한 답을 선택해 주세요."
      );
      return;
    }

    if (currentIndex === totalQuestions - 1) {
      if (!allAnswered) {
        setError(
          language.startsWith("en")
            ? "Please answer all questions."
            : "모든 질문에 답해 주세요."
        );
        return;
      }
      const mood = calculateMood();
      navigation.navigate("OttSelect", { mood, language });
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setError("");
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setError("");
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        style={[
          styles.moodScreenContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.moodTopRow}>
          <Text style={styles.moodTopLabel}>{t(language, "moodTopLabel")}</Text>
          <Text style={styles.moodTopStep}>
            {currentIndex + 1} / {totalQuestions}
          </Text>
        </View>

        <View style={styles.moodQuestionBlock}>
          <Text style={styles.moodQuestionText}>{question.text}</Text>
        </View>

        <View style={styles.moodOptionsBlock}>
          {question.options.map((opt) => {
            const isSelected = opt.id === selectedOptionId;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.moodOptionButton,
                  isSelected && styles.moodOptionButtonSelected,
                ]}
                onPress={() => handleSelectOption(question.id, opt.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.moodOptionText,
                    isSelected && styles.moodOptionTextSelected,
                  ]}
                >
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.moodErrorText}>{error}</Text> : null}

        <View
          style={[
            styles.moodBottomRow,
            { marginBottom: insets.bottom > 0 ? insets.bottom : 8 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.moodPrevButton,
              currentIndex === 0 && { opacity: 0.3 },
            ]}
            disabled={currentIndex === 0}
            onPress={handlePrev}
          >
            <Text style={styles.moodPrevText}>{t(language, "prev")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moodNextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.moodNextText}>
              {currentIndex === totalQuestions - 1
                ? t(language, "viewResult")
                : t(language, "next")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// =========================
// 2. OTT 선택 화면 (KR=로컬 / US=TMDB Provider)
// =========================
function OttSelectScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { mood, language = "ko-KR", watchRegion = "KR" } = route.params || {};

  const [selectedOttId, setSelectedOttId] = useState(null);
  const [ottList, setOttList] = useState([]);
  const [loadingOtts, setLoadingOtts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingOtts(true);

        if (watchRegion !== "US") {
          if (!cancelled) setOttList(OTTS_KR);
          return;
        }

        const providers = await fetchWatchProvidersMovie({
          region: "US",
          language,
        });

        const pickNames = new Set([
          "Netflix",
          "Disney Plus",
          "Hulu",
          "Amazon Prime Video",
          "Max",
          "Apple TV Plus",
          "Paramount Plus",
          "Peacock",
        ]);

        const picked = providers
          .filter((p) => pickNames.has(p.provider_name))
          .map((p) => ({
            id: String(p.provider_id),
            name: p.provider_name,
            providerId: p.provider_id,
            watchRegion: "US",
            logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : null,
          }));

        if (!cancelled) setOttList(picked);
      } catch (e) {
        console.warn("Failed to load OTT providers", e);
        if (!cancelled) setOttList(watchRegion === "US" ? [] : OTTS_KR);
      } finally {
        if (!cancelled) setLoadingOtts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [watchRegion, language]);

  const handleSelectOtt = (ott) => {
    setSelectedOttId(ott.id);
    navigation.navigate("Results", {
      mood: mood || "아무거나",
      ott,
      language,
      watchRegion: ott.watchRegion || watchRegion,
    });
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        style={[
          styles.ottScreenContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
        ]}
        edges={["top", "bottom"]}
      >
        <Text style={styles.sectionTitle}>{t(language, "whereToWatch")}</Text>
        <Text style={styles.ottDescriptionText}>
          {t(language, "whereToWatchDesc")}
        </Text>

        {loadingOtts ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.smallText, { marginTop: 8 }]}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={ottList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.ottList,
              { paddingBottom: insets.bottom + 24 },
            ]}
            renderItem={({ item }) => {
              const isSelected = selectedOttId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.ottItemRow,
                    isSelected && styles.ottItemSelected,
                  ]}
                  onPress={() => handleSelectOtt(item)}
                  activeOpacity={0.9}
                >
                  {item.logo ? (
                    <Image source={item.logo} style={styles.ottLogoImage} />
                  ) : item.logoUrl ? (
                    <Image
                      source={{ uri: item.logoUrl }}
                      style={styles.ottLogoImage}
                    />
                  ) : null}

                  <Text style={styles.ottNameText}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ paddingTop: 24 }}>
                <Text style={styles.smallText}>
                  {language.startsWith("en")
                    ? "No OTT providers found."
                    : "OTT 목록을 불러오지 못했어요."}
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// =========================
// 3. 추천 결과 화면
// =========================
function ResultsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    mood = "아무거나",
    ott,
    language = "ko-KR",
    watchRegion = "KR",
  } = route.params || {};

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedMovieDetail, setSelectedMovieDetail] = useState(null);
  const [trailers, setTrailers] = useState({});

  const moodLabel =
    MOOD_LABELS[mood]?.[language.startsWith("en") ? "en-US" : "ko-KR"] || mood;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@favorites");
        if (raw) setFavorites(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to load favorites", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ott) return;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchOttMovies(
          { ...ott, watchRegion: ott.watchRegion || watchRegion },
          mood,
          { language }
        );
        setMovies(data);
      } catch (e) {
        console.warn("Failed to fetch movies", e);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ott, mood, language, watchRegion]);

  useEffect(() => {
    if (!movies?.length) return;
    let isCancelled = false;

    (async () => {
      try {
        const entries = await Promise.all(
          movies.map(async (m) => {
            try {
              const url = await fetchBestTrailer(m.id, { language });
              return [m.id, url];
            } catch (e) {
              console.warn("Failed to fetch trailer", e);
              return [m.id, null];
            }
          })
        );
        if (!isCancelled) setTrailers(Object.fromEntries(entries));
      } catch (e) {
        console.warn("Trailer prefetch error", e);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [movies, language]);

  const saveFavorites = async (next) => {
    try {
      setFavorites(next);
      await AsyncStorage.setItem("@favorites", JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save favorites", e);
    }
  };

  const toggleFavorite = (movie) => {
    const exists = favorites.some((f) => f.id === movie.id);
    const next = exists
      ? favorites.filter((f) => f.id !== movie.id)
      : [...favorites, movie];
    saveFavorites(next);
  };

  const openDetail = async (movie) => {
    setSelectedMovie(movie);
    setDetailModalVisible(true);
    try {
      const detail = await fetchMovieDetail(movie.id, { language });
      setSelectedMovieDetail(detail);
    } catch (e) {
      console.warn("Failed to fetch detail", e);
    }
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedMovie(null);
    setSelectedMovieDetail(null);
  };

  const openTrailer = async (movieId) => {
    const url = trailers[movieId];
    if (!url) {
      alert(t(language, "trailerNotFound"));
      return;
    }

    try {
      // canOpenURL이 false라도 openURL이 되는 케이스가 있어 fallback 포함
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      console.warn("Failed to open trailer url", e);
      alert(t(language, "trailerOpenFail"));
    }
  };

  const renderMovieCard = ({ item }) => {
    const isFav = favorites.some((f) => f.id === item.id);
    const trailerUrl = trailers[item.id];

    return (
      <TouchableOpacity
        style={[styles.movieCard, trailerUrl && styles.movieCardWithTrailer]}
        activeOpacity={0.9}
        onPress={() => openDetail(item)}
      >
        <View style={styles.moviePosterWrapper}>
          {item.poster_path ? (
            <Image
              source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path}` }}
              style={styles.moviePosterImage}
            />
          ) : null}
        </View>

        <View style={styles.movieInfoArea}>
          <View>
            <Text style={styles.movieTitle} numberOfLines={2}>
              {item.title || item.name}
            </Text>
            <Text style={styles.movieMetaText}>
              ⭐ {item.vote_average?.toFixed(1) || "N/A"} ·{" "}
              {item.release_date?.slice(0, 4) || t(language, "yearNA")}
            </Text>
            <Text style={styles.movieOverviewText} numberOfLines={3}>
              {item.overview || t(language, "noOverview")}
            </Text>
          </View>

          <View style={styles.cardBottomRow}>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(item)}
            >
              <Text style={styles.favoriteButtonText}>
                {isFav ? t(language, "favoriteOn") : t(language, "favoriteOff")}
              </Text>
            </TouchableOpacity>

            {trailerUrl && (
              <TouchableOpacity
                style={styles.trailerButton}
                onPress={() => openTrailer(item.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.trailerButtonText}>
                  {t(language, "youtubeTrailer")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {trailerUrl && (
          <View style={styles.youtubeBadge}>
            <Text style={styles.youtubeBadgeText}>▶</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFavoriteSmall = ({ item }) => (
    <TouchableOpacity
      style={styles.favoriteSmallCard}
      onPress={() => openDetail(item)}
    >
      {item.poster_path && (
        <Image
          source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path}` }}
          style={styles.favoriteSmallPoster}
        />
      )}
      <Text style={styles.favoriteSmallTitle} numberOfLines={2}>
        {item.title || item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        style={[
          styles.resultScreenContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.resultHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionTitle}>
              {language.startsWith("en")
                ? `${ott?.name || "OTT"}${t(language, "resultsTitleSuffix")}`
                : `${ott?.name || "OTT"}${t(language, "resultsTitleSuffix")}`}
            </Text>

            {language.startsWith("en") ? (
              <Text style={styles.smallText}>
                {t(language, "recommendLinePrefix")}
                <Text style={styles.moodHighlight}>{moodLabel}</Text>
                {t(language, "recommendLineSuffix")}
              </Text>
            ) : (
              <Text style={styles.smallText}>
                "<Text style={styles.moodHighlight}>{moodLabel}</Text>"
                {t(language, "recommendLineSuffix")}
              </Text>
            )}
          </View>

          <View style={styles.resultMoodRight}>
            <TouchableOpacity
              style={styles.resultMoodResetButton}
              onPress={() => navigation.navigate("Mood")}
              activeOpacity={0.7}
            >
              <Text style={styles.resultMoodResetText}>
                {t(language, "moodReset")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultMoodResetButton}
              onPress={() =>
                navigation.navigate("OttSelect", {
                  mood,
                  language,
                  watchRegion,
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.resultMoodResetText}>
                {t(language, "ottReset")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {favorites.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.smallText}>
              {t(language, "favoritesTitle")}
            </Text>
            <FlatList
              data={favorites}
              keyExtractor={(item) => `fav-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favoritesListHorizontal}
              renderItem={renderFavoriteSmall}
            />
          </View>
        )}

        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.smallText, { marginTop: 8 }]}>
              {t(language, "loading")}
            </Text>
          </View>
        ) : movies.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={styles.smallText}>{t(language, "notFound")}</Text>
          </View>
        ) : (
          <FlatList
            data={movies}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMovieCard}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
        )}

        <Modal
          visible={detailModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeDetail}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedMovie?.title || selectedMovie?.name || ""}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeDetail}
                >
                  <Text style={styles.modalCloseText}>
                    {t(language, "close")}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBodyScroll}
                showsVerticalScrollIndicator={false}
              >
                {selectedMovie?.poster_path && (
                  <Image
                    source={{
                      uri: `${TMDB_IMAGE_BASE}${selectedMovie.poster_path}`,
                    }}
                    style={{
                      width: "100%",
                      height: 220,
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.modalSectionTitle}>
                  {t(language, "baseInfo")}
                </Text>
                <Text style={styles.modalText}>
                  {t(language, "releaseDate")}:{" "}
                  {selectedMovieDetail?.release_date ||
                    selectedMovie?.release_date ||
                    t(language, "infoNA")}
                </Text>
                <Text style={styles.modalText}>
                  {t(language, "rating")}:{" "}
                  {selectedMovieDetail?.vote_average?.toFixed(1) ||
                    selectedMovie?.vote_average?.toFixed(1) ||
                    "N/A"}
                </Text>

                <Text style={styles.modalSectionTitle}>
                  {t(language, "overview")}
                </Text>
                <Text style={styles.modalText}>
                  {selectedMovieDetail?.overview ||
                    selectedMovie?.overview ||
                    t(language, "noOverview")}
                </Text>

                {selectedMovie && trailers[selectedMovie.id] && (
                  <TouchableOpacity
                    style={styles.modalTrailerButton}
                    onPress={() => openTrailer(selectedMovie.id)}
                  >
                    <Text style={styles.modalTrailerButtonText}>
                      {t(language, "youtubeTrailer")}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// =========================
// 네비게이션 루트
// =========================
const Stack = createNativeStackNavigator();

function RootNavigator() {
  // 기기 지역/언어로 기본값 결정
  const deviceRegion = Localization.region || "KR";
  const primaryLocale = Localization.getLocales()?.[0]?.languageTag || "ko-KR";

  const watchRegion = deviceRegion === "US" ? "US" : "KR";
  const language =
    primaryLocale.startsWith("en") || watchRegion === "US" ? "en-US" : "ko-KR";

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#050816" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050816" },
        }}
      >
        <Stack.Screen
          name="Mood"
          component={MoodScreen}
          initialParams={{ language, watchRegion }}
        />
        <Stack.Screen
          name="OttSelect"
          component={OttSelectScreen}
          initialParams={{ language, watchRegion }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          initialParams={{ language, watchRegion }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}

// =========================
// 스타일
// =========================
const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: "#050816",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 12,
  },
  smallText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // 1. MoodScreen
  moodScreenContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  moodTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  moodTopLabel: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  moodTopStep: {
    fontSize: 13,
    color: "#6B7280",
  },
  moodQuestionBlock: {
    marginBottom: 32,
  },
  moodQuestionText: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  moodOptionsBlock: {
    flexGrow: 1,
  },
  moodOptionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2933",
    backgroundColor: "#0B1120",
    marginBottom: 12,
  },
  moodOptionButtonSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1D4ED8",
  },
  moodOptionText: {
    fontSize: 15,
    color: "#E5E7EB",
  },
  moodOptionTextSelected: {
    color: "#F9FAFB",
    fontWeight: "600",
  },
  moodErrorText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 12,
  },
  moodBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  moodPrevButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  moodPrevText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  moodNextButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  moodNextText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#020617",
  },
  moodHighlight: {
    color: "#4ade80",
    fontWeight: "600",
  },

  // 2. OTT 선택 화면
  ottScreenContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ottDescriptionText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  ottList: {
    paddingBottom: 16,
  },
  ottItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#0B1120",
    marginBottom: 10,
  },
  ottLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  ottNameText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#F9FAFB",
  },
  ottItemSelected: {
    borderWidth: 1,
    borderColor: "#3B82F6",
    backgroundColor: "#111827",
  },

  // 3. 추천 결과 화면
  resultScreenContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultMoodRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultMoodResetButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  resultMoodResetText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  movieCard: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#0B1120",
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  movieCardWithTrailer: {
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  moviePosterWrapper: {
    width: 90,
    height: 130,
    backgroundColor: "#111827",
  },
  moviePosterImage: {
    width: "100%",
    height: "100%",
  },
  movieInfoArea: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  movieMetaText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  movieOverviewText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  favoriteButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  favoriteButtonText: {
    fontSize: 12,
    color: "#FBBF24",
  },
  trailerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FF0000",
    alignItems: "center",
    justifyContent: "center",
  },
  trailerButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F9FAFB",
  },

  favoritesSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  favoritesListHorizontal: {
    paddingVertical: 4,
  },
  favoriteSmallCard: {
    width: 90,
    marginRight: 8,
  },
  favoriteSmallPoster: {
    width: 90,
    height: 130,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  favoriteSmallTitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#E5E7EB",
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    maxHeight: "80%",
    borderRadius: 20,
    backgroundColor: "#020617",
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
    flex: 1,
    marginRight: 8,
  },
  modalCloseButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalBodyScroll: {
    marginTop: 8,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E5E7EB",
    marginTop: 10,
    marginBottom: 4,
  },
  modalText: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 18,
  },
  modalTrailerButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FF0000",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTrailerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  youtubeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  youtubeBadgeText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "700",
  },
});
