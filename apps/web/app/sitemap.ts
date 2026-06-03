import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kino-web-ten.vercel.app";
  return ["", "/search", "/ce-soir", "/login", "/register", "/legal", "/privacy", "/terms"].map(
    (path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "weekly" as const }),
  );
}
