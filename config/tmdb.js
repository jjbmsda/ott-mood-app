import Constants from "expo-constants";

export const TMDB_API_KEY = Constants.expoConfig?.extra?.tmdbApiKey;

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export async function fetchWatchProviders(movieId) {
  // TMDB: /movie/{movie_id}/watch/providers
  const url = `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return json?.results || {};
}

// ✅ 작품별 watch providers 조회 (상세 모달에서만 호출)
export async function fetchMovieWatchProviders(movieId, { region }) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return json?.results?.[region] || null; // { flatrate, rent, buy, link ... } 형태
}

export async function fetchMoodMovies(mood, { language, watchRegion }) {
  const genres = MOOD_GENRES[mood] || [];

  const params = [
    `api_key=${TMDB_API_KEY}`,
    `language=${encodeURIComponent(language)}`,
    "sort_by=popularity.desc",
    "include_adult=false",
    "page=1",
    // ✅ region은 watch_region이 아니라 region 파라미터로 거는 게 더 일반적
    `region=${encodeURIComponent(watchRegion)}`,
  ];

  if (genres.length > 0) params.push(`with_genres=${genres.join(",")}`);

  const url = `${TMDB_BASE_URL}/discover/movie?${params.join("&")}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}
