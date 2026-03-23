import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cesium.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://cesium.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https: http: wss: ws:",
              "font-src 'self' data:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self' https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
