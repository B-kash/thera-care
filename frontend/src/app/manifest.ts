import type { MetadataRoute } from "next";

/** Web app manifest (install / Add to Home Screen). Icons live in `public/icons/`. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thera Care",
    short_name: "Thera Care",
    description: "Physiotherapist practice management",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#e4e4ec",
    theme_color: "#3f3f46",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
