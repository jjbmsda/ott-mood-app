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
import { TMDB_IMAGE_BASE } from "../../config/tmdb";

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

  const moodLabel =
    MOOD_LABELS[mood]?.[language.startsWith("en") ? "en-US" : "ko-KR"] || mood;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@favorites");
        if (raw) setFavorites(JSON.parse(raw));
      } catch (e) {}
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

  const openDetail = async (movie) => {
    setSelectedMovie(movie);
    setDetailModalVisible(true);
    try {
      const detail = await fetchMovieDetail(movie.id, { language });
      setSelectedMovieDetail(detail);
    } catch (e) {}
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
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else await Linking.openURL(url);
    } catch (e) {
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
        {/* ✅ 헤더: (원하는대로 더 커스터마이징 가능) */}
        <View style={styles.resultHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              {/* OTT 로고 노출 */}
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

          {/* 오른쪽 버튼 영역 */}
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

            {/* 지구본(설정) 버튼 */}
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
