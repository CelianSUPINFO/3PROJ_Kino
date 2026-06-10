export const MOVIE_GENRES = [
  { id: "", slug: "all" },
  { id: "28", slug: "action" },
  { id: "27", slug: "horror" },
  { id: "35", slug: "comedy" },
  { id: "18", slug: "drama" },
  { id: "878", slug: "scifi" },
  { id: "10749", slug: "romance" },
  { id: "53", slug: "thriller" },
  { id: "16", slug: "animation" },
  { id: "99", slug: "documentary" },
  { id: "80", slug: "crime" },
  { id: "14", slug: "fantasy" },
] as const;

export const TV_GENRES = [
  { id: "", slug: "all" },
  { id: "10759", slug: "action" },
  { id: "9648", slug: "thriller" },
  { id: "35", slug: "comedy" },
  { id: "18", slug: "drama" },
  { id: "10765", slug: "scifi" },
  { id: "10749", slug: "romance" },
  { id: "16", slug: "animation" },
  { id: "99", slug: "documentary" },
  { id: "80", slug: "crime" },
  { id: "10762", slug: "fantasy" },
  { id: "27", slug: "horror" },
] as const;

const ALL_GENRE_ENTRIES = [...MOVIE_GENRES, ...TV_GENRES];

export function genreSlugFromId(id: string) {
  if (!id) return "all";
  return ALL_GENRE_ENTRIES.find((genre) => genre.id === id)?.slug ?? "all";
}

export function genreIdForMedia(slug: string, media: "movie" | "tv") {
  if (!slug || slug === "all") return "";
  const list = media === "tv" ? TV_GENRES : MOVIE_GENRES;
  return list.find((genre) => genre.slug === slug)?.id ?? "";
}

export function genreChipList(type: "all" | "movie" | "tv") {
  return type === "tv" ? TV_GENRES : MOVIE_GENRES;
}
