/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@clerk/nextjs"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/parse-resume": [
        "./node_modules/pdfjs-dist/legacy/build/pdf.js",
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.js",
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js",
        "./node_modules/pdfjs-dist/cmaps/**/*",
        "./node_modules/pdfjs-dist/standard_fonts/**/*",
      ],
      "/api/parse-pdf": [
        "./node_modules/pdfjs-dist/legacy/build/pdf.js",
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.js",
        "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js",
        "./node_modules/pdfjs-dist/cmaps/**/*",
        "./node_modules/pdfjs-dist/standard_fonts/**/*",
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
