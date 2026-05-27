// Example local config (copy to config.generated.js or run: npm run build)
const CONFIG = {
  API_BASE: "https://stoic-caiman-320.convex.site",
  WEB_BASE: "http://localhost:3000",
  LOCAL_PDF_API: "http://localhost:8000",
};

if (typeof globalThis !== "undefined") {
  globalThis.__RESUMOD_CONFIG__ = CONFIG;
}
