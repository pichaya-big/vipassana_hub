import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server in .next/standalone (used by the Docker image)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Lesson videos are uploaded through /api, which Next.js forwards to the API server in local dev.
    // The defaults (10 MB body, 30 s) would cut uploads off. Keep the size above MAX_VIDEO_MB (50).
    proxyClientMaxBodySize: "60mb",
    proxyTimeout: 10 * 60 * 1000,
  },
  // Root URL goes to login. Redirects live here, not in a page, because cacheComponents
  // rejects redirect() during prerendering of "/".
  redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  // Local dev has no nginx in front, so forward /api/* to the Node.js server.
  // In Docker, nginx routes /api before Next.js sees it, so this rule is not used there.
  rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
