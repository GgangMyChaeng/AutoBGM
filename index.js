/*
  AutoBGM (SillyTavern Extension)
  - Dynamic dependency resolver so it works in both layouts:
    /scripts/extensions/<ext>/...
    /scripts/extensions/third-party/<ext>/...
*/
let extension_settings;
let saveSettingsDebounced;
let __abgmDebugLine = ""; // 키워드 모드 디버깅
let __abgmDebugMode = false;
let _engineLastPresetId = "";

async function __abgmResolveDeps() {
  const base = import.meta.url;

  const tryImport = async (rel) => {
    try {
      return await import(new URL(rel, base));
    } catch (e) {
      return null;
    }
  };

  const extMod =
    (await tryImport("../../../extensions.js")) ||
    (await tryImport("../../extensions.js"));

  if (!extMod?.extension_settings) {
    throw new Error("[AutoBGM] Failed to import extension_settings (extensions.js path mismatch)");
  }
  extension_settings = extMod.extension_settings;

  const scriptMod =
    (await tryImport("../../../../script.js")) ||
    (await tryImport("../../../script.js"));

  if (!scriptMod?.saveSettingsDebounced) {
    throw new Error("[AutoBGM] Failed to import saveSettingsDebounced (script.js path mismatch)");
  }
  saveSettingsDebounced = scriptMod.saveSettingsDebounced;
}

const SETTINGS_KEY = "autobgm";
const MODAL_OVERLAY_ID = "abgm_modal_overlay";
const EXT_BIND_KEY = "autobgm_binding";

function getSTContextSafe() {
  try {
    if (window.SillyTavern?.getContext) return window.SillyTavern.getContext();
  } catch {}
  try {
    if (typeof getContext === "function") return getContext();
  } catch {}
  return null;
}

function getBoundPresetIdFromContext(ctx) {
  try {
    const cid = ctx?.characterId;
    const chars = ctx?.characters;
    if (cid === undefined || cid === null) return "";
    const ch = chars?.[cid];
    const pid = ch?.data?.extensions?.[EXT_BIND_KEY]?.presetId;
    return pid ? String(pid) : "";
  } catch {
    return "";
  }
}

let _abgmViewportHandler = null;

function fitModalToViewport(overlay) {
  const modal = overlay?.querySelector?.(".autobgm-modal");
  if (!modal) return;

  const vv = window.visualViewport;
  const hRaw = Math.max(vv?.height || 0, window.innerHeight || 0, 600);
  const maxH = Math.max(240, Math.floor(hRaw - 24));

  const setI = (k, v) => modal.style.setProperty(k, v, "important");

  // 좁은 폭에서도 무조건 화면 안
  setI("box-sizing", "border-box");
  setI("display", "block");
  setI("position", "relative");
  setI("width", "calc(100vw - 24px)");
  setI("max-width", "calc(100vw - 24px)");
  setI("min-width", "0");
  setI("margin", "12px");

  // 높이 강제 (CSS !important도 뚫음)
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

  const vv = window.visualViewport;
  const vw = vv?.width || window.innerWidth;
  const vh = vv?.height || window.innerHeight;

  // PC만 여백/최대폭 제한
  const isPc = vw >= 900;
  const pad = isPc ? 18 : 12;          // PC는 살짝 더 여유
  const maxWDesktop = 860;              // <-- 여기 숫자 줄이면 더 콤팩트

  const wRaw = Math.max(280, Math.floor(vw - pad * 2));
  const w = isPc ? Math.min(maxWDesktop, wRaw) : wRaw;

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

/** ========= 삭제 확인 및 취소 ========= */
function abgmConfirm(containerOrDoc, message, {
  title = "Confirm",
  okText = "확인",
  cancelText = "취소",
} = {}) {
  const doc = containerOrDoc?.ownerDocument || document;

  // overlay(=root) 같은 엘리먼트가 들어오면 거기에 붙임
  const container =
    containerOrDoc && containerOrDoc.nodeType === 1 ? containerOrDoc : doc.body;

  return new Promise((resolve) => {
    const wrap = doc.createElement("div");
    wrap.className = "abgm-confirm-wrap";

    // overlay 안에 붙일 때는 absolute 센터링 모드
    if (container !== doc.body) wrap.classList.add("abgm-confirm-in-modal");

    wrap.innerHTML = `
      <div class="abgm-confirm-backdrop"></div>
      <div class="abgm-confirm" role="dialog" aria-modal="true">
        <div class="abgm-confirm-title">${escapeHtml(title)}</div>
        <div class="abgm-confirm-msg">${escapeHtml(message)}</div>
        <div class="abgm-confirm-actions">
          <button class="menu_button abgm-confirm-ok" type="button">${escapeHtml(okText)}</button>
          <button class="menu_button abgm-confirm-cancel" type="button">${escapeHtml(cancelText)}</button>
        </div>
      </div>
    `;

    const done = (v) => {
      doc.removeEventListener("keydown", onKey);
      wrap.remove();
      resolve(v);
    };

    wrap.querySelector(".abgm-confirm-backdrop")?.addEventListener("click", () => done(false));
    wrap.querySelector(".abgm-confirm-cancel")?.addEventListener("click", () => done(false));
    wrap.querySelector(".abgm-confirm-ok")?.addEventListener("click", () => done(true));

    const onKey = (e) => { if (e.key === "Escape") done(false); };
    doc.addEventListener("keydown", onKey);

    container.appendChild(wrap);
  });
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
 * preset.bgms[]: { id, fileKey, keywords, priority, volume, volLocked }
 * preset.defaultBgmKey: "neutral_01.mp3"
 */
function ensureSettings() {
  extension_settings[SETTINGS_KEY] ??= {
    enabled: true,
    keywordMode: true,
    debugMode: false,
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
    chatStates: {},
    ui: { bgmSort: "added_asc" },
  };

  const s = extension_settings[SETTINGS_KEY];
  ensureEngineFields(s);

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
  s.chatStates ??= {};
  s.debugMode ??= false;
  __abgmDebugMode = !!s.debugMode;

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

    // bgm들 스키마 보정
    p.bgms.forEach((b) => {
      b.id ??= uid();
      if (!b.fileKey) {
        if (b.name) b.fileKey = `${b.name}.mp3`;
        else b.fileKey = "";
      }
      b.keywords ??= "";
      b.priority ??= 0;
      b.volume ??= 1.0;
      b.volLocked ??= false;
    });
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

  /** ========= Runtime Audio Engine ========= */
const _bgmAudio = new Audio();
let _bgmUrl = "";
let _engineTimer = null;
let _engineLastChatKey = "";
let _engineCurrentFileKey = "";
let _engineCurrentPresetId = "";


// ===== Now Playing UI =====
let _abgmNowPlayingBound = false;

function _abgmSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text ?? "");
}

function updateNowPlayingUI() {
  try {
    // 표시할 파일명/상태
    const fk = String(_engineCurrentFileKey || "");
    const state = !fk ? "Stopped" : (_bgmAudio?.paused ? "Paused" : "Playing");

    const settings = ensureSettings?.() || {};
    // preset명 / 모드
    const preset = settings?.presets?.[settings?.activePresetId] || Object.values(settings?.presets || {})[0] || {};
    const presetName = preset?.name || "Preset";
    const modeLabel = settings?.keywordMode ? "Keyword" : (settings?.playMode || "manual");
    const meta = `${modeLabel} · ${presetName}` + (__abgmDebugMode && __abgmDebugLine ? ` · ${__abgmDebugLine}` : ""); // +부터 키워드 모드 디버깅

    // drawer
    _abgmSetText("autobgm_now_title", fk || "(none)");
    _abgmSetText("autobgm_now_state", state);
    _abgmSetText("autobgm_now_meta", meta);

    // modal
    _abgmSetText("abgm_now_title", fk || "(none)");
    _abgmSetText("abgm_now_state", state);
    _abgmSetText("abgm_now_meta", meta);
  } catch (e) {
    // ignore
  }
}

function bindNowPlayingEventsOnce() {
  if (_abgmNowPlayingBound) return;
  _abgmNowPlayingBound = true;

  try {
    _bgmAudio.addEventListener("play", updateNowPlayingUI);
    _bgmAudio.addEventListener("pause", updateNowPlayingUI);
    _bgmAudio.addEventListener("ended", updateNowPlayingUI);
    _bgmAudio.addEventListener("error", updateNowPlayingUI);
  } catch {}
}

// playmode: manual | random | loop_one | loop_list
function ensureEngineFields(settings) {
  settings.playMode ??= "manual";
  settings.chatStates ??= {};     // { [chatKey]: { currentKey, listIndex } }
  settings.presetBindings ??= {}; // (나중에 캐릭-프리셋 매칭용)
}

function clamp01(x) {
  x = Number(x);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function stopRuntime() {
  try { _bgmAudio.pause(); } catch {}
  _bgmAudio.currentTime = 0;
  if (_bgmUrl) URL.revokeObjectURL(_bgmUrl);
  _bgmUrl = "";
  _bgmAudio.src = "";
  _engineCurrentFileKey = "";
  _engineCurrentPresetId = "";
  updateNowPlayingUI();

}

function getChatKeyFromContext(ctx) {
  // ST 버전차 대비 (대충이라도 안정적으로)
  const chatId = ctx?.chatId ?? ctx?.chat_id ?? ctx?.chat?.id ?? "global";
  const char = ctx?.characterId ?? ctx?.character_id ?? ctx?.character?.id ?? ctx?.name2 ?? "";
  return `${chatId}::${char}`;
}

// Ai 컨텍스트 제발 돼라 ㅅㅂ
function getLastAssistantText(ctx) {
  try {
    // 1) ctx에서 먼저 시도
    let chat = (ctx && (ctx.chat || ctx.messages)) || null;

    // 2) 그래도 없으면 SillyTavern 객체/함수에서 시도
    if (!Array.isArray(chat) || chat.length === 0) {
      try {
        const st = window.SillyTavern || window?.parent?.SillyTavern;
        const gc = st && typeof st.getContext === "function" ? st.getContext() : null;
        chat = (gc && (gc.chat || gc.messages)) || chat;
      } catch {}
    }

    // 3) 그래도 없으면 (가능하면) window.chat 시도
    if (!Array.isArray(chat) || chat.length === 0) {
      if (Array.isArray(window.chat)) chat = window.chat;
    }

    // 4) 배열이 있으면 거기서 마지막 assistant 찾기
    if (Array.isArray(chat) && chat.length) {
      for (let i = chat.length - 1; i >= 0; i--) {
        const m = chat[i] || {};
        if (m.is_user === true) continue;

        const role = String(m.role || m.sender || "").toLowerCase();
        if (role === "user") continue;

        const text = (m.content ?? m.mes ?? m.message ?? m.text ?? "");
        if (typeof text === "string" && text.trim()) return text;
      }
    }

    // 5) 최후의 수단: DOM에서 마지막 assistant 메시지 긁기
    // (ST UI 구조가 바뀌어도 최대한 버티도록 넓게 잡음)
    const root =
      document.querySelector("#chat") ||
      document.querySelector("#chat_content") ||
      document.querySelector("main") ||
      document.body;

    if (root) {
      const nodes = Array.from(root.querySelectorAll(".mes, .message, .chat_message"));
      for (let i = nodes.length - 1; i >= 0; i--) {
        const el = nodes[i];
        if (!el) continue;

        // 유저 메시지로 보이는 것들 최대한 스킵
        const cls = el.classList;
        if (cls && (cls.contains("is_user") || cls.contains("user") || cls.contains("from_user"))) continue;

        // 메시지 텍스트 후보
        const textEl =
          el.querySelector(".mes_text, .message_text, .text, .content, .mes_content") || el;

        const txt = (textEl.innerText || textEl.textContent || "").trim();
        if (txt) return txt;
      }
    }
  } catch {}

  return "";
}

// 키워드 구분 (쉼표, 띄어쓰기)
function parseKeywords(s) {
  return String(s ?? "")
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// 우선도에 따른 곡 선정 로직
function pickByKeyword(preset, text, preferKey = "") {
  const t = String(text ?? "").toLowerCase();
  if (!t) return null;

  let bestPri = -Infinity;
  let candidates = [];

  for (const b of preset.bgms ?? []) {
    const fk = String(b.fileKey ?? "");
    if (!fk) continue;

    const kws = parseKeywords(b.keywords);
    if (!kws.length) continue;

    const hit = kws.some((kw) => t.includes(kw.toLowerCase()));
    if (!hit) continue;

    const pri = Number(b.priority ?? 0);

    if (pri > bestPri) {
      bestPri = pri;
      candidates = [b];
    } else if (pri === bestPri) {
      candidates.push(b);
    }
  }

  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  // 현재 곡이 동률 후보 중 하나면 그 곡 유지(틱마다 바뀌는거 방지)
  if (preferKey) {
    const keep = candidates.find((x) => String(x.fileKey ?? "") === String(preferKey));
    if (keep) return keep;
  }

  // 그 외엔 랜덤
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getSortedKeys(preset, sort) {
  return getSortedBgms(preset, sort)
    .map((b) => String(b.fileKey ?? ""))
    .filter(Boolean);
}

function pickRandomKey(keys, avoid = "") {
  const arr = (keys ?? []).filter(Boolean);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];

  const pool = arr.filter((k) => k !== avoid);
  const pickFrom = pool.length ? pool : arr;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

function findBgmByKey(preset, fileKey) {
  return (preset.bgms ?? []).find((b) => String(b.fileKey ?? "") === String(fileKey ?? ""));
}

async function ensurePlayFile(fileKey, vol01, loop) {
  const fk = String(fileKey ?? "");
  if (!fk) return false;

  const blob = await idbGet(fk);
  if (!blob) return false;

  if (_bgmUrl) URL.revokeObjectURL(_bgmUrl);
  _bgmUrl = URL.createObjectURL(blob);

  _bgmAudio.loop = !!loop;
  _bgmAudio.src = _bgmUrl;
  _bgmAudio.volume = clamp01(vol01);

  try {
    await _bgmAudio.play();
  } catch {}

  _engineCurrentFileKey = fk;
  updateNowPlayingUI();
  return true;
}

// ===== Entry Name helpers =====
function basenameNoExt(fileKey = "") {
  const s = String(fileKey || "");
  const base = s.split("/").pop() || s;
  return base.replace(/\.[^/.]+$/, ""); // 확장자 제거
}

function getEntryName(bgm) {
  const n = String(bgm?.name ?? "").trim();
  return n ? n : basenameNoExt(bgm?.fileKey ?? "");
}

function ensureBgmNames(preset) {
  for (const b of preset?.bgms ?? []) {
    if (!String(b?.name ?? "").trim()) {
      b.name = basenameNoExt(b.fileKey);
    }
  }
}

/** ========= ZIP (JSZip 필요) ========= */
async function ensureJSZipLoaded() {
  if (window.JSZip) return window.JSZip;

  // vendor/jszip.min.js를 확장 폴더에 넣으면 여기서 로드됨
  const s = document.createElement("script");
  s.src = new URL("vendor/jszip.min.js", import.meta.url).toString();
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
  updateNowPlayingUI();

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

   // 모바일 WebView 강제 스타일 (CSS 씹는 경우 방지) — important 버전
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

// 컨테이너 기준으로 사이징
fitModalToHost(overlay, host);
requestAnimationFrame(() => fitModalToHost(overlay, host));
setTimeout(() => fitModalToHost(overlay, host), 120);

// 키보드/주소창 변화 대응 (visualViewport)
_abgmViewportHandler = () => {
  // 키보드 올라왔다 내려올 때 width/height가 바뀜
  fitModalToHost(overlay, host);
};

// 키보드 내려갈 때 resize 이벤트가 안 오기도 해서, 포커스 빠질 때 강제 재계산
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
  window.visualViewport.addEventListener("scroll", _abgmViewportHandler); // 중요: 키보드 올라오면 scroll도 같이 변함
}

  document.body.classList.add("autobgm-modal-open");
  window.addEventListener("keydown", onEscClose);

  const closeBtn = overlay.querySelector("#abgm_modal_close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  initModal(overlay);
  bindNowPlayingEventsOnce();
  updateNowPlayingUI();

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
    getEntryName(a).localeCompare(
      getEntryName(b),
      undefined,
      { numeric: true, sensitivity: "base" }
    )
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

  const cur = String(preset.defaultBgmKey ?? "");
  const list = getSortedBgms(preset, getBgmSort(settings));
  const keys = list.map((b) => String(b.fileKey ?? "")).filter(Boolean);

  sel.innerHTML = "";

  // (none)
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "(none)";
  sel.appendChild(none);

  // 현재 default가 룰 목록에 없으면(=missing) 옵션을 하나 만들어서 고정 유지
  if (cur && !keys.includes(cur)) {
    const miss = document.createElement("option");
    miss.value = cur;
    miss.textContent = `${cur} (missing rule)`;
    sel.appendChild(miss);
  }

  // rules
  for (const fk of keys) {
    const opt = document.createElement("option");
    opt.value = fk;
    opt.textContent = fk;
    sel.appendChild(opt);
  }

  // value로 고정 (selected 속성보다 이게 안전)
  sel.value = cur;
}

function renderBgmTable(root, settings) {
  const preset = getActivePreset(settings);
  const tbody = root.querySelector("#abgm_bgm_tbody");
  if (!tbody) return;

  ensureBgmNames(preset);

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
      <td class="abgm-filecell">
      <input type="text" class="abgm_name" value="${escapeHtml(getEntryName(b))}" placeholder="Entry name">
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
    const locked = !!b.volLocked;

// index.js (renderBgmTable 안 tr2.innerHTML 부분에서 abgm-detail-grid 통째로 교체)

tr2.innerHTML = `
  <td colspan="4">
    <div class="abgm-detail-grid abgm-detail-v3">

      <!-- Row 1: Keywords / Priority -->
      <div class="abgm-kwh">
        <small>Keywords</small>
      </div>

      <div class="abgm-prih">
        <small>Priority</small>
        <input type="number" class="abgm_priority abgm_narrow" value="${Number(b.priority ?? 0)}" step="1">
      </div>

      <!-- Row 2: Keywords input / Volume -->
      <div class="abgm-kwbox">
        <textarea
          class="abgm_keywords"
          placeholder="rain, storm..."
        >${escapeHtml(b.keywords ?? "")}</textarea>
      </div>

      <div class="abgm-volbox">
        <small>Volume</small>
        <div class="abgm-volcell">
          <input type="range" class="abgm_vol" min="0" max="100" value="${vol100}" ${locked ? "disabled" : ""}>
          <input type="number" class="abgm_volnum" min="0" max="100" step="1" value="${vol100}">
          <div class="menu_button abgm-iconbtn abgm_vol_lock" title="Lock slider">
            <i class="fa-solid ${locked ? "fa-lock" : "fa-lock-open"}"></i>
          </div>
        </div>
      </div>

      <!-- Row 3: Source (ONLY under Keywords column) -->
      <div class="abgm-srcbox">
        <small>Source</small>
        <input
          type="text"
          class="abgm_source"
          value="${escapeHtml(b.fileKey ?? "")}"
          placeholder="neutral_01.mp3 or https://..."
        >
      </div>

      <!-- Delete (right, spans rows) -->
      <div class="abgm-detail-actions">
        <div class="menu_button abgm_del" title="Delete">
          <i class="fa-solid fa-trash"></i> <span class="abgm-del-label">Delete</span>
        </div>
      </div>

    </div>
  </td>
`;

  // Entry name change
const nameInput = tr.querySelector(".abgm_name");
if (nameInput) {
  nameInput.addEventListener("change", () => {
    b.name = nameInput.value.trim();
    saveSettingsDebounced();
  });
}
    
    tbody.appendChild(tr);
    tbody.appendChild(tr2);
  });
}

function setPlayButtonsLocked(root, locked) {
  root?.querySelectorAll?.(".abgm_test")?.forEach((btn) => {
    btn.classList.toggle("abgm-test-locked", !!locked);
    btn.setAttribute("aria-disabled", locked ? "true" : "false");
    btn.title = locked ? "Disabled in Keyword Mode" : "Play";
  });
}

function rerenderAll(root, settings) {
  renderPresetSelect(root, settings);
  renderDefaultSelect(root, settings);
  renderBgmTable(root, settings);

  // 이건 “함수 안”에 있어야 함
  if (typeof root?.__abgmUpdateSelectionUI === "function") {
    root.__abgmUpdateSelectionUI();
  }
  // KeywordMode 상태에 따라 Play 버튼 잠금/해제
  setPlayButtonsLocked(root, !!settings.keywordMode);
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
      name: b.name ?? "", // ✅ 엔트리 이름 저장
      keywords: b.keywords ?? "",
      priority: Number(b.priority ?? 0),
      volume: Number(b.volume ?? 1),
      volLocked: !!b.volLocked,
    })),
  };

  return {
    type: "autobgm_preset",
    version: 3,
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
    name: b.name ?? "", // 엔트리 이름 복원
    keywords: b.keywords ?? "",
    priority: Number(b.priority ?? 0),
    volume: Number(b.volume ?? 1),
    volLocked: !!b.volLocked,
  }));

  if (!p.defaultBgmKey && p.bgms.length && p.bgms[0].fileKey) {
    p.defaultBgmKey = p.bgms[0].fileKey;
  }

  return p;
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

  // 구버전 dataUrl 있으면 IndexedDB로 옮김 (있어도 한번만)
  migrateLegacyDataUrlsToIDB(settings);

  // ===== 상단 옵션 =====
  const kw = root.querySelector("#abgm_keywordMode");
  const dbg = root.querySelector("#abgm_debugMode");
  const pm = root.querySelector("#abgm_playMode");
  const gv = root.querySelector("#abgm_globalVol");
  const gvText = root.querySelector("#abgm_globalVolText");
  const useDef = root.querySelector("#abgm_useDefault");

  if (kw) kw.checked = !!settings.keywordMode;
  if (dbg) dbg.checked = !!settings.debugMode;
  __abgmDebugMode = !!settings.debugMode;

  if (pm) {
    pm.value = settings.playMode ?? "manual";
    pm.disabled = !!settings.keywordMode;

    pm.addEventListener("change", (e) => {
      settings.playMode = e.target.value;
      saveSettingsDebounced();
    });
  }

  if (kw) {
    kw.addEventListener("change", (e) => {
      settings.keywordMode = !!e.target.checked;
      if (pm) pm.disabled = !!settings.keywordMode;
      // KeywordMode 상태에 따라 Play 버튼 잠금/해제
      setPlayButtonsLocked(root, !!settings.keywordMode);
      saveSettingsDebounced();
    });
  }

  if (dbg) {
    dbg.addEventListener("change", (e) => {
      settings.debugMode = !!e.target.checked;
      __abgmDebugMode = !!settings.debugMode;
      if (!__abgmDebugMode) __abgmDebugLine = "";
      saveSettingsDebounced();
      updateNowPlayingUI();
    });
  }

  if (gv) gv.value = String(Math.round((settings.globalVolume ?? 0.7) * 100));
  if (gvText) gvText.textContent = gv?.value ?? "70";

  gv?.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    settings.globalVolume = Math.max(0, Math.min(1, v / 100));
    if (gvText) gvText.textContent = String(v);
    saveSettingsDebounced();
    engineTick();
  });

  if (useDef) useDef.checked = !!settings.useDefault;
  useDef?.addEventListener("change", (e) => {
    settings.useDefault = !!e.target.checked;
    saveSettingsDebounced();
  });

  const bgmHelpBtn = root.querySelector("#abgm_bgm_help_toggle");
  const bgmHelpBox = root.querySelector("#abgm_bgm_help");
  
  bgmHelpBtn?.addEventListener("click", () => {
  if (!bgmHelpBox) return;
  const on = bgmHelpBox.style.display !== "none";
  bgmHelpBox.style.display = on ? "none" : "block";
});

  // ===== Sort =====
  const sortSel = root.querySelector("#abgm_sort");
  if (sortSel) {
    sortSel.value = getBgmSort(settings);
    sortSel.addEventListener("change", (e) => {
      settings.ui.bgmSort = e.target.value;
      saveSettingsDebounced();
      rerenderAll(root, settings);
    });
  }

  // ===== select all =====
  root.querySelector("#abgm_sel_all")?.addEventListener("change", (e) => {
    const preset = getActivePreset(settings);
    const list = getSortedBgms(preset, getBgmSort(settings));
    const selected = root.__abgmSelected;

    if (e.target.checked) list.forEach((b) => selected.add(b.id));
    else selected.clear();

    rerenderAll(root, settings);
  });

  // ===== row checkbox =====
  root.querySelector("#abgm_bgm_tbody")?.addEventListener("change", (e) => {
    if (!e.target.classList?.contains("abgm_sel")) return;
    const tr = e.target.closest("tr");
    if (!tr) return;

    const id = tr.dataset.id;
    if (e.target.checked) root.__abgmSelected.add(id);
    else root.__abgmSelected.delete(id);

    updateSelectionUI();
  });

  // ===== bulk delete =====
  root.querySelector("#abgm_delete_selected")?.addEventListener("click", async () => {
    const selected = root.__abgmSelected;
    if (!selected.size) return;

    const preset = getActivePreset(settings);

    const names = [];
    for (const id of selected) {
      const bgm = preset.bgms.find((x) => x.id === id);
      if (bgm?.fileKey) names.push(bgm.fileKey);
    }

    const preview = names.slice(0, 6).map((x) => `- ${x}`).join("\n");
    const more = names.length > 6 ? `\n...외 ${names.length - 6}개` : "";
    const ok = await abgmConfirm(root, `선택한 ${names.length}개 BGM 삭제?\n${preview}${more}`, {
      title: "Delete selected",
      okText: "확인",
      cancelText: "취소",
    });
    if (!ok) return;

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

  // ===== Expand/Collapse all =====
  root.querySelector("#abgm_expand_all")?.addEventListener("click", () => {
    const preset = getActivePreset(settings);
    const list = getSortedBgms(preset, getBgmSort(settings));
    list.forEach((b) => root.__abgmExpanded.add(b.id));
    rerenderAll(root, settings);
  });

  root.querySelector("#abgm_collapse_all")?.addEventListener("click", () => {
    root.__abgmExpanded.clear();
    rerenderAll(root, settings);
  });

  // ===== lock all volume sliders =====
  root.querySelector("#abgm_lock_all_vol")?.addEventListener("click", () => {
    const preset = getActivePreset(settings);
    (preset.bgms ?? []).forEach((b) => { b.volLocked = true; });
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // ===== preset select =====
  root.querySelector("#abgm_preset_select")?.addEventListener("change", (e) => {
    settings.activePresetId = e.target.value;
    root.__abgmSelected.clear();
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // ===== preset add/del/rename =====
  root.querySelector("#abgm_preset_add")?.addEventListener("click", () => {
    const id = uid();
    settings.presets[id] = { id, name: "New Preset", defaultBgmKey: "", bgms: [] };
    settings.activePresetId = id;
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  root.querySelector("#abgm_preset_del")?.addEventListener("click", async () => {
    const keys = Object.keys(settings.presets);
    if (keys.length <= 1) return;

    const cur = getActivePreset(settings);
    const name = cur?.name || cur?.id || "Preset";

    const ok = await abgmConfirm(root, `"${name}" 프리셋 삭제?`, {
      title: "Delete preset",
      okText: "삭제",
      cancelText: "취소",
    });
    if (!ok) return;

    delete settings.presets[settings.activePresetId];
    settings.activePresetId = Object.keys(settings.presets)[0];

    root.__abgmSelected?.clear?.();
    root.__abgmExpanded?.clear?.();

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

    // ===== Preset Binding UI (bind preset to character cards) =====
  const bindOpen = root.querySelector("#abgm_bind_open");
  const bindOverlay = root.querySelector("#abgm_bind_overlay");
  const bindClose = root.querySelector("#abgm_bind_close");
  const bindList = root.querySelector("#abgm_bind_list");
  const bindTitle = root.querySelector("#abgm_bind_title");
  const bindSub = root.querySelector("#abgm_bind_sub");

  const hideBindOverlay = () => {
    if (bindOverlay) bindOverlay.style.display = "none";
  };

  const renderBindOverlay = async () => {
    if (!bindList) return;

    const settingsNow = ensureSettings();
    const preset = getActivePreset(settingsNow);
    const presetId = String(preset?.id ?? "");
    const presetName = String(preset?.name ?? presetId);

    if (bindTitle) bindTitle.textContent = `Bind Preset → Characters`;
    if (bindSub) bindSub.textContent = `"${presetName}" 프리셋을 연결할 캐릭터를 선택`;

    const ctx = getSTContextSafe();
    const chars = ctx?.characters;
    const writeExtensionField = ctx?.writeExtensionField;

    bindList.innerHTML = "";

    if (!chars || !Array.isArray(chars) || typeof writeExtensionField !== "function") {
      const p = document.createElement("div");
      p.style.opacity = ".8";
      p.style.fontSize = "12px";
      p.style.padding = "10px";
      p.textContent = "SillyTavern 컨텍스트를 못 불러옴 (getContext/writeExtensionField 없음)";
      bindList.appendChild(p);
      return;
    }

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (!ch) continue;

      const name =
        String(ch.name ?? ch?.data?.name ?? ch?.data?.first_mes ?? `Character #${i}`).trim() || `Character #${i}`;

      const boundId = String(ch?.data?.extensions?.[EXT_BIND_KEY]?.presetId ?? "");
      const boundName = boundId && settingsNow.presets?.[boundId] ? String(settingsNow.presets[boundId].name ?? boundId) : (boundId || "");

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.padding = "8px 10px";
      row.style.border = "1px solid rgba(255,255,255,.12)";
      row.style.borderRadius = "10px";
      row.style.background = "rgba(0,0,0,.18)";

      const mainBtn = document.createElement("button");
      mainBtn.type = "button";
      mainBtn.className = "menu_button";
      mainBtn.style.flex = "1";
      mainBtn.style.textAlign = "left";
      mainBtn.style.whiteSpace = "nowrap";
      mainBtn.style.overflow = "hidden";
      mainBtn.style.textOverflow = "ellipsis";
      mainBtn.textContent = boundId ? `${name}  ·  (Bound: ${boundName || boundId})` : `${name}  ·  (Not bound)`;

      mainBtn.addEventListener("click", async () => {
        try {
          await writeExtensionField(i, EXT_BIND_KEY, { presetId, presetName, at: Date.now() });
        } catch (e) {
          console.error("[AutoBGM] bind failed", e);
        }
        await renderBindOverlay();
        try { engineTick(); } catch {}
      });

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "menu_button";
      clearBtn.textContent = "Unbind";
      clearBtn.style.flex = "0 0 auto";
      clearBtn.style.opacity = boundId ? "1" : ".5";
      clearBtn.disabled = !boundId;

      clearBtn.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        try {
          await writeExtensionField(i, EXT_BIND_KEY, null);
        } catch {
          try { await writeExtensionField(i, EXT_BIND_KEY, {}); } catch {}
        }
        await renderBindOverlay();
        try { engineTick(); } catch {}
      });

      row.appendChild(mainBtn);
      row.appendChild(clearBtn);
      bindList.appendChild(row);
    }
  };

  const showBindOverlay = async () => {
    if (!bindOverlay) return;
    bindOverlay.style.display = "flex";
    await renderBindOverlay();
  };

  bindOpen?.addEventListener("click", showBindOverlay);
  bindClose?.addEventListener("click", hideBindOverlay);
  bindOverlay?.addEventListener("click", (e) => {
    if (e.target === bindOverlay) hideBindOverlay();
  });

// ===== MP3 add =====
  const mp3Input = root.querySelector("#abgm_bgm_file");
  root.querySelector("#abgm_bgm_add")?.addEventListener("click", () => mp3Input?.click());

  mp3Input?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preset = getActivePreset(settings);
    const fileKey = file.name;

    await idbPut(fileKey, file);
    const assets = ensureAssetList(settings);
    assets[fileKey] = { fileKey, label: fileKey.replace(/\.mp3$/i, "") };

    const exists = preset.bgms.some((b) => b.fileKey === fileKey);
    if (!exists) {
      preset.bgms.push({
        id: uid(),
        fileKey,
        name: basenameNoExt(fileKey),
        keywords: "",
        priority: 0,
        volume: 1.0,
        volLocked: false,
      });
    }

    if (!preset.defaultBgmKey) preset.defaultBgmKey = fileKey;

    e.target.value = "";
    saveSettingsDebounced();
    rerenderAll(root, settings);
  });

  // ===== ZIP add =====
  const zipInput = root.querySelector("#abgm_zip_file");
  root.querySelector("#abgm_zip_add")?.addEventListener("click", () => zipInput?.click());

  zipInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedKeys = await importZip(file, settings);
      const preset = getActivePreset(settings);

      for (const fk of importedKeys) {
        if (!preset.bgms.some((b) => b.fileKey === fk)) {
          preset.bgms.push({
            id: uid(),
            fileKey: fk,
            name: basenameNoExt(fileKey),
            keywords: "",
            priority: 0,
            volume: 1.0,
            volLocked: false,
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

  // ===== default select =====
  root.querySelector("#abgm_default_select")?.addEventListener("change", (e) => {
    const preset = getActivePreset(settings);
    preset.defaultBgmKey = e.target.value;
    saveSettingsDebounced();
  });

  // ===== tbody input =====
  root.querySelector("#abgm_bgm_tbody")?.addEventListener("input", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    const id = tr.dataset.id;
    const preset = getActivePreset(settings);
    const bgm = preset.bgms.find((x) => x.id === id);
    if (!bgm) return;

    if (e.target.classList.contains("abgm_keywords")) bgm.keywords = e.target.value;
    if (e.target.classList.contains("abgm_priority")) bgm.priority = Number(e.target.value || 0);

    const detailRow = tr.classList.contains("abgm-bgm-detail") ? tr : tr.closest("tr.abgm-bgm-detail") || tr;

    if (e.target.classList.contains("abgm_vol")) {
      if (bgm.volLocked) return;
      const v = Math.max(0, Math.min(100, Number(e.target.value || 100)));
      bgm.volume = v / 100;
      engineTick();
      const n = detailRow.querySelector(".abgm_volnum");
      if (n) n.value = String(v);
    }

    if (e.target.classList.contains("abgm_volnum")) {
      const v = Math.max(0, Math.min(100, Number(e.target.value || 100)));
      bgm.volume = v / 100;
      engineTick();
      if (!bgm.volLocked) {
        const r = detailRow.querySelector(".abgm_vol");
        if (r) r.value = String(v);
      }
    }

    if (e.target.classList.contains("abgm_source")) {
  const oldKey = bgm.fileKey;
  const newKey = String(e.target.value || "").trim();

  bgm.fileKey = newKey;

  // default가 이 곡을 가리키고 있었다면 같이 갱신
  if (preset.defaultBgmKey === oldKey) {
    preset.defaultBgmKey = newKey;
  }

  saveSettingsDebounced();
  renderDefaultSelect(root, settings);
  return;
}

    saveSettingsDebounced();
  });

  // ===== tbody click (toggle/lock/del/test) =====
  root.querySelector("#abgm_bgm_tbody")?.addEventListener("click", async (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    // toggle
    if (e.target.closest(".abgm_toggle")) {
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
        rerenderAll(root, settings);
      }
      return;
    }

    // id/bgm
    const id = tr.dataset.id;
    const preset = getActivePreset(settings);
    const bgm = preset.bgms.find((x) => x.id === id);
    if (!bgm) return;

    // lock volume
    if (e.target.closest(".abgm_vol_lock")) {
      bgm.volLocked = !bgm.volLocked;

      const detailRow = tr.classList.contains("abgm-bgm-detail") ? tr : tr.closest("tr.abgm-bgm-detail") || tr;
      const range = detailRow.querySelector(".abgm_vol");
      const icon = detailRow.querySelector(".abgm_vol_lock i");

      if (range) range.disabled = !!bgm.volLocked;
      if (icon) icon.className = `fa-solid ${bgm.volLocked ? "fa-lock" : "fa-lock-open"}`;

      saveSettingsDebounced();
      return;
    }

    // delete
    if (e.target.closest(".abgm_del")) {
      const fk = bgm.fileKey || "(unknown)";
      const ok = await abgmConfirm(root, `"${fk}" 삭제?`, {
        title: "Delete",
        okText: "확인",
        cancelText: "취소",
      });
      if (!ok) return;

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

    // test / runtime play
    if (e.target.closest(".abgm_test")) {
      if (settings.keywordMode) return; // 키워드 모드에서는 개별 재생 금지

      settings.playMode = "manual";
      if (pm) { pm.value = "manual"; pm.disabled = false; }

      const ctx = getSTContextSafe();
      const chatKey = getChatKeyFromContext(ctx);
      settings.chatStates ??= {};
      settings.chatStates[chatKey] ??= { currentKey: "", listIndex: 0 };
      settings.chatStates[chatKey].currentKey = bgm.fileKey;

      saveSettingsDebounced();
      return;
    }
  });

  // ===== Import/Export (preset 1개: 룰만) =====
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
    a.download = `${(String(preset.name || preset.id || "Preset").trim() || "Preset")
      .replace(/[\\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/[._-]+$/g, "")}_AutoBGM.json`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // 프리셋 헬프
  const presetHelpBtn = root.querySelector("#abgm_preset_help_toggle");
  const presetHelpBox = root.querySelector("#abgm_preset_help");
  presetHelpBtn?.addEventListener("click", () => {
  if (!presetHelpBox) return;
  const on = presetHelpBox.style.display !== "none";
  presetHelpBox.style.display = on ? "none" : "block";
});


  // 키보드/주소창 변화 대응
  overlay.addEventListener("focusin", () => {
    requestAnimationFrame(() => fitModalToHost(overlay, getModalHost()));
    setTimeout(() => fitModalToHost(overlay, getModalHost()), 120);
  });

  rerenderAll(root, settings);
}

/** ========= Side menu mount ========= */
async function mount() {
  const host = document.querySelector("#extensions_settings");
  if (!host) return;

  // 이미 붙었으면 끝
  if (document.getElementById("autobgm-root")) return;

  // mount 레이스 방지 (핵심)
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

    const helpBtn = root.querySelector("#autobgm_help_toggle");
    const helpText = root.querySelector("#autobgm_help_text");
    
    const enabledBtn = root.querySelector("#autobgm_enabled_btn");
    const enabledState = root.querySelector("#autobgm_enabled_state");
    const enabledIcon = root.querySelector("#autobgm_enabled_icon");
    const openBtn = root.querySelector("#autobgm_open");
    if (!enabledBtn || !enabledState || !openBtn) return;
    
    const syncEnabledUI = () => {
      const on = !!settings.enabled;
      enabledState.textContent = on ? "On" : "Off";
      
      if (enabledIcon) {
    // on/off 아이콘 바꾸기 (원하면 다른 아이콘 써도 됨)
    enabledIcon.classList.toggle("fa-toggle-off", !on);
    enabledIcon.classList.toggle("fa-toggle-on", on);
  }
};
    
    syncEnabledUI();
    
    enabledBtn.addEventListener("click", () => {
      settings.enabled = !settings.enabled;
      saveSettingsDebounced();
      syncEnabledUI();
      try { engineTick(); } catch {}
    });
    
    helpBtn?.addEventListener("click", () => {
      if (!helpText) return;
      const on = helpText.style.display !== "none";
      helpText.style.display = on ? "none" : "block";
    });
    
    openBtn.addEventListener("click", () => openModal());

    bindNowPlayingEventsOnce();
    updateNowPlayingUI();

    console.log("[AutoBGM] mounted OK");
  } finally {
    window.__AUTOBGM_MOUNTING__ = false;
  }
}

function init() {
  // 중복 로드/실행 방지 (메뉴 2개 뜨는 거 방지)
  if (window.__AUTOBGM_BOOTED__) return;
  window.__AUTOBGM_BOOTED__ = true;

  mount();
  startEngine();
  const obs = new MutationObserver(() => mount());
  obs.observe(document.body, { childList: true, subtree: true });
}

/** ========= 엔진틱 ========= */
  function engineTick() {
  const settings = ensureSettings();
  ensureEngineFields(settings);

  if (!settings.enabled) {
    stopRuntime();
    return;
  }

  // ST 컨텍스트 (없어도 global로 굴러가게)
  const ctx = getSTContextSafe();
  const chatKey = getChatKeyFromContext(ctx);

  settings.chatStates[chatKey] ??= { currentKey: "", listIndex: 0 };
  const st = settings.chatStates[chatKey];

  // ====== Character Binding (card extensions) ======
  // 캐릭 단일 채팅에서: 캐릭 카드(data.extensions)에 저장된 프리셋 종속이 있으면 그걸 강제 적용
  const boundPresetId = getBoundPresetIdFromContext(ctx);
  if (boundPresetId && settings.presets?.[boundPresetId] && String(settings.activePresetId) !== String(boundPresetId)) {
    settings.activePresetId = boundPresetId;
    try { saveSettingsDebounced?.(); } catch {}
  }


  // 채팅 바뀌면: 이전 곡은 끄고, 새 채팅 규칙으로 다시 판단
  if (_engineLastChatKey && _engineLastChatKey !== chatKey) {
    stopRuntime();
  }
  _engineLastChatKey = chatKey;

  // preset 선택(지금은 activePresetId 기준. 나중에 캐릭 매칭 끼우면 여기서 바꾸면 됨)
  let preset = settings.presets?.[settings.activePresetId];
  if (!preset) preset = Object.values(settings.presets ?? {})[0];
  if (!preset) return;

  _engineCurrentPresetId = preset.id;
    
 // 프리셋이 바뀌면: 이전곡 유지값/런타임 키 전부 초기화
if (_engineLastPresetId && _engineLastPresetId !== String(preset.id)) {
  // 재생 멈추기
  stopRuntime();

  // "이전곡 유지" 방지용: 채팅 상태 초기화
  st.currentKey = "";
  st.listIndex = 0;

  // Now Playing/엔진 상태도 초기화
  _engineCurrentFileKey = "";
}
_engineLastPresetId = String(preset.id);

  const sort = getBgmSort(settings);
  const keys = getSortedKeys(preset, sort);
  const lastAsst = getLastAssistantText(ctx);
  const as = String(lastAsst ?? "");
  if (__abgmDebugMode) {
    __abgmDebugLine = `asstLen:${as.length} ${as.slice(0, 18).replace(/\s+/g, " ")}`;
    try { updateNowPlayingUI(); } catch {}
  }
  const useDefault = !!settings.useDefault;
  const defKey = String(preset.defaultBgmKey ?? "");

  // 현재 곡 볼륨 계산용
  const getVol = (fk) => {
    const b = findBgmByKey(preset, fk);
    return clamp01((settings.globalVolume ?? 0.7) * (b?.volume ?? 1));
  };

 // ====== Keyword Mode ON ======
if (settings.keywordMode) {
  const prefer = st.currentKey || _engineCurrentFileKey || "";

  // 1) 먼저 매칭 계산(디버그 모드가 절대 로직에 영향 주면 안 됨)
  const hit = pickByKeyword(preset, lastAsst, prefer);
  const hitKey = hit?.fileKey ? String(hit.fileKey) : "";

  const desired = hitKey
    ? hitKey
    : (useDefault && defKey ? defKey : "");

  // 2) 디버그는 "출력만" 한다 (변수/흐름 수정 금지)
if (__abgmDebugMode) {
  const tLower = String(lastAsst ?? "").toLowerCase();

  // 최종 결정 곡(= 지금 틀 곡)
  const finalKey = desired || "";

// 걸린 키워드 목록(모든 BGM 전체에서 스캔, 중복 제거)
let kwList = [];
const seen = new Set();

for (const b of (preset.bgms ?? [])) {
  const kws = parseKeywords(b.keywords);
  for (const kw of kws) {
    const k = String(kw ?? "").trim();
    if (!k) continue;

    const kLower = k.toLowerCase();
    if (tLower.includes(kLower) && !seen.has(kLower)) {
      seen.add(kLower);
      kwList.push(k);
    }
  }
}

const kwText = kwList.length ? kwList.join(", ") : "none";

  __abgmDebugLine = `asstLen:${as.length} kw:${kwText} hit:${finalKey || "none"}`;
  try { updateNowPlayingUI(); } catch {}
}

  // 3) 키워드 히트 or default 있으면 그걸 무한 유지
  if (desired) {
    st.currentKey = desired;

    if (_engineCurrentFileKey !== desired) {
      // UI 즉시 반영용: 먼저 키를 갱신
      _engineCurrentFileKey = desired;
      ensurePlayFile(desired, getVol(desired), true);
      try { updateNowPlayingUI(); } catch {}
    } else {
      _bgmAudio.loop = true;
      _bgmAudio.volume = getVol(desired);
    }
    return;
  }

  // 4) default도 없고 키워드도 없으면: 이전곡 유지(무한)
  if (st.currentKey) {
    if (_engineCurrentFileKey !== st.currentKey) {
      _engineCurrentFileKey = st.currentKey;
      ensurePlayFile(st.currentKey, getVol(st.currentKey), true);
      try { updateNowPlayingUI(); } catch {}
    } else {
      _bgmAudio.loop = true;
      _bgmAudio.volume = getVol(st.currentKey);
    }
  }
  return;
}

  // ====== Keyword Mode OFF ======
  const mode = settings.playMode ?? "manual";

  // manual: 자동재생 안 함 (유저가 누른 곡만)
  if (mode === "manual") {
    if (st.currentKey) {
      // manual은 루프 안 함 (원하면 loop_one으로 바꾸면 됨)
      if (_engineCurrentFileKey !== st.currentKey) {
        ensurePlayFile(st.currentKey, getVol(st.currentKey), false);
      } else {
        _bgmAudio.loop = false;
        _bgmAudio.volume = getVol(st.currentKey);
      }
    }
    return;
  }

  // loop_one: currentKey 없으면 default -> 첫곡
  if (mode === "loop_one") {
    const fk = st.currentKey || defKey || keys[0] || "";
    if (!fk) return;

    if (_engineCurrentFileKey !== fk) {
      ensurePlayFile(fk, getVol(fk), true);
      st.currentKey = fk;
    } else {
      _bgmAudio.loop = true;
      _bgmAudio.volume = getVol(fk);
    }
    return;
  }

// loop_list / random 은 ended 이벤트에서 다음곡 넘김(여기선 “시작 보장” + 재생중 볼륨 갱신)
if (mode === "loop_list" || mode === "random") {

  // 이미 재생 중이면: 볼륨만 갱신(글로벌/개별 모두 반영)
  if (_engineCurrentFileKey) {
    const fk = _engineCurrentFileKey;
    _bgmAudio.loop = false;
    _bgmAudio.volume = getVol(fk);
    st.currentKey = fk;
    return;
  }

  // 아직 아무것도 안 틀었으면: 모드에 맞게 시작
  if (mode === "loop_list") {
    const idx = Math.max(0, Math.min(st.listIndex ?? 0, keys.length - 1));
    const fk = keys[idx] || "";
    if (fk) {
      ensurePlayFile(fk, getVol(fk), false);
      st.currentKey = fk;
      st.listIndex = idx;
    }
    return;
  }

  if (mode === "random") {
    const fk = pickRandomKey(keys, st.currentKey || "");
    if (fk) {
      ensurePlayFile(fk, getVol(fk), false);
      st.currentKey = fk;
    }
    return;
  }
}
}

// ended: loop_list/random 다음곡 처리
_bgmAudio.addEventListener("ended", () => {
  const settings = ensureSettings();
  ensureEngineFields(settings);
  if (!settings.enabled) return;
  if (settings.keywordMode) return; // keyword는 loop=true라 보통 안 옴

  const ctx = getSTContextSafe();
  const chatKey = getChatKeyFromContext(ctx);
  settings.chatStates[chatKey] ??= { currentKey: "", listIndex: 0 };
  const st = settings.chatStates[chatKey];

  let preset = settings.presets?.[settings.activePresetId];
  if (!preset) preset = Object.values(settings.presets ?? {})[0];
  if (!preset) return;

  const sort = getBgmSort(settings);
  const keys = getSortedKeys(preset, sort);
  const defKey = String(preset.defaultBgmKey ?? "");
  const getVol = (fk) => {
    const b = findBgmByKey(preset, fk);
    return clamp01((settings.globalVolume ?? 0.7) * (b?.volume ?? 1));
  };

  const mode = settings.playMode ?? "manual";

  if (mode === "loop_list") {
    if (!keys.length) return;
    let idx = Number(st.listIndex ?? 0);
    idx = (idx + 1) % keys.length;
    st.listIndex = idx;
    const fk = keys[idx];
    st.currentKey = fk;
    ensurePlayFile(fk, getVol(fk), false);
    saveSettingsDebounced();
    return;
  }

  if (mode === "random") {
    if (!keys.length) return;
    const cur = String(st.currentKey ?? "");
    const pool = keys.filter((k) => k !== cur);
    const next = (pool.length ? pool : keys)[Math.floor(Math.random() * (pool.length ? pool.length : keys.length))];
    st.currentKey = next;
    ensurePlayFile(next, getVol(next), false);
    saveSettingsDebounced();
    return;
  }
});

function startEngine() {
  if (_engineTimer) clearInterval(_engineTimer);
  _engineTimer = setInterval(engineTick, 900);
  engineTick();
}
  

(async () => {
  try {
    await __abgmResolveDeps();
    console.log("[AutoBGM] index.js loaded", import.meta.url);

    const onReady = () => init();

    if (typeof jQuery === "function") {
      jQuery(() => onReady());
    } else if (typeof $ === "function") {
      $(() => onReady());
    } else {
      window.addEventListener("DOMContentLoaded", onReady, { once: true });
    }
  } catch (e) {
    console.error("[AutoBGM] boot failed", e);
  }
})();
