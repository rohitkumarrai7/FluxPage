/**
 * PostHog analytics for the Chrome extension (MV3 service worker).
 * Uses PostHog HTTP capture/decide APIs — no posthog-js bundle required.
 */
(function (global) {
  var STORAGE_DISTINCT = "rf_ph_distinct_id";
  var STORAGE_FLAGS = "rf_ph_feature_flags";
  var STORAGE_FLAGS_AT = "rf_ph_feature_flags_at";
  var FLAG_CACHE_MS = 5 * 60 * 1000;

  function cfg() {
    return global.__RESUMOD_CONFIG__ || {};
  }

  function posthogKey() {
    return cfg().POSTHOG_KEY || "";
  }

  function posthogHost() {
    return cfg().POSTHOG_HOST || "https://us.i.posthog.com";
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) {
      return global.crypto.randomUUID();
    }
    return "ph_" + Date.now() + "_" + Math.random().toString(36).slice(2, 12);
  }

  function storageGet(keys) {
    return new Promise(function (resolve) {
      if (!global.chrome || !chrome.storage || !chrome.storage.local) {
        resolve({});
        return;
      }
      chrome.storage.local.get(keys, resolve);
    });
  }

  function storageSet(obj) {
    return new Promise(function (resolve) {
      if (!global.chrome || !chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      chrome.storage.local.set(obj, resolve);
    });
  }

  async function getDistinctId() {
    var stored = await storageGet([STORAGE_DISTINCT]);
    if (stored[STORAGE_DISTINCT]) {
      return stored[STORAGE_DISTINCT];
    }
    var id = uuid();
    await storageSet({ [STORAGE_DISTINCT]: id });
    return id;
  }

  async function aliasUser(convexUserId) {
    if (!convexUserId) return;
    var distinctId = await getDistinctId();
    if (distinctId === convexUserId) return;

    var key = posthogKey();
    if (!key) return;

    try {
      await fetch(posthogHost() + "/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          event: "$create_alias",
          distinct_id: distinctId,
          properties: { alias: convexUserId },
        }),
      });
      await storageSet({ [STORAGE_DISTINCT]: convexUserId });
    } catch (e) {
      console.warn("[PostHog] alias failed:", e);
    }
  }

  async function capture(event, properties) {
    var key = posthogKey();
    if (!key || !event) return { ok: false };

    var distinctId = await getDistinctId();
    var payload = {
      api_key: key,
      event: event,
      distinct_id: distinctId,
      properties: Object.assign({ source: "chrome_extension" }, properties || {}),
    };

    try {
      var res = await fetch(posthogHost() + "/capture/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok };
    } catch (e) {
      console.warn("[PostHog] capture failed:", event, e);
      return { ok: false };
    }
  }

  async function getFeatureFlags(forceRefresh) {
    var key = posthogKey();
    if (!key) return {};

    var stored = await storageGet([STORAGE_FLAGS, STORAGE_FLAGS_AT]);
    var cached = stored[STORAGE_FLAGS] || {};
    var cachedAt = stored[STORAGE_FLAGS_AT] || 0;
    if (!forceRefresh && Date.now() - cachedAt < FLAG_CACHE_MS && Object.keys(cached).length) {
      return cached;
    }

    var distinctId = await getDistinctId();
    try {
      var res = await fetch(posthogHost() + "/decide/?v=3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          distinct_id: distinctId,
        }),
      });
      if (!res.ok) return cached;
      var data = await res.json();
      var flags = data.featureFlags || {};
      await storageSet({
        rf_ph_feature_flags: flags,
        rf_ph_feature_flags_at: Date.now(),
      });
      return flags;
    } catch (e) {
      console.warn("[PostHog] decide failed:", e);
      return cached;
    }
  }

  global.__FLUXPAGE_ANALYTICS__ = {
    getDistinctId: getDistinctId,
    aliasUser: aliasUser,
    capture: capture,
    getFeatureFlags: getFeatureFlags,
  };
})(typeof self !== "undefined" ? self : globalThis);
