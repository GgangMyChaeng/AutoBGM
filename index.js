import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

console.log("[AutoBGM] index.js loaded", import.meta.url);

const SETTINGS_KEY = "autobgm";
const MODAL_OVERLAY_ID = "abgm_modal_overlay";
let _abgmViewportHandler = null;

function fitModalToViewport(overlay) {
  const modal = overlay?.querySelector?.(".autobgm-modal");
  if (!modal) return;

  const vv = window.visualViewport;
  const hRaw = Math.max(vv?.height || 0, window.innerHeight || 0, 600);
  const maxH = Math.max(240, Math.floor(hRaw - 24));

  const setI = (k, v) => modal.style.setProperty(k, v, "important");

  // ✅ 좁은 폭에서도 무조건 화면 안
  setI("box-sizing", "border-box");
  setI("display", "block");
  setI("position", "relative");
  setI("width", "calc(100vw - 24px)");
  setI("max-width", "calc(100vw - 24px)");
  setI("min-width", "0");
  setI("margin", "12px");

  // ✅ 높이 강제 (CSS !important도 뚫음)
  setI("min-height", "240px");
  setI("height", `${maxH}px`);
  setI("max-height", `${maxH}px`);
  setI("overflow", "auto");

  setI("visibility", "visible");
  setI("opacity", "1");
  setI("transform", "none");

  setI("background", "rgba(20,20,20,.96)");
  setI("border", "1px solid rgba(255,255,255,.14)");
  setI("border-radius", "14px");
}

function getModalHost() {
  return (
    document.querySelector("#app") ||
    document.querySelector("#sillytavern") ||
    document.querySelector("main") ||
    document.body
  );
}

function fitModalToHost(overlay, host) {
  const modal = overlay?.querySelector?.(".autobgm-modal");
  if (!modal) return;

  const pad = 12;
  const vv = window.visualViewport;
  const vw = vv?.width || window.innerWidth;
  const vh = vv?.height || window.innerHeight;
  const w = Math.max(280, Math.floor(vw - pad * 2));
  const h = Math.max(240, Math.floor(vh - pad * 2));

  const setI = (k, v) => modal.style.setProperty(k, v, "important");

  setI("box-sizing", "border-box");
  setI("display", "block");
  setI("position", "relative");
  setI("width", `${w}px`);
  setI("max-width", `${w}px`);
  setI("min-width", "0");
  setI("margin", `${pad}px auto`);

  setI("min-height", "240px");
  setI("height", `${h}px`);
  setI("max-height", `${h}px`);
  setI("overflow", "auto");

  setI("visibility", "visible");
  setI("opacity", "1");
  setI("transform", "none");

  setI("background", "rgba(20,20,20,.96)");
  setI("border", "1px solid rgba(255,255,255,.14)");
  setI("border-radius", "14px");
}

/** ========= util ========= */
function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getActivePreset(settings) {
  return settings.presets[settings.activePresetId];
}

/** ========= IndexedDB Assets =========
 * key: fileKey (예: "neutral_01.mp3")
 * value: Blob(File)
 */
const DB_NAME = "autobgm_db";
const DB_VER = 1;
const STORE_ASSETS = "assets";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) db.createObjectStore(STORE_ASSETS);
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

/** settings.assets = { [fileKey]: { fileKey, label } } */
function ensureAssetList(settings) {
  settings.assets ??= {};
  return settings.assets;
}

/** ========= Template loader ========= */
async function loadHtml(relPath) {
  const url = new URL(relPath, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Template fetch failed: ${res.status} ${url}`);
  return await res.text();
}

/** ========= Settings schema + migration =========
 * preset.bgms[]: { id, fileKey, keywords, priority, volume }
 * preset.defaultBgmKey: "neutral_01.mp3"
 */
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
    assets: {},
    ui: { bgmSort: "added_asc" },
  };

  const s = extension_settings[SETTINGS_KEY];

  s.ui ??= { bgmSort: "added_asc" };
  s.ui.bgmSort ??= "added_asc";

  // 안전장치
  if (!s.presets || Object.keys(s.presets).length === 0) {
    s.presets = {
      default: { id: "default", name: "Default", defaultBgmKey: "", bgms: [] },
    };
    s.activePresetId = "default";
  }
  if (!s.presets[s.activePresetId]) s.activePresetId = Object.keys(s.presets)[0];

  ensureAssetList(s);

  // 프리셋/곡 스키마 보정 + 구버전 변환
  Object.values(s.presets).forEach((p) => {
    p.defaultBgmKey ??= "";
    p.bgms ??= [];

    // 구버전: preset.defaultBgmId가 있으면 -> defaultBgmKey로 변환
    if (p.defaultBgmId && !p.defaultBgmKey) {
      const hit = p.bgms.find((b) => b.id === p.defaultBgmId);
      if (hit?.fileKey) p.defaultBgmKey = hit.fileKey;
      else if (hit?.name) p.defaultBgmKey = `${hit.name}.mp3`;
      delete p.defaultBgmId;
    }

    // bgm들 fileKey 없으면 채워주기 (최소한 안 터지게)
    p.bgms.forEach((b) => {
      if (!b.fileKey) {
        if (b.name) b.fileKey = `${b.name}.mp3`;
        else b.fileKey = "";
      }
      b.keywords ??= "";
      b.priority ??= 0;
      b.volume ??= 1.0;
    });

    // default 비었으면 첫 곡 fileKey로
    if (!p.defaultBgmKey && p.bgms.length && p.bgms[0].fileKey) {
      p.defaultBgmKey = p.bgms[0].fileKey;
    }
  });

  // 구버전: settings.defaultBgmId 같은 전역 값 남아있으면 제거 (있어도 안 쓰게)
  if (s.defaultBgmId) delete s.defaultBgmId;

  return s;
}

/** ========= Legacy: dataUrl -> idb로 옮기기 (있으면 한번만) ========= */
let _legacyMigrated = false;
async function migrateLegacyDataUrlsToIDB(settings) {
  if (_legacyMigrated) return;
  _legacyMigrated = true;

  let changed = false;
  const assets = ensureAssetList(settings);

  for (const p of Object.values(settings.presets)) {
    for (const b of p.bgms) {
      if (b.dataUrl && b.fileKey) {
        try {
          const blob = await (await fetch(b.dataUrl)).blob();
          await idbPut(b.fileKey, blob);
          assets[b.fileKey] = { fileKey: b.fileKey, label: b.fileKey.replace(/\.mp3$/i, "") };
          delete b.dataUrl;
          changed = true;
        } catch (e) {
          console.warn("[AutoBGM] legacy dataUrl migrate failed:", b.fileKey, e);
        }
      }
    }
  }

  if (changed) saveSettingsDebounced();
}

/** ========= Audio player (test) ========= */
const _testAudio = new Audio();
let _testUrl = "";
async function playAsset(fileKey, volume01) {
  const blob = await idbGet(fileKey);
  if (!blob) {
    console.warn("[AutoBGM] missing asset:", fileKey);
    return;
  }

  if (_testUrl) URL.revokeObjectURL(_testUrl);
  _testUrl = URL.createObjectURL(blob);

  _testAudio.pause();
  _testAudio.currentTime = 0;
  _testAudio.src = _testUrl;
  _testAudio.volume = Math.max(0, Math.min(1, volume01));
  _testAudio.play().catch(() => {});
}

/** ========= ZIP (JSZip 필요) ========= */
async function ensureJSZipLoaded() {
  if (window.JSZip) return window.JSZip;

  // ✅ 너가 vendor/jszip.min.js를 확장 폴더에 넣으면 여기서 로드됨
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
  const importedKeys = [];

  const entries = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.toLowerCase().endsWith(".mp3")
  );

  for (const entry of entries) {
    const blob = await entry.async("blob");
    const fileKey = entry.name.split("/").pop(); // 폴더 제거

    await idbPut(fileKey, blob);
    assets[fileKey] = { fileKey, label: fileKey.replace(/\.mp3$/i, "") };
    importedKeys.push(fileKey);
  }

  saveSettingsDebounced();
  return importedKeys;
}

/** ========= Helpers: asset delete safely ========= */
function isFileKeyReferenced(settings, fileKey) {
  for (const p of Object.values(settings.presets)) {
    if (p.defaultBgmKey === fileKey) return true;
    if (p.bgms?.some((b) => b.fileKey === fileKey)) return true;
  }
  return false;
}

/** ========= Modal open/close ========= */
function closeModal() {
  const overlay = document.getElementById(MODAL_OVERLAY_ID);
  if (overlay) overlay.remove();
  document.body.classList.remove("autobgm-modal-open");
  window.removeEventListener("keydown", onEscClose);
  if (_abgmViewportHandler) {
  window.removeEventListener("resize", _abgmViewportHandler);
  window.visualViewport?.removeEventListener("resize", _abgmViewportHandler);
  window.visualViewport?.removeEventListener("scroll", _abgmViewportHandler);
  _abgmViewportHandler = null;
}
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

   // ✅ 모바일 WebView 강제 스타일 (CSS 씹는 경우 방지) — important 버전
const host = getModalHost();

// host가 static이면 absolute overlay가 제대로 안 잡힘
const cs = getComputedStyle(host);
if (cs.position === "static") host.style.position = "relative";

// overlay는 컨테이너 기준 absolute로
const setO = (k, v) => overlay.style.setProperty(k, v, "important");
setO("position", "absolute");
setO("inset", "0");
setO("display", "block");
setO("overflow", "auto");
setO("-webkit-overflow-scrolling", "touch");
setO("background", "rgba(0,0,0,.55)");
setO("z-index", "2147483647");
setO("padding", "0"); // modal이 margin/pad 갖고 있으니 overlay는 0

host.appendChild(overlay);

// ✅ 컨테이너 기준으로 사이징
fitModalToHost(overlay, host);
requestAnimationFrame(() => fitModalToHost(overlay, host));
setTimeout(() => fitModalToHost(overlay, host), 120);

// ✅ 키보드/주소창 변화 대응 (visualViewport)
_abgmViewportHandler = () => {
  // 키보드 올라왔다 내려올 때 width/height가 바뀜
  fitModalToHost(overlay, host);
};

// ✅ 키보드 내려갈 때 resize 이벤트가 안 오기도 해서, 포커스 빠질 때 강제 재계산
const kickFit = () => {
  _abgmViewportHandler?.();
  setTimeout(() => _abgmViewportHandler?.(), 60);
  setTimeout(() => _abgmViewportHandler?.(), 240);
};

overlay.addEventListener("focusout", kickFit, true);
overlay.addEventListener("touchend", kickFit, { passive: true });
overlay.addEventListener("pointerup", kickFit, { passive: true });

// window resize도 유지
window.addEventListener("resize", _abgmViewportHandler);

// visualViewport가 있으면 더 정확히
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", _abgmViewportHandler);
  window.visualViewport.addEventListener("scroll", _abgmViewportHandler); // ✅ 중요: 키보드 올라오면 scroll도 같이 변함
}

  document.body.classList.add("autobgm-modal-open");
  window.addEventListener("keydown", onEscClose);

  const closeBtn = overlay.querySelector("#abgm_modal_close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  initModal(overlay);

  console.log("[AutoBGM] modal opened");
}

/** ========= UI render ========= */
function getBgmSort(settings) {
  return settings?.ui?.bgmSort ?? "added_asc";
}

function getSortedBgms(preset, sort) {
  const arr = [...(preset?.bgms ?? [])];
  const mode = sort || "added_asc";

  if (mode === "added_desc") return arr.reverse();

  if (mode === "name_asc" || mode === "name_desc") {
    arr.sort((a, b) =>
      String(a?.fileKey ?? "").localeCompare(String(b?.fileKey ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    if (mode === "name_desc") arr.reverse();
    return arr;
  }

  return arr; // added_asc
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

  const list = getSortedBgms(preset, getBgmSort(settings));
  list.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b.fileKey || "";
    opt.textContent = b.fileKey || "(missing fileKey)";
    if (opt.value && opt.value === (preset.defaultBgmKey ?? "")) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderBgmTable(root, settings) {
  const preset = getActivePreset(settings);
  const tbody = root.querySelector("#abgm_bgm_tbody");
  if (!tbody) return;

  const selected = root?.__abgmSelected instanceof Set ? root.__abgmSelected : new Set();
  root.__abgmSelected = selected;

  const expanded = root?.__abgmExpanded instanceof Set ? root.__abgmExpanded : new Set();
  root.__abgmExpanded = expanded;

  const list = getSortedBgms(preset, getBgmSort(settings));

  tbody.innerHTML = "";

  list.forEach((b) => {
    const isOpen = expanded.has(b.id);

    // ===== summary row (collapsed) =====
    const tr = document.createElement("tr");
    tr.dataset.id = b.id;
    tr.className = `abgm-bgm-summary${isOpen ? " abgm-expanded" : ""}`;
    tr.innerHTML = `
      <td class="abgm-col-check">
        <input type="checkbox" class="abgm_sel" ${selected.has(b.id) ? "checked" : ""}>
      </td>
      <td>
        <input type="text" class="abgm_name" value="${escapeHtml(b.fileKey ?? "")}" placeholder="neutral_01.mp3">
      </td>
      <td>
        <div class="menu_button abgm-iconbtn abgm_test" title="Play">
          <i class="fa-solid fa-play"></i>
        </div>
      </td>
      <td>
        <div class="menu_button abgm-iconbtn abgm_toggle" title="More">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </td>
    `;

    // ===== detail row (expanded) =====
    const tr2 = document.createElement("tr");
    tr2.dataset.id = b.id;
    tr2.className = "abgm-bgm-detail";
    if (!isOpen) tr2.style.display = "none";

    const vol100 = Math.round((b.volume ?? 1) * 100);
    tr2.innerHTML = `
      <td colspan="4">
        <div class="abgm-detail-wrap">
          <div class="abgm-field">
            <small>Keywords</small>
            <input type="text" class="abgm_keywords" value="${escapeHtml(b.keywords ?? "")}" placeholder="rain, storm...">
          </div>

          <div class="abgm-field" style="max-width:140px;">
            <small>Priority</small>
            <input type="number" class="abgm_priority" value="${Number(b.priority ?? 0)}" step="1">
          </div>

          <div class="abgm-field">
            <small>Volume</small>
            <div class="abgm-volcell">
              <input type="range" class="abgm_vol" min="0" max="100" value="${vol100}">
              <input type="number" class="abgm_volnum" min="0" max="100" step="1" value="${vol100}">
            </div>
          </div>

          <div class="abgm-detail-actions">
            <div class="menu_button abgm_del" title="Delete">
              <i class="fa-solid fa-trash"></i> Delete
            </div>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
    tbody.appendChild(tr2);
  });
}

function rerenderAll(root, settings) {
  renderPresetSelect(root, settings);
  renderDefaultSelect(root, settings);
  renderBgmTable(root, settings);

  // ✅ 이건 “함수 안”에 있어야 함
  if (typeof root?.__abgmUpdateSelectionUI === "function") {
    root.__abgmUpdateSelectionUI();
  }
}

/** ========= Preset Import/Export (preset 단위 / 파일은 포함 안 함) ========= */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// export는 "룰만" 보냄 (dataUrl 없음)
function exportPresetFile(preset) {
  const clean = {
    id: preset.id,
    name: preset.name,
    defaultBgmKey: preset.defaultBgmKey ?? "",
    bgms: (preset.bgms ?? []).map((b) => ({
      id: b.id,
      fileKey: b.fileKey ?? "",
      keywords: b.keywords ?? "",
      priority: Number(b.priority ?? 0),
      volume: Number(b.volume ?? 1),
    })),
  };

  return {
    type: "autobgm_preset",
    version: 2,
    exportedAt: new Date().toISOString(),
    preset: clean,
  };
}

function rekeyPreset(preset) {
  const p = clone(preset);

  p.id = uid();
  p.name = (p.name && String(p.name).trim()) ? p.name : "Imported Preset";
  p.defaultBgmKey ??= "";

  p.bgms = (p.bgms ?? []).map((b) => ({
    id: uid(),
    fileKey: b.fileKey ?? "",
    keywords: b.keywords ?? "",
    priority: Number(b.priority ?? 0),
    volume: Number(b.volume ?? 1),
  }));

  if (!p.defaultBgmKey && p.bgms.length && p.bgms[0].fileKey) {
    p.defaultBgmKey = p.bgms[0].fileKey;
  }

  return p;
}

function pickPresetFromImportData(data) {
  if (data?.type === "autobgm_preset" && data?.preset) return data.preset;

  // (구형 전체 설정 파일) 들어오면 activePreset 하나만 뽑아서 import
  if (data?.presets && typeof data.presets === "object") {
    const pid =
      data.activePresetId && data.presets[data.activePresetId]
        ? data.activePresetId
        : Object.keys(data.presets)[0];

    return data.presets?.[pid] ?? null;
  }

  return null;
}

/** ========= Modal logic ========= */
function initModal(overlay) {
  const settings = ensureSettings();
  const root = overlay;
  root.__abgmSelected = new Set();
  root.__abgmExpanded = new Set();

const updateSelectionUI = () => {
  const preset = getActivePreset(settings);
  const list = getSortedBgms(preset, getBgmSort(settings));
  const selected = root.__abgmSelected;

  const countEl = root.querySelector("#abgm_selected_count");
  if (countEl) countEl.textContent = `${selected.size} selected`;

  const allChk = root.querySelector("#abgm_sel_all");
  if (allChk) {
    const total = list.length;
    const checked = list.filter((b) => selected.has(b.id)).length;
    allChk.checked = total > 0 && checked === total;
    allChk.indeterminate = checked > 0 && checked < total;
  }
};
root.__abgmUpdateSelectionUI = updateSelectionUI;

  // ===== 선택/정렬 UI 이벤트 (updateSelectionUI 만든 직후에 넣기) =====
const sortSel = root.querySelector("#abgm_sort");
if (sortSel) {
  sortSel.value = getBgmSort(settings);
  sortSel.addEventListener("change", (e) => {
    settings.ui.bgmSort = e.target.value;
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });
}

// select all
root.querySelector("#abgm_sel_all")?.addEventListener("change", (e) => {
  const preset = getActivePreset(settings);
  const list = getSortedBgms(preset, getBgmSort(settings));
  const selected = root.__abgmSelected;

  if (e.target.checked) list.forEach((b) => selected.add(b.id));
  else selected.clear();

  rerenderAll(root, settings);
});

// row checkbox
root.querySelector("#abgm_bgm_tbody")?.addEventListener("change", (e) => {
  if (!e.target.classList?.contains("abgm_sel")) return;
  const tr = e.target.closest("tr");
  if (!tr) return;

  const id = tr.dataset.id;
  if (e.target.checked) root.__abgmSelected.add(id);
  else root.__abgmSelected.delete(id);

  updateSelectionUI();
});

// bulk delete
root.querySelector("#abgm_delete_selected")?.addEventListener("click", async () => {

  const names = [];
for (const id of selected) {
  const bgm = preset.bgms.find((x) => x.id === id);
  if (bgm?.fileKey) names.push(bgm.fileKey);
}
const preview = names.slice(0, 6).map((x) => `- ${x}`).join("\n");
const more = names.length > 6 ? `\n...외 ${names.length - 6}개` : "";
if (!confirm(`선택한 ${names.length}개 BGM 삭제?\n${preview}${more}`)) return;

  const selected = root.__abgmSelected;
  if (!selected.size) return;

  const preset = getActivePreset(settings);
  const idsToDelete = new Set(selected);
  const removedKeys = [];

  for (const id of idsToDelete) {
    const bgm = preset.bgms.find((x) => x.id === id);
    if (bgm?.fileKey) removedKeys.push(bgm.fileKey);
  }

  preset.bgms = preset.bgms.filter((x) => !idsToDelete.has(x.id));

  if (preset.defaultBgmKey && !preset.bgms.some((b) => b.fileKey === preset.defaultBgmKey)) {
    preset.defaultBgmKey = preset.bgms[0]?.fileKey ?? "";
  }

  selected.clear();

  for (const fk of removedKeys) {
    if (!fk) continue;
    if (isFileKeyReferenced(settings, fk)) continue;
    try { await idbDel(fk); delete settings.assets[fk]; } catch {}
  }

  saveSettingsDebounced();
  rerenderAll(root, settings);
});
  
  // 구버전 dataUrl 있으면 IndexedDB로 옮김 (있어도 한번만)
  migrateLegacyDataUrlsToIDB(settings);

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

  // 프리셋 선택: 선택목록 초기화까지
root.querySelector("#abgm_preset_select")?.addEventListener("change", (e) => {
  settings.activePresetId = e.target.value;
  root.__abgmSelected.clear();
  saveSettingsDebounced();
  rerenderAll(root, settings);
});

  // 프리셋 추가/삭제/이름변경
  root.querySelector("#abgm_preset_add")?.addEventListener("click", () => {
    const id = uid();
    settings.presets[id] = { id, name: "New Preset", defaultBgmKey: "", bgms: [] };
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

  // ===== MP3 추가 (Assets 저장 + 현재 프리셋에 룰 row 추가) =====
  const mp3Input = root.querySelector("#abgm_bgm_file");
  root.querySelector("#abgm_bgm_add")?.addEventListener("click", () => mp3Input?.click());

  mp3Input?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preset = getActivePreset(settings);
    const fileKey = file.name;

    // asset 저장
    await idbPut(fileKey, file);
    const assets = ensureAssetList(settings);
    assets[fileKey] = { fileKey, label: fileKey.replace(/\.mp3$/i, "") };

    // 룰 row 없으면 추가
    const exists = preset.bgms.some((b) => b.fileKey === fileKey);
    if (!exists) {
      preset.bgms.push({
        id: uid(),
        fileKey,
        keywords: "",
        priority: 0,
        volume: 1.0,
      });
    }

    if (!preset.defaultBgmKey) preset.defaultBgmKey = fileKey;

    e.target.value = "";
    saveSettingsDebounced();
    rerenderAll(root, settings);

    if (e.target.classList.contains("abgm_vol")) {
  const v = Math.max(0, Math.min(100, Number(e.target.value || 100)));
  bgm.volume = v / 100;

  const n = tr.querySelector(".abgm_volnum");
  if (n) n.value = String(v);
}

if (e.target.classList.contains("abgm_volnum")) {
  const v = Math.max(0, Math.min(100, Number(e.target.value || 100)));
  bgm.volume = v / 100;

  const r = tr.querySelector(".abgm_vol");
  if (r) r.value = String(v);
}
  });

  // ===== ZIP 추가 (Assets 저장 + 현재 프리셋에 row 자동 생성) =====
  const zipInput = root.querySelector("#abgm_zip_file");
  root.querySelector("#abgm_zip_add")?.addEventListener("click", () => zipInput?.click());

  zipInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedKeys = await importZip(file, settings);
      const preset = getActivePreset(settings);

      // 룰 row 자동 생성 (이미 있으면 스킵)
      for (const fk of importedKeys) {
        if (!preset.bgms.some((b) => b.fileKey === fk)) {
          preset.bgms.push({
            id: uid(),
            fileKey: fk,
            keywords: "",
            priority: 0,
            volume: 1.0,
          });
        }
      }

      if (!preset.defaultBgmKey && preset.bgms.length && preset.bgms[0].fileKey) {
        preset.defaultBgmKey = preset.bgms[0].fileKey;
      }

      saveSettingsDebounced();
      rerenderAll(root, settings);
    } catch (err) {
      console.error("[AutoBGM] zip import failed:", err);
      console.warn("[AutoBGM] vendor/jszip.min.js 없으면 zip 안 됨");
    } finally {
      e.target.value = "";
    }
  });

  // Default select (fileKey로 저장)
  root.querySelector("#abgm_default_select")?.addEventListener("change", (e) => {
    const preset = getActivePreset(settings);
    preset.defaultBgmKey = e.target.value;
    saveSettingsDebounced();
  });

  // 테이블 input 이벤트 (fileKey/keywords/priority/volume)
  root.querySelector("#abgm_bgm_tbody")?.addEventListener("input", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    const id = tr.dataset.id;
    const preset = getActivePreset(settings);
    const bgm = preset.bgms.find((x) => x.id === id);
    if (!bgm) return;

    // 첫 컬럼(abgm_name)을 fileKey로 씀
    if (e.target.classList.contains("abgm_name")) {
      const oldKey = bgm.fileKey;
      const newKey = String(e.target.value || "").trim();

      bgm.fileKey = newKey;

      // default가 이 곡이었다면 같이 따라가게
      if (preset.defaultBgmKey === oldKey) preset.defaultBgmKey = newKey;
    }

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

// 테스트/삭제 + 접기/펼치기
root.querySelector("#abgm_bgm_tbody")?.addEventListener("click", async (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;

  // ✅ 접기/펼치기 (tr 선언 이후에 해야 함)
  if (e.target.closest(".abgm_toggle")) {
    // toggle은 summary row에만 있으니까 summary를 정확히 잡자
    const summary = tr.classList.contains("abgm-bgm-summary") ? tr : tr.closest("tr.abgm-bgm-summary");
    if (!summary) return;

    const id = summary.dataset.id;
    const open = !root.__abgmExpanded.has(id);

    if (open) root.__abgmExpanded.add(id);
    else root.__abgmExpanded.delete(id);

    const detail = summary.nextElementSibling;

    summary.classList.toggle("abgm-expanded", open);

    if (detail?.classList?.contains("abgm-bgm-detail")) {
      detail.style.display = open ? "" : "none";
    } else {
      // 혹시 DOM이 꼬였으면 안전하게 리렌더
      rerenderAll(root, settings);
    }
    return;
  }

  // 여기부터는 공통 처리 (id/bgm 찾기)
  const id = tr.dataset.id;
  const preset = getActivePreset(settings);
  const bgm = preset.bgms.find((x) => x.id === id);
  if (!bgm) return;

  // 삭제
  if (e.target.closest(".abgm_del")) {
    const fk = bgm.fileKey || "(unknown)";
    if (!confirm(`"${fk}" 삭제?`)) return;

    root.__abgmSelected?.delete(id);
    const fileKey = bgm.fileKey;

    preset.bgms = preset.bgms.filter((x) => x.id !== id);

    if (preset.defaultBgmKey === fileKey) {
      preset.defaultBgmKey = preset.bgms[0]?.fileKey ?? "";
    }

    if (fileKey && !isFileKeyReferenced(settings, fileKey)) {
      try {
        await idbDel(fileKey);
        delete settings.assets[fileKey];
      } catch {}
    }

    saveSettingsDebounced();
    rerenderAll(root, settings);
    return;
  }

  // 재생
  if (e.target.closest(".abgm_test")) {
    const vol = (settings.globalVolume ?? 0.7) * (bgm.volume ?? 1);
    await playAsset(bgm.fileKey, vol);
    return;
  }
});

  // Import/Export (preset 1개: 룰만)
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
  
  overlay.addEventListener("focusin", () => {
  // 키보드 뜨기 직전에 한번, 뜬 뒤에 한번
  requestAnimationFrame(() => fitModalToHost(overlay, getModalHost()));
  setTimeout(() => fitModalToHost(overlay, getModalHost()), 120);
});


  rerenderAll(root, settings);
}

/** ========= Side menu mount ========= */
async function mount() {
  const host = document.querySelector("#extensions_settings");
  if (!host) return;

  // ✅ 이미 붙었으면 끝
  if (document.getElementById("autobgm-root")) return;

  // ✅ mount 레이스 방지 (핵심)
  if (window.__AUTOBGM_MOUNTING__) return;
  window.__AUTOBGM_MOUNTING__ = true;

  try {
    const settings = ensureSettings();

    let html;
    try {
      html = await loadHtml("templates/window.html");
    } catch (e) {
      console.error("[AutoBGM] window.html load failed", e);
      return;
    }

    // 혹시 레이스로 여기 도달 전에 다른 mount가 붙였으면 종료
    if (document.getElementById("autobgm-root")) return;

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
  } finally {
    window.__AUTOBGM_MOUNTING__ = false;
  }
}

function init() {
  // ✅ 중복 로드/실행 방지 (메뉴 2개 뜨는 거 방지)
  if (window.__AUTOBGM_BOOTED__) return;
  window.__AUTOBGM_BOOTED__ = true;

  mount();
  const obs = new MutationObserver(() => mount());
  obs.observe(document.body, { childList: true, subtree: true });
}

jQuery(() => init());
