import type { MetadataRoute } from "next";

/** Web app manifest (served at /manifest.webmanifest). Icons come from scripts/brand-assets.mjs. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keystone",
    short_name: "Keystone",
    // i18n-ignore: the installed-app manifest is English, like the tab titles
    description: "Build on solid numbers",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F4F2",
    theme_color: "#201F1E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
