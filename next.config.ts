import type { NextConfig } from 'next';
import TerserPlugin from 'terser-webpack-plugin';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      // Next 16.3 SWC emits invalid octal escapes in Cesium's embedded WASM.
      // Replace only the JS minimizer; retain Next's CSS optimization.
      config.optimization.minimizer[0] = new TerserPlugin({
        parallel: 2,
        terserOptions: { format: { ascii_only: true } },
      });
    }
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https: ws: wss:",
        "font-src 'self' data:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
      ].join('; ') },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }];
  },
};
export default nextConfig;
