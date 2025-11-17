import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";

const TMDB_API_KEY = "f276e46996150c5b6a693f773ad2cdee";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// UI에 보여줄 OTT 이름들
const OTT_NAMES = ["Netflix", "Disney+", "Wavve", "TVING", "Watcha"];

// 기분 옵션
const MOODS = ["행복", "슬픔", "설렘", "우울", "지침", "심심함"];

// 기분 → TMDB 장르 ID 매핑 (대략적인 예시)
const moodGenreMap = {
  행복: "35", // 코미디
  슬픔: "18", // 드라마
  설렘: "10749", // 로맨스
  우울: "18,80", // 드라마 + 범죄 느낌
  지침: "28,53", // 액션 + 스릴러
  심심함: "35,12", // 코미디 + 모험
};

// 문자열 비교용 정규화 (영문/숫자만 남기기)
const normalizeName = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function App() {
  const [selectedOtt, setSelectedOtt] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);

  const [providers, setProviders] = useState([]);
  const [titles, setTitles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [error, setError] = useState(null);

  // 전역 중복 제거용: { [movieId]: "Netflix" 같은 형태 }
  const [shownMovieIds, setShownMovieIds] = useState({});

  // 1) 앱 로드시: TMDB watch providers (KR) 로딩
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoadingProviders(true);
        const url = `https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&language=ko-KR&watch_region=KR`;
        const res = await fetch(url);
        const json = await res.json();
        setProviders(json.results || []);

        // 어떤 provider들이 있는지 확인용 로그
        console.log(
          "TMDB providers in KR:",
          (json.results || []).map((p) => p.provider_name)
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  // TMDB provider 목록에서 OTT 이름에 해당하는 provider 찾기
  const getProviderInfoByName = (name) => {
    if (!providers || providers.length === 0) return null;

    const target = normalizeName(name);

    // 1차: 정규화된 이름 완전 일치
    let found =
      providers.find((p) => normalizeName(p.provider_name) === target) || null;

    if (found) return found;

    // 2차: 부분 포함 (예: disney vs disneyplus)
    found =
      providers.find((p) => {
        const nv = normalizeName(p.provider_name);
        return nv.includes(target) || target.includes(nv);
      }) || null;

    return found;
  };

  // 2) OTT + 기분 조합으로 영화 가져오기
  const fetchTitlesByOttAndMood = async (ottName, mood) => {
    const providerInfo = getProviderInfoByName(ottName);

    if (!providerInfo) {
      setError(
        `${ottName}에 해당하는 TMDB 제공사(provider)를 찾지 못했습니다. 한국 region에서 미지원일 수 있습니다.`
      );
      setTitles([]);
      return;
    }

    const providerId = providerInfo.provider_id;
    const genreParam = mood ? moodGenreMap[mood] : null;

    setLoading(true);
    setError(null);

    try {
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&sort_by=popularity.desc&with_watch_providers=${providerId}&watch_region=KR&page=1&include_adult=false`;

      // 기분에 따라 장르 필터 추가
      if (genreParam) {
        url += `&with_genres=${genreParam}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      const results = json.results || [];

      // ✅ OTT 기준 전역 중복 제거
      // - 처음 등장 OTT가 나(ottName)면 OK
      // - 다른 OTT에서 먼저 등장한 영화는 제외
      const filtered = results.filter((movie) => {
        const firstOtt = shownMovieIds[movie.id];
        if (!firstOtt) return true; // 아직 안 나온 영화
        return firstOtt === ottName; // 나에서 처음 나온 영화만 유지
      });

      // 처음 등장하는 영화에 대해서만 최초 OTT 기록
      setShownMovieIds((prev) => {
        const next = { ...prev };
        filtered.forEach((movie) => {
          if (!next[movie.id]) {
            next[movie.id] = ottName;
          }
        });
        return next;
      });

      setTitles(filtered);
    } catch (e) {
      console.error(e);
      setError("작품 리스트를 불러오는 중 오류가 발생했습니다.");
      setTitles([]);
    } finally {
      setLoading(false);
    }
  };

  // OTT 선택 시
  const onSelectOtt = (ottName) => {
    setSelectedOtt(ottName);
    if (ottName) {
      fetchTitlesByOttAndMood(ottName, selectedMood);
    }
  };

  // 기분 선택 시
  const onSelectMood = (mood) => {
    setSelectedMood(mood);
    if (selectedOtt) {
      fetchTitlesByOttAndMood(selectedOtt, mood);
    }
  };

  // 선택된 OTT의 provider/로고
  const selectedProviderInfo = selectedOtt
    ? getProviderInfoByName(selectedOtt)
    : null;

  const selectedProviderLogo = selectedProviderInfo?.logo_path
    ? `${TMDB_IMAGE_BASE}/w200${selectedProviderInfo.logo_path}`
    : null;

  const renderTitleItem = ({ item }) => {
    const posterUrl = item.poster_path
      ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}`
      : null;

    return (
      <View style={styles.card}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={{ color: "#888" }}>No Image</Text>
          </View>
        )}
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSub}>
            개봉일: {item.release_date || "정보 없음"}
          </Text>
          <Text style={styles.cardSub}>
            평점: {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎬 OTT + 기분 기반 추천 (TMDB)</Text>

      {/* 기분 선택 */}
      <Text style={styles.sectionTitle}>오늘 기분은?</Text>
      <View style={styles.moodRow}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood}
            style={[
              styles.moodButton,
              selectedMood === mood && styles.moodButtonSelected,
            ]}
            onPress={() => onSelectMood(mood)}
          >
            <Text
              style={[
                styles.moodButtonText,
                selectedMood === mood && styles.moodButtonTextSelected,
              ]}
            >
              {mood}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* OTT 선택 */}
      <Text style={styles.sectionTitle}>어디에서 볼까?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}
      >
        {OTT_NAMES.map((name) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.ottButton,
              selectedOtt === name && styles.ottButtonSelected,
            ]}
            onPress={() => onSelectOtt(name)}
          >
            <Text
              style={[
                styles.ottButtonText,
                selectedOtt === name && styles.ottButtonTextSelected,
              ]}
            >
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* OTT 로고 + 상태 안내 */}
      {loadingProviders ? (
        <ActivityIndicator size="small" />
      ) : selectedOtt && selectedProviderLogo ? (
        <View style={styles.logoContainer}>
          <Image source={{ uri: selectedProviderLogo }} style={styles.logo} />
          <Text style={styles.providerName}>
            {selectedProviderInfo?.provider_name}
          </Text>
        </View>
      ) : selectedOtt ? (
        <Text style={styles.infoText}>
          {selectedOtt}에 대한 로고 정보를 찾지 못했습니다.
        </Text>
      ) : (
        <Text style={styles.infoText}>
          OTT와 기분을 선택하면 추천 영화 리스트를 보여드립니다.
        </Text>
      )}

      {/* 추천 리스트 */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : titles.length === 0 && selectedOtt ? (
        <Text style={styles.infoText}>
          조건에 맞는 작품을 찾지 못했습니다. 기분이나 OTT를 바꿔보세요.
        </Text>
      ) : (
        <FlatList
          data={titles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTitleItem}
          style={{ marginTop: 10 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  moodButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
  },
  moodButtonSelected: {
    backgroundColor: "#FFB347",
    borderColor: "#FFB347",
  },
  moodButtonText: {
    fontSize: 13,
    color: "#333",
  },
  moodButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  ottButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
  },
  ottButtonSelected: {
    backgroundColor: "#4C9AFF",
    borderColor: "#4C9AFF",
  },
  ottButtonText: {
    fontSize: 14,
    color: "#333",
  },
  ottButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  logoContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: "contain",
  },
  providerName: {
    marginTop: 4,
    fontSize: 14,
    color: "#444",
  },
  infoText: {
    marginTop: 8,
    fontSize: 13,
    color: "#666",
  },
  errorText: {
    marginTop: 10,
    color: "red",
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 4,
    backgroundColor: "#ddd",
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: "#555",
    marginBottom: 2,
  },
});
