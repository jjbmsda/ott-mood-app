import React, { useEffect, useState } from "react";
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
  fetchOttMovies,
  fetchMovieDetail,
  fetchBestTrailer,
} from "../services/tmdb";

// ✅ TMDB 호출에 필요
import {
  TMDB_API_KEY,
  TMDB_BASE_URL,
  TMDB_IMAGE_BASE,
} from "../../config/tmdb";

export default function ResultsScreen({ route, navigation }) {
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

  // ✅ 상세 모달에서만 사용: watch providers
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersList, setProvidersList] = useState([]); // [{provider_id, provider_name, logo_path}]
  const [providersLink, setProvidersLink] = useState(null);

  const moodLabel =
    MOOD_LABELS[mood]?.[language.startsWith("en") ? "en-US" : "ko-KR"] || mood;

  // -------------------------
  // favorites load
  // -------------------------
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@favorites");
        if (raw) setFavorites(JSON.parse(raw));
      } catch (e) {}
    })();
  }, []);

  // -------------------------
  // movie list load
  // -------------------------
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
        setMovies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ott, mood, language, watchRegion]);

  // -------------------------
  // trailer prefetch
  // -------------------------
  useEffect(() => {
    if (!movies?.length) return;
    let isCancelled = false;

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
      if (!isCancelled) setTrailers(Object.fromEntries(entries));
    })();

    return () => {
      isCancelled = true;
    };
  }, [movies, language]);

  // -------------------------
  // favorites save/toggle
  // -------------------------
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

  // -------------------------
  // TMDB watch providers (detail modal only)
  // -------------------------
  const fetchMovieWatchProviders = async (movieId, region) => {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();

    const r = json?.results?.[region];
    if (!r) return { link: null, providers: [] };

    // TMDB 응답 카테고리들에서 provider 합치기
    const buckets = []
      .concat(r.flatrate || [])
      .concat(r.free || [])
      .concat(r.ads || [])
      .concat(r.rent || [])
      .concat(r.buy || []);

    // provider_id 기준 dedup
    const map = new Map();
    for (const p of buckets) {
      if (!p?.provider_id) continue;
      if (!map.has(p.provider_id)) map.set(p.provider_id, p);
    }

    return {
      link: r.link || null,
      providers: Array.from(map.values()),
    };
  };

  // -------------------------
  // modal open/close
  // -------------------------
  const openDetail = async (movie) => {
    setSelectedMovie(movie);
    setSelectedMovieDetail(null);

    // ✅ 이전 provider 상태 초기화
    setProvidersLoading(true);
    setProvidersList([]);
    setProvidersLink(null);

    setDetailModalVisible(true);

    try {
      const [detail, wp] = await Promise.all([
        fetchMovieDetail(movie.id, { language }),
        fetchMovieWatchProviders(movie.id, watchRegion),
      ]);

      setSelectedMovieDetail(detail);
      setProvidersLink(wp.link || null);
      setProvidersList(wp.providers || []);
    } catch (e) {
      // 실패 시 조용히
    } finally {
      setProvidersLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedMovie(null);
    setSelectedMovieDetail(null);

    setProvidersLoading(false);
    setProvidersList([]);
    setProvidersLink(null);
  };

  // -------------------------
  // open trailer
  // -------------------------
  const openTrailer = async (movieId) => {
    const url = trailers[movieId];
    if (!url) {
      alert(t(language, "trailerNotFound"));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else await Linking.openURL(url);
    } catch (e) {
      alert(t(language, "trailerOpenFail"));
    }
  };

  const openProvidersLink = async () => {
    if (!providersLink) return;
    try {
      await Linking.openURL(providersLink);
    } catch (e) {}
  };

  // -------------------------
  // renderers
  // -------------------------
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

  // ✅ 선택한 OTT가 providersList에 있는지 확인해서 강조
  const selectedProviderId = ott?.providerId ?? ott?.provider_id ?? null;
  const hasSelectedOttInProviders =
    selectedProviderId != null &&
    providersList.some((p) => p.provider_id === selectedProviderId);

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        style={[
          styles.resultScreenContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 },
        ]}
        edges={["top", "bottom"]}
      >
        {/* ✅ 헤더 */}
        <View style={styles.resultHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              {ott?.logo ? (
                <Image
                  source={ott.logo}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    marginRight: 10,
                  }}
                />
              ) : ott?.logoUrl ? (
                <Image
                  source={{ uri: ott.logoUrl }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    marginRight: 10,
                  }}
                />
              ) : null}

              <Text style={styles.sectionTitle} numberOfLines={1}>
                {ott?.name || "OTT"}
              </Text>
            </View>

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
        ) : movies.length === 0 ? (
          <View style={styles.centerFill}>
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

                {/* ✅ 여기부터: 시청 가능 OTT (모달 열 때만 조회) */}
                <Text style={[styles.modalSectionTitle, { marginTop: 14 }]}>
                  {language.startsWith("en")
                    ? "Available on"
                    : "재생 가능한 OTT"}
                </Text>

                {providersLoading ? (
                  <View style={{ paddingVertical: 10 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.smallText, { marginTop: 6 }]}>
                      {language.startsWith("en")
                        ? "Loading providers..."
                        : "OTT 정보를 불러오는 중..."}
                    </Text>
                  </View>
                ) : providersList.length === 0 ? (
                  <Text style={styles.modalText}>
                    {language.startsWith("en")
                      ? "No provider info for this region."
                      : "이 지역에서 재생 가능한 OTT 정보를 찾지 못했어요."}
                  </Text>
                ) : (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginTop: 8,
                        marginBottom: 8,
                      }}
                    >
                      {providersList.map((p) => {
                        const isSelected =
                          selectedProviderId != null &&
                          p.provider_id === selectedProviderId;

                        return (
                          <View
                            key={String(p.provider_id)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 999,
                              marginRight: 8,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: isSelected ? "#60A5FA" : "#1F2933",
                              backgroundColor: isSelected
                                ? "#0B1B3A"
                                : "#0B1120",
                            }}
                          >
                            {p.logo_path ? (
                              <Image
                                source={{
                                  uri: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
                                }}
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
                        );
                      })}
                    </View>

                    {/* 선택한 OTT가 providers 목록에 없으면 안내(강제로 합치지 않음) */}
                    {selectedProviderId != null &&
                    !hasSelectedOttInProviders ? (
                      <Text style={[styles.modalText, { color: "#FCA5A5" }]}>
                        {language.startsWith("en")
                          ? `Selected OTT (${ott?.name}) is not listed in provider info for this title/region.`
                          : `선택한 OTT(${ott?.name})가 이 작품/지역의 제공사 목록에 표시되지 않았어요.`}
                      </Text>
                    ) : null}

                    {/* TMDB 제공 link 있으면 열기 */}
                    {providersLink ? (
                      <TouchableOpacity
                        onPress={openProvidersLink}
                        style={[
                          styles.modalTrailerButton,
                          { backgroundColor: "#111827", marginTop: 6 },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.modalTrailerButtonText}>
                          {language.startsWith("en")
                            ? "Open watch options"
                            : "시청 옵션 열기"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}

                {/* 예고편 버튼 */}
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
