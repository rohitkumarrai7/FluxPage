/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@clerk/nextjs"],
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "pdf-parse", "canvas", "@napi-rs/canvas"],
    outputFileTracingIncludes: {
      "/api/parse-resume": [
        "./node_modules/pdf-parse/dist/**/*",
        "./node_modules/pdfjs-dist/**/*",
      ],
      "/api/parse-pdf": [
        "./node_modules/pdf-parse/dist/**/*",
        "./node_modules/pdfjs-dist/**/*",
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "canvas"];
    }
    return config;
  },
};

module.exports = nextConfig;
