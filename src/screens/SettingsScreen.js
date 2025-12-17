import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { styles } from "../styles/common";
import { t } from "../constants/strings";

export default function SettingsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { language = "ko-KR", watchRegion = "KR" } = route.params || {};

  const [lang, setLang] = useState(language);
  const [region, setRegion] = useState(watchRegion);

  const persistAndGo = async (nextLang, nextRegion) => {
    setLang(nextLang);
    setRegion(nextRegion);

    await AsyncStorage.setItem("@language", nextLang);
    await AsyncStorage.setItem("@watchRegion", nextRegion);
    await AsyncStorage.setItem("@didPickPrefs", "1");

    // ✅ 앱 전체에서 params로 쓰는 값 동기화
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "Mood",
          params: { language: nextLang, watchRegion: nextRegion },
        },
      ],
    });
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
        <Text style={styles.sectionTitle}>
          {lang.startsWith("en") ? "Language & Region" : "언어 / 지역 선택"}
        </Text>

        <Text style={[styles.smallText, { marginBottom: 10 }]}>
          {t(lang, "pickLang")}
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 18 }}>
          <TouchableOpacity
            onPress={() =>
              persistAndGo("ko-KR", region === "US" ? "KR" : region)
            }
            style={[
              styles.resultMoodResetButton,
              { marginLeft: 0, paddingVertical: 6, paddingHorizontal: 10 },
              lang === "ko-KR" && { backgroundColor: "#2563EB" },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              KR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              persistAndGo("en-US", region === "KR" ? "US" : region)
            }
            style={[
              styles.resultMoodResetButton,
              { paddingVertical: 6, paddingHorizontal: 10 },
              lang === "en-US" && { backgroundColor: "#2563EB" },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              EN
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.smallText, { marginBottom: 10 }]}>
          {t(lang, "pickRegion")}
        </Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={() => persistAndGo("ko-KR", "KR")}
            style={[
              styles.resultMoodResetButton,
              { marginLeft: 0, paddingVertical: 6, paddingHorizontal: 10 },
              region === "KR" && { backgroundColor: "#2563EB" },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              {t(lang, "regionKR")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => persistAndGo("en-US", "US")}
            style={[
              styles.resultMoodResetButton,
              { paddingVertical: 6, paddingHorizontal: 10 },
              region === "US" && { backgroundColor: "#2563EB" },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              {t(lang, "regionUS")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.smallText, { marginTop: 18, lineHeight: 18 }]}>
          {lang.startsWith("en")
            ? "Pick one option above. It will apply immediately."
            : "위에서 선택하면 바로 적용됩니다."}
        </Text>
      </SafeAreaView>
    </View>
  );
}
