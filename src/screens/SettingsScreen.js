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

  const save = async () => {
    await AsyncStorage.setItem("@language", lang);
    await AsyncStorage.setItem("@watchRegion", region);

    // ✅ 이전 화면들이 params로 language/watchRegion을 쓰는 구조라면, 돌아가면서 갱신
    navigation.navigate("Mood", { language: lang, watchRegion: region });
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
        <Text style={styles.sectionTitle}>{t(lang, "settings")}</Text>

        <Text style={[styles.smallText, { marginBottom: 10 }]}>
          {t(lang, "pickLang")}
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setLang("ko-KR")}
            style={[
              styles.resultMoodResetButton,
              { marginLeft: 0 },
              lang === "ko-KR" && { backgroundColor: "#2563EB" },
            ]}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              KR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLang("en-US")}
            style={[
              styles.resultMoodResetButton,
              lang === "en-US" && { backgroundColor: "#2563EB" },
            ]}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              EN
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.smallText, { marginBottom: 10 }]}>
          {t(lang, "pickRegion")}
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => {
              setRegion("KR");
              setLang("ko-KR");
            }}
            style={[
              styles.resultMoodResetButton,
              { marginLeft: 0 },
              region === "KR" && { backgroundColor: "#2563EB" },
            ]}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              {t(lang, "regionKR")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRegion("US");
              setLang("en-US");
            }}
            style={[
              styles.resultMoodResetButton,
              region === "US" && { backgroundColor: "#2563EB" },
            ]}
          >
            <Text style={[styles.resultMoodResetText, { color: "#F9FAFB" }]}>
              {t(lang, "regionUS")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.moodNextButton}
          onPress={save}
          activeOpacity={0.85}
        >
          <Text style={styles.moodNextText}>{t(lang, "save")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
