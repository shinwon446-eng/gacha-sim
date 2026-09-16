/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // 정적 데모(Pages)에는 서버가 없으므로 클라이언트가 로컬 엔진 폴백으로 전환된다
  env: {
    NEXT_PUBLIC_STATIC_DEMO: isPages ? "true" : "",
    // public/ 정적 자산의 절대 경로 앞에 붙인다. Pages 는 /gacha-sim 아래에 배포된다.
    NEXT_PUBLIC_BASE_PATH: isPages ? "/gacha-sim" : "",
  },
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
