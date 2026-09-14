/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // GitHub Pages 정적 배포: https://<owner>.github.io/gacha-sim/
  ...(isPages
    ? {
        output: "export",
        basePath: "/gacha-sim",
        assetPrefix: "/gacha-sim/",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
