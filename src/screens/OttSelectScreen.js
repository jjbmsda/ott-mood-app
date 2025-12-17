import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { styles } from "../styles/common";
import { t } from "../constants/strings";
import {
  OTTS_KR,
  WANT_US_PROVIDERS,
  normalizeProviderName,
  CANONICAL_US_NAME,
} from "../constants/otts";
import { fetchWatchProvidersMovie, TMDB_LOGO_BASE } from "../services/tmdb";

export default function OttSelectScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { mood, language = "ko-KR", watchRegion = "KR" } = route.params || {};

  const [selectedOttId, setSelectedOttId] = useState(null);
  const [ottList, setOttList] = useState([]);
  const [loadingOtts, setLoadingOtts] = useState(true);

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

        // ✅ 필터 + 중복 제거(정규화 key 기준)
        const map = new Map(); // key -> provider
        for (const p of providers) {
          const key = normalizeProviderName(p.provider_name);

          // 관심 목록만
          if (!WANT_US_PROVIDERS.has(key)) continue;

          // Apple TV가 2개 뜨는 문제 같은 것들 제거: key가 같은 건 하나만 유지
          if (!map.has(key)) map.set(key, p);
        }

        const picked = Array.from(map.entries()).map(([key, p]) => {
          const displayName = CANONICAL_US_NAME[key] || p.provider_name;
          return {
            id: String(p.provider_id),
            name: displayName,
            providerId: p.provider_id,
            watchRegion: "US",
            logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : null,
          };
        });

        // 보기 좋게 정렬(원하는 순서)
        const order = [
          "netflix",
          "disney plus",
          "hulu",
          "amazon prime video",
          "max",
          "apple tv",
          "paramount plus",
          "peacock",
        ];
        picked.sort((a, b) => {
          const ak = normalizeProviderName(a.name);
          const bk = normalizeProviderName(b.name);
          return order.indexOf(ak) - order.indexOf(bk);
        });

        if (!cancelled) setOttList(picked);
      } catch (e) {
        console.warn("Failed to load OTT providers", e);
        if (!cancelled) setOttList(watchRegion === "US" ? [] : OTTS_KR);
      } finally {
        if (!cancelled) setLoadingOtts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [watchRegion, language]);

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
          styles.ottScreenContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 },
        ]}
        edges={["top", "bottom"]}
      >
        <Text style={styles.sectionTitle}>{t(language, "whereToWatch")}</Text>
        <Text style={styles.ottDescriptionText}>
          {t(language, "whereToWatchDesc")}
        </Text>

        {loadingOtts ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.smallText, { marginTop: 8 }]}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={ottList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.ottList,
              { paddingBottom: insets.bottom + 24 },
            ]}
            renderItem={({ item }) => {
              const isSelected = selectedOttId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.ottItemRow,
                    isSelected && styles.ottItemSelected,
                  ]}
                  onPress={() => handleSelectOtt(item)}
                  activeOpacity={0.9}
                >
                  {item.logo ? (
                    <Image source={item.logo} style={styles.ottLogoImage} />
                  ) : item.logoUrl ? (
                    <Image
                      source={{ uri: item.logoUrl }}
                      style={styles.ottLogoImage}
                    />
                  ) : null}

                  <Text style={styles.ottNameText}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ paddingTop: 24 }}>
                <Text style={styles.smallText}>
                  {language.startsWith("en")
                    ? "No OTT providers found."
                    : "OTT 목록을 불러오지 못했어요."}
                </Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
