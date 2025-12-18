import { extension_settings, renderExtensionTemplateAsync } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const EXTENSION_NAME = "AutoBGM";   // 폴더명 정확히 (대소문자 포함)
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

  const html = await renderExtensionTemplateAsync(EXTENSION_NAME, "settings");
  const root = document.createElement("div");
  root.id = "autobgm-root";
  root.innerHTML = html;
  host.appendChild(root);

  const enable = root.querySelector("#abgm_enable");
  const btn = root.querySelector("#abgm_openSettings");

  if (enable) {
    enable.checked = !!settings.enabled;
    enable.addEventListener("change", (e) => {
      settings.enabled = !!e.target.checked;
      saveSettingsDebounced();
    });
  }

  if (btn) {
    btn.addEventListener("click", () => {
      alert("Settings modal (TODO)");
    });
  }

  console.log("[AutoBGM] mounted in extensions menu");
}

jQuery(() => { mount(); });

