import { describe, expect, it } from "vitest";
import { MOVIE_GENRES, TV_GENRES, browseHref } from "./genres";

describe("web genre navigation", () => {
  it("builds browse links with an optional genre", () => {
    expect(browseHref("movie")).toBe("/browse/movie");
    expect(browseHref("tv", "18")).toBe("/browse/tv?genre=18");
  });

  it("keeps all and drama available for movies and series", () => {
    expect(MOVIE_GENRES).toEqual(expect.arrayContaining([{ id: "", slug: "all" }, { id: "18", slug: "drama" }]));
    expect(TV_GENRES).toEqual(expect.arrayContaining([{ id: "", slug: "all" }, { id: "18", slug: "drama" }]));
  });
});
