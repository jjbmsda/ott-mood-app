export default {
  expo: {
    name: "OTT Mood",
    slug: "ott-mood-app",
    version: "1.0.8",
    plugins: ["expo-localization"],

    // ✅ QR 카드/프로젝트 메타에 쓰이는 기본 아이콘
    icon: "./assets/icon.png",

    ios: {
      bundleIdentifier: "com.oneul.moviemood",
      buildNumber: "1.0.8",
      supportsTablet: true,
    },

    android: {
      package: "com.oneul.moviemood",
      versionCode: 5,

      // ✅ 안드로이드 런처용 Adaptive Icon
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive_icon.png",
        backgroundColor: "#050816",
      },
    },

    // (선택) 스플래시도 같이 맞추고 싶으면 주석 해제해서 사용
    // splash: {
    //   image: "./assets/splash.png",
    //   resizeMode: "contain",
    //   backgroundColor: "#050816",
    // },

    extra: {
      tmdbApiKey: process.env.TMDB_API_KEY,
      eas: {
        projectId: "98078928-0b4f-4d9e-8a4c-18731b8ea06b",
      },
    },
  },
};
