import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents requires the Node.js runtime and uses setTimeout() internally.
  // Cloudflare Workers' workerd runtime has an incompatible setTimeout() implementation
  // which causes the Worker to hang and never send a response.
  // Keep this DISABLED for Cloudflare Workers deployments.
  cacheComponents: false,

  // partialPrefetching is tightly coupled to cacheComponents (PPR).
  // Must be disabled when cacheComponents is false.
  partialPrefetching: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

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
