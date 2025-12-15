import "dotenv/config";

export default {
  expo: {
    name: "OTT Mood",
    slug: "ott-mood-app",
    extra: {
      tmdbApiKey: process.env.TMDB_API_KEY,
    },
  },
};
