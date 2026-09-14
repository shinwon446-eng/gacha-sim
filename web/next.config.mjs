/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // 정적 데모(Pages)에는 서버가 없으므로 클라이언트가 로컬 엔진 폴백으로 전환된다
  env: { NEXT_PUBLIC_STATIC_DEMO: isPages ? "true" : "" },
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
