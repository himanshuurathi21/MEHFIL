import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* MEHFIL: auth-dependent pages must render dynamically */
  cacheComponents: false,
  partialPrefetching: false,
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
