import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[AutoBGM] index.js loaded", import.meta.url);

const SETTINGS_KEY = "autobgm";

function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= { enabled: true };
  return extension_settings[SETTINGS_KEY];
}

async function loadHtml(relPath) {
  const url = new URL(relPath, import.meta.url); // ✅ third-party/AutoBGM 기준으로 잡힘
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Template fetch failed: ${res.status} ${url}`);
  return await res.text();
}

async function mount() {
  const host = document.querySelector("#extensions_settings");
  if (!host) return;
  if (document.getElementById("autobgm-root")) return;

  const settings = ensureSettings();

  let html;
  try {
    html = await loadHtml("templates/window.html"); // ✅ 여기!
  } catch (e) {
    console.error("[AutoBGM] window.html load failed", e);
    return;
  }

  const root = document.createElement("div");
  root.id = "autobgm-root";
  root.innerHTML = html;
  host.appendChild(root);

  const enable = root.querySelector("#autobgm_enabled");
  const openBtn = root.querySelector("#autobgm_open");

  if (!enable || !openBtn) {
    console.warn("[AutoBGM] window.html ids mismatch:", { enable: !!enable, openBtn: !!openBtn });
    return;
  }

  enable.checked = !!settings.enabled;
  enable.addEventListener("change", (e) => {
    settings.enabled = !!e.target.checked;
    saveSettingsDebounced();
  });

  openBtn.addEventListener("click", () => {
    console.log("[AutoBGM] open settings clicked");
  });

  console.log("[AutoBGM] mounted OK");
}

function init() {
  mount();
  const obs = new MutationObserver(() => mount());
  obs.observe(document.body, { childList: true, subtree: true });
}

jQuery(() => init());
