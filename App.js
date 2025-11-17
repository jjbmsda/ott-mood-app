// App.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

// 🔑 TMDB 설정
const TMDB_API_KEY = "f276e46996150c5b6a693f773ad2cdee"; // ← 여기에 본인 키 넣기
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// OTT → TMDB provider_id 매핑 (KR 기준)
const PROVIDER_IDS = {
  Netflix: 8,
  "Disney+": 337,
  Watcha: 97,
  Wavve: 356,
  TVING: 283,
};

// 기분 → 장르 매핑 (단순 예시)
const MOOD_GENRES = {
  행복해요: 35, // 코미디
  우울해요: 18, // 드라마
  설레요: 10749, // 로맨스
  신나요: 28, // 액션
  아무거나: null, // 장르 제한 없음
};

/**
 * 1️⃣ 첫 화면: 기분 선택
 */
function MoodScreen({ navigation }) {
  const moods = ["행복해요", "우울해요", "설레요", "신나요", "아무거나"];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appTitle}>오늘 기분은 어때요?</Text>
      <Text style={styles.subtitle}>
        기분을 선택하면 다음 화면에서 OTT를 고를 수 있어요.
      </Text>

      <View style={styles.moodRow}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood}
            style={styles.moodButton}
            onPress={() => navigation.navigate("OttSelect", { mood })}
          >
            <Text style={styles.moodButtonText}>{mood}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

/**
 * 2️⃣ 두 번째 화면: OTT 선택
 * - MoodScreen 에서 넘겨준 mood를 route.params로 받음
 * - OTT 선택시 MovieListScreen으로 이동
 */
function OttScreen({ navigation, route }) {
  const { mood } = route.params;
  const otts = ["Netflix", "Disney+", "Watcha", "Wavve", "TVING"];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appTitle}>어디에서 볼까요?</Text>
      <Text style={styles.subtitle}>
        선택한 기분: <Text style={styles.highlight}>{mood}</Text>
      </Text>

      <View style={styles.ottRow}>
        {otts.map((name) => (
          <TouchableOpacity
            key={name}
            style={styles.ottButton}
            onPress={() =>
              navigation.navigate("MovieList", {
                mood,
                ott: name,
              })
            }
          >
            <Text style={styles.ottButtonText}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

/**
 * 3️⃣ 세 번째 화면: 영화 리스트
 * - route.params.mood / ott 사용해 TMDB 호출
 */
function MovieListScreen({ navigation, route }) {
  const { mood, ott } = route.params;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const providerId = PROVIDER_IDS[ott];
        const genreId = MOOD_GENRES[mood];

        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&region=KR&include_adult=false&include_video=false&sort_by=popularity.desc&page=1&with_watch_providers=${providerId}&watch_region=KR`;

        if (genreId) {
          url += `&with_genres=${genreId}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
          setMovies([]);
          setErrorMsg("조건에 맞는 작품을 찾지 못했습니다.");
        } else {
          setMovies(data.results);
        }
      } catch (e) {
        console.warn(e);
        setErrorMsg("영화 목록을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [mood, ott]);

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        {item.poster_path ? (
          <Image
            source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path}` }}
            style={styles.poster}
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.posterPlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <Text style={styles.movieMeta}>
            ⭐ {item.vote_average?.toFixed(1) || "N/A"} / 10
          </Text>
          {item.overview ? (
            <Text style={styles.movieOverview} numberOfLines={3}>
              {item.overview}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appTitle}>추천 결과</Text>
      <Text style={styles.subtitle}>
        기분 <Text style={styles.highlight}>{mood}</Text> 일 때,{" "}
        <Text style={styles.highlight}>{ott}</Text> 에서 볼 수 있는 작품이에요.
      </Text>

      <View style={styles.topButtonsRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>OTT 다시 선택</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          style={styles.smallButtonOutline}
        >
          <Text style={styles.smallButtonOutlineText}>기분 다시 선택</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" />
          <Text style={styles.infoText}>영화를 불러오는 중입니다…</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerArea}>
          <Text style={styles.infoText}>{errorMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * 루트 컴포넌트: 네비게이션 설정
 */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MoodSelect"
          component={MoodScreen}
          options={{ title: "오늘 기분" }}
        />
        <Stack.Screen
          name="OttSelect"
          component={OttScreen}
          options={{ title: "어디에서 볼까?" }}
        />
        <Stack.Screen
          name="MovieList"
          component={MovieListScreen}
          options={{ title: "추천 결과" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// 🎨 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  highlight: {
    fontWeight: "700",
    color: "#111",
  },
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moodButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#111",
    marginRight: 8,
    marginBottom: 8,
  },
  moodButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  ottRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ottButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  ottButtonText: {
    fontSize: 13,
    color: "#333",
  },
  topButtonsRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginTop: 4,
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  smallButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  smallButtonOutline: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#999",
  },
  smallButtonOutlineText: {
    color: "#555",
    fontSize: 12,
  },
  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
  listContent: {
    paddingVertical: 8,
  },
  card: {
    flexDirection: "row",
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    overflow: "hidden",
  },
  poster: {
    width: 90,
    height: 130,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  posterPlaceholder: {
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  posterPlaceholderText: {
    fontSize: 10,
    color: "#666",
  },
  cardContent: {
    flex: 1,
    padding: 10,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  movieMeta: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
  },
  movieOverview: {
    fontSize: 12,
    color: "#555",
  },
});
