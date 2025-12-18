// index.js
import { callPopup, saveSettingsDebounced } from "../../../../script.js";
import { extension_settings, renderExtensionTemplateAsync } from "../../../extensions.js";

const EXTENSION_NAME = "AutoBGM";   // 폴더명(리포/확장 폴더명)
const SETTINGS_KEY = "autobgm";

function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= {
    enabled: true,
    activeCharKey: "none",
    selectedPresetId: null,
    presets: [],
    charPresetMap: {},
  };
  return extension_settings[SETTINGS_KEY];
}

async function openSettingsModal() {
  // 모달 내용(html) = templates/popup.html 로드
  const html = await renderExtensionTemplateAsync(EXTENSION_NAME, "popup");
  const $root = await callPopup(html, "text"); // ST 팝업

  // callPopup가 jQuery 래퍼를 주는 버전이 많음. 안전하게 DOM 잡기
  const root = $root?.[0] ?? document;

  const settings = ensureSettings();

  // 여기서부터: 프리셋/트랙 렌더 + 이벤트 바인딩
  // (일단 뼈대만)
  const btnClose = root.querySelector("#abgm_modal_close");
  btnClose?.addEventListener("click", () => {
    // callPopup 닫기는 보통 ST가 제공하는 close를 쓰거나,
    // 팝업 내부 close 버튼을 누르면 자동 닫힘 구조인 경우가 많아서
    // 여기선 그냥 안내만 해둠
  });

  console.log("[AutoBGM] settings modal opened");
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

  const html = await renderExtensionTemplateAsync(EXTENSION_NAME, "settings");
  const root = document.createElement("div");
  root.id = "autobgm-root";
  root.innerHTML = html;
  host.appendChild(root);

  const enable = root.querySelector("#autobgm_enabled");
  const btn = root.querySelector("#autobgm_open");

  if (enable) {
    enable.checked = !!settings.enabled;
    enable.addEventListener("change", (e) => {
      settings.enabled = !!e.target.checked;
      saveSettingsDebounced();
    });
  }

  if (btn) {
    btn.addEventListener("click", () => {
      openSettingsModal().catch(err => console.error(err));
    });
  }

  console.log("[AutoBGM] mounted");
}

jQuery(() => mount());
