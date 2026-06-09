import { describe, expect, it } from "vitest";
import { MOVIE_GENRES, TV_GENRES } from "./genres";

describe("mobile advanced-search genres", () => {
  it("provides movie and series filters", () => {
    expect(MOVIE_GENRES.length).toBeGreaterThan(10);
    expect(TV_GENRES.length).toBeGreaterThan(10);
  });

  it("uses the TMDB genre identifiers expected by search", () => {
    expect(MOVIE_GENRES.find((genre) => genre.slug === "scifi")?.id).toBe("878");
    expect(TV_GENRES.find((genre) => genre.slug === "scifi")?.id).toBe("10765");
  });
});
