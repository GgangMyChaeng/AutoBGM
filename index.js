// index.js
import { extension_settings, renderExtensionTemplateAsync } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const EXTENSION_NAME = "AutoBGM";   // 폴더명(대소문자 포함) == third-party/AutoBGM
const SETTINGS_KEY  = "autobgm";    // extension_settings에 저장될 키

function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= {
    enabled: true,
  };
  return extension_settings[SETTINGS_KEY];
}

async function mount() {
  const host = document.querySelector("#extensions_settings");
  if (!host) return;

  // 중복 방지
  if (document.getElementById("autobgm-root")) return;

  const settings = ensureSettings();

  let html = "";
  try {
    // templates/window.html 로드
    html = await renderExtensionTemplateAsync(EXTENSION_NAME, "window");
  } catch (e) {
    console.error("[AutoBGM] template load failed:", e);
    return;
  }

  const root = document.createElement("div");
  root.id = "autobgm-root";
  root.innerHTML = html;
  host.appendChild(root);

  // ✅ window.html id에 맞춰서 바인딩
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
      // TODO: 여기서 settings 모달 띄우면 됨
      // (일단 동작 확인용)
      console.log("[AutoBGM] open settings clicked");
      alert("Settings modal (TODO)");
    });
  } else {
    console.warn("[AutoBGM] #autobgm_open not found (window.html id 확인)");
  }

  console.log("[AutoBGM] mounted (extensions menu)");
}

// ST는 보통 jQuery ready에서 확장 마운트
jQuery(() => mount());
