import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Localization from "expo-localization";

import MoodScreen from "./src/screens/MoodScreen";
import OttSelectScreen from "./src/screens/OttSelectScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [language, setLanguage] = useState(null); // "ko-KR" | "en-US"
  const [watchRegion, setWatchRegion] = useState(null); // "KR" | "US"
  const [didPickPrefs, setDidPickPrefs] = useState(false); // ✅ 처음 선택 완료 여부
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const savedLang = await AsyncStorage.getItem("@language");
        const savedRegion = await AsyncStorage.getItem("@watchRegion");
        const flag = await AsyncStorage.getItem("@didPickPrefs"); // ✅ 새 플래그

        const deviceRegion = Localization.region || "KR";
        const primaryLocale =
          Localization.getLocales()?.[0]?.languageTag || "ko-KR";

        const defaultRegion =
          savedRegion === "KR" || savedRegion === "US"
            ? savedRegion
            : deviceRegion === "US"
            ? "US"
            : "KR";

        const defaultLang =
          savedLang === "ko-KR" || savedLang === "en-US"
            ? savedLang
            : primaryLocale.startsWith("en") || defaultRegion === "US"
            ? "en-US"
            : "ko-KR";

        setWatchRegion(defaultRegion);
        setLanguage(defaultLang);
        setDidPickPrefs(flag === "1");
      } catch (e) {
        setWatchRegion("KR");
        setLanguage("ko-KR");
        setDidPickPrefs(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setAppPrefs = useCallback(async (patch) => {
    // patch: { language?: "ko-KR"|"en-US", watchRegion?: "KR"|"US" }
    if (patch.language) {
      setLanguage(patch.language);
      await AsyncStorage.setItem("@language", patch.language);
    }
    if (patch.watchRegion) {
      setWatchRegion(patch.watchRegion);
      await AsyncStorage.setItem("@watchRegion", patch.watchRegion);
    }
  }, []);

  // ✅ Settings에서 "저장"했을 때 호출할 완료 핸들러
  const markPrefsPicked = useCallback(async () => {
    setDidPickPrefs(true);
    await AsyncStorage.setItem("@didPickPrefs", "1");
  }, []);

  // ✅ 앱 시작 라우트 결정: 한번이라도 선택 완료했으면 Mood, 아니면 Settings
  const initialRouteName = useMemo(() => {
    return didPickPrefs ? "Mood" : "Settings";
  }, [didPickPrefs]);

  if (!ready || !language || !watchRegion) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#050816" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#050816" },
          }}
        >
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            initialParams={{
              language,
              watchRegion,
              setAppPrefs,
              markPrefsPicked, // ✅ Settings 저장 완료 처리용
            }}
          />

          <Stack.Screen
            name="Mood"
            component={MoodScreen}
            initialParams={{ language, watchRegion }}
          />
          <Stack.Screen
            name="OttSelect"
            component={OttSelectScreen}
            initialParams={{ language, watchRegion }}
          />
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            initialParams={{ language, watchRegion }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
