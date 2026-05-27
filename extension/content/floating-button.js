(function () {
  if (window.__RESUMOD_FLOATING_BTN__) return;
  window.__RESUMOD_FLOATING_BTN__ = true;

  var DISMISSED_KEY = "rf_dismissed_sites";
  var floatingHost = null;
  var floatingRoot = null;
  var floatingContainer = null;
  var applyButtonEl = null;
  var isVisible = false;
  var positionInterval = null;

  function getDismissedSites(cb) {
    chrome.storage.local.get([DISMISSED_KEY], function (result) {
      cb(result[DISMISSED_KEY] || []);
    });
  }

  function addDismissedSite(siteKey) {
    chrome.storage.local.get([DISMISSED_KEY], function (result) {
      var list = result[DISMISSED_KEY] || [];
      if (list.indexOf(siteKey) === -1) {
        list.push(siteKey);
        chrome.storage.local.set({ rf_dismissed_sites: list });
      }
    });
  }

  function getSiteKey() {
    try {
      var url = new URL(location.href);
      return url.hostname + url.pathname.replace(/\/\d+/g, "/:id").replace(/\/$/, "");
    } catch (e) {
      return location.hostname;
    }
  }

  function findApplyButton() {
    if (window.ResumodDetect) {
      return window.ResumodDetect.detectApplyButton();
    }
    var allBtns = document.querySelectorAll('button, [role="button"], a');
    for (var i = 0; i < allBtns.length; i++) {
      var btn = allBtns[i];
      if (btn.offsetParent === null) continue;
      var text = (btn.textContent || "").trim();
      var ariaLabel = (btn.getAttribute("aria-label") || "").trim();
      if (/^apply$/i.test(text) || /apply now/i.test(text) || /apply/i.test(ariaLabel)) return btn;
    }
    return null;
  }

  function buildButton() {
    floatingHost = document.createElement("div");
    floatingHost.id = "resumod-floating-btn-host";
    floatingHost.setAttribute("style",
      "position: fixed; z-index: 2147483646; pointer-events: none; top: 0; left: 0; width: 0; height: 0;"
    );
    floatingRoot = floatingHost.attachShadow({ mode: "open" });

    floatingContainer = document.createElement("div");
    floatingContainer.setAttribute("style", "pointer-events: auto;");
    floatingRoot.appendChild(floatingContainer);
    floatingContainer.innerHTML = BTN_TEMPLATE;

    document.documentElement.appendChild(floatingHost);

    var mainBtn = floatingContainer.querySelector("#rm-float-main");
    var dismissBtn = floatingContainer.querySelector("#rm-float-dismiss");

    mainBtn.addEventListener("click", function () {
      openSidebarToSave();
    });

    dismissBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      hideButton();
      addDismissedSite(getSiteKey());
    });

    isVisible = true;
    updatePosition();
    startPositionTracking();
  }

  function updatePosition() {
    if (!floatingContainer) return;
    applyButtonEl = findApplyButton();

    if (applyButtonEl) {
      var rect = applyButtonEl.getBoundingClientRect();
      var btnWidth = 200;
      var left = rect.left + (rect.width / 2) - (btnWidth / 2);
      var top = rect.bottom + 12;

      if (left < 10) left = 10;
      if (left + btnWidth > window.innerWidth - 10) left = window.innerWidth - btnWidth - 10;
      if (top + 50 > window.innerHeight) {
        top = rect.top - 50;
      }
      if (top < 10) top = window.innerHeight - 70;

      floatingContainer.style.cssText =
        "position: fixed; left: " + left + "px; top: " + top + "px; pointer-events: auto;";
    } else {
      floatingContainer.style.cssText =
        "position: fixed; bottom: 24px; right: 24px; pointer-events: auto;";
    }
  }

  function startPositionTracking() {
    if (positionInterval) clearInterval(positionInterval);
    positionInterval = setInterval(function () {
      if (isVisible) updatePosition();
    }, 2000);

    window.addEventListener("scroll", function () {
      if (isVisible) updatePosition();
    }, { passive: true });

    window.addEventListener("resize", function () {
      if (isVisible) updatePosition();
    }, { passive: true });
  }

  function hideButton() {
    if (floatingHost) {
      floatingHost.remove();
    }
    if (positionInterval) {
      clearInterval(positionInterval);
      positionInterval = null;
    }
    floatingHost = null;
    floatingRoot = null;
    floatingContainer = null;
    isVisible = false;
  }

  function showButton() {
    if (isVisible) return;
    buildButton();
  }

  function openSidebarToSave() {
    try {
      chrome.runtime.sendMessage({ type: "TOGGLE_SIDEBAR" }, function () {
        if (chrome.runtime.lastError) {
          chrome.runtime.sendMessage({ type: "INJECT_SIDEBAR" });
        }
      });
    } catch (e) {
      chrome.runtime.sendMessage({ type: "INJECT_SIDEBAR" });
    }

    setTimeout(function () {
      try {
        chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR_TAB", payload: { tab: "save" } });
      } catch (e) { /* ignore */ }
    }, 200);
  }

  function init() {
    var detect = window.ResumodDetect;
    if (!detect) return;

    var result = detect.detectJobPage();
    if (!result.isJobPage) return;

    var siteKey = getSiteKey();
    getDismissedSites(function (dismissed) {
      if (dismissed.indexOf(siteKey) !== -1) return;
      showButton();
    });
  }

  if (window.ResumodDetect && window.ResumodDetect.watchNavigation) {
    window.ResumodDetect.watchNavigation(function (result) {
      if (result.isJobPage && !isVisible) {
        var siteKey = getSiteKey();
        getDismissedSites(function (dismissed) {
          if (dismissed.indexOf(siteKey) === -1) showButton();
        });
      } else if (!result.isJobPage && isVisible) {
        hideButton();
      }
    });
  }

  setTimeout(init, 1500);

  var logoUrl = chrome.runtime.getURL("icons/logo-mark.svg");

  var BTN_TEMPLATE =
    '<div class="rm-float-wrap" style="' +
    "display: inline-flex; align-items: center; gap: 10px;" +
    "background: linear-gradient(135deg, #0369a1 0%, #059669 100%);" +
    "color: #fff; padding: 11px 18px 11px 12px; border-radius: 12px;" +
    "font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" +
    "font-size: 13px; font-weight: 600; cursor: pointer;" +
    "box-shadow: 0 8px 28px rgba(5, 150, 105, 0.4);" +
    "transition: transform 0.2s, box-shadow 0.2s;" +
    "white-space: nowrap; position: relative; border: 1px solid rgba(255,255,255,0.2);" +
    '">' +
    '<button id="rm-float-main" style="' +
    "background: none; border: none; color: #fff; font: inherit;" +
    "cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 0;" +
    '">' +
    '<img src="' + logoUrl + '" width="24" height="24" alt="" style="border-radius:6px;background:#fff;padding:2px;" />' +
    '<span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.2;">' +
    '<span style="font-size:13px;font-weight:700;">Save to Fluxpage</span>' +
    '<span style="font-size:10px;opacity:0.9;font-weight:500;">AI job assistant</span>' +
    '</span>' +
    "</button>" +
    '<button id="rm-float-dismiss" style="' +
    "position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;" +
    "border-radius: 50%; border: 1px solid rgba(255,255,255,0.3);" +
    "background: #ef4444; color: #fff; font-size: 10px; line-height: 1;" +
    "cursor: pointer; display: flex; align-items: center; justify-content: center;" +
    "padding: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.25);" +
    '" title="Dismiss">&#10005;</button>' +
    "</div>";
})();
