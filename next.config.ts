import type { NextConfig } from "next";

// GitHub Pages build: static export under /jarvis-agent. CI removes src/app/api first (Pages cannot run server routes).
const isStatic = process.env.NEXT_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isStatic && { output: "export" as const, basePath: "/jarvis-agent", trailingSlash: true, images: { unoptimized: true } }),
  /* config options here */
  ...(!isStatic && { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
