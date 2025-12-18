console.log("[AutoBGM] index.js loaded", import.meta.url);

import { extension_settings, renderExtensionTemplateAsync } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[AutoBGM] index.js loaded", import.meta.url);

const SETTINGS_KEY = "autobgm";

// ✅ 설치된 “폴더명” 자동 추출 (AutoBGM-main 같은 케이스 대응)
const EXTENSION_NAME = new URL(".", import.meta.url).pathname
  .split("/")
  .filter(Boolean)
  .pop();

function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= { enabled: true };
  return extension_settings[SETTINGS_KEY];
}

async function mount() {
  const host = document.querySelector("#extensions_settings");

  // ✅ 왜 안 붙는지 로그 남김
  if (!host) {
    console.log("[AutoBGM] mount skipped: #extensions_settings not found yet");
    return;
  }

  if (document.getElementById("autobgm-root")) return;

  console.log("[AutoBGM] mounting... EXTENSION_NAME =", EXTENSION_NAME);

  const settings = ensureSettings();

  let html = "";
  try {
    html = await renderExtensionTemplateAsync(EXTENSION_NAME, "window");
  } catch (e) {
    console.error("[AutoBGM] template load failed:", e, "EXTENSION_NAME =", EXTENSION_NAME);
    return;
  }

  const root = document.createElement("div");
  root.id = "autobgm-root";
  root.innerHTML = html;
  host.appendChild(root);

  const enable = root.querySelector("#autobgm_enabled");
  const openBtn = root.querySelector("#autobgm_open");

  if (enable) {
    enable.checked = !!settings.enabled;
    enable.addEventListener("change", (e) => {
      settings.enabled = !!e.target.checked;
      saveSettingsDebounced();
      console.log("[AutoBGM] enabled =", settings.enabled);
    });
  } else {
    console.warn("[AutoBGM] #autobgm_enabled not found (window.html id 확인)");
  }

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      console.log("[AutoBGM] open settings clicked");
      alert("Settings modal (TODO)");
    });
  } else {
    console.warn("[AutoBGM] #autobgm_open not found (window.html id 확인)");
  }

  console.log("[AutoBGM] mounted OK");
}

// ✅ ST는 메뉴 열 때 DOM이 늦게 생길 수 있어서 옵저버로 재시도
function init() {
  mount();

  const obs = new MutationObserver(() => {
    if (document.querySelector("#extensions_settings") && !document.getElementById("autobgm-root")) {
      mount();
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}

jQuery(() => init());
