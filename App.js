import React, { useEffect, useState, useCallback } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // ✅ 저장값은 참고만(시작 화면 결정에 사용 X)
        const savedLang = await AsyncStorage.getItem("@language");
        const savedRegion = await AsyncStorage.getItem("@watchRegion");

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
          // ✅ 무조건 Settings부터 시작
          initialRouteName="Settings"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#050816" },
          }}
        >
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            initialParams={{ language, watchRegion, setAppPrefs }}
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
