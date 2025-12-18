import { extension_settings, renderExtensionTemplateAsync } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// ✅ 설치 폴더명 자동 추출 (AutoBGM / AutoBGM-main 등)
const EXTENSION_NAME = new URL(".", import.meta.url).pathname
  .split("/")
  .filter(Boolean)
  .pop();

const SETTINGS_KEY = "autobgm";

function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= { enabled: true };
  return extension_settings[SETTINGS_KEY];
}

async function mount() {
  const host = document.querySelector("#extensions_settings");
  if (!host) return;

  if (document.getElementById("autobgm-root")) return;

  const settings = ensureSettings();

  let html = "";
  try {
    html = await renderExtensionTemplateAsync(EXTENSION_NAME, "window");
  } catch (e) {
    console.error("[AutoBGM] template load failed:", e, "EXTENSION_NAME=", EXTENSION_NAME);
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
    });
  }

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      console.log("[AutoBGM] open settings clicked");
      alert("Settings modal (TODO)");
    });
  }

  console.log("[AutoBGM] mounted");
}

function init() {
  // 1) 즉시 한 번 시도
  mount();

  // 2) 나중에 Extensions 패널 열리면서 DOM 생기면 그때 붙이기
  const obs = new MutationObserver(() => {
    if (document.querySelector("#extensions_settings") && !document.getElementById("autobgm-root")) {
      mount();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

jQuery(() => init());
