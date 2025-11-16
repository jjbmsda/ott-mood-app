import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
} from "react-native";

export default function App() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedOtt, setSelectedOtt] = useState(null);

  const moods = ["행복", "슬픔", "설렘", "우울", "지침", "심심함"];
  const otts = ["Netflix", "Disney+", "Coupang Play", "TVING", "Wavve"];

  // Mock 데이터
  const movieData = {
    행복: {
      Netflix: ["인사이드 아웃", "싱", "주토피아"],
      "Disney+": ["명탐정 코난", "토이스토리"],
      "Coupang Play": ["극한직업", "해치지않아"],
      TVING: ["라라랜드", "코코"],
      Wavve: ["스즈메의 문단속", "너의 이름은"],
    },
    슬픔: {
      Netflix: ["이터널 선샤인"],
      "Disney+": ["업"],
      "Coupang Play": ["말아톤"],
      TVING: ["스틸 앨리스"],
      Wavve: ["파수꾼"],
    },
    설렘: {
      Netflix: ["엽기적인 그녀", "러브레터"],
      "Disney+": ["노팅힐"],
      "Coupang Play": ["건축학개론"],
      TVING: ["라라랜드"],
      Wavve: ["조제, 호랑이 그리고 물고기들"],
    },
    우울: {
      Netflix: ["조커"],
      "Disney+": ["블루발렌타인"],
      "Coupang Play": ["한공주"],
      TVING: ["곡성"],
      Wavve: ["타인은 지옥이다"],
    },
    지침: {
      Netflix: ["킬 빌", "매드맥스"],
      "Disney+": ["스타워즈"],
      "Coupang Play": ["분노의 질주"],
      TVING: ["존윅"],
      Wavve: ["테이큰"],
    },
    심심함: {
      Netflix: ["오징어 게임", "D.P"],
      "Disney+": ["심슨"],
      "Coupang Play": ["SNL코리아"],
      TVING: ["환승연애"],
      Wavve: ["나혼자산다"],
    },
  };

  const recommendedMovies =
    selectedMood && selectedOtt ? movieData[selectedMood][selectedOtt] : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎬 OTT 기분 기반 추천</Text>

      {/* 기분 선택 */}
      <Text style={styles.sectionTitle}>오늘 기분은?</Text>
      <View style={styles.row}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood}
            style={[
              styles.button,
              selectedMood === mood && styles.selectedButton,
            ]}
            onPress={() => setSelectedMood(mood)}
          >
            <Text
              style={[
                styles.buttonText,
                selectedMood === mood && styles.selectedButtonText,
              ]}
            >
              {mood}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* OTT 선택 */}
      <Text style={styles.sectionTitle}>어디에서 볼까?</Text>
      <View style={styles.row}>
        {otts.map((ott) => (
          <TouchableOpacity
            key={ott}
            style={[
              styles.button,
              selectedOtt === ott && styles.selectedButton,
            ]}
            onPress={() => setSelectedOtt(ott)}
          >
            <Text
              style={[
                styles.buttonText,
                selectedOtt === ott && styles.selectedButtonText,
              ]}
            >
              {ott}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 추천 결과 */}
      <Text style={styles.sectionTitle}>추천 영화</Text>
      {recommendedMovies.length > 0 ? (
        <FlatList
          data={recommendedMovies}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Text style={styles.movieItem}>• {item}</Text>
          )}
        />
      ) : (
        <Text style={styles.emptyText}>기분과 OTT를 선택해주세요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
    marginBottom: 10,
  },
  selectedButton: {
    backgroundColor: "#4C9AFF",
    borderColor: "#4C9AFF",
  },
  buttonText: {
    fontSize: 16,
    color: "#333",
  },
  selectedButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  movieItem: {
    fontSize: 18,
    paddingVertical: 5,
  },
  emptyText: {
    marginTop: 10,
    color: "#888",
    fontSize: 16,
  },
});
