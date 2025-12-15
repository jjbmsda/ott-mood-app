export default {
  expo: {
    name: "OTT Mood",
    slug: "ott-mood-app",

    android: {
      package: "com.oneul.moviemood",
    },

    extra: {
      tmdbApiKey: process.env.TMDB_API_KEY,
      eas: {
        projectId: "98078928-0b4f-4d9e-8a4c-18731b8ea06b",
      },
    },
  },
};
