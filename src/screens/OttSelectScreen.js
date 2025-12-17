import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TMDB_API_KEY, TMDB_BASE_URL } from "../../config/tmdb"; // ✅ 경로 필요하면 수정

// =========================
// 최소 t() fallback (프로젝트에 기존 t() 있으면 이거 제거하고 import로 교체)
// =========================
const STRINGS = {
  "ko-KR": {
    whereToWatch: "어디에서 볼까요?",
    whereToWatchDesc:
      "지금 가입해 둔 OTT를 선택하면,\n그 안에서 볼 수 있는 작품만 골라 드릴게요.",
    empty: "OTT 목록을 불러오지 못했어요.",
  },
  "en-US": {
    whereToWatch: "Where will you watch?",
    whereToWatchDesc:
      "Pick a streaming service you use,\nthen I'll recommend titles available there.",
    empty: "No OTT providers found.",
  },
};
const t = (lang, key) => STRINGS[lang]?.[key] ?? STRINGS["en-US"][key] ?? key;

// =========================
// KR 고정 OTT(로컬 로고)
// =========================
const OTTS_KR = [
  {
    id: "netflix",
    name: "넷플릭스",
    providerId: 8,
    watchRegion: "KR",
    logo: require("../../assets/logos/netflix.png"),
  },
  {
    id: "tving",
    name: "티빙",
    providerId: 97,
    watchRegion: "KR",
    logo: require("../../assets/logos/tving.png"),
  },
  {
    id: "wavve",
    name: "웨이브",
    providerId: 356,
    watchRegion: "KR",
    logo: require("../../assets/logos/wavve.png"),
  },
  {
    id: "watcha",
    name: "왓챠",
    providerId: 97, // (주의) TMDB 상 watcha id는 별도 확인 필요할 수 있음
    watchRegion: "KR",
    logo: require("../../assets/logos/watcha.png"),
  },
  {
    id: "disney",
    name: "디즈니플러스",
    providerId: 337,
    watchRegion: "KR",
    logo: require("../../assets/logos/disney.png"),
  },
];

// =========================
// TMDB helpers
// =========================
const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

async function fetchWatchProvidersMovie({ region, language }) {
  const url =
    `${TMDB_BASE_URL}/watch/providers/movie` +
    `?api_key=${TMDB_API_KEY}` +
    `&watch_region=${encodeURIComponent(region)}` +
    `&language=${encodeURIComponent(language)}`;

  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}

// =========================
// Screen
// =========================
export default function OttSelectScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { mood, language = "ko-KR", watchRegion = "KR" } = route.params || {};

  const [selectedOttId, setSelectedOttId] = useState(null);
  const [ottList, setOttList] = useState([]);
  const [loadingOtts, setLoadingOtts] = useState(true);

  // ✅ US에서 보여주고 싶은 provider_id만 “id 기준”으로 고정 필터링
  //    (여기만 수정하면 됨)
  const WANT_US_PROVIDER_IDS = useMemo(
    () =>
      new Set([
        8, // Netflix
        337, // Disney+
        15, // Hulu
        9, // Amazon Prime Video
        1899, // Max (⚠️ 혹시 안 뜨면 로그 찍어서 id 확인)
        350, // Apple TV+ (이 id로만 남기면 Apple TV 중복 없음)
        531, // Paramount+
        386, // Peacock
      ]),
    []
  );

  // ✅ 표시 순서(없으면 뒤로 감)
  const ORDER_US = useMemo(() => [8, 337, 15, 9, 1899, 350, 531, 386], []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingOtts(true);

        if (watchRegion !== "US") {
          if (!cancelled) setOttList(OTTS_KR);
          return;
        }

        const providers = await fetchWatchProvidersMovie({
          region: "US",
          language,
        });

        // ✅ 실제 provider_id 확인 필요할 때만 잠깐 켜
        // console.log(
        //   "TMDB US providers:",
        //   providers.map((p) => ({ id: p.provider_id, name: p.provider_name }))
        // );

        // 1) provider_id 기준으로 필터
        const pickedRaw = providers
          .filter((p) => WANT_US_PROVIDER_IDS.has(p.provider_id))
          .map((p) => ({
            id: String(p.provider_id), // FlatList key 용
            name: p.provider_name,
            providerId: p.provider_id,
            watchRegion: "US",
            logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : null,
          }));

        // 2) providerId 기준 dedup (id가 같으면 무조건 1개만)
        const byId = new Map();
        for (const item of pickedRaw) {
          if (!byId.has(item.providerId)) byId.set(item.providerId, item);
        }

        let picked = Array.from(byId.values());

        // 3) 이름 통일(선택) - Apple TV+ / Disney+ 같은 표기 정리
        picked = picked.map((x) => {
          if (x.providerId === 350) return { ...x, name: "Apple TV+" };
          if (x.providerId === 337) return { ...x, name: "Disney+" };
          if (x.providerId === 1899) return { ...x, name: "Max" };
          if (x.providerId === 531) return { ...x, name: "Paramount+" };
          return x;
        });

        // 4) 정렬(원하는 순서)
        const rank = (id) => {
          const idx = ORDER_US.indexOf(id);
          return idx === -1 ? 999 : idx;
        };
        picked.sort((a, b) => rank(a.providerId) - rank(b.providerId));

        if (!cancelled) setOttList(picked);
      } catch (e) {
        console.warn("Failed to load OTT providers", e);
        if (!cancelled) setOttList([]);
      } finally {
        if (!cancelled) setLoadingOtts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [watchRegion, language, WANT_US_PROVIDER_IDS, ORDER_US]);

  const handleSelectOtt = (ott) => {
    setSelectedOttId(ott.id);
    navigation.navigate("Results", {
      mood: mood || "아무거나",
      ott,
      language,
      watchRegion: ott.watchRegion || watchRegion,
    });
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
        ]}
        edges={["top", "bottom"]}
      >
        <Text style={styles.title}>{t(language, "whereToWatch")}</Text>
        <Text style={styles.desc}>{t(language, "whereToWatchDesc")}</Text>

        {loadingOtts ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.smallText, { marginTop: 8 }]}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={ottList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => {
              const isSelected = selectedOttId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => handleSelectOtt(item)}
                  activeOpacity={0.9}
                >
                  {item.logo ? (
                    <Image source={item.logo} style={styles.logo} />
                  ) : item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.logo} />
                  ) : (
                    <View
                      style={[styles.logo, { backgroundColor: "#111827" }]}
                    />
                  )}

                  <Text style={styles.name}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ paddingTop: 24 }}>
                <Text style={styles.smallText}>{t(language, "empty")}</Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// =========================
// styles
// =========================
const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: "#050816" },
  container: { flex: 1, paddingHorizontal: 20 },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 12,
  },
  desc: { fontSize: 14, color: "#9CA3AF", marginBottom: 20 },
  smallText: { fontSize: 13, color: "#9CA3AF" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#0B1120",
    marginBottom: 10,
  },
  rowSelected: {
    borderWidth: 1,
    borderColor: "#3B82F6",
    backgroundColor: "#111827",
  },
  logo: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  name: { fontSize: 16, fontWeight: "500", color: "#F9FAFB" },
});
