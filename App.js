import React, { useState, useEffect } from "react";
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
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// =========================
// TMDB / OTT / 설문 데이터
// =========================
const TMDB_API_KEY = "f276e46996150c5b6a693f773ad2cdee";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const OTTS = [
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

const MOOD_QUESTIONS = [
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

const MOOD_GENRES = {
  행복해요: [35, 10751], // 코미디, 가족
  우울해요: [18], // 드라마
  설레요: [10749], // 로맨스
  신나요: [28, 12], // 액션, 어드벤처
  아무거나: [], // 장르 필터 없음
};

// =========================
// TMDB 호출 헬퍼
// =========================
async function fetchOttMovies(ott, mood) {
  const genres = MOOD_GENRES[mood] || [];
  const params = [
    `api_key=${TMDB_API_KEY}`,
    "language=ko-KR",
    "sort_by=popularity.desc",
    `with_watch_providers=${ott.providerId}`,
    `watch_region=${ott.watchRegion || "KR"}`,
    "include_adult=false",
    "page=1",
  ];
  if (genres.length > 0) {
    params.push(`with_genres=${genres.join(",")}`);
  }

  const url = `${TMDB_BASE_URL}/discover/movie?${params.join("&")}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}

async function fetchMovieDetail(movieId) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ko-KR`;
  const res = await fetch(url);
  return await res.json();
}

async function fetchBestTrailer(movieId) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=ko-KR`;
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
    if (name.includes("공식") || name.includes("official")) s += 2;
    if (name.includes("티저") || name.includes("teaser")) s += 1;
    if (name.includes("trailer")) s += 1;
    return s;
  };

  const sorted = [...results].sort((a, b) => score(b) - score(a));
  const best = sorted[0];

  if (!best || !best.key || best.site !== "YouTube") return null;
  return `https://www.youtube.com/watch?v=${best.key}`;
}

// =========================
// 1. 기분 설문 화면
// =========================
function MoodScreen({ navigation }) {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");

  const totalQuestions = MOOD_QUESTIONS.length;
  const question = MOOD_QUESTIONS[currentIndex];
  const selectedOptionId = answers[question.id];

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
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
      if (!option || !option.weights) return;

      Object.entries(option.weights).forEach(([moodKey, weight]) => {
        if (scores[moodKey] != null) {
          scores[moodKey] += weight;
        }
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

    if (bestScore <= 0) {
      bestMood = "아무거나";
    }
    return bestMood;
  };

  const handleNext = () => {
    if (!selectedOptionId) {
      setError("현재 질문에 대한 답을 선택해 주세요.");
      return;
    }

    if (currentIndex === totalQuestions - 1) {
      if (!allAnswered) {
        setError("모든 질문에 답해 주세요.");
        return;
      }
      const mood = calculateMood();
      navigation.navigate("OttSelect", { mood });
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
    <View style={styles.moodScreenWrapper}>
      <SafeAreaView style={styles.moodScreenContainer}>
        {/* 상단 */}
        <View style={styles.moodTopRow}>
          <Text style={styles.moodTopLabel}>오늘의 기분</Text>
          <Text style={styles.moodTopStep}>
            {currentIndex + 1} / {totalQuestions}
          </Text>
        </View>

        {/* 질문 */}
        <View style={styles.moodQuestionBlock}>
          <Text style={styles.moodQuestionText}>{question.text}</Text>
        </View>

        {/* 선택지 */}
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

        {/* 에러 */}
        {error ? <Text style={styles.moodErrorText}>{error}</Text> : null}

        {/* 하단 네비 */}
        <View style={styles.moodBottomRow}>
          <TouchableOpacity
            style={[
              styles.moodPrevButton,
              currentIndex === 0 && { opacity: 0.3 },
            ]}
            disabled={currentIndex === 0}
            onPress={handlePrev}
          >
            <Text style={styles.moodPrevText}>이전</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moodNextButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.moodNextText}>
              {currentIndex === totalQuestions - 1 ? "결과 보기" : "다음"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// =========================
// 2. OTT 선택 화면
// =========================
function OttSelectScreen({ navigation, route }) {
  const { mood } = route.params || {};
  const [selectedOttId, setSelectedOttId] = useState(null);

  const handleSelectOtt = (ott) => {
    setSelectedOttId(ott.id);
    navigation.navigate("Results", {
      mood: mood || "아무거나",
      ott,
    });
  };

  return (
    <View style={styles.ottScreenWrapper}>
      <SafeAreaView style={styles.ottScreenContainer}>
        <Text style={styles.sectionTitle}>어디에서 볼까요?</Text>
        <Text style={styles.ottDescriptionText}>
          지금 가입해 둔 OTT를 선택하면,{"\n"}그 안에서 볼 수 있는 작품만 골라
          드릴게요.
        </Text>

        <FlatList
          data={OTTS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ottList}
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
                {item.logo && (
                  <Image source={item.logo} style={styles.ottLogoImage} />
                )}
                <Text style={styles.ottNameText}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

// =========================
// 3. 추천 결과 화면
// =========================
function ResultsScreen({ route, navigation }) {
  const { mood = "아무거나", ott } = route.params || {};
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedMovieDetail, setSelectedMovieDetail] = useState(null);
  //const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailers, setTrailers] = useState({}); // { [movieId]: url or null }

  // 즐겨찾기 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@favorites");
        if (raw) {
          setFavorites(JSON.parse(raw));
        }
      } catch (e) {
        console.warn("Failed to load favorites", e);
      }
    })();
  }, []);

  // 영화 로드
  useEffect(() => {
    if (!ott) return;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchOttMovies(ott, mood);
        setMovies(data);
      } catch (e) {
        console.warn("Failed to fetch movies", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ott, mood]);
  // 영화 로드
  useEffect(() => {
    if (!ott) return;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchOttMovies(ott, mood);
        setMovies(data);
      } catch (e) {
        console.warn("Failed to fetch movies", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ott, mood]);

  // 🔴 영화 목록 기준으로 예고편 미리 조회
  useEffect(() => {
    if (!movies || movies.length === 0) return;

    let isCancelled = false;

    (async () => {
      try {
        const entries = await Promise.all(
          movies.map(async (m) => {
            try {
              const url = await fetchBestTrailer(m.id);
              return [m.id, url]; // url 또는 null
            } catch (e) {
              console.warn("Failed to fetch trailer", e);
              return [m.id, null];
            }
          })
        );
        if (!isCancelled) {
          setTrailers(Object.fromEntries(entries));
        }
      } catch (e) {
        console.warn("Trailer prefetch error", e);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [movies]);

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
    let next;
    if (exists) {
      next = favorites.filter((f) => f.id !== movie.id);
    } else {
      next = [...favorites, movie];
    }
    saveFavorites(next);
  };

  const openDetail = async (movie) => {
    setSelectedMovie(movie);
    setDetailModalVisible(true);
    try {
      const detail = await fetchMovieDetail(movie.id);
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
      alert("예고편을 찾지 못했어요.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      alert("이 링크를 열 수 없어요.");
    }
  };

  const renderMovieCard = ({ item }) => {
    const isFav = favorites.some((f) => f.id === item.id);
    const trailerUrl = trailers[item.id]; // 🔴 이 영화의 예고편 URL
    return (
      <TouchableOpacity
        style={styles.movieCard}
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
              {item.release_date?.slice(0, 4) || "연도 정보 없음"}
            </Text>
            <Text style={styles.movieOverviewText} numberOfLines={3}>
              {item.overview || "줄거리 정보가 없습니다."}
            </Text>
          </View>

          <View style={styles.cardBottomRow}>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(item)}
            >
              <Text style={styles.favoriteButtonText}>
                {isFav ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
              </Text>
            </TouchableOpacity>

            {trailerUrl && (
              <TouchableOpacity
                style={styles.trailerButton}
                onPress={() => openTrailer(item.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.trailerButtonText}>YouTube 예고편</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    <View style={styles.resultScreenWrapper}>
      <SafeAreaView style={styles.resultScreenContainer}>
        {/* 헤더 */}
        <View style={styles.resultHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              {ott?.name || "OTT"}에서 볼 수 있는 작품
            </Text>
            <Text style={styles.smallText}>
              "<Text style={styles.moodHighlight}>{mood}</Text>" 기분에 맞는
              작품을 추천했어요.
            </Text>
          </View>

          <View style={styles.resultMoodRight}>
            <TouchableOpacity
              style={styles.resultMoodResetButton}
              onPress={() => navigation.navigate("Mood")}
              activeOpacity={0.7}
            >
              <Text style={styles.resultMoodResetText}>기분 다시선택</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultMoodResetButton}
              onPress={() => navigation.navigate("OttSelect", { mood })}
              activeOpacity={0.7}
            >
              <Text style={styles.resultMoodResetText}>OTT 다시선택</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 즐겨찾기 섹션 */}
        {favorites.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.smallText}>내가 저장한 작품</Text>
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

        {/* 본문 리스트 */}
        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.smallText, { marginTop: 8 }]}>
              추천 작품을 불러오는 중입니다...
            </Text>
          </View>
        ) : movies.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={styles.smallText}>
              조건에 맞는 작품을 찾지 못했어요.
            </Text>
          </View>
        ) : (
          <FlatList
            data={movies}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMovieCard}
            contentContainerStyle={styles.movieList}
          />
        )}

        {/* 상세 모달 */}
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
                  <Text style={styles.modalCloseText}>닫기</Text>
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

                <Text style={styles.modalSectionTitle}>기본 정보</Text>
                <Text style={styles.modalText}>
                  개봉일:{" "}
                  {selectedMovieDetail?.release_date ||
                    selectedMovie?.release_date ||
                    "정보 없음"}
                </Text>
                <Text style={styles.modalText}>
                  평점:{" "}
                  {selectedMovieDetail?.vote_average?.toFixed(1) ||
                    selectedMovie?.vote_average?.toFixed(1) ||
                    "N/A"}
                </Text>

                <Text style={styles.modalSectionTitle}>줄거리</Text>
                <Text style={styles.modalText}>
                  {selectedMovieDetail?.overview ||
                    selectedMovie?.overview ||
                    "줄거리 정보가 없습니다."}
                </Text>

                {selectedMovie && trailers[selectedMovie.id] && (
                  <TouchableOpacity
                    style={styles.modalTrailerButton}
                    onPress={() => openTrailer(selectedMovie.id)}
                  >
                    <Text style={styles.modalTrailerButtonText}>
                      YouTube 예고편
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

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050816" },
        }}
      >
        <Stack.Screen name="Mood" component={MoodScreen} />
        <Stack.Screen name="OttSelect" component={OttSelectScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// =========================
// 스타일
// =========================
const styles = StyleSheet.create({
  // 공통
  screenRoot: {
    flex: 1,
    backgroundColor: "#050816",
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  moodScreenWrapper: {
    flex: 1,
    backgroundColor: "#050816",
  },
  moodScreenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    marginBottom: 10,
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
    color: "#4ade80", // Tailwind green-400 느낌
    fontWeight: "600",
  },

  // 2. OTT 선택 화면
  ottScreenWrapper: {
    flex: 1,
    backgroundColor: "#050816",
  },
  ottScreenContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  resultScreenWrapper: {
    flex: 1,
    backgroundColor: "#050816",
  },
  resultScreenContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  movieList: {
    paddingBottom: 24,
  },
  movieCard: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#0B1120",
    marginBottom: 12,
    overflow: "hidden",
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
    backgroundColor: "#FF0000", // 유튜브 레드
    alignItems: "center",
    justifyContent: "center",
  },
  trailerButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F9FAFB",
  },

  // 즐겨찾기
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
});
