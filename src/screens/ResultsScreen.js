import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { styles } from "../styles/common";
import { t } from "../constants/strings";
import { MOOD_LABELS } from "../constants/moods";
import {
  fetchMoodMovies,
  fetchMovieDetail,
  fetchBestTrailer,
  fetchWatchProviders,
  TMDB_LOGO_BASE,
} from "../services/tmdb";
import { TMDB_IMAGE_BASE } from "../../config/tmdb";

// ✅ provider list → “쓸만한 OTT만” 뽑아서 보여주고 싶으면 여기서 필터링
const normalize = (s = "") =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const WANT_PROVIDER_KEYS = new Set([
  "netflix",
  "disney plus",
  "hulu",
  "amazon prime video",
  "max",
  "apple tv plus",
  "paramount plus",
  "peacock",
  // 지역/언어 따라 이름이 조금씩 흔들리면 여기 추가
]);

export default function ResultsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    mood = "아무거나",
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

  // ✅ “시청 가능한 OTT 있는지”만 먼저 캐싱해서 정렬에 사용
  // movieId -> boolean
  const [hasProviderMap, setHasProviderMap] = useState({});

  // ✅ 상세 모달에서만 “어떤 OTT들인지” 리스트 표시용
  const [providersInRegion, setProvidersInRegion] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  const moodLabel =
    MOOD_LABELS[mood]?.[language.startsWith("en") ? "en-US" : "ko-KR"] || mood;

  // favorites load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@favorites");
        if (raw) setFavorites(JSON.parse(raw));
      } catch (e) {}
    })();
  }, []);

  // ✅ 1) mood 기반 작품 가져오기 (OttSelect 제거)
  useEffect(() => {
    setLoading(true);

    (async () => {
      try {
        const data = await fetchMoodMovies({
          mood,
          watchRegion,
          language,
          page: 1,
        });
        setMovies(data || []);
      } catch (e) {
        setMovies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [mood, watchRegion, language]);

  // ✅ 2) 트레일러 프리패치(기존 그대로)
  useEffect(() => {
    if (!movies?.length) return;
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        movies.map(async (m) => {
          try {
            const url = await fetchBestTrailer(m.id, { language });
            return [m.id, url];
          } catch (e) {
            return [m.id, null];
          }
        })
      );
      if (!cancelled) setTrailers(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [movies, language]);

  // ✅ 3) “시청 가능한 OTT 없는 작품은 뒤로” 정렬을 위해 hasProviderMap 먼저 채움
  // (discover 응답 20개 정도라 여기서 20번 호출해도 일단은 버팀)
  useEffect(() => {
    if (!movies?.length) return;
    let cancelled = false;

    (async () => {
      try {
        const entries = await Promise.all(
          movies.map(async (m) => {
            try {
              const results = await fetchWatchProviders(m.id);
              const regionData = results?.[watchRegion];
              const list =
                regionData?.flatrate ||
                regionData?.rent ||
                regionData?.buy ||
                [];
              return [m.id, Array.isArray(list) && list.length > 0];
            } catch (e) {
              return [m.id, false];
            }
          })
        );
        if (!cancelled) setHasProviderMap(Object.fromEntries(entries));
      } catch (e) {
        if (!cancelled) setHasProviderMap({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movies, watchRegion]);

  // ✅ 정렬된 movies
  const filteredMovies = useMemo(() => {
    if (!movies?.length) return [];
    return movies.filter((m) => hasProviderMap[m.id]);
  }, [movies, hasProviderMap]);

  const saveFavorites = async (next) => {
    setFavorites(next);
    await AsyncStorage.setItem("@favorites", JSON.stringify(next));
  };

  const toggleFavorite = (movie) => {
    const exists = favorites.some((f) => f.id === movie.id);
    const next = exists
      ? favorites.filter((f) => f.id !== movie.id)
      : [...favorites, movie];
    saveFavorites(next);
  };

  const openTrailer = async (movieId) => {
    const url = trailers[movieId];
    if (!url) {
      alert(t(language, "trailerNotFound"));
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      alert(t(language, "trailerOpenFail"));
    }
  };

  // ✅ 상세 모달 열 때: detail + providers(지역 기준) 조회
  const openDetail = async (movie) => {
    setSelectedMovie(movie);
    setSelectedMovieDetail(null);
    setProvidersInRegion([]);
    setDetailModalVisible(true);

    try {
      const detail = await fetchMovieDetail(movie.id, { language });
      setSelectedMovieDetail(detail);
    } catch (e) {}

    try {
      setProvidersLoading(true);
      const results = await fetchWatchProviders(movie.id);
      const regionData = results?.[watchRegion];

      const flatrate = regionData?.flatrate || [];
      const rent = regionData?.rent || [];
      const buy = regionData?.buy || [];

      // 중복 제거(provider_id 기준)
      const map = new Map();
      [...flatrate, ...rent, ...buy].forEach((p) => {
        if (!p?.provider_id) return;
        map.set(p.provider_id, p);
      });

      // “원하는 OTT만” 보여주고 싶다면 필터 적용
      let list = Array.from(map.values());
      const filtered = list.filter((p) =>
        WANT_PROVIDER_KEYS.has(normalize(p.provider_name))
      );
      list = filtered.length ? filtered : list; // 필터 결과가 0이면 그냥 전체 보여주기(=없다고 안 뜨게)

      // 이름 통일 (Apple TV+)
      list = list.map((p) => {
        const k = normalize(p.provider_name);
        if (k === "apple tv plus") return { ...p, provider_name: "Apple TV+" };
        return p;
      });

      setProvidersInRegion(list);
    } catch (e) {
      setProvidersInRegion([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedMovie(null);
    setSelectedMovieDetail(null);
    setProvidersInRegion([]);
  };

  const renderMovieCard = ({ item }) => {
    const isFav = favorites.some((f) => f.id === item.id);
    const trailerUrl = trailers[item.id];
    const hasProvider = item._hasProvider;

    return (
      <TouchableOpacity
        style={[
          styles.movieCard,
          trailerUrl && styles.movieCardWithTrailer,
          !hasProvider && { opacity: 0.92 },
        ]}
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
              {!hasProvider
                ? language.startsWith("en")
                  ? " · No OTT"
                  : " · OTT 없음"
                : ""}
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
        {/* ✅ 헤더: mood + 버튼 유지 */}
        <View style={styles.resultHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {language.startsWith("en") ? "Recommended" : "추천작"}
            </Text>
            <Text style={styles.smallText}>
              "<Text style={styles.moodHighlight}>{moodLabel}</Text>"
              {t(language, "recommendLineSuffix")}
            </Text>
          </View>

          <View style={styles.resultMoodRight}>
            <TouchableOpacity
              style={[styles.resultMoodResetButton, { marginLeft: 4 }]}
              onPress={() =>
                navigation.navigate("Mood", { language, watchRegion })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.resultMoodResetText}>
                {t(language, "moodReset")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resultMoodResetButton, { marginLeft: 6 }]}
              onPress={() =>
                navigation.navigate("Settings", { language, watchRegion })
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.resultMoodResetText, { fontSize: 14 }]}>
                🌍
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
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.smallText, { marginTop: 8 }]}>
              {t(language, "loading")}
            </Text>
          </View>
        ) : filteredMovies.length === 0 ? (
          <View style={styles.centerFill}>
            <Text style={styles.smallText}>
              {language.startsWith("en") ? "No results." : "결과가 없어요."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMovies}
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

                <Text style={[styles.modalSectionTitle, { marginTop: 14 }]}>
                  {language.startsWith("en")
                    ? "Where to watch"
                    : "시청 가능 OTT"}
                </Text>

                {providersLoading ? (
                  <View style={{ paddingVertical: 10 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : providersInRegion.length === 0 ? (
                  <Text style={styles.smallText}>
                    {language.startsWith("en")
                      ? "No titles available on streaming services in your region."
                      : "이 지역에서 바로 볼 수 있는 작품을 찾지 못했어요."}
                  </Text>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {providersInRegion.map((p) => (
                      <View
                        key={String(p.provider_id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          backgroundColor: "#111827",
                          marginRight: 8,
                          marginBottom: 8,
                        }}
                      >
                        {p.logo_path ? (
                          <Image
                            source={{ uri: `${TMDB_LOGO_BASE}${p.logo_path}` }}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              marginRight: 6,
                            }}
                          />
                        ) : null}
                        <Text style={{ color: "#E5E7EB", fontSize: 12 }}>
                          {p.provider_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.modalSectionTitle, { marginTop: 14 }]}>
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
