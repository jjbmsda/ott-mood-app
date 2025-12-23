import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Localization from "expo-localization";

import MoodScreen from "./src/screens/MoodScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [language, setLanguage] = useState(null); // "ko-KR" | "en-US"
  const [watchRegion, setWatchRegion] = useState(null); // "KR" | "US"
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // ✅ “새로 시작하면 무조건 설정 화면 뜨게” 하려면
        // 여기서 saved 값을 아예 쓰지 않거나, 강제로 null 처리하면 됨.
        // 지금은 네가 원한대로: 저장값 무시하고 기기 기반 기본값으로만 세팅
        const deviceRegion = Localization.region || "KR";
        const primaryLocale =
          Localization.getLocales()?.[0]?.languageTag || "ko-KR";

        const defaultRegion = deviceRegion === "US" ? "US" : "KR";
        const defaultLang =
          primaryLocale.startsWith("en") || defaultRegion === "US"
            ? "en-US"
            : "ko-KR";

        setWatchRegion(defaultRegion);
        setLanguage(defaultLang);
      } catch (e) {
        setWatchRegion("KR");
        setLanguage("ko-KR");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setAppPrefs = useCallback(async (patch) => {
    if (patch.language) {
      setLanguage(patch.language);
      await AsyncStorage.setItem("@language", patch.language);
    }
    if (patch.watchRegion) {
      setWatchRegion(patch.watchRegion);
      await AsyncStorage.setItem("@watchRegion", patch.watchRegion);
    }
  }, []);

  if (!ready || !language || !watchRegion) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#050816" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#050816" },
          }}
        >
          {/* ✅ 시작은 무조건 Settings로 */}
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            initialParams={{
              language,
              watchRegion,
              setAppPrefs,
              entry: "boot", // ✅ SettingsScreen에서 "Next" 누르면 Mood로 가게 쓰면 됨
            }}
          />

          <Stack.Screen
            name="Mood"
            component={MoodScreen}
            initialParams={{ language, watchRegion, setAppPrefs }}
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
