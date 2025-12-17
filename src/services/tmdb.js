import { TMDB_API_KEY, TMDB_BASE_URL } from "../../config/tmdb";
import { MOOD_GENRES } from "../constants/moods";

export const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

export async function fetchOttMovies(ott, mood, { language }) {
  const genres = MOOD_GENRES[mood] || [];
  const params = [
    `api_key=${TMDB_API_KEY}`,
    `language=${encodeURIComponent(language)}`,
    "sort_by=popularity.desc",
    `with_watch_providers=${ott.providerId}`,
    `watch_region=${ott.watchRegion || "KR"}`,
    "include_adult=false",
    "page=1",
  ];
  if (genres.length > 0) params.push(`with_genres=${genres.join(",")}`);

  const url = `${TMDB_BASE_URL}/discover/movie?${params.join("&")}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}

export async function fetchMovieDetail(movieId, { language }) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=${encodeURIComponent(
    language
  )}`;
  const res = await fetch(url);
  return await res.json();
}

export async function fetchBestTrailer(movieId, { language }) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=${encodeURIComponent(
    language
  )}`;
  const res = await fetch(url);
  const json = await res.json();
  const results = json.results || [];
  if (!results.length) return null;

  const score = (v) => {
    let s = 0;
    const name = (v.name || "").toLowerCase();
    const type = (v.type || "").toLowerCase();
    if (v.site === "YouTube") s += 5;
    if (type.includes("trailer")) s += 5;
    if (type.includes("teaser")) s += 3;
    if (name.includes("official") || name.includes("공식")) s += 2;
    if (name.includes("teaser") || name.includes("티저")) s += 1;
    if (name.includes("trailer")) s += 1;
    return s;
  };

  const best = [...results].sort((a, b) => score(b) - score(a))[0];
  if (!best || !best.key || best.site !== "YouTube") return null;
  return `https://www.youtube.com/watch?v=${best.key}`;
}

export async function fetchWatchProvidersMovie({ region, language }) {
  const url = `${TMDB_BASE_URL}/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=${encodeURIComponent(
    region
  )}&language=${encodeURIComponent(language)}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}
