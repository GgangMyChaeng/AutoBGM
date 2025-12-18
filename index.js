import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[AutoBGM] index.js loaded", import.meta.url);

const SETTINGS_KEY = "autobgm";
const MODAL_OVERLAY_ID = "abgm_modal_overlay";

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= {
    enabled: true,
    keywordMode: true,
    globalVolume: 0.7,
    useDefault: true,
    activePresetId: "default",
    presets: {
      default: {
        id: "default",
        name: "Default",
        defaultBgmKey: "",
        bgms: [],
      },
    },
  };

  const s = extension_settings[SETTINGS_KEY];

  // 구버전 호환: settings.defaultBgmId -> active preset의 defaultBgmId로 이동
  if (s.defaultBgmId && s.presets?.[s.activePresetId] && !s.presets[s.activePresetId].defaultBgmId) {
    s.presets[s.activePresetId].defaultBgmId = s.defaultBgmId;
    delete s.defaultBgmId;
  }

  // 안전장치
  if (!s.presets || Object.keys(s.presets).length === 0) {
    s.presets = {
      default: { id: "default", name: "Default", defaultBgmId: "", bgms: [] },
    };
    s.activePresetId = "default";
  }

  if (!s.presets[s.activePresetId]) {
    s.activePresetId = Object.keys(s.presets)[0];
  }

  // preset 스키마 보정
  Object.values(s.presets).forEach((p) => {
    p.defaultBgmId ??= "";
    p.bgms ??= [];
  });

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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    if (b.id === (preset.defaultBgmId ?? "")) opt.selected = true;
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

function rerenderAll(root, settings) {
  renderPresetSelect(root, settings);
  renderDefaultSelect(root, settings);
  renderBgmTable(root, settings);
}

// ===== Preset Import/Export (preset 단위) =====
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function exportPresetFile(preset) {
  return {
    type: "autobgm_preset",
    version: 1,
    exportedAt: new Date().toISOString(),
    preset: clone(preset),
  };
}

function rekeyPreset(preset) {
  const p = clone(preset);
  const oldToNew = new Map();

  p.id = uid();

  (p.bgms ?? []).forEach((b) => {
    const newId = uid();
    oldToNew.set(b.id, newId);
    b.id = newId;
  });

  if (p.defaultBgmId && oldToNew.has(p.defaultBgmId)) {
    p.defaultBgmId = oldToNew.get(p.defaultBgmId);
  } else if (p.bgms?.length) {
    p.defaultBgmId = p.bgms[0].id;
  } else {
    p.defaultBgmId = "";
  }

  p.name = (p.name && String(p.name).trim()) ? p.name : "Imported Preset";
  return p;
}

function pickPresetFromImportData(data) {
  if (data?.type === "autobgm_preset" && data?.preset) return data.preset;

  if (data?.presets && typeof data.presets === "object") {
    const pid =
      data.activePresetId && data.presets[data.activePresetId]
        ? data.activePresetId
        : Object.keys(data.presets)[0];
    return data.presets?.[pid] ?? null;
  }

  return null;
}

function initModal(overlay) {
  const settings = ensureSettings();
  const root = overlay;

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
    settings.presets[id] = { id, name: "New Preset", defaultBgmId: "", bgms: [] };
    settings.activePresetId = id;
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  root.querySelector("#abgm_preset_del")?.addEventListener("click", () => {
    const keys = Object.keys(settings.presets);
    if (keys.length <= 1) return;
    delete settings.presets[settings.activePresetId];
    settings.activePresetId = Object.keys(settings.presets)[0];
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

  // BGM 추가
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
  fileKey: file.name,
  keywords: "",
  priority: 0,
  volume: 1.0,
});

if (!preset.defaultBgmKey) preset.defaultBgmKey = file.name;

    e.target.value = "";
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // Default select
  root.querySelector("#abgm_default_select")?.addEventListener("change", (e) => {
    const preset = getActivePreset(settings);
    preset.defaultBgmKey = e.target.value;
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

  // 테스트/삭제
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
      if (preset.defaultBgmId === id) preset.defaultBgmId = preset.bgms[0]?.id ?? "";
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

  // Import/Export (preset 1개)
  const importFile = root.querySelector("#abgm_import_file");
  root.querySelector("#abgm_import")?.addEventListener("click", () => importFile?.click());

  importFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const incomingPresetRaw = pickPresetFromImportData(data);
      if (!incomingPresetRaw) return;

      const incomingPreset = rekeyPreset(incomingPresetRaw);

      const names = new Set(Object.values(settings.presets).map((p) => p.name));
      if (names.has(incomingPreset.name)) incomingPreset.name = `${incomingPreset.name} (imported)`;

      settings.presets[incomingPreset.id] = incomingPreset;
      settings.activePresetId = incomingPreset.id;

      saveSettingsDebounced();
      rerenderAll(root, settings);
    } catch (err) {
      console.error("[AutoBGM] import failed", err);
    } finally {
      e.target.value = "";
    }
  });

  root.querySelector("#abgm_export")?.addEventListener("click", () => {
    const preset = getActivePreset(settings);
    const out = exportPresetFile(preset);

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `autobgm_preset_${(preset.name || preset.id).replace(/[^\w\-]+/g, "_")}.json`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  rerenderAll(root, settings);
} // ✅ initModal 닫힘 (이거 없어서 니 확장 증발했음)

// ===== IndexedDB (Assets 저장) =====
const DB_NAME = "autobgm_db";
const DB_VER = 1;
const STORE_ASSETS = "assets"; // key: fileKey (예: "rain_01.mp3"), value: Blob

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readwrite");
    tx.objectStore(STORE_ASSETS).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readonly");
    const req = tx.objectStore(STORE_ASSETS).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, "readwrite");
    tx.objectStore(STORE_ASSETS).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ===== Assets 메타 (settings에 "목록"만 저장) =====
// settings.assets = { [fileKey]: { fileKey, label } }
function ensureAssetList(settings) {
  settings.assets ??= {};
  return settings.assets;
}

// ===== 재생할 때: Blob -> ObjectURL =====
async function playAsset(fileKey, volume01 = 1) {
  const blob = await idbGet(fileKey);
  if (!blob) {
    console.warn("[AutoBGM] missing asset:", fileKey);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.volume = volume01;
  a.onended = () => URL.revokeObjectURL(url);
  a.play().catch(() => URL.revokeObjectURL(url));
}

// ===== ZIP 로더: JSZip 필요 =====
async function ensureJSZipLoaded() {
  if (window.JSZip) return window.JSZip;

  // 확장 폴더에 vendor/jszip.min.js 넣는 방식 (추천)
  const s = document.createElement("script");
  s.src = new URL("vendor/jszip.min.js", import.meta.url);
  document.head.appendChild(s);

  await new Promise((resolve, reject) => {
    s.onload = resolve;
    s.onerror = reject;
  });

  return window.JSZip;
}

async function importZip(file, settings) {
  const JSZip = await ensureJSZipLoaded();
  const zip = await JSZip.loadAsync(file);

  const assets = ensureAssetList(settings);

  const entries = Object.values(zip.files)
    .filter(f => !f.dir && f.name.toLowerCase().endsWith(".mp3"));

  for (const entry of entries) {
    const blob = await entry.async("blob");
    const fileKey = entry.name.split("/").pop(); // "rain_01.mp3" 만 남김

    await idbPut(fileKey, blob);
    assets[fileKey] = { fileKey, label: fileKey.replace(/\.mp3$/i, "") };
  }
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
