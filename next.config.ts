import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages needs a static output directory with index.html
  output: "export",

  // Prevents static hosting refresh issues (/path vs /path/)
  trailingSlash: true,

  // Required for static export if any Next/Image is used (or added later)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
