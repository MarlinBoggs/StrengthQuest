import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StrengthQuest",
    short_name: "StrengthQuest",
    description:
      "The workout tracker that turns your lifts into RPG skills. Earn XP every set, level up Push, Pull, and Legs, and climb the tier ladder.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#06060b",
    theme_color: "#06060b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
