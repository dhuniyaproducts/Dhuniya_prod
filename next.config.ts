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
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|avif|woff2|woff)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
