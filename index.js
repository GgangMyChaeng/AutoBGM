import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const EXTENSION_NAME = "AutoBGM";
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

  const res = await fetch(`/scripts/extensions/third-party/${EXTENSION_NAME}/window.html`);
  if (!res.ok) {
    console.error("[AutoBGM] window.html load failed", res.status);
    return;
  }
  const html = await res.text();

  const root = document.createElement("div");
  root.id = "autobgm-root";
  root.innerHTML = html;
  host.appendChild(root);

  const enable = root.querySelector("#abgm_enable");
  if (enable) {
    enable.checked = !!settings.enabled;
    enable.addEventListener("change", (e) => {
      settings.enabled = !!e.target.checked;
      saveSettingsDebounced();
    });
  }

  root.querySelector("#abgm_openSettings")?.addEventListener("click", () => {
    alert("Settings modal (TODO)");
  });

  console.log("[AutoBGM] mounted");
}

jQuery(() => mount());
