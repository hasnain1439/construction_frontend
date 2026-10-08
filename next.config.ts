import type { NextConfig } from "next";

/**
 * The backend's httpOnly auth cookies only work first-party, so the browser talks to
 * `/api/v1/*` on this origin and Next.js forwards it to the Express API.
 */
const API_ORIGIN = (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Smallest modern formats first (the login photo is served as AVIF/WebP at the screen size).
  images: { formats: ["image/avif", "image/webp"] },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
