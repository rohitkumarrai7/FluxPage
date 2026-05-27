/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@clerk/nextjs"],
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
};

module.exports = nextConfig;
