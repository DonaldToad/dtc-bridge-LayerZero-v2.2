/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages requires a static output directory with index.html
  output: "export",

  // Ensures URLs work as files without server rewrites
  trailingSlash: true,

  // Your app uses images for logos; this avoids server-side image optimization
  images: { unoptimized: true },
};

module.exports = nextConfig;
