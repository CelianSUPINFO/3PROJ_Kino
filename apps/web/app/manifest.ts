import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kino — Culture Connect",
    short_name: "Kino",
    description: "Films, séries, critiques et recommandations entre amis.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0710",
    theme_color: "#ff2e7e",
    orientation: "portrait-primary",
    icons: [
      { src: "/kino-logo.png", sizes: "512x512", type: "image/png" },
      { src: "/kino-mark.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
