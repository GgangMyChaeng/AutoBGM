import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[AutoBGM] index.js loaded", import.meta.url);

const SETTINGS_KEY = "autobgm";
const MODAL_OVERLAY_ID = "abgm_modal_overlay";

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSettings() {
  // 기본 스키마
  extension_settings[SETTINGS_KEY] ??= {
    enabled: true,
    keywordMode: true,
    globalVolume: 0.7,
    useDefault: true,
    defaultBgmId: "",
    activePresetId: "default",
    presets: {
      default: {
        id: "default",
        name: "Default",
        bgms: [] // {id,name,dataUrl,keywords,priority,volume}
      },
    },
  };

  // 안전장치
  const s = extension_settings[SETTINGS_KEY];
  if (!s.presets || Object.keys(s.presets).length === 0) {
    s.presets = { default: { id: "default", name: "Default", bgms: [] } };
    s.activePresetId = "default";
  }
  if (!s.presets[s.activePresetId]) {
    s.activePresetId = Object.keys(s.presets)[0];
  }
  return s;
}

async function loadHtml(relPath) {
  const url = new URL(relPath, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Template fetch failed: ${res.status} ${url}`);
  return await res.text();
}

// ===== Modal open/close =====
function closeModal() {
  const overlay = document.getElementById(MODAL_OVERLAY_ID);
  if (overlay) overlay.remove();
  document.body.classList.remove("autobgm-modal-open");
  window.removeEventListener("keydown", onEscClose);
}

function onEscClose(e) {
  if (e.key === "Escape") closeModal();
}

async function openModal() {
  if (document.getElementById(MODAL_OVERLAY_ID)) return;

  let html = "";
  try {
    html = await loadHtml("templates/popup.html");
  } catch (e) {
    console.error("[AutoBGM] popup.html load failed", e);
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = MODAL_OVERLAY_ID;
  overlay.className = "autobgm-overlay";
  overlay.innerHTML = html;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  document.body.classList.add("autobgm-modal-open");
  window.addEventListener("keydown", onEscClose);

  const closeBtn = overlay.querySelector("#abgm_modal_close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  initModal(overlay);

  console.log("[AutoBGM] modal opened");
}

// ===== Modal UI logic =====
function getActivePreset(settings) {
  return settings.presets[settings.activePresetId];
}

function renderPresetSelect(root, settings) {
  const sel = root.querySelector("#abgm_preset_select");
  const nameInput = root.querySelector("#abgm_preset_name");
  if (!sel || !nameInput) return;

  sel.innerHTML = "";
  Object.values(settings.presets).forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name || p.id;
    if (p.id === settings.activePresetId) opt.selected = true;
    sel.appendChild(opt);
  });

  nameInput.value = getActivePreset(settings).name || "";
}

function renderDefaultSelect(root, settings) {
  const preset = getActivePreset(settings);
  const sel = root.querySelector("#abgm_default_select");
  if (!sel) return;

  sel.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "(none)";
  sel.appendChild(none);

  preset.bgms.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name || b.id;
    if (b.id === settings.defaultBgmId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderBgmTable(root, settings) {
  const preset = getActivePreset(settings);
  const tbody = root.querySelector("#abgm_bgm_tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  preset.bgms.forEach((b) => {
    const tr = document.createElement("tr");
    tr.dataset.id = b.id;

    tr.innerHTML = `
      <td><input type="text" class="abgm_name" value="${escapeHtml(b.name ?? "")}" placeholder="BGM name"></td>
      <td><input type="text" class="abgm_keywords" value="${escapeHtml(b.keywords ?? "")}" placeholder="rain, storm..."></td>
      <td><input type="number" class="abgm_priority" value="${Number(b.priority ?? 0)}" step="1"></td>
      <td>
        <div class="abgm-volcell">
          <input type="range" class="abgm_vol" min="0" max="100" value="${Math.round((b.volume ?? 1) * 100)}">
          <small class="abgm_voltxt" style="opacity:.8; width:34px; text-align:right;">${Math.round((b.volume ?? 1) * 100)}</small>
        </div>
      </td>
      <td>
        <div class="menu_button abgm-iconbtn abgm_test" title="Test">
          <i class="fa-solid fa-play"></i>
        </div>
      </td>
      <td>
        <div class="menu_button abgm-iconbtn abgm_del" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rerenderAll(root, settings) {
  renderPresetSelect(root, settings);
  renderDefaultSelect(root, settings);
  renderBgmTable(root, settings);
}

function initModal(overlay) {
  const settings = ensureSettings();
  const root = overlay; // overlay 내부에서 query

  // 상단 옵션
  const kw = root.querySelector("#abgm_keywordMode");
  const gv = root.querySelector("#abgm_globalVol");
  const gvText = root.querySelector("#abgm_globalVolText");
  const useDef = root.querySelector("#abgm_useDefault");

  if (kw) kw.checked = !!settings.keywordMode;
  if (gv) gv.value = String(Math.round((settings.globalVolume ?? 0.7) * 100));
  if (gvText) gvText.textContent = gv?.value ?? "70";
  if (useDef) useDef.checked = !!settings.useDefault;

  kw?.addEventListener("change", (e) => {
    settings.keywordMode = !!e.target.checked;
    saveSettingsDebounced();
  });

  gv?.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    settings.globalVolume = Math.max(0, Math.min(1, v / 100));
    if (gvText) gvText.textContent = String(v);
    saveSettingsDebounced();
  });

  useDef?.addEventListener("change", (e) => {
    settings.useDefault = !!e.target.checked;
    saveSettingsDebounced();
  });

  // 프리셋 선택
  const presetSel = root.querySelector("#abgm_preset_select");
  presetSel?.addEventListener("change", (e) => {
    settings.activePresetId = e.target.value;
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // 프리셋 추가/삭제/이름변경
  root.querySelector("#abgm_preset_add")?.addEventListener("click", () => {
    const id = uid();
    settings.presets[id] = { id, name: "New Preset", bgms: [] };
    settings.activePresetId = id;
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  root.querySelector("#abgm_preset_del")?.addEventListener("click", () => {
    const keys = Object.keys(settings.presets);
    if (keys.length <= 1) return; // 마지막은 삭제 금지
    delete settings.presets[settings.activePresetId];
    settings.activePresetId = Object.keys(settings.presets)[0];
    settings.defaultBgmId = "";
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  root.querySelector("#abgm_preset_rename")?.addEventListener("click", () => {
    const name = root.querySelector("#abgm_preset_name")?.value?.trim();
    if (!name) return;
    getActivePreset(settings).name = name;
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // BGM 추가 (mp3 → dataURL로 저장)
  const fileInput = root.querySelector("#abgm_bgm_file");
  root.querySelector("#abgm_bgm_add")?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

    const preset = getActivePreset(settings);
    const id = uid();
    preset.bgms.push({
      id,
      name: file.name.replace(/\.(mp3)$/i, ""),
      dataUrl,
      keywords: "",
      priority: 0,
      volume: 1.0,
    });

    // default 없으면 자동 지정
    if (!settings.defaultBgmId) settings.defaultBgmId = id;

    e.target.value = "";
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // Default select
  root.querySelector("#abgm_default_select")?.addEventListener("change", (e) => {
    settings.defaultBgmId = e.target.value;
    saveSettingsDebounced();
  });

  // 테이블 이벤트 위임
  root.querySelector("#abgm_bgm_tbody")?.addEventListener("input", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;

    const preset = getActivePreset(settings);
    const bgm = preset.bgms.find((x) => x.id === id);
    if (!bgm) return;

    if (e.target.classList.contains("abgm_name")) bgm.name = e.target.value;
    if (e.target.classList.contains("abgm_keywords")) bgm.keywords = e.target.value;
    if (e.target.classList.contains("abgm_priority")) bgm.priority = Number(e.target.value || 0);

    if (e.target.classList.contains("abgm_vol")) {
      const v = Number(e.target.value || 100);
      bgm.volume = Math.max(0, Math.min(1, v / 100));
      const t = tr.querySelector(".abgm_voltxt");
      if (t) t.textContent = String(v);
    }

    saveSettingsDebounced();
    renderDefaultSelect(root, settings);
  });

  // 버튼 클릭 (테스트/삭제)
  const testAudio = new Audio();
  root.querySelector("#abgm_bgm_tbody")?.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;

    const preset = getActivePreset(settings);
    const bgm = preset.bgms.find((x) => x.id === id);
    if (!bgm) return;

    if (e.target.closest(".abgm_del")) {
      preset.bgms = preset.bgms.filter((x) => x.id !== id);
      if (settings.defaultBgmId === id) settings.defaultBgmId = preset.bgms[0]?.id ?? "";
      saveSettingsDebounced();
      rerenderAll(root, settings);
      return;
    }

    if (e.target.closest(".abgm_test")) {
      testAudio.pause();
      testAudio.currentTime = 0;
      testAudio.src = bgm.dataUrl || "";
      testAudio.volume = (settings.globalVolume ?? 0.7) * (bgm.volume ?? 1);
      testAudio.play().catch(() => {});
      return;
    }
  });

  // Import/Export
  const importFile = root.querySelector("#abgm_import_file");
  root.querySelector("#abgm_import")?.addEventListener("click", () => importFile?.click());

  importFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 아주 느슨하게 병합
      if (data?.presets) extension_settings[SETTINGS_KEY] = data;
      ensureSettings();

      saveSettingsDebounced();
      rerenderAll(root, ensureSettings());
    } catch (err) {
      console.error("[AutoBGM] import failed", err);
    } finally {
      e.target.value = "";
    }
  });

  root.querySelector("#abgm_export")?.addEventListener("click", () => {
    const s = ensureSettings();
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "autobgm_preset_export.json";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // 최초 렌더
  rerenderAll(root, settings);
}

// ===== Side menu mount =====
async function mount() {
  const host = document.querySelector("#extensions_settings");
  if (!host) return;
  if (document.getElementById("autobgm-root")) return;

  const settings = ensureSettings();

  let html;
  try {
    html = await loadHtml("templates/window.html");
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

  if (!enable || !openBtn) return;

  enable.checked = !!settings.enabled;
  enable.addEventListener("change", (e) => {
    settings.enabled = !!e.target.checked;
    saveSettingsDebounced();
  });

  openBtn.addEventListener("click", () => openModal());

  console.log("[AutoBGM] mounted OK");
}

function init() {
  mount();
  const obs = new MutationObserver(() => mount());
  obs.observe(document.body, { childList: true, subtree: true });
}

jQuery(() => init());
