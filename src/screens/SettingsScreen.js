import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const STR = {
  "ko-KR": {
    title: "언어 / 지역 선택",
    lang: "언어",
    region: "지역",
    next: "다음",
  },
  "en-US": {
    title: "Language / Region",
    lang: "Language",
    region: "Region",
    next: "Next",
  },
};

export default function SettingsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const {
    language: initialLang = "ko-KR",
    watchRegion: initialRegion = "KR",
    setAppPrefs,
    markPrefsPicked,
  } = route.params || {};

  // ✅ 선택은 로컬 state로만 관리 (바로 이동/저장 X)
  const [lang, setLang] = useState(initialLang);
  const [region, setRegion] = useState(initialRegion);

  const uiLang = useMemo(
    () => (lang?.startsWith("en") ? "en-US" : "ko-KR"),
    [lang]
  );
  const t = (k) => STR[uiLang]?.[k] ?? STR["en-US"][k] ?? k;

  const handleNext = async () => {
    // ✅ 여기서만 저장 + “선택 완료” 플래그 + 화면 이동
    await setAppPrefs?.({ language: lang, watchRegion: region });
    await markPrefsPicked?.();

    navigation.reset({
      index: 0,
      routes: [
        { name: "Mood", params: { language: lang, watchRegion: region } },
      ],
    });
  };

  // (선택 UX) region을 US로 바꾸면 언어 기본을 en-US로 맞추고 싶다면 아래처럼
  const pickRegion = (nextRegion) => {
    setRegion(nextRegion);
    if (nextRegion === "US") setLang("en-US");
    if (nextRegion === "KR") setLang("ko-KR");
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={styles.title}>{t("title")}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>{t("lang")}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pill, lang === "ko-KR" && styles.pillActive]}
              onPress={() => setLang("ko-KR")}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>KR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, lang === "en-US" && styles.pillActive]}
              onPress={() => setLang("en-US")}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>EN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t("region")}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pill, region === "KR" && styles.pillActive]}
              onPress={() => pickRegion("KR")}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>KR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, region === "US" && styles.pillActive]}
              onPress={() => pickRegion("US")}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>US</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ 하단 “다음” 버튼 */}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.nextText}>{t("next")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: "#050816" },
  container: { flex: 1, paddingHorizontal: 20 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 18,
  },
  section: { marginBottom: 16 },
  label: { fontSize: 12, color: "#9CA3AF", marginBottom: 8 },
  row: { flexDirection: "row" },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#111827",
    marginRight: 10,
  },
  pillActive: { backgroundColor: "#2563EB" },
  pillText: { color: "#F9FAFB", fontWeight: "700" },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { fontSize: 15, fontWeight: "700", color: "#020617" },
});
