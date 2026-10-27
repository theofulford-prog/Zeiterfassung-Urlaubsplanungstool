import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TeamZeit",
    short_name: "TeamZeit",
    description: "Zeiterfassung, Projektkosten und Urlaubsplanung",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#0e6c76",
    lang: "de",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
