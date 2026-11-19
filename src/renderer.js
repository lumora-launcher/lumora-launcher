// ============================================================
//  Lumora Launcher - Arayüz Mantığı
//  (İzole Profiller, Modrinth API, Temalar, Güncelleyici, Çökme Analizcisi)
// ============================================================
const $ = (id) => document.getElementById(id);

let settings = {};
let sys = { totalRam: 8192, appVersion: '1.0.0', isPackaged: false };
let versionData = null;
let javaList = [];
let requiredJava = null;
let saveTimer = null;
let latestUpdateInfo = null;

// İzole profiller & Modrinth durumu
let instances = [];
let activeInstanceId = 'default-vanilla';
let currentContentTab = 'mod';
let currentModrinthType = 'mod';
let currentModrinthCategory = '';
let currentModrinthOffset = 0;
let currentModrinthTotal = 0;
let installedProjectIds = new Set();

const THEME_LABELS = {
  aurora: 'Aurora',
  emerald: 'Zümrüt',
  nether: 'Nether',
  cyber: 'Cyberpunk',
  frost: 'Buzul'
};

const LAYOUT_LABELS = {
  modern: 'Modern Kartlar',
  compact: 'Sinematik Alt Bar',
  minimal: 'Minimalist Odak'
};

const LOADER_LABELS = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  quilt: 'Quilt',
  forge: 'Forge',
  neoforge: 'NeoForge',
  optifine: 'OptiFine'
};

const LOADER_ICONS = {
  vanilla: '🟩',
  fabric: '🧵',
  quilt: '🟪',
  forge: '⚒️',
  neoforge: '🦊',
  optifine: '⚡'
};

const CUSTOM_ICONS = {
  grass: '🟩',
  fabric: '🧵',
  quilt: '🟪',
  forge: '⚒️',
  neoforge: '🦊',
  optifine: '⚡',
  diamond: '💎',
  sword: '⚔️',
  fire: '🔥',
  crown: '👑',
  rocket: '🚀',
  vanilla: '🟩'
};

function getInstIcon(inst) {
  if (!inst) return '🟩';
  return CUSTOM_ICONS[inst.icon] || LOADER_ICONS[inst.loader] || '🟩';
}

function i18nT(key) {
  return window.LumoraI18n ? window.LumoraI18n.t(key) : key;
}

function i18nFmt(key, vars) {
  return window.LumoraI18n && window.LumoraI18n.fmt ? window.LumoraI18n.fmt(key, vars) : i18nT(key);
}

// ---------------- Yardımcılar ----------------
function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = 'toast'), 3500);
}

const gb = (mb) => `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
const fmtNum = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}B`;
  return String(n || 0);
};

function log(msg, cls = '') {
  const el = $('console');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = msg;
  el.appendChild(line);
  while (el.childElementCount > 3000) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

function persist(partial) {
  Object.assign(settings, partial);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await window.api.saveSettings(settings);
    const s = $('savedMsg');
    if (s) {
      s.classList.add('show');
      setTimeout(() => s.classList.remove('show'), 1400);
    }
  }, 250);
  updateStats();
}

function getActiveInstance() {
  return instances.find((x) => x.id === activeInstanceId) || instances[0] || null;
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn[data-page]').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  if (page === 'instances') {
    refreshInstances();
  } else if (page === 'modrinth') {
    updateModrinthFilterBadge();
    if (!$('modrinthResults').children.length) runModrinthSearch(false);
  } else if (page === 'servers') {
    refreshServers();
  }
}

// ---------------- Gerçek Ağ / Mojang API Durumu ----------------
async function checkNetworkStatus() {
  const dot = $('netStatusDot');
  const txt = $('netStatusText');
  try {
    const res = await window.api.networkStatus();
    if (res && res.online) {
      dot.classList.remove('offline');
      txt.textContent = `Mojang API Aktif (${res.pingMs} ms)`;
    } else {
      dot.classList.add('offline');
      txt.textContent = 'Çevrimdışı Mod (İnternet yok)';
    }
  } catch {
    dot.classList.add('offline');
    txt.textContent = 'Çevrimdışı Mod';
  }
}

// ---------------- Açılış Animasyonu (Splash) ----------------
function playSplashIntro(force = false) {
  const splash = $('splash');
  const fill = $('splashFill');
  const status = $('splashStatus');
  if (!force && settings.splashEnabled === false) {
    splash.classList.add('hide');
    return;
  }
  splash.classList.remove('hide');
  fill.style.width = '15%';
  status.textContent = sys.isBeta ? 'Lumora Beta önizleme çekirdeği başlatılıyor...' : 'Lumora çekirdeği başlatılıyor...';

  setTimeout(() => {
    fill.style.width = '55%';
    status.textContent = 'İzole profiller ve Modrinth bağlantısı hazırlanıyor...';
  }, 450);

  setTimeout(() => {
    fill.style.width = '100%';
    status.textContent = 'Hazır!';
  }, 950);

  setTimeout(() => {
    splash.classList.add('hide');
  }, 1450);
}

// ---------------- Tema, Düzen ve Animasyonlar ----------------
function applyTheme(theme) {
  const t = THEME_LABELS[theme] ? theme : 'aurora';
  document.documentElement.setAttribute('data-theme', t);
  const localizedThemes = window.LumoraI18n ? window.LumoraI18n.t('theme_names') : null;
  const label = (localizedThemes && localizedThemes[t]) || THEME_LABELS[t];
  $('activeThemeBadge').textContent = label;
  $('statTheme').textContent = label;

  document.querySelectorAll('#themeGrid .theme-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.theme === t);
  });
  document.querySelectorAll('.theme-dot[data-quick-theme]').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.quickTheme === t);
  });
}

function applyLayout(layout) {
  const l = LAYOUT_LABELS[layout] ? layout : 'modern';
  document.documentElement.setAttribute('data-layout', l);
  $('activeLayoutBadge').textContent = LAYOUT_LABELS[l];

  document.querySelectorAll('#layoutGrid .layout-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.layout === l);
  });
}

function applyAnimations(enabled) {
  document.documentElement.setAttribute('data-animations', enabled ? 'on' : 'off');
}

document.querySelectorAll('#themeGrid .theme-card').forEach((card) => {
  card.onclick = () => {
    const t = card.dataset.theme;
    applyTheme(t);
    persist({ theme: t });
  };
});

document.querySelectorAll('.theme-dot[data-quick-theme]').forEach((dot) => {
  dot.onclick = () => {
    const t = dot.dataset.quickTheme;
    applyTheme(t);
    persist({ theme: t });
    toast(`Tema değiştirildi: ${THEME_LABELS[t]}`);
  };
});

document.querySelectorAll('#layoutGrid .layout-card').forEach((card) => {
  card.onclick = () => {
    const l = card.dataset.layout;
    applyLayout(l);
    persist({ layoutStyle: l });
    toast(`Arayüz düzeni: ${LAYOUT_LABELS[l]}`);
  };
});

$('animationsEnabled').addEventListener('change', (e) => {
  applyAnimations(e.target.checked);
  persist({ animationsEnabled: e.target.checked });
});

$('splashEnabled').addEventListener('change', (e) => {
  persist({ splashEnabled: e.target.checked });
});

$('btnReplaySplash').onclick = () => playSplashIntro(true);

// ---------------- Pencere & navigasyon ----------------
$('btnMin').onclick = () => window.api.minimize();
$('btnMax').onclick = () => window.api.maximize();
$('btnClose').onclick = () => window.api.close();
$('btnFolder').onclick = () => {
  const inst = getActiveInstance();
  if (inst) window.api.openInstanceFolder(inst.id);
  else window.api.openFolder(settings.gameDir);
};
$('appVersionBadge').onclick = () => navigateTo('updates');
$('btnManageInstances').onclick = () => navigateTo('instances');

document.querySelectorAll('.nav-btn[data-page]').forEach((btn) => {
  btn.onclick = () => navigateTo(btn.dataset.page);
});

document.querySelectorAll('.stat[data-goto]').forEach((card) => {
  card.onclick = () => navigateTo(card.dataset.goto);
});

// ---------------- Hesap Yönetimi (Microsoft OAuth2 & Çevrimdışı) ----------------
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
let avatarTimer = null;
let savedMsAccounts = [];
let lastAvatarLookupKey = '';

// ---------------- Dahili 3B HTML5 Canvas Skin Motoru (Steve 4px & Alex 3px) ----------------
function createFallbackSkinCanvas(model = 'classic') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const isSlim = model === 'slim';
  const skinCol = isSlim ? '#f4c7a5' : '#cfa07a';
  const hairCol = isSlim ? '#d4742c' : '#3a2415';
  const eyeCol = isSlim ? '#4e8a38' : '#4a47b5';
  const shirtCol = isSlim ? '#6aa84f' : '#00a8a8';
  const pantsCol = isSlim ? '#4d4137' : '#323299';
  const shoeCol = isSlim ? '#3b332d' : '#555555';

  // Kafa (8x8x8)
  ctx.fillStyle = skinCol;
  ctx.fillRect(0, 8, 32, 8);
  ctx.fillRect(8, 0, 16, 8);
  // Saç
  ctx.fillStyle = hairCol;
  ctx.fillRect(8, 0, 8, 8);
  ctx.fillRect(24, 8, 8, 8);
  ctx.fillRect(8, 8, 8, 2);
  ctx.fillRect(0, 8, 8, 3);
  ctx.fillRect(16, 8, 8, 3);
  // Göz & Ağız
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 12, 1, 1);
  ctx.fillRect(14, 12, 1, 1);
  ctx.fillStyle = eyeCol;
  ctx.fillRect(10, 12, 1, 1);
  ctx.fillRect(13, 12, 1, 1);
  ctx.fillStyle = '#9e6246';
  ctx.fillRect(11, 14, 2, 1);

  // Gövde (shirt)
  ctx.fillStyle = shirtCol;
  ctx.fillRect(16, 20, 24, 12);
  ctx.fillRect(20, 16, 16, 4);

  // Bacaklar
  ctx.fillStyle = pantsCol;
  ctx.fillRect(0, 20, 16, 10);
  ctx.fillRect(4, 16, 8, 4);
  ctx.fillRect(16, 52, 16, 10);
  ctx.fillRect(20, 48, 8, 4);
  ctx.fillStyle = shoeCol;
  ctx.fillRect(0, 30, 16, 2);
  ctx.fillRect(16, 62, 16, 2);

  // Kollar (Steve: 4px, Alex: 3px)
  const aw = isSlim ? 3 : 4;
  ctx.fillStyle = shirtCol;
  ctx.fillRect(40, 20, aw * 2 + 8, 4);
  ctx.fillRect(44, 16, aw * 2, 4);
  ctx.fillRect(32, 52, aw * 2 + 8, 4);
  ctx.fillRect(36, 48, aw * 2, 4);
  ctx.fillStyle = skinCol;
  ctx.fillRect(40, 24, aw * 2 + 8, 8);
  ctx.fillRect(32, 56, aw * 2 + 8, 8);
  return c;
}

function normalizeSkinToCanvas(img) {
  const w = img.width || 64;
  const h = img.height || 64;
  const scale = Math.max(1, w / 64);
  const size = Math.round(64 * scale);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);

  // Eski 64x32 skinlerde Şapka bölgesinde (32,0,32,16) şeffaflık yoksa (Notch gibi katı siyah arka planlı PNG'ler),
  // Minecraft ImageBufferDownload kuralına uygun olarak şapka katmanını temizle
  const hatX = Math.round(32 * scale);
  const hatW = Math.round(32 * scale);
  const hatH = Math.round(16 * scale);
  const hatData = ctx.getImageData(hatX, 0, hatW, hatH).data;
  let hatHasAlpha = false;
  for (let i = 3; i < hatData.length; i += 4) {
    if (hatData[i] < 255) {
      hatHasAlpha = true;
      break;
    }
  }
  if (!hatHasAlpha) {
    ctx.clearRect(hatX, 0, hatW, hatH);
  }

  // Eski 64x32 formatını 64x64'e aynalayarak dönüştür
  if (h < w) {
    const copyFlip = (sx, sy, sw, sh, dx, dy) => {
      ctx.save();
      ctx.translate((dx + sw) * scale, dy * scale);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx * scale, sy * scale, sw * scale, sh * scale, 0, 0, sw * scale, sh * scale);
      ctx.restore();
    };
    // Sağ bacak -> Sol bacak (16,48)
    copyFlip(4, 16, 4, 4, 20, 48);
    copyFlip(8, 16, 4, 4, 24, 48);
    copyFlip(8, 20, 4, 12, 16, 52);
    copyFlip(4, 20, 4, 12, 20, 52);
    copyFlip(0, 20, 4, 12, 24, 52);
    copyFlip(12, 20, 4, 12, 28, 52);
    // Sağ kol -> Sol kol (32,48)
    copyFlip(44, 16, 4, 4, 36, 48);
    copyFlip(48, 16, 4, 4, 40, 48);
    copyFlip(48, 20, 4, 12, 32, 52);
    copyFlip(44, 20, 4, 12, 36, 52);
    copyFlip(40, 20, 4, 12, 40, 52);
    copyFlip(52, 20, 4, 12, 44, 52);
  }
  return c;
}

function renderSkinHeadToDataUrl(skinCanvas) {
  const s = skinCanvas.width / 64;
  const out = document.createElement('canvas');
  out.width = 128;
  out.height = 128;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Yüz (8,8,8,8) + Şapka katmanı (40,8,8,8)
  ctx.drawImage(skinCanvas, 8 * s, 8 * s, 8 * s, 8 * s, 6, 6, 116, 116);
  ctx.drawImage(skinCanvas, 40 * s, 8 * s, 8 * s, 8 * s, 0, 0, 128, 128);
  return out.toDataURL('image/png');
}

function buildCharacterBoxes(model, isLegacy) {
  const isSlim = model === 'slim';
  const aw = isSlim ? 3 : 4;
  const armCenter = 4 + aw / 2;

  const armFaces = (bx, by, w) => ({
    top: [bx + 4, by, w, 4],
    bottom: [bx + 4 + w, by, w, 4],
    right: [bx, by + 4, 4, 12],
    front: [bx + 4, by + 4, w, 12],
    left: [bx + 4 + w, by + 4, 4, 12],
    back: [bx + 8 + w, by + 4, w, 12]
  });

  const legOrBodyFaces = (bx, by, w, h, d) => ({
    top: [bx + d, by, w, d],
    bottom: [bx + d + w, by, w, d],
    right: [bx, by + d, d, h],
    front: [bx + d, by + d, w, h],
    left: [bx + d + w, by + d, d, h],
    back: [bx + d + w + d, by + d, w, h]
  });

  const boxes = [
    { name: 'head', pivot: [0, -8, 0], min: [-4, -8, -4], max: [4, 0, 4], rx: 0, overlay: false, uv: legOrBodyFaces(0, 0, 8, 8, 8) },
    { name: 'hat', pivot: [0, -8, 0], min: [-4.55, -8.55, -4.55], max: [4.55, 0.55, 4.55], rx: 0, overlay: true, uv: legOrBodyFaces(32, 0, 8, 8, 8) },
    { name: 'body', pivot: [0, -8, 0], min: [-4, 0, -2], max: [4, 12, 2], rx: 0, overlay: false, uv: legOrBodyFaces(16, 16, 8, 12, 4) },
    { name: 'rleg', pivot: [-2, 4, 0], min: [-2, 0, -2], max: [2, 12, 2], rx: -1, overlay: false, uv: legOrBodyFaces(0, 16, 4, 12, 4) },
    { name: 'lleg', pivot: [2, 4, 0], min: [-2, 0, -2], max: [2, 12, 2], rx: 1, overlay: false, uv: legOrBodyFaces(16, 48, 4, 12, 4) },
    { name: 'rarm', pivot: [-armCenter, -6, 0], min: [-aw / 2, -2, -2], max: [aw / 2, 10, 2], rx: 1, overlay: false, uv: armFaces(40, 16, aw) },
    { name: 'larm', pivot: [armCenter, -6, 0], min: [-aw / 2, -2, -2], max: [aw / 2, 10, 2], rx: -1, overlay: false, uv: armFaces(32, 48, aw) }
  ];

  if (!isLegacy) {
    boxes.push(
      { name: 'jacket', pivot: [0, -8, 0], min: [-4.45, -0.45, -2.45], max: [4.45, 12.45, 2.45], rx: 0, overlay: true, uv: legOrBodyFaces(16, 32, 8, 12, 4) },
      { name: 'rpants', pivot: [-2, 4, 0], min: [-2.45, -0.45, -2.45], max: [2.45, 12.45, 2.45], rx: -1, overlay: true, uv: legOrBodyFaces(0, 32, 4, 12, 4) },
      { name: 'lpants', pivot: [2, 4, 0], min: [-2.45, -0.45, -2.45], max: [2.45, 12.45, 2.45], rx: 1, overlay: true, uv: legOrBodyFaces(0, 48, 4, 12, 4) },
      { name: 'rsleeve', pivot: [-armCenter, -6, 0], min: [-aw / 2 - 0.45, -2.45, -2.45], max: [aw / 2 + 0.45, 10.45, 2.45], rx: 1, overlay: true, uv: armFaces(40, 32, aw) },
      { name: 'lsleeve', pivot: [armCenter, -6, 0], min: [-aw / 2 - 0.45, -2.45, -2.45], max: [aw / 2 + 0.45, 10.45, 2.45], rx: -1, overlay: true, uv: armFaces(48, 48, aw) }
    );
  }
  return boxes;
}

function renderSkinBodyToCanvas(canvas, skinCanvas, { model = 'classic', viewAngle = 'front', walkPose = true } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const yaw = viewAngle === 'back' ? Math.PI + 0.48 : 0.48;
  const pitch = -0.22;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const scale = Math.min(canvas.width / 28, canvas.height / 38);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + scale * 0.5;
  const s = skinCanvas.width / 64;
  const swingAngle = walkPose ? 0.46 : 0;

  const transformPoint = (pt, pivot, limbRx) => {
    let [lx, ly, lz] = pt;
    if (limbRx !== 0) {
      const c = Math.cos(limbRx);
      const sn = Math.sin(limbRx);
      const ny = ly * c - lz * sn;
      const nz = ly * sn + lz * c;
      ly = ny;
      lz = nz;
    }
    const wx = lx + pivot[0];
    const wy = ly + pivot[1];
    const wz = lz + pivot[2];

    const x1 = wx * cosY + wz * sinY;
    const z1 = -wx * sinY + wz * cosY;
    const y2 = wy * cosP - z1 * sinP;
    const z2 = wy * sinP + z1 * cosP;
    return [cx + x1 * scale, cy + y2 * scale, z2];
  };

  const quadDefs = (min, max) => {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    return [
      { key: 'front', shade: 0.03, pts: [[x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1]] },
      { key: 'back', shade: 0.14, pts: [[x1, y0, z0], [x0, y0, z0], [x1, y1, z0], [x0, y1, z0]] },
      { key: 'right', shade: 0.12, pts: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z0], [x0, y1, z1]] },
      { key: 'left', shade: 0.12, pts: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z1], [x1, y1, z0]] },
      { key: 'top', shade: 0, pts: [[x0, y0, z0], [x1, y0, z0], [x0, y0, z1], [x1, y0, z1]] },
      { key: 'bottom', shade: 0.25, pts: [[x0, y1, z1], [x1, y1, z1], [x0, y1, z0], [x1, y1, z0]] }
    ];
  };

  const facesToDraw = [];
  const boxes = buildCharacterBoxes(model, false);

  for (const box of boxes) {
    const rx = box.rx * swingAngle;
    for (const q of quadDefs(box.min, box.max)) {
      const proj = q.pts.map((p) => transformPoint(p, box.pivot, rx));
      const p0 = proj[0];
      const p1 = proj[1];
      const p2 = proj[2];
      const ux = p1[0] - p0[0];
      const uy = p1[1] - p0[1];
      const vx = p2[0] - p0[0];
      const vy = p2[1] - p0[1];
      const cross = ux * vy - uy * vx;
      if (cross <= 0.1) continue;

      const avgZ = (proj[0][2] + proj[1][2] + proj[2][2] + proj[3][2]) / 4 + (box.overlay ? 0.02 : 0);
      facesToDraw.push({
        p0,
        ux,
        uy,
        vx,
        vy,
        avgZ,
        shade: q.shade,
        overlay: box.overlay,
        uv: box.uv[q.key]
      });
    }
  }

  facesToDraw.sort((a, b) => a.avgZ - b.avgZ);

  for (const f of facesToDraw) {
    const [sx, sy, sw, sh] = f.uv;
    if (!sw || !sh) continue;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.transform(f.ux / sw, f.uy / sw, f.vx / sh, f.vy / sh, f.p0[0], f.p0[1]);
    ctx.drawImage(skinCanvas, sx * s, sy * s, sw * s, sh * s, 0, 0, sw, sh);
    if (!f.overlay && f.shade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${f.shade})`;
      ctx.fillRect(0, 0, sw, sh);
    }
    ctx.restore();
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

async function resolveCanvasForSkinLookup(username, preferredFallbackModel = 'classic') {
  const clean = (String(username || '').trim() || 'Steve').replace(/[^A-Za-z0-9_]/g, '') || 'Steve';
  const res = await window.api.lookupSkin({ username: clean });
  let model = res && res.model ? res.model : preferredFallbackModel;
  let skinCanvas = null;

  if (res && res.skinDataUrl) {
    try {
      const img = await loadImageElement(res.skinDataUrl);
      skinCanvas = normalizeSkinToCanvas(img);
    } catch {}
  }
  if (!skinCanvas) {
    skinCanvas = createFallbackSkinCanvas(model);
  }
  return {
    found: !!(res && res.found),
    name: (res && res.name) || clean,
    uuid: (res && res.uuid) || null,
    model,
    skinCanvas,
    skinDataUrl: res ? res.skinDataUrl : null
  };
}

function updateAccountBadgeAndAvatar(name, isMs) {
  const lang = settings.language || 'tr';
  const i18n = window.LumoraI18n;
  const badge = $('accountModeBadge');
  if (badge) {
    badge.textContent = i18n
      ? i18n.t(isMs ? 'pill_original' : 'pill_offline')
      : isMs
      ? '✓ ORİJİNAL'
      : 'ÇEVRİMDIŞI';
    badge.className = `account-mode-pill${isMs ? ' ms-active' : ''}`;
  }
  const cleanName = (name || '').trim();
  if (i18n) {
    $('greeting').textContent = i18n.getGreeting(lang, cleanName);
  } else {
    const h = new Date().getHours();
    const part = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
    $('greeting').textContent = cleanName ? `${part}, ${cleanName}` : `${part}!`;
  }
  $('avatarTag').textContent = cleanName || 'Steve';

  clearTimeout(avatarTimer);
  avatarTimer = setTimeout(async () => {
    const valid = USERNAME_RE.test(cleanName);
    const targetName = valid ? cleanName : 'Steve';
    const useCustomLocal = !isMs && settings.customSkinDataUrl;
    const lookupKey = useCustomLocal ? `custom:${settings.customSkinDataUrl.slice(-24)}` : targetName.toLowerCase();
    if (lookupKey === lastAvatarLookupKey) return;
    lastAvatarLookupKey = lookupKey;

    try {
      if (useCustomLocal) {
        const img = await loadImageElement(settings.customSkinDataUrl);
        $('avatar').src = renderSkinHeadToDataUrl(normalizeSkinToCanvas(img));
        return;
      }
      const resolved = await resolveCanvasForSkinLookup(targetName, settings.offlineSkinModel || 'classic');
      $('avatar').src = renderSkinHeadToDataUrl(resolved.skinCanvas);
    } catch {
      $('avatar').src = renderSkinHeadToDataUrl(createFallbackSkinCanvas(settings.offlineSkinModel || 'classic'));
    }
  }, 250);
}

async function refreshAccountsUI() {
  const data = await window.api.listAccounts();
  savedMsAccounts = data.accounts || [];
  const mode = settings.authMode || data.authMode || 'offline';
  settings.authMode = mode;

  document.querySelectorAll('#authModeTabs .auth-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.authmode === mode);
  });

  $('offlineAuthBox').classList.toggle('hidden', mode === 'microsoft');
  $('microsoftAuthBox').classList.toggle('hidden', mode !== 'microsoft');

  const sel = $('msAccountSelect');
  sel.innerHTML = '';
  if (savedMsAccounts.length === 0) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Hesap eklenmedi →';
    sel.appendChild(o);
    $('btnRemoveMsAccount').disabled = true;
  } else {
    $('btnRemoveMsAccount').disabled = false;
    for (const acc of savedMsAccounts) {
      const o = document.createElement('option');
      o.value = acc.id;
      o.textContent = `🟢 ${acc.name} (Orijinal Lisans)`;
      sel.appendChild(o);
    }
    const activeAcc =
      savedMsAccounts.find((x) => x.id === settings.activeAccountId) || savedMsAccounts[0];
    if (activeAcc) {
      sel.value = activeAcc.id;
      settings.activeAccountId = activeAcc.id;
    }
  }

  if (mode === 'microsoft') {
    const activeAcc =
      savedMsAccounts.find((x) => x.id === settings.activeAccountId) || savedMsAccounts[0];
    if (activeAcc) {
      settings.username = activeAcc.name;
      updateAccountBadgeAndAvatar(activeAcc.name, true);
    } else {
      updateAccountBadgeAndAvatar('Steve', true);
    }
  } else {
    validateUsername();
    updateAccountBadgeAndAvatar($('username').value.trim(), false);
  }
}

document.querySelectorAll('#authModeTabs .auth-tab').forEach((btn) => {
  btn.onclick = async () => {
    const mode = btn.dataset.authmode;
    settings.authMode = mode;
    await window.api.selectAccount({
      authMode: mode,
      accountId: settings.activeAccountId
    });
    await refreshAccountsUI();
  };
});

$('msAccountSelect').addEventListener('change', async (e) => {
  const id = e.target.value;
  settings.activeAccountId = id;
  await window.api.selectAccount({ authMode: 'microsoft', accountId: id });
  await refreshAccountsUI();
});

$('btnLoginMicrosoft').onclick = async () => {
  const btn = $('btnLoginMicrosoft');
  btn.disabled = true;
  btn.textContent = 'Giriş Bekleniyor...';
  try {
    const res = await window.api.loginMicrosoft();
    if (!res.ok) {
      toast(res.error || 'Microsoft girişi tamamlanamadı', true);
    } else {
      settings.authMode = 'microsoft';
      settings.activeAccountId = res.account.id;
      settings.username = res.account.name;
      toast(`Hoş geldin, ${res.account.name}! Orijinal Microsoft hesabın bağlandı ✓`);
      await refreshAccountsUI();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Microsoft Girişi';
  }
};

$('btnRemoveMsAccount').onclick = async () => {
  const id = $('msAccountSelect').value;
  if (!id) return;
  await window.api.removeAccount(id);
  toast('Microsoft hesabı kaldırıldı');
  await refreshAccountsUI();
};

function validateUsername() {
  if (settings.authMode === 'microsoft') {
    const hasAcc = savedMsAccounts.length > 0;
    const msHint = $('msAccountHint');
    if (!hasAcc) {
      msHint.textContent = i18nT('hint_ms_need');
      msHint.className = 'hint error';
      return false;
    }
    msHint.textContent = i18nT('hint_ms_ok');
    msHint.className = 'hint ok';
    return true;
  }

  const v = $('username').value.trim();
  const hint = $('usernameHint');
  if (!v) {
    hint.textContent = i18nT('hint_user_default');
    hint.className = 'hint';
    return false;
  }
  if (!USERNAME_RE.test(v)) {
    hint.textContent = i18nT('hint_user_invalid');
    hint.className = 'hint error';
    return false;
  }
  hint.textContent = i18nT('hint_user_ok');
  hint.className = 'hint ok';
  return true;
}

function updateGreeting() {
  const isMs = settings.authMode === 'microsoft';
  const name = isMs ? (settings.username || '') : $('username').value.trim();
  updateAccountBadgeAndAvatar(name, isMs);
}

$('username').addEventListener('input', () => {
  validateUsername();
  updateGreeting();
  persist({ username: $('username').value.trim(), authMode: 'offline' });
});
$('avatar').onerror = function () {
  if (this.src.startsWith('data:')) return;
  this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="%237c5cff"/></svg>';
};

// ---------------- İzole Profiller (Instances) Yönetimi ----------------
async function refreshInstances() {
  instances = await window.api.listInstances();
  if (!instances.some((x) => x.id === activeInstanceId)) {
    activeInstanceId = instances[0] ? instances[0].id : 'default-vanilla';
  }
  renderInstanceSelectors();
  renderInstanceCards();
  await renderActiveInstanceDetails();
  await onActiveInstanceChanged();
}

function renderInstanceSelectors() {
  const homeSel = $('homeInstanceSelect');
  const mrSel = $('modrinthInstanceSelect');
  homeSel.innerHTML = '';
  mrSel.innerHTML = '';

  for (const inst of instances) {
    const label = `${getInstIcon(inst)} ${inst.name} (${LOADER_LABELS[inst.loader]} ${inst.mcVersion})`;
    const o1 = document.createElement('option');
    o1.value = inst.id;
    o1.textContent = label;
    homeSel.appendChild(o1);

    const o2 = document.createElement('option');
    o2.value = inst.id;
    o2.textContent = label;
    mrSel.appendChild(o2);
  }
  homeSel.value = activeInstanceId;
  mrSel.value = activeInstanceId;
}

$('homeInstanceSelect').addEventListener('change', async (e) => {
  await selectActiveInstance(e.target.value);
});

$('modrinthInstanceSelect').addEventListener('change', async (e) => {
  await selectActiveInstance(e.target.value);
  updateModrinthFilterBadge();
  runModrinthSearch();
});

async function selectActiveInstance(id) {
  activeInstanceId = id;
  const inst = getActiveInstance();
  if (inst) {
    persist({ activeInstanceId: inst.id, version: inst.mcVersion });
  }
  renderInstanceSelectors();
  renderInstanceCards();
  await renderActiveInstanceDetails();
  await onActiveInstanceChanged();
}

function renderInstanceCards() {
  const grid = $('instanceGrid');
  grid.innerHTML = '';

  for (const inst of instances) {
    const card = document.createElement('div');
    card.className = `inst-card${inst.id === activeInstanceId ? ' active' : ''}`;
    const playMins = Math.round((inst.playTimeMs || 0) / 60000);
    const playText = playMins > 0 ? i18nFmt('lbl_mins_played', { n: playMins }) : i18nT('lbl_never_played');
    const baseTag = inst.baseInstalled
      ? `<span class="inst-tag" style="background:rgba(32,214,168,0.14);color:var(--accent-2)">${i18nT('lbl_base_ready')}</span>`
      : `<span class="inst-tag" style="background:rgba(255,184,77,0.16);color:#ffb84d">${i18nT('lbl_base_dl')}</span>`;

    card.innerHTML = `
      <div class="inst-card-top">
        <div class="inst-avatar">${getInstIcon(inst)}</div>
        <div class="inst-meta">
          <h4></h4>
          <div class="inst-tags">
            <span class="inst-tag">${LOADER_LABELS[inst.loader] || 'Vanilla'}</span>
            <span>MC ${inst.mcVersion}</span>
            ${baseTag}
          </div>
        </div>
      </div>
      <div class="inst-card-foot">
        <span>${inst.modsCount || 0} ${i18nT('lbl_mods_short')} · ${inst.shadersCount || 0} ${i18nT('lbl_shaders_short')} · ${playText}</span>
        <div class="inst-card-btns">
          <button class="icon-btn" data-act="folder" title="${i18nT('btn_open_folder')}">📁</button>
          <button class="icon-btn danger" data-act="delete" title="✕">🗑</button>
        </div>
      </div>
    `;
    card.querySelector('h4').textContent = inst.name;

    card.onclick = (ev) => {
      const btn = ev.target.closest('button[data-act]');
      if (btn) {
        ev.stopPropagation();
        if (btn.dataset.act === 'folder') {
          window.api.openInstanceFolder(inst.id);
        } else if (btn.dataset.act === 'delete') {
          deleteInstancePrompt(inst);
        }
        return;
      }
      selectActiveInstance(inst.id);
    };
    grid.appendChild(card);
  }
}

async function deleteInstancePrompt(inst) {
  if (instances.length <= 1) {
    return toast('En az bir profil kalmalıdır!', true);
  }
  const res = await window.api.deleteInstance(inst.id);
  if (!res.ok) return toast(res.error, true);
  activeInstanceId = res.activeId;
  toast(`"${inst.name}" profili silindi`);
  await refreshInstances();
}

async function renderActiveInstanceDetails() {
  const inst = getActiveInstance();
  if (!inst) return;

  $('detailInstName').textContent = `${getInstIcon(inst)} ${inst.name} — ${i18nT('lbl_detail_installed')}`;
  $('detailInstBadge').textContent = `${LOADER_LABELS[inst.loader]} ${inst.mcVersion}`;
  $('detailInstPath').textContent = `${i18nT('lbl_iso_dir')}: ${inst.dir}`;
  $('instRamSelect').value = String(inst.ramMax || 0);
  $('btnInstallFpsPack').style.display = inst.loader === 'fabric' || inst.loader === 'quilt' ? 'inline-block' : 'none';

  const dropTarget = $('dropOverlayTarget');
  if (dropTarget) dropTarget.textContent = i18nFmt('drop_hint', { name: inst.name });

  const baseBadge = $('detailBaseStatusBadge');
  const prepBtn = $('btnPrepareBaseVersion');
  if (inst.baseInstalled) {
    baseBadge.textContent = i18nFmt('lbl_base_installed_badge', { ver: inst.mcVersion });
    baseBadge.className = 'badge ok-badge';
    prepBtn.classList.add('hidden');
  } else {
    baseBadge.textContent = i18nFmt('lbl_base_missing_badge', { ver: inst.mcVersion });
    baseBadge.className = 'badge warn-badge';
    prepBtn.classList.remove('hidden');
  }

  const listEl = $('installedContentList');
  listEl.innerHTML = '';

  // Dünyalar & Yedekler sekmesi
  if (currentContentTab === 'worlds') {
    await renderWorldsTab(inst, listEl);
    return;
  }

  // Ekran Görüntüleri sekmesi
  if (currentContentTab === 'screenshots') {
    await renderScreenshotsTab(inst, listEl);
    return;
  }

  // Config & Ayarlar sekmesi
  if (currentContentTab === 'configs') {
    await renderConfigsTab(inst, listEl);
    return;
  }

  const items = await window.api.listInstanceContent({
    instanceId: inst.id,
    type: currentContentTab
  });

  // Modrinth mağazasında "Kurulu" butonlarını işaretlemek için kaydet
  if (currentContentTab === 'mod') {
    installedProjectIds = new Set(items.map((x) => x.projectId).filter(Boolean));
  }

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = currentContentTab === 'mod' ? i18nT('empty_mods') : i18nT('empty_other_pkg');
    listEl.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = `installed-item${item.enabled ? '' : ' disabled'}`;
    const sizeKb = Math.max(1, Math.round(item.size / 1024));

    row.innerHTML = `
      <div class="installed-left">
        ${
          item.iconUrl
            ? `<img class="installed-icon" src="${item.iconUrl}" alt="" />`
            : `<div class="installed-icon">📦</div>`
        }
        <div class="installed-info">
          <strong></strong>
          <span>${item.versionNumber ? `${i18nT('lbl_version_pfx')}: ${item.versionNumber} · ` : ''}${item.baseName} (${sizeKb} KB)</span>
        </div>
      </div>
      <div class="installed-actions">
        <label class="switch" title="Etkinleştir / Devre Dışı Bırak">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} data-toggle="${item.fileName}" />
          <span></span>
        </label>
        <button class="icon-btn danger" data-del="${item.fileName}" title="Kaldır">✕</button>
      </div>
    `;
    row.querySelector('strong').textContent = item.title;

    row.querySelector('input[data-toggle]').onchange = async () => {
      await window.api.toggleInstanceContent({
        instanceId: inst.id,
        type: currentContentTab,
        fileName: item.fileName
      });
      await refreshInstances();
    };

    row.querySelector('button[data-del]').onclick = async () => {
      await window.api.deleteInstanceContent({
        instanceId: inst.id,
        type: currentContentTab,
        fileName: item.fileName
      });
      toast(`${item.title} kaldırıldı`);
      await refreshInstances();
    };

    listEl.appendChild(row);
  }
}

document.querySelectorAll('#instContentTabs .sub-tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('#instContentTabs .sub-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentContentTab = tab.dataset.ctype;
    renderActiveInstanceDetails();
  };
});

// Yeni profil oluşturma formu
let selectedNewLoader = 'fabric';
document.querySelectorAll('#newInstLoaderGroup .loader-pill').forEach((pill) => {
  pill.onclick = () => {
    document.querySelectorAll('#newInstLoaderGroup .loader-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    selectedNewLoader = pill.dataset.loader;
  };
});

$('btnShowCreateInstance').onclick = () => {
  $('createInstanceBox').classList.remove('hidden');
  $('newInstName').focus();
};
$('btnCancelCreateInstance').onclick = () => {
  $('createInstanceBox').classList.add('hidden');
};

$('btnConfirmCreateInstance').onclick = async () => {
  const name = $('newInstName').value.trim() || `${LOADER_LABELS[selectedNewLoader]} ${$('newInstVersion').value}`;
  const mcVersion = $('newInstVersion').value || '1.21.4';
  const created = await window.api.createInstance({
    name,
    mcVersion,
    loader: selectedNewLoader
  });
  $('newInstName').value = '';
  $('createInstanceBox').classList.add('hidden');
  activeInstanceId = created.id;
  toast(`"${created.name}" profili oluşturuldu!`);
  await refreshInstances();
};

$('btnOpenInstFolder').onclick = () => {
  const inst = getActiveInstance();
  if (inst) window.api.openInstanceFolder(inst.id);
};

// .mrpack İçe ve Dışa Aktarma
$('btnImportMrpack').onclick = async () => {
  const btn = $('btnImportMrpack');
  btn.disabled = true;
  btn.textContent = '⏳ İçe Aktarılıyor...';
  const res = await window.api.importMrpackFile();
  btn.disabled = false;
  btn.textContent = '📦 .mrpack İçe Aktar';
  if (res.canceled) return;
  if (!res.ok) return toast(res.error, true);
  activeInstanceId = res.instance.id;
  toast(`"${res.instance.name}" modpack profili başarıyla kuruldu! 🎉`);
  await refreshInstances();
};

$('btnExportMrpack').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const res = await window.api.exportInstanceMrpack({ instanceId: inst.id });
  if (res.canceled) return;
  if (!res.ok) return toast(res.error, true);
  toast(`Profil .mrpack olarak dışa aktarıldı!`);
};

$('btnDuplicateInstance').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const res = await window.api.duplicateInstance(inst.id);
  if (!res.ok) return toast(res.error || 'Profil çoğaltılamadı', true);
  activeInstanceId = res.instance.id;
  toast(`"${res.instance.name}" profili oluşturuldu! ✓`);
  await refreshInstances();
};

$('instRamSelect').onchange = async (e) => {
  const inst = getActiveInstance();
  if (!inst) return;
  const ramMax = Number(e.target.value) || 0;
  await window.api.updateInstance({ id: inst.id, ramMax });
  toast(ramMax > 0 ? `${inst.name} için RAM ${gb(ramMax)} olarak ayarlandı` : `${inst.name} genel RAM ayarını kullanacak`);
  await refreshInstances();
};

// Profil Adı & Simge Düzenleme (Inline Strip)
let editingInstIcon = 'grass';
document.querySelectorAll('#editInstIconGroup .chip').forEach((chip) => {
  chip.onclick = () => {
    document.querySelectorAll('#editInstIconGroup .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    editingInstIcon = chip.dataset.icon || 'grass';
  };
});

$('btnRenameInstance').onclick = () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const box = $('renameInstanceBox');
  const willOpen = box.classList.contains('hidden');
  box.classList.toggle('hidden');
  if (willOpen) {
    $('editInstNameInput').value = inst.name || '';
    editingInstIcon = inst.icon || (inst.loader === 'vanilla' ? 'grass' : inst.loader) || 'grass';
    document.querySelectorAll('#editInstIconGroup .chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.icon === editingInstIcon);
    });
    $('editInstNameInput').focus();
  }
};

$('btnCancelInstMeta').onclick = () => {
  $('renameInstanceBox').classList.add('hidden');
};

$('btnSaveInstMeta').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const newName = $('editInstNameInput').value.trim().slice(0, 40);
  if (!newName) return toast(i18nT('inst_need_name'), true);
  await window.api.updateInstance({ id: inst.id, name: newName, icon: editingInstIcon });
  $('renameInstanceBox').classList.add('hidden');
  toast(i18nT('inst_updated'));
  await refreshInstances();
};

// Başka Launcher'dan Profil Göçü (Import Wizard)
$('btnShowImportWizard').onclick = async () => {
  $('importWizardBox').classList.remove('hidden');
  await renderExternalInstancesList();
};
$('btnCloseImportWizard').onclick = () => {
  $('importWizardBox').classList.add('hidden');
};
$('btnPickCustomImportFolder').onclick = async () => {
  const res = await window.api.pickCustomImportFolder();
  if (res.canceled) return;
  if (!res.ok) return toast(res.error, true);
  $('importWizardBox').classList.add('hidden');
  activeInstanceId = res.instance.id;
  toast(`"${res.instance.name}" klasörü yeni profil olarak aktarıldı! 🎉`);
  await refreshInstances();
};

async function renderExternalInstancesList() {
  const listEl = $('externalInstancesList');
  listEl.innerHTML = '<div class="empty-state">Bilgisayarındaki Minecraft kurulumları taranıyor...</div>';
  const items = await window.api.scanExternalInstances();
  listEl.innerHTML = '';

  if (!items || items.length === 0) {
    listEl.innerHTML =
      '<div class="empty-state">Standart konumlarda (.minecraft, CurseForge, Prism, Modrinth) kurulu profil bulunamadı. Sağ üstteki "📂 Özel Klasör Seçerek Aktar" butonunu kullanabilirsin.</div>';
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'installed-item';
    row.innerHTML = `
      <div class="installed-left">
        <div class="installed-icon">${LOADER_ICONS[item.loader] || '📦'}</div>
        <div class="installed-info">
          <strong></strong>
          <span>Kaynak: ${item.sourceName} · ${LOADER_LABELS[item.loader] || 'Vanilla'} ${item.mcVersion} · ${item.modsCount} Mod · ${item.savesCount} Dünya · ${item.shadersCount} Shader</span>
        </div>
      </div>
      <div class="installed-actions">
        <button class="play-btn sm-btn" data-migrate>
          <span class="play-label">📥 LUMORA'YA AKTAR</span>
        </button>
      </div>
    `;
    row.querySelector('strong').textContent = item.name;
    row.querySelector('[data-migrate]').onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.querySelector('.play-label').textContent = 'AKTARILIYOR...';
      const res = await window.api.migrateExternalFolder(item);
      if (!res.ok) {
        btn.disabled = false;
        btn.querySelector('.play-label').textContent = "📥 LUMORA'YA AKTAR";
        return toast(res.error, true);
      }
      $('importWizardBox').classList.add('hidden');
      activeInstanceId = res.instance.id;
      toast(`"${res.instance.name}" (${item.modsCount} mod, ${item.savesCount} dünya) başarıyla Lumora'ya aktarıldı! 🎉`);
      await refreshInstances();
    };
    listEl.appendChild(row);
  }
}

// Dünyalar & Yedekler Sekmesi
async function renderWorldsTab(inst, container) {
  const { worlds, backups } = await window.api.listWorlds({ instanceId: inst.id });

  if (!worlds.length && !backups.length) {
    container.innerHTML = `<div class="empty-state">${i18nT('empty_worlds')}</div>`;
    return;
  }

  for (const w of worlds) {
    const row = document.createElement('div');
    row.className = 'installed-item';
    const mb = (w.sizeBytes / 1024 / 1024).toFixed(1);
    const dateStr = new Date(w.lastModified).toLocaleDateString();

    row.innerHTML = `
      <div class="installed-left">
        ${w.iconData ? `<img class="installed-icon" src="${w.iconData}" alt="" />` : `<div class="installed-icon">🌍</div>`}
        <div class="installed-info">
          <strong></strong>
          <span>${i18nT('lbl_world_size')}: ${mb} MB · ${i18nT('lbl_world_last')}: ${dateStr}</span>
        </div>
      </div>
      <div class="installed-actions">
        <button class="ghost-btn accent-border" data-play-world="${w.folderName}">${i18nT('btn_play_world')}</button>
        <button class="ghost-btn" data-backup-world="${w.folderName}">${i18nT('btn_backup_world')}</button>
        <button class="icon-btn danger" data-del-world="${w.folderName}" title="✕">🗑</button>
      </div>
    `;
    row.querySelector('strong').textContent = w.folderName;

    row.querySelector('[data-play-world]').onclick = () => launchWithQuickPlay({ world: w.folderName });
    row.querySelector('[data-backup-world]').onclick = async (e) => {
      e.target.disabled = true;
      e.target.textContent = i18nT('btn_backing_up');
      const r = await window.api.backupWorld({ instanceId: inst.id, folderName: w.folderName });
      if (r.ok) toast(`ZIP: ${r.zipName}`);
      else toast(r.error, true);
      await renderActiveInstanceDetails();
    };
    row.querySelector('[data-del-world]').onclick = async () => {
      await window.api.deleteWorld({ instanceId: inst.id, folderName: w.folderName });
      await renderActiveInstanceDetails();
    };
    container.appendChild(row);
  }

  if (backups.length) {
    const head = document.createElement('div');
    head.style.cssText = 'font-size:12px;font-weight:700;color:var(--accent-2);margin:10px 0 4px';
    head.textContent = i18nFmt('lbl_world_backups', { n: backups.length });
    container.appendChild(head);

    for (const b of backups) {
      const row = document.createElement('div');
      row.className = 'installed-item';
      const mb = (b.sizeBytes / 1024 / 1024).toFixed(1);
      row.innerHTML = `
        <div class="installed-left">
          <div class="installed-icon">🗜</div>
          <div class="installed-info">
            <strong></strong>
            <span>${i18nT('lbl_backup_archive')} · ${mb} MB</span>
          </div>
        </div>
        <div class="installed-actions">
          <button class="ghost-btn" data-restore="${b.fileName}">${i18nT('btn_restore_backup')}</button>
        </div>
      `;
      row.querySelector('strong').textContent = b.fileName;
      row.querySelector('[data-restore]').onclick = async () => {
        const r = await window.api.restoreWorld({ instanceId: inst.id, backupFileName: b.fileName });
        if (r.ok) toast('✓');
        else toast(r.error, true);
        await renderActiveInstanceDetails();
      };
      container.appendChild(row);
    }
  }
}

// Ekran Görüntüleri Sekmesi
let activeScreenshotPreview = null;

async function copyScreenshotToClipboard(instanceId, fileName) {
  const res = await window.api.copyScreenshot(instanceId, fileName);
  if (res && res.ok) toast(i18nT('sc_copied_toast'));
  else toast((res && res.error) || 'Copy error', true);
}

async function renderScreenshotsTab(inst, container) {
  const shots = await window.api.listScreenshots({ instanceId: inst.id });
  if (!shots.length) {
    container.innerHTML = `<div class="empty-state">${i18nT('empty_screenshots')}</div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'screenshots-grid';
  for (const s of shots) {
    const card = document.createElement('div');
    card.className = 'sc-card';
    card.innerHTML = `
      <div class="sc-card-actions">
        <button type="button" class="sc-mini-btn" data-copy-sc>${i18nT('sc_copy_btn')}</button>
      </div>
      <img src="${s.dataUrl || ''}" alt="" />
      <div class="sc-card-foot">${s.fileName}</div>
    `;
    card.querySelector('[data-copy-sc]').onclick = (e) => {
      e.stopPropagation();
      copyScreenshotToClipboard(inst.id, s.fileName);
    };
    card.onclick = () => {
      activeScreenshotPreview = { instanceId: inst.id, fileName: s.fileName };
      $('scPreviewTitle').textContent = s.fileName;
      $('scPreviewImg').src = s.dataUrl || '';
      $('screenshotPreviewModal').classList.remove('hidden');
    };
    grid.appendChild(card);
  }
  container.appendChild(grid);
}

$('btnScPreviewClose').onclick = () => $('screenshotPreviewModal').classList.add('hidden');
$('btnScPreviewFolder').onclick = () => {
  if (activeScreenshotPreview) window.api.openInstanceFolder(activeScreenshotPreview.instanceId, 'screenshots');
};
$('btnScPreviewCopy').onclick = () => {
  if (activeScreenshotPreview) {
    copyScreenshotToClipboard(activeScreenshotPreview.instanceId, activeScreenshotPreview.fileName);
  }
};

// Config & Ayarlar Sekmesi
let editingConfigState = null;

async function renderConfigsTab(inst, container) {
  const files = await window.api.listConfigs({ instanceId: inst.id });
  if (!files || !files.length) {
    container.innerHTML = `<div class="empty-state">${i18nT('empty_configs')}</div>`;
    return;
  }

  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'installed-item';
    const sizeKb = Math.max(1, Math.round((f.size || 0) / 1024));
    const dateStr = f.mtime ? new Date(f.mtime).toLocaleDateString() : '';
    row.innerHTML = `
      <div class="installed-left">
        <div class="installed-icon">⚙️</div>
        <div class="installed-info">
          <strong></strong>
          <span>${sizeKb} KB${dateStr ? ` · ${i18nT('lbl_updated_on')}: ${dateStr}` : ''}</span>
        </div>
      </div>
      <div class="installed-actions">
        <button class="ghost-btn accent-border" data-edit-cfg>${i18nT('btn_edit_cfg')}</button>
      </div>
    `;
    row.querySelector('strong').textContent = f.relPath;
    row.querySelector('[data-edit-cfg]').onclick = async () => {
      const res = await window.api.readConfigFile({ instanceId: inst.id, relPath: f.relPath });
      if (!res.ok) return toast(res.error || 'Error', true);
      editingConfigState = { instanceId: inst.id, relPath: f.relPath };
      $('configEditorTitle').textContent = `${inst.name} — ${f.relPath}`;
      $('configEditorTextarea').value = res.content;
      $('configEditorModal').classList.remove('hidden');
      $('configEditorTextarea').focus();
    };
    container.appendChild(row);
  }
}

$('btnConfigCancel').onclick = () => {
  editingConfigState = null;
  $('configEditorModal').classList.add('hidden');
};

$('btnConfigSave').onclick = async () => {
  if (!editingConfigState) return;
  const btn = $('btnConfigSave');
  btn.disabled = true;
  const res = await window.api.saveConfigFile({
    instanceId: editingConfigState.instanceId,
    relPath: editingConfigState.relPath,
    content: $('configEditorTextarea').value
  });
  btn.disabled = false;
  if (!res.ok) return toast(res.error || 'Error', true);
  toast(`${editingConfigState.relPath} ✓`);
  editingConfigState = null;
  $('configEditorModal').classList.add('hidden');
  await renderActiveInstanceDetails();
};

$('btnPrepareBaseVersion').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const btn = $('btnPrepareBaseVersion');
  btn.disabled = true;
  btn.textContent = i18nFmt('btn_prep_busy', { ver: inst.mcVersion });
  const res = await window.api.ensureBaseVersion(inst.mcVersion);
  btn.disabled = false;
  btn.textContent = i18nT('btn_prep_base');
  if (!res.ok) return toast(res.error, true);
  toast(`Minecraft ${inst.mcVersion} ✓`);
  await refreshInstances();
};

$('btnOpenInstModrinth').onclick = () => {
  currentModrinthType = ['mod', 'shader', 'resourcepack'].includes(currentContentTab) ? currentContentTab : 'mod';
  document.querySelectorAll('#modrinthTypeTabs .sub-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.mtype === currentModrinthType);
  });
  navigateTo('modrinth');
  runModrinthSearch();
};

// Tek Tıkla FPS Paketi Kurucu
$('btnInstallFpsPack').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const btn = $('btnInstallFpsPack');
  btn.disabled = true;
  btn.textContent = '⏳ FPS Paketi Kuruluyor...';
  toast('Sodium, Lithium, FerriteCore ve Fabric API indiriliyor...');
  const res = await window.api.modrinthInstallFpsPack({ instanceId: inst.id });
  btn.disabled = false;
  btn.textContent = '⚡ Tek Tıkla FPS Paketi Kur';

  if (!res.ok) return toast(res.error, true);
  toast(`FPS Paketi kuruldu! (${res.installed.length} mod eklendi)`);
  await refreshInstances();
};

// Mod Güncellemelerini Denetle
$('btnCheckModUpdates').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const btn = $('btnCheckModUpdates');
  btn.disabled = true;
  btn.textContent = '⏳ Denetleniyor...';
  const res = await window.api.modrinthCheckUpdates({ instanceId: inst.id });
  btn.disabled = false;
  btn.textContent = '🔄 Mod Güncellemelerini Denetle';

  if (!res.ok) return toast(res.error, true);
  if (!res.updates || res.updates.length === 0) {
    return toast('Tüm kurulu modların güncel! ✓');
  }
  toast(`${res.updates.length} mod için güncelleme bulundu, indiriliyor...`);
  const applied = await window.api.modrinthApplyUpdates({
    instanceId: inst.id,
    updates: res.updates
  });
  if (applied.ok) {
    toast(`${applied.count} mod başarıyla güncellendi!`);
    await refreshInstances();
  }
};

// ---------------- Modrinth Mağazası Arama & Kurulum (Geniş Havuz + Sayfalama) ----------------
let lastModrinthHits = [];

function updateModrinthFilterBadge() {
  const inst = getActiveInstance();
  if (!inst) return;
  const typeLabel =
    currentModrinthType === 'modpack'
      ? i18nT('mr_tab_modpack')
      : currentModrinthType === 'shader'
      ? i18nT('mr_tab_shader')
      : currentModrinthType === 'resourcepack'
      ? i18nT('mr_tab_rp')
      : `Mod (${LOADER_LABELS[inst.loader]})`;
  $('modrinthFilterBadge').textContent = `${inst.name} · MC ${inst.mcVersion} · ${typeLabel}`;
}

document.querySelectorAll('#modrinthTypeTabs .sub-tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('#modrinthTypeTabs .sub-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentModrinthType = tab.dataset.mtype;
    currentModrinthCategory = '';
    document.querySelectorAll('#modrinthCategoryChips .chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.mcat === '');
    });
    updateModrinthFilterBadge();
    runModrinthSearch(false);
  };
});

document.querySelectorAll('#modrinthCategoryChips .chip').forEach((chip) => {
  chip.onclick = () => {
    document.querySelectorAll('#modrinthCategoryChips .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentModrinthCategory = chip.dataset.mcat || '';
    runModrinthSearch(false);
  };
});

$('btnModrinthSearch').onclick = () => runModrinthSearch(false);
$('modrinthSortSelect').onchange = () => runModrinthSearch(false);
$('modrinthSearchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runModrinthSearch(false);
});
$('btnModrinthLoadMore').onclick = () => runModrinthSearch(true);

function createModrinthCard(hit) {
  const card = document.createElement('div');
  card.className = 'mr-card';
  const isInstalled = installedProjectIds.has(hit.project_id);

  card.innerHTML = `
    <img class="mr-icon" src="${hit.icon_url || 'https://cdn.modrinth.com/placeholder.svg'}" alt="" />
    <div class="mr-body">
      <div class="mr-head">
        <div>
          <div class="mr-title"></div>
          <div class="mr-author"></div>
        </div>
        <button class="mr-install-btn${isInstalled ? ' installed' : ''}" data-pid="${hit.project_id}">
          ${isInstalled ? i18nT('btn_installed') : i18nT('btn_install')}
        </button>
      </div>
      <p class="mr-desc"></p>
      <div class="mr-foot">
        <span>⬇ ${fmtNum(hit.downloads)} ${i18nT('lbl_downloads')}</span>
        <span>${(hit.categories || []).slice(0, 3).join(' · ')}</span>
      </div>
    </div>
  `;
  card.querySelector('.mr-title').textContent = hit.title;
  card.querySelector('.mr-author').textContent = `${i18nT('lbl_author')}: ${hit.author || 'Modrinth'}`;
  card.querySelector('.mr-desc').textContent = hit.description || '';

  const btn = card.querySelector('.mr-install-btn');
  if (currentModrinthType === 'modpack') {
    btn.textContent = i18nT('btn_install_pack');
  }
  btn.onclick = async () => {
    if (currentModrinthType === 'modpack') {
      btn.disabled = true;
      btn.textContent = i18nT('btn_installing_pack');
      const res = await window.api.modrinthInstallModpack({
        projectId: hit.project_id,
        title: hit.title
      });
      if (!res.ok) {
        btn.disabled = false;
        btn.textContent = i18nT('btn_install_pack');
        return toast(res.error, true);
      }
      activeInstanceId = res.instance.id;
      btn.className = 'mr-install-btn installed';
      btn.textContent = i18nT('btn_pack_created');
      toast(`${res.instance.name} ✓`);
      await refreshInstances();
      return;
    }

    const targetInst = getActiveInstance();
    if (!targetInst) return;
    if (currentModrinthType === 'mod' && (targetInst.loader === 'vanilla' || targetInst.loader === 'optifine')) {
      toast(`${LOADER_LABELS[targetInst.loader]}: Fabric / Quilt / Forge / NeoForge`, true);
      return;
    }
    btn.disabled = true;
    btn.textContent = i18nT('btn_installing');
    const res = await window.api.modrinthInstall({
      instanceId: targetInst.id,
      projectId: hit.project_id,
      title: hit.title,
      iconUrl: hit.icon_url,
      author: hit.author,
      projectType: currentModrinthType
    });
    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = i18nT('btn_install');
      toast(res.error, true);
      return;
    }
    installedProjectIds.add(hit.project_id);
    btn.className = 'mr-install-btn installed';
    btn.textContent = i18nT('btn_just_installed');
    const extra = res.files.length > 1 ? ` (+${res.files.length - 1})` : '';
    toast(`${hit.title} ✓${extra}`);
    await refreshInstances();
  };

  return card;
}

async function runModrinthSearch(append = false) {
  const inst = getActiveInstance();
  if (!inst) return;

  const box = $('modrinthResults');
  const loadMoreBtn = $('btnModrinthLoadMore');
  const countBadge = $('modrinthCountBadge');

  if (!append) {
    currentModrinthOffset = 0;
    lastModrinthHits = [];
    box.innerHTML = `<div class="empty-state" style="grid-column:span 2">${i18nT('mr_scanning')}</div>`;
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = i18nT('mr_loading');
  }

  try {
    const data = await window.api.modrinthSearch({
      query: $('modrinthSearchInput').value.trim(),
      projectType: currentModrinthType,
      mcVersion: inst.mcVersion,
      loader: inst.loader,
      category: currentModrinthCategory,
      offset: currentModrinthOffset,
      limit: 48,
      sort: $('modrinthSortSelect').value
    });

    if (!append) box.innerHTML = '';
    const hits = data.hits || [];
    currentModrinthTotal = data.total_hits || hits.length;
    lastModrinthHits = append ? lastModrinthHits.concat(hits) : hits;

    if (!append && hits.length === 0) {
      box.innerHTML = `<div class="empty-state" style="grid-column:span 2">${i18nFmt('mr_no_results', { ver: inst.mcVersion })}</div>`;
      countBadge.textContent = i18nT('mr_zero');
      return;
    }

    for (const hit of hits) {
      box.appendChild(createModrinthCard(hit));
    }

    currentModrinthOffset += hits.length;
    countBadge.textContent = i18nFmt('mr_showing', {
      shown: currentModrinthOffset,
      total: fmtNum(currentModrinthTotal)
    });

    if (currentModrinthOffset < currentModrinthTotal) {
      loadMoreBtn.classList.remove('hidden');
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = i18nFmt('mr_load_more', {
        shown: currentModrinthOffset,
        total: fmtNum(currentModrinthTotal)
      });
    } else {
      loadMoreBtn.classList.add('hidden');
    }
  } catch (err) {
    if (!append) {
      box.innerHTML = `<div class="empty-state" style="grid-column:span 2">Modrinth: ${err.message}</div>`;
    } else {
      toast(err.message, true);
    }
  }
}

// ---------------- Sürümler & Java Uyumluluğu ----------------
function renderVersionOptions() {
  const sel = $('newInstVersion');
  if (!sel || !versionData) return;
  sel.innerHTML = '';
  const list = versionData.versions.filter(
    (v) => v.type === 'release' || (settings.showSnapshots && v.type === 'snapshot')
  );
  for (const v of list) {
    const o = document.createElement('option');
    o.value = v.id;
    o.textContent = v.type === 'snapshot' ? `${v.id} (snapshot)` : v.id;
    if (v.id === versionData.latest.release) o.textContent += ' — en yeni';
    sel.appendChild(o);
  }
  sel.value = '1.21.4';
}

async function loadVersions() {
  try {
    versionData = await window.api.listVersions();
    renderVersionOptions();
    await onActiveInstanceChanged();
  } catch {
    $('javaHint').textContent = i18nT('java_offline_err');
    $('javaHint').className = 'hint error';
  }
}

async function onActiveInstanceChanged() {
  const inst = getActiveInstance();
  if (!inst) return;
  $('javaHint').textContent = 'Profil ve Java gereksinimi kontrol ediliyor...';
  $('javaHint').className = 'hint';
  requiredJava = await window.api.versionJava(inst.mcVersion);
  checkJavaCompat();
  updateStats();
}

function selectedJava() {
  return javaList.find((j) => j.path === settings.javaPath) || null;
}

function bestJavaFor(major) {
  return javaList.find((j) => j.major === major) || javaList.find((j) => j.major >= major) || null;
}

function checkJavaCompat() {
  const hint = $('javaHint');
  const inst = getActiveInstance();
  if (!requiredJava || !inst) {
    hint.innerHTML = '&nbsp;';
    return;
  }
  let java = selectedJava();
  if (!settings.javaPath) java = bestJavaFor(requiredJava);

  const loaderTxt = `${LOADER_LABELS[inst.loader]} ${inst.mcVersion}`;
  const baseStatusTxt = inst.baseInstalled ? i18nT('java_base_ready') : i18nT('java_base_auto');
  if (!java) {
    hint.textContent = `${loaderTxt} · ${baseStatusTxt} · ${i18nFmt('java_will_dl', { n: requiredJava })}`;
    hint.className = 'hint warn';
  } else if (java.major < requiredJava) {
    hint.textContent = `${loaderTxt} · ${i18nFmt('java_mismatch', { req: requiredJava, cur: java.major })}`;
    hint.className = 'hint error';
  } else {
    hint.textContent = `${loaderTxt} · ${baseStatusTxt} · Java ${java.major}${settings.javaPath ? '' : i18nT('java_oto')} ✓`;
    hint.className = inst.baseInstalled ? 'hint ok' : 'hint warn';
  }
  updateStats();
}

// ---------------- Java ----------------
function renderJavaSelect() {
  const sel = $('javaSelect');
  sel.innerHTML = '';
  const auto = document.createElement('option');
  auto.value = '';
  auto.textContent = i18nT('java_auto_opt');
  sel.appendChild(auto);
  for (const j of javaList) {
    const o = document.createElement('option');
    o.value = j.path;
    o.textContent = `Java ${j.major} (${j.version}) — ${j.isPath ? 'Sistem PATH' : j.path}`;
    sel.appendChild(o);
  }
  if (settings.javaPath && !javaList.some((j) => j.path === settings.javaPath)) {
    const o = document.createElement('option');
    o.value = settings.javaPath;
    o.textContent = settings.javaPath;
    sel.appendChild(o);
  }
  sel.value = settings.javaPath || '';
}

async function scanJava() {
  $('javaSelect').innerHTML = '<option>Java aranıyor...</option>';
  javaList = await window.api.scanJava();
  renderJavaSelect();
  checkJavaCompat();
}

$('javaSelect').addEventListener('change', (e) => {
  persist({ javaPath: e.target.value });
  checkJavaCompat();
});
$('btnScanJava').onclick = scanJava;
$('btnPickJava').onclick = async () => {
  const r = await window.api.pickJava();
  if (!r) return;
  if (!r.major) return toast('Bu dosya geçerli bir Java gibi görünmüyor', true);
  if (!javaList.some((j) => j.path === r.path)) javaList.push(r);
  javaList.sort((a, b) => b.major - a.major);
  persist({ javaPath: r.path });
  renderJavaSelect();
  checkJavaCompat();
  toast(`Java ${r.major} seçildi`);
};

// ---------------- RAM ----------------
function updateRamUI(val) {
  const slider = $('ramSlider');
  const pct = ((val - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--fill', `${pct}%`);
  $('ramValue').textContent = gb(val);
  const hint = $('ramHint');
  if (val > sys.totalRam * 0.75) {
    hint.textContent = `Dikkat: Sistem RAM'in ${gb(sys.totalRam)}. Bu kadar vermek bilgisayarı yavaşlatabilir.`;
    hint.className = 'hint warn';
  } else {
    hint.textContent = `Sistem RAM: ${gb(sys.totalRam)} · Vanilla için 2-4 GB, modlu için 6-8 GB önerilir.`;
    hint.className = 'hint';
  }
  document.querySelectorAll('#ramPresets .chip').forEach((c) => {
    c.classList.toggle('active', Number(c.dataset.ram) === Number(val));
  });
}

$('ramSlider').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  updateRamUI(v);
  persist({ ramMax: v });
});
document.querySelectorAll('#ramPresets .chip').forEach((c) => {
  c.onclick = () => {
    const v = Number(c.dataset.ram);
    $('ramSlider').value = v;
    updateRamUI(v);
    persist({ ramMax: v });
  };
});

// ---------------- Ekran & diğer ----------------
function updateResRow() {
  $('resRow').classList.toggle('disabled', $('fullscreen').checked);
}
$('fullscreen').addEventListener('change', (e) => {
  persist({ fullscreen: e.target.checked });
  updateResRow();
});
$('width').addEventListener('change', (e) => persist({ width: Number(e.target.value) || 1280 }));
$('height').addEventListener('change', (e) => persist({ height: Number(e.target.value) || 720 }));
$('discordRpc').addEventListener('change', (e) => persist({ discordRpc: e.target.checked }));
$('minimizeToTray').addEventListener('change', (e) => persist({ minimizeToTray: e.target.checked }));
$('closeOnLaunch').addEventListener('change', (e) => persist({ closeOnLaunch: e.target.checked }));
$('showSnapshots').addEventListener('change', (e) => {
  persist({ showSnapshots: e.target.checked });
  renderVersionOptions();
});
$('gameDir').addEventListener('change', (e) => persist({ gameDir: e.target.value.trim() }));
$('jvmArgs').addEventListener('change', (e) => persist({ jvmArgs: e.target.value }));

const JVM_PRESETS = {
  aikar:
    '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions ' +
    '-XX:+DisableExplicitGC -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M ' +
    '-XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 ' +
    '-XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 ' +
    '-XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1',
  lowend: '-XX:+UseG1GC -XX:MaxGCPauseMillis=50 -XX:+DisableExplicitGC -XX:+UseStringDeduplication'
};
document.querySelectorAll('#jvmPresets .chip').forEach((chip) => {
  chip.onclick = () => {
    const val = chip.dataset.jvm ? JVM_PRESETS[chip.dataset.jvm] : '';
    $('jvmArgs').value = val;
    persist({ jvmArgs: val });
    toast(chip.dataset.jvm ? `JVM hazır ayarı uygulandı: ${chip.textContent.trim()}` : 'JVM argümanları temizlendi');
  };
});

$('btnShareLogs').onclick = async () => {
  const btn = $('btnShareLogs');
  btn.disabled = true;
  btn.textContent = '⏳ Yükleniyor...';
  try {
    const res = await window.api.shareLogs({ consoleText: $('console').textContent || '' });
    if (!res.ok) return toast(res.error, true);
    toast(`Log linki panoya kopyalandı: ${res.url}`);
    log(`> Log paylaşıldı: ${res.url}`, 'info');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔗 Logu Paylaş (mclo.gs)';
  }
};
$('btnPickDir').onclick = async () => {
  const dir = await window.api.pickFolder();
  if (dir) {
    $('gameDir').value = dir;
    persist({ gameDir: dir });
  }
};
$('btnClearLog').onclick = () => ($('console').innerHTML = '');

function updateStats() {
  const inst = getActiveInstance();
  if (inst) {
    $('statLoader').textContent = `${LOADER_LABELS[inst.loader]} ${inst.mcVersion}`;
    $('statMods').textContent = `${inst.modsCount || 0} Mod · ${inst.shadersCount || 0} Shader`;
  }
  let java = selectedJava();
  if (!settings.javaPath && requiredJava) java = bestJavaFor(requiredJava);
  const jTxt = java ? `Java ${java.major}` : requiredJava ? `Java ${requiredJava}` : 'Oto';
  $('statRam').textContent = `${gb(settings.ramMax || 4096)} · ${jTxt}`;
}

// ---------------- Güncelleme Sistemi (Sabit Resmi GitHub Deposu) ----------------
const OFFICIAL_GITHUB_URL = 'https://github.com/lumora-launcher/lumora-launcher';

function openUpdatePopup(ev) {
  if (!ev) return;
  const badge = $('updatePopupBadge');
  if (badge) badge.textContent = i18nT(ev.prerelease ? 'upd_popup_badge_beta' : 'upd_popup_badge_stable');
  $('updatePopupTitle').textContent = i18nFmt('upd_popup_title_fmt', { ver: ev.version });
  const sizePart = ev.exeSize ? ` · ${(ev.exeSize / 1024 / 1024).toFixed(1)} MB` : '';
  $('updatePopupSub').textContent = `v${sys.appVersion} → v${ev.version}${sizePart}`;

  const notesWrap = $('updatePopupNotesWrap');
  if (ev.releaseNotes) {
    notesWrap.classList.remove('hidden');
    $('updatePopupNotesBody').textContent = ev.releaseNotes;
  } else {
    notesWrap.classList.add('hidden');
  }

  $('updatePopupProgressWrap').classList.add('hidden');
  const dlPopupBtn = $('btnPopupDownload');
  dlPopupBtn.disabled = false;
  dlPopupBtn.classList.remove('hidden');
  $('lblPopupDownload').textContent = i18nT('upd_popup_dl_btn');
  $('btnPopupInstall').classList.add('hidden');
  $('updatePopupStatusMsg').textContent = i18nT('upd_popup_hint');
  $('updatePopupModal').classList.remove('hidden');
}

function handleUpdateEvent(ev) {
  if (!ev) return;
  const checkBtn = $('btnCheckUpdate');
  const dlBtn = $('btnDownloadUpdate');
  const instBtn = $('btnInstallUpdate');
  const progWrap = $('updateProgressWrap');
  const notesBox = $('releaseNotesBox');
  const title = $('updateStatusTitle');
  const dlLabel = dlBtn.querySelector('.play-label') || dlBtn;

  if (ev.state === 'checking') {
    checkBtn.disabled = true;
    checkBtn.querySelector('.play-label').textContent = 'DENETLENİYOR...';
    title.textContent = ev.message || 'Resmi GitHub sunucusu üzerinden yeni sürüm aranıyor...';
    return;
  }

  checkBtn.disabled = false;
  checkBtn.querySelector('.play-label').textContent = i18nT('upd_check_btn');

  if (ev.state === 'available') {
    latestUpdateInfo = ev;
    title.textContent = `${i18nFmt('upd_popup_title_fmt', { ver: ev.version })} (v${sys.appVersion} → v${ev.version})`;
    dlBtn.disabled = false;
    dlLabel.textContent = i18nT('upd_popup_dl_btn');
    dlBtn.classList.remove('hidden');
    instBtn.classList.add('hidden');
    $('navUpdateDot').classList.add('show');
    $('updateBannerText').textContent = `${i18nFmt('upd_popup_title_fmt', { ver: ev.version })}`;
    $('updateBanner').classList.add('show');

    if (ev.releaseNotes) {
      notesBox.classList.remove('hidden');
      $('releaseNotesTitle').textContent = `${ev.releaseName || 'v' + ev.version} — ${i18nT('upd_notes_title')}`;
      $('releaseNotesBody').textContent = ev.releaseNotes;
    }
    openUpdatePopup(ev);
  } else if (ev.state === 'downloading') {
    const pct = Math.max(0, Math.min(100, Number(ev.percent) || 0));
    const sizeTxt =
      ev.total > 0
        ? ` (${(ev.transferred / 1024 / 1024).toFixed(1)} / ${(ev.total / 1024 / 1024).toFixed(1)} MB)`
        : '';

    progWrap.classList.remove('hidden');
    $('updateProgressBar').style.width = `${pct}%`;
    $('updateProgressPct').textContent = `${pct}%`;
    $('updateProgressText').textContent = `${i18nT('upd_popup_installing_btn')}${sizeTxt}`;
    dlBtn.disabled = true;
    dlLabel.textContent = `⏳ ${pct}%`;

    const popupModal = $('updatePopupModal');
    if (popupModal && !popupModal.classList.contains('hidden')) {
      $('updatePopupProgressWrap').classList.remove('hidden');
      $('updatePopupProgressBar').style.width = `${pct}%`;
      $('updatePopupProgressPct').textContent = `${pct}%`;
      $('updatePopupProgressText').textContent = `${i18nT('upd_popup_installing_btn')}${sizeTxt}`;
      $('btnPopupDownload').disabled = true;
      $('lblPopupDownload').textContent = `⏳ ${pct}%`;
    }
  } else if (ev.state === 'downloaded') {
    progWrap.classList.add('hidden');
    dlBtn.classList.add('hidden');
    instBtn.classList.remove('hidden');
    $('updatePopupProgressWrap').classList.add('hidden');
    $('btnPopupDownload').classList.add('hidden');
    $('btnPopupInstall').classList.remove('hidden');
    const doneMsg =
      ev.message || 'Güncelleme indirildi! Kurulum sihirbazı açılmadan arka planda sessizce güncellenip yeniden başlatılıyor...';
    title.textContent = doneMsg;
    $('updatePopupStatusMsg').textContent = doneMsg;
    toast(doneMsg);
  } else if (ev.state === 'up-to-date') {
    dlBtn.classList.add('hidden');
    instBtn.classList.add('hidden');
    notesBox.classList.add('hidden');
    $('navUpdateDot').classList.remove('show');
    $('updateBanner').classList.remove('show');
    title.textContent = ev.message || `v${sys.appVersion}`;
  } else if (ev.state === 'no-release') {
    dlBtn.classList.add('hidden');
    instBtn.classList.add('hidden');
    notesBox.classList.add('hidden');
    title.textContent = ev.message;
  } else if (ev.state === 'error') {
    dlBtn.disabled = false;
    dlLabel.textContent = i18nT('upd_popup_dl_btn');
    $('btnPopupDownload').disabled = false;
    $('lblPopupDownload').textContent = i18nT('upd_popup_dl_btn');
    title.textContent = `Hata: ${ev.message}`;
    $('updatePopupStatusMsg').textContent = `Hata: ${ev.message}`;
    toast(ev.message, true);
  }
}

window.api.onUpdateEvent(handleUpdateEvent);

async function startUpdateDownload() {
  if (!latestUpdateInfo) return;
  const dlBtn = $('btnDownloadUpdate');
  const dlLabel = dlBtn.querySelector('.play-label') || dlBtn;
  dlBtn.disabled = true;
  dlLabel.textContent = i18nT('upd_popup_installing_btn');
  $('btnPopupDownload').disabled = true;
  $('lblPopupDownload').textContent = i18nT('upd_popup_installing_btn');

  const url = latestUpdateInfo.downloadUrl || latestUpdateInfo.htmlUrl;
  const res = await window.api.downloadUpdate(url);
  if (!res || !res.ok) {
    dlBtn.disabled = false;
    dlLabel.textContent = i18nT('upd_popup_dl_btn');
    $('btnPopupDownload').disabled = false;
    $('lblPopupDownload').textContent = i18nT('upd_popup_dl_btn');
    toast((res && res.error) || 'Update error', true);
  } else if (res.mode === 'browser') {
    dlBtn.disabled = false;
    dlLabel.textContent = i18nT('upd_popup_dl_btn');
    $('btnPopupDownload').disabled = false;
    $('lblPopupDownload').textContent = i18nT('upd_popup_dl_btn');
  }
}

$('btnCheckUpdate').onclick = async () => {
  const r = await window.api.checkForUpdates();
  if (r && r.state === 'up-to-date') toast('Lumora güncel!');
  else if (r && r.state === 'available') toast(`${i18nFmt('upd_popup_title_fmt', { ver: r.version })}`);
  else if (r && r.state === 'no-release') toast(r.message || 'Henüz Release yok');
};

$('btnDownloadUpdate').onclick = () => startUpdateDownload();
$('btnPopupDownload').onclick = () => startUpdateDownload();

$('btnInstallUpdate').onclick = async () => {
  const res = await window.api.installUpdate();
  if (!res.ok) toast(res.error, true);
};
$('btnPopupInstall').onclick = async () => {
  const res = await window.api.installUpdate();
  if (!res.ok) toast(res.error, true);
};

$('btnUpdatePopupClose').onclick = () => $('updatePopupModal').classList.add('hidden');
$('btnPopupLater').onclick = () => $('updatePopupModal').classList.add('hidden');
$('btnPopupOpenGithub').onclick = () => {
  window.api.openExternal((latestUpdateInfo && latestUpdateInfo.htmlUrl) || OFFICIAL_GITHUB_URL);
};

$('btnOpenReleasePage').onclick = () => {
  window.api.openExternal((latestUpdateInfo && latestUpdateInfo.htmlUrl) || OFFICIAL_GITHUB_URL);
};

$('btnOpenGithubRepo').onclick = () => {
  window.api.openExternal(OFFICIAL_GITHUB_URL);
};

$('btnBannerUpdate').onclick = () => {
  if (latestUpdateInfo) openUpdatePopup(latestUpdateInfo);
  else navigateTo('updates');
};
$('btnBannerDismiss').onclick = () => $('updateBanner').classList.remove('show');
$('autoUpdateCheck').addEventListener('change', (e) => persist({ autoUpdateCheck: e.target.checked }));
$('receiveBetaUpdates').addEventListener('change', (e) => persist({ receiveBetaUpdates: e.target.checked }));

// ---------------- İndirici Önbelleği Temizleyici ----------------
$('btnClearCache').onclick = async () => {
  const btn = $('btnClearCache');
  btn.disabled = true;
  const res = await window.api.clearCache();
  btn.disabled = false;
  if (!res || !res.ok) return toast((res && res.error) || 'Error', true);
  if (res.freedBytes > 0) {
    toast(i18nFmt('cache_cleared_fmt', { mb: res.freedMb }));
  } else {
    toast(i18nT('cache_already_clean'));
  }
};

// ---------------- Evrensel Sürükle-Bırak Kurulumu (.jar / .zip / .mrpack) ----------------
let dropDepth = 0;
function hasDroppedFiles(e) {
  return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
}

window.addEventListener('dragenter', (e) => {
  if (!hasDroppedFiles(e)) return;
  e.preventDefault();
  dropDepth++;
  const inst = getActiveInstance();
  if ($('dropOverlayTarget') && inst) {
    $('dropOverlayTarget').textContent = i18nFmt('drop_hint', { name: inst.name });
  }
  $('dropOverlay').classList.add('active');
});

window.addEventListener('dragover', (e) => {
  if (!hasDroppedFiles(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (e) => {
  if (!hasDroppedFiles(e)) return;
  dropDepth = Math.max(0, dropDepth - 1);
  if (dropDepth === 0) {
    $('dropOverlay').classList.remove('active');
  }
});

window.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropDepth = 0;
  $('dropOverlay').classList.remove('active');
  const rawFiles = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
  if (!rawFiles.length) return;

  const paths = rawFiles
    .map((f) => window.api.getPathForFile(f))
    .filter((p) => /\.(jar|zip|mrpack)$/i.test(p));

  if (!paths.length) {
    return toast(i18nT('drop_no_valid'), true);
  }

  const inst = getActiveInstance();
  toast(i18nT('drop_installing'));
  const res = await window.api.installDroppedFiles(activeInstanceId, paths);
  if (!res || !res.ok) {
    return toast((res && res.error) || 'Error', true);
  }
  if (res.newInstanceId) {
    activeInstanceId = res.newInstanceId;
  }
  await refreshInstances();

  const packItem = (res.installed || []).find((x) => x.kind === 'mrpack' && x.instance);
  if (packItem) {
    toast(i18nFmt('drop_done_pack', { name: packItem.instance.name }));
  } else if (res.installed && res.installed.length > 0) {
    toast(i18nFmt('drop_done_mods', { n: res.installed.length, name: (inst && inst.name) || '' }));
  } else {
    toast(i18nT('drop_no_valid'), true);
  }
});

// ---------------- Çökme Analizcisi Modalı & Manuel Log Analizi ----------------
let lastMissingModId = null;

function showCrashModal(info) {
  if (!info) return;
  $('crashTitle').textContent = info.title || 'Oyun Beklenmedik Şekilde Kapandı';
  $('crashDetail').textContent = info.detail || '';
  lastMissingModId = info.missingMod || null;
  const searchBtn = $('btnCrashSearchMod');
  if (lastMissingModId) {
    searchBtn.textContent = `🔍 "${lastMissingModId}" Modunu Modrinth'te Ara`;
    searchBtn.classList.remove('hidden');
  } else {
    searchBtn.classList.add('hidden');
  }
  $('crashModal').classList.remove('hidden');
}

window.api.onCrash((info) => showCrashModal(info));

$('btnAnalyzeCrash').onclick = async () => {
  const logsText = $('console').textContent || '';
  const info = await window.api.analyzeInstanceCrash({ logsText });
  showCrashModal(info);
};

$('btnCrashSearchMod').onclick = () => {
  $('crashModal').classList.add('hidden');
  if (lastMissingModId) {
    $('modrinthSearchInput').value = lastMissingModId;
    navigateTo('modrinth');
    runModrinthSearch(false);
  }
};

$('btnCrashClose').onclick = () => $('crashModal').classList.add('hidden');
$('btnCrashConsole').onclick = () => {
  $('crashModal').classList.add('hidden');
  navigateTo('console');
};

// ---------------- Oyunu başlat ----------------
const playBtn = $('playBtn');
const progressWrap = $('progressWrap');
const bar = $('progressBar');

function setProgress(text, pct) {
  progressWrap.classList.add('show');
  $('progressText').textContent = text;
  if (pct == null) {
    bar.classList.add('indeterminate');
    $('progressPct').textContent = '';
  } else {
    bar.classList.remove('indeterminate');
    bar.style.width = `${pct}%`;
    $('progressPct').textContent = `${Math.round(pct)}%`;
  }
}

const TASK_NAMES = {
  java: 'Java indiriliyor',
  'base-jar': 'Ana Minecraft sürümü (Vanilla) indiriliyor',
  optifine: 'OptiFine paketi indiriliyor ve kuruluyor',
  neoforge: 'NeoForge paketi indiriliyor ve kuruluyor',
  mrpack: 'Modpack (.mrpack) içerikleri indiriliyor',
  assets: 'Oyun dosyaları indiriliyor',
  natives: 'Native dosyalar indiriliyor',
  classes: 'Kütüphaneler indiriliyor',
  'classes-custom': 'Mod yükleyici kütüphaneleri indiriliyor',
  'classes-maven-custom': 'Forge kütüphaneleri indiriliyor'
};

// ---------------- Skin & Karakter Stüdyosu (Dahili 3B Motor + Alex/Steve + Mojang API) ----------------
let activeSkinPreviewName = 'Steve';
let skinStudioCanvas = null;
let skinStudioModel = 'classic';
let skinViewAngle = 'front';
let skinWalkPose = true;

function renderSkinStudioFrame() {
  const canvas = $('skinFullBodyCanvas');
  if (!canvas || !skinStudioCanvas) return;
  renderSkinBodyToCanvas(canvas, skinStudioCanvas, {
    model: skinStudioModel,
    viewAngle: skinViewAngle,
    walkPose: skinWalkPose
  });
  $('skinDetectedModelBadge').textContent =
    skinStudioModel === 'slim' ? 'Model: Alex (İnce 3px Kol)' : 'Model: Steve (Klasik 4px)';
  $('skinBustImg').src = renderSkinHeadToDataUrl(skinStudioCanvas);
  $('btnSkinToggleWalk').classList.toggle('accent-border', skinWalkPose);
}

async function updateSkinStudioPreview(rawName, useLocalIfEmpty = false) {
  const clean = (String(rawName || '').trim() || 'Steve').replace(/[^A-Za-z0-9_]/g, '') || 'Steve';
  activeSkinPreviewName = clean;
  $('skinStudioPreviewLabel').textContent = clean;
  $('skinMetaSubLabel').textContent = 'Mojang API aranıyor...';

  if (useLocalIfEmpty && settings.customSkinDataUrl) {
    try {
      const img = await loadImageElement(settings.customSkinDataUrl);
      skinStudioCanvas = normalizeSkinToCanvas(img);
      skinStudioModel = settings.offlineSkinModel || 'classic';
      $('skinMetaSubLabel').textContent = 'Özel yerel PNG skin aktif';
      renderSkinStudioFrame();
      return;
    } catch {}
  }

  const resolved = await resolveCanvasForSkinLookup(clean, settings.offlineSkinModel || 'classic');
  skinStudioCanvas = resolved.skinCanvas;
  skinStudioModel = resolved.model;
  $('skinStudioPreviewLabel').textContent = resolved.name;
  $('skinMetaSubLabel').textContent = resolved.found
    ? `Mojang resmi profil · ${resolved.model === 'slim' ? 'Alex (İnce)' : 'Steve (Klasik)'}`
    : 'Mojang kaydı yok (Varsayılan / Çevrimdışı model)';
  renderSkinStudioFrame();
}

function syncSkinStudioControls() {
  $('offlineSkinModelSelect').value = settings.offlineSkinModel || 'classic';
  $('btnClearLocalSkin').classList.toggle('hidden', !settings.customSkinDataUrl);
}

function openSkinStudio() {
  const curName =
    settings.authMode === 'microsoft'
      ? settings.username || 'Steve'
      : $('username').value.trim() || settings.username || 'Steve';
  $('skinSearchInput').value = curName;
  syncSkinStudioControls();
  updateSkinStudioPreview(curName, true);
  $('skinStudioModal').classList.remove('hidden');
}

$('avatarCard').onclick = openSkinStudio;
$('avatarCard').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openSkinStudio();
  }
});

$('btnSkinStudioClose').onclick = () => $('skinStudioModal').classList.add('hidden');
$('skinStudioModal').addEventListener('click', (e) => {
  if (e.target === $('skinStudioModal')) $('skinStudioModal').classList.add('hidden');
});
$('configEditorModal').addEventListener('click', (e) => {
  if (e.target === $('configEditorModal')) {
    editingConfigState = null;
    $('configEditorModal').classList.add('hidden');
  }
});

$('btnSkinFlipView').onclick = () => {
  skinViewAngle = skinViewAngle === 'front' ? 'back' : 'front';
  renderSkinStudioFrame();
};

$('btnSkinToggleWalk').onclick = () => {
  skinWalkPose = !skinWalkPose;
  renderSkinStudioFrame();
};

$('btnSkinPreview').onclick = () => updateSkinStudioPreview($('skinSearchInput').value, false);
$('skinSearchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') updateSkinStudioPreview($('skinSearchInput').value, false);
});

$('offlineSkinModelSelect').addEventListener('change', (e) => {
  const m = e.target.value === 'slim' ? 'slim' : 'classic';
  settings.offlineSkinModel = m;
  settings.offlineSkinModelOverride = true;
  skinStudioModel = m;
  persist({ offlineSkinModel: m, offlineSkinModelOverride: true });
  if (!skinStudioCanvas || $('skinMetaSubLabel').textContent.includes('Varsayılan')) {
    skinStudioCanvas = createFallbackSkinCanvas(m);
  }
  renderSkinStudioFrame();
  lastAvatarLookupKey = '';
  updateGreeting();
  toast(m === 'slim' ? 'Çevrimdışı model: Alex (İnce Kol) seçildi ✓' : 'Çevrimdışı model: Steve (Klasik) seçildi ✓');
});

$('btnPickLocalSkin').onclick = async () => {
  const res = await window.api.pickLocalSkinPng({});
  if (res.canceled) return;
  if (!res.ok) return toast(res.error || 'Skin seçilemedi', true);
  settings.customSkinDataUrl = res.skinDataUrl;
  settings.offlineSkinModel = res.model;
  settings.offlineSkinModelOverride = true;
  syncSkinStudioControls();
  const img = await loadImageElement(res.skinDataUrl);
  skinStudioCanvas = normalizeSkinToCanvas(img);
  skinStudioModel = res.model;
  $('skinMetaSubLabel').textContent = `Yerel PNG skin (${res.model === 'slim' ? 'Alex' : 'Steve'})`;
  renderSkinStudioFrame();
  lastAvatarLookupKey = '';
  updateGreeting();
  toast(`Özel skin yüklendi (Algılanan model: ${res.model === 'slim' ? 'Alex' : 'Steve'}) ✓`);
};

$('btnClearLocalSkin').onclick = async () => {
  await window.api.clearLocalSkinPng();
  settings.customSkinDataUrl = '';
  syncSkinStudioControls();
  lastAvatarLookupKey = '';
  await updateSkinStudioPreview($('skinSearchInput').value, false);
  updateGreeting();
  toast('Özel yerel skin temizlendi');
};

$('btnInstallSkinMod').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  if (inst.loader === 'vanilla' || inst.loader === 'optifine') {
    return toast('CustomSkinLoader modu için Fabric, Forge, NeoForge veya Quilt profili seçmelisin!', true);
  }
  const btn = $('btnInstallSkinMod');
  btn.disabled = true;
  btn.textContent = '⏳ CustomSkinLoader Aranıyor...';
  try {
    const searchRes = await window.api.modrinthSearch({
      query: 'CustomSkinLoader',
      projectType: 'mod',
      mcVersion: inst.mcVersion,
      loader: inst.loader,
      limit: 5
    });
    const hit = (searchRes.hits || []).find((h) => /customskinloader/i.test(h.slug || h.title)) || (searchRes.hits || [])[0];
    if (!hit) {
      $('skinStudioModal').classList.add('hidden');
      $('modrinthSearchInput').value = 'skin';
      navigateTo('modrinth');
      runModrinthSearch(false);
      return toast(`${inst.mcVersion} (${LOADER_LABELS[inst.loader]}) için alternatif skin modları gösteriliyor.`);
    }
    const instRes = await window.api.modrinthInstall({
      instanceId: inst.id,
      projectId: hit.project_id,
      title: hit.title,
      iconUrl: hit.icon_url,
      author: hit.author,
      projectType: 'mod'
    });
    if (!instRes.ok) return toast(instRes.error, true);
    toast(`${hit.title} aktif profile (${inst.name}) kuruldu! ✓`);
    await refreshInstances();
  } finally {
    btn.disabled = false;
    btn.textContent = '🧩 Aktif Profile Skin Modu (CustomSkinLoader) Kur';
  }
};

$('btnSkinUseName').onclick = async () => {
  const name = ($('skinSearchInput').value.trim() || activeSkinPreviewName || 'Steve').slice(0, 16);
  if (!USERNAME_RE.test(name)) {
    return toast('Geçersiz kullanıcı adı (3-16 karakter, harf, rakam ve _)', true);
  }
  settings.authMode = 'offline';
  settings.username = name;
  settings.offlineSkinModel = skinStudioModel;
  settings.offlineSkinModelOverride = false;
  $('username').value = name;
  await window.api.selectAccount({ authMode: 'offline', accountId: settings.activeAccountId });
  persist({ username: name, authMode: 'offline', offlineSkinModel: skinStudioModel, offlineSkinModelOverride: false });
  syncSkinStudioControls();
  lastAvatarLookupKey = '';
  await refreshAccountsUI();
  $('skinStudioModal').classList.add('hidden');
  toast(`Kullanıcı adı "${name}" (${skinStudioModel === 'slim' ? 'Alex' : 'Steve'}) olarak ayarlandı ✓`);
};

$('btnSkinDownloadPng').onclick = async () => {
  const name = $('skinSearchInput').value.trim() || activeSkinPreviewName || 'Steve';
  const res = await window.api.downloadSkinPng({ username: name });
  if (res.canceled) return;
  if (!res.ok) return toast(res.error || 'Skin indirilemedi', true);
  toast(`Skin (.png) kaydedildi ✓`);
};

$('btnSkinUploadMs').onclick = async () => {
  const btn = $('btnSkinUploadMs');
  const variant = $('skinVariantSelect').value;
  btn.disabled = true;
  btn.querySelector('.play-label').textContent = '⏳ YÜKLENİYOR...';
  try {
    const res = await window.api.uploadMicrosoftSkin({ variant });
    if (res.canceled) return;
    if (!res.ok) return toast(res.error || 'Skin yüklenemedi', true);
    toast(`${res.accountName} hesabına yeni skin başarıyla yüklendi! 🎉`);
    if (res.accountName) {
      lastAvatarLookupKey = '';
      await updateSkinStudioPreview(res.accountName, false);
      updateGreeting();
    }
  } finally {
    btn.disabled = false;
    btn.querySelector('.play-label').textContent = '📤 Microsoft Hesabıma Skin (.png) Yükle';
  }
};

// ---------------- Sunucu Listesi, Canlı Ping & QuickPlay ----------------
async function refreshServers() {
  const listEl = $('serversList');
  if (!listEl) return;
  const servers = await window.api.listServers();
  listEl.innerHTML = '';

  for (const srv of servers) {
    const card = document.createElement('div');
    card.className = 'srv-card';
    card.innerHTML = `
      <div class="srv-left">
        <div class="srv-icon" data-srv-icon>🌐</div>
        <div class="srv-info">
          <div class="srv-title-row">
            <strong></strong>
            <span class="srv-addr"></span>
          </div>
          <div class="srv-motd" data-srv-motd>${i18nT('lbl_querying')}</div>
        </div>
      </div>
      <div class="srv-right">
        <div class="srv-stats">
          <span class="srv-players" data-srv-players>— / —</span>
          <span class="srv-ping" data-srv-ping>${i18nT('lbl_pinging')}</span>
        </div>
        <button class="play-btn sm-btn" data-join="${srv.address}">
          <span class="play-label">${i18nT('btn_join')}</span>
        </button>
        <button class="icon-btn danger" data-del-srv="${srv.id}" title="${i18nT('srv_del_title')}">🗑</button>
      </div>
    `;
    card.querySelector('strong').textContent = srv.name;
    card.querySelector('.srv-addr').textContent = srv.address;

    card.querySelector('[data-join]').onclick = () => launchWithQuickPlay({ server: srv.address });
    card.querySelector('[data-del-srv]').onclick = async () => {
      await window.api.deleteServer(srv.id);
      toast(i18nFmt('srv_removed', { name: srv.name }));
      refreshServers();
    };

    listEl.appendChild(card);

    // Arka planda canlı ping at
    window.api.pingServer(srv.address).then((st) => {
      if (!card.isConnected) return;
      const motdEl = card.querySelector('[data-srv-motd]');
      const pEl = card.querySelector('[data-srv-players]');
      const pingEl = card.querySelector('[data-srv-ping]');
      const iconEl = card.querySelector('[data-srv-icon]');

      if (st && st.online) {
        motdEl.textContent = st.motd || `${srv.name} — ${i18nT('lbl_online')}`;
        pEl.textContent = `${fmtNum(st.playersOnline)} / ${fmtNum(st.playersMax)} ${i18nT('lbl_players')}`;
        pingEl.textContent = `● ${st.pingMs} ms`;
        pingEl.className = 'srv-ping';
        if (st.favicon) {
          iconEl.innerHTML = `<img class="srv-icon" src="${st.favicon}" alt="" />`;
        }
      } else {
        motdEl.textContent = i18nT('lbl_srv_unreachable');
        pEl.textContent = i18nT('lbl_offline_srv');
        pingEl.textContent = i18nT('lbl_closed_srv');
        pingEl.className = 'srv-ping offline';
      }
    });
  }
}

$('btnRefreshServers').onclick = () => refreshServers();
$('btnAddServer').onclick = async () => {
  const name = $('newServerName').value.trim();
  const address = $('newServerAddress').value.trim();
  if (!address) return toast(i18nT('srv_need_addr'), true);
  await window.api.addServer({ name: name || address, address });
  $('newServerName').value = '';
  $('newServerAddress').value = '';
  toast('Sunucu listeye eklendi!');
  refreshServers();
};

// ---------------- Mod & Bağımlılık Doktoru ----------------
let modDoctorPreLaunchCb = null;

async function runModDoctorUI(inst, preLaunchCallback = null) {
  if (!inst) return;
  modDoctorPreLaunchCb = preLaunchCallback;
  const res = await window.api.runModDoctor(inst.id);
  const listEl = $('modDoctorList');
  const summaryEl = $('modDoctorSummary');
  const launchBtn = $('btnModDoctorLaunchAnyway');

  if (!res || !res.ok) {
    return toast((res && res.error) || 'Mod Doctor error', true);
  }

  listEl.innerHTML = '';
  const issues = res.issues || [];
  if (!issues.length) {
    summaryEl.textContent = i18nFmt('doc_clean_fmt', { n: res.modsScanned || 0 });
    summaryEl.className = 'badge ok-badge';
    listEl.innerHTML = `<div class="empty-state">${i18nFmt('doc_clean_fmt', { n: res.modsScanned || 0 })}</div>`;
    launchBtn.classList.add('hidden');
  } else {
    summaryEl.textContent = i18nFmt('doc_issues_fmt', { n: res.modsScanned || 0, c: issues.length });
    summaryEl.className = 'badge warn-badge';
    launchBtn.classList.toggle('hidden', !preLaunchCallback);

    for (const iss of issues) {
      const row = document.createElement('div');
      row.className = `doctor-issue-item${iss.type === 'mc_mismatch' ? ' error' : ''}`;
      const descText =
        iss.type === 'mc_mismatch'
          ? i18nFmt('doc_mc_mismatch', { req: iss.requiredVer, cur: iss.currentVer })
          : i18nFmt('doc_missing_dep', { dep: iss.depId });

      row.innerHTML = `
        <div class="doctor-issue-info">
          <strong></strong>
          <span></span>
        </div>
        ${iss.searchQuery ? `<button type="button" class="ghost-btn accent-border" data-doc-mr>${i18nT('doc_search_mr')}</button>` : ''}
      `;
      row.querySelector('strong').textContent = `${iss.modName} (${iss.fileName})`;
      row.querySelector('span').textContent = descText;
      const mrBtn = row.querySelector('[data-doc-mr]');
      if (mrBtn) {
        mrBtn.onclick = () => {
          $('modDoctorModal').classList.add('hidden');
          navigateTo('modrinth');
          $('modrinthSearchInput').value = iss.searchQuery;
          runModrinthSearch(false);
        };
      }
      listEl.appendChild(row);
    }
  }

  $('modDoctorModal').classList.remove('hidden');
}

$('btnModDoctor').onclick = () => runModDoctorUI(getActiveInstance(), null);
$('btnModDoctorClose').onclick = () => {
  modDoctorPreLaunchCb = null;
  $('modDoctorModal').classList.add('hidden');
};
$('btnModDoctorCloseIcon').onclick = () => {
  modDoctorPreLaunchCb = null;
  $('modDoctorModal').classList.add('hidden');
};
$('btnModDoctorLaunchAnyway').onclick = async () => {
  const cb = modDoctorPreLaunchCb;
  modDoctorPreLaunchCb = null;
  $('modDoctorModal').classList.add('hidden');
  if (typeof cb === 'function') await cb();
};

// ---------------- Ctrl+K Hızlı Komut Paleti ----------------
let cmdPaletteItems = [];
let cmdPaletteActiveIdx = 0;

function toggleCmdPalette(forceState = null) {
  const modal = $('cmdPaletteModal');
  const open = forceState !== null ? forceState : modal.classList.contains('hidden');
  modal.classList.toggle('hidden', !open);
  if (open) {
    $('cmdPaletteInput').value = '';
    cmdPaletteActiveIdx = 0;
    renderCmdPalette();
    setTimeout(() => $('cmdPaletteInput').focus(), 20);
  }
}

function renderCmdPalette() {
  const q = ($('cmdPaletteInput').value || '').trim().toLowerCase();
  const listEl = $('cmdPaletteList');
  listEl.innerHTML = '';

  const actions = [];
  if (q) {
    actions.push({
      icon: '🟢',
      title: `Modrinth: "${$('cmdPaletteInput').value.trim()}"`,
      sub: i18nT('mr_page_title'),
      tag: 'Modrinth',
      run: () => {
        navigateTo('modrinth');
        $('modrinthSearchInput').value = $('cmdPaletteInput').value.trim();
        runModrinthSearch(false);
      }
    });
  }

  actions.push(
    { icon: '▶', title: i18nT('play_btn'), sub: getActiveInstance() ? getActiveInstance().name : '', tag: 'Launch', run: () => launchWithQuickPlay() },
    { icon: '🩺', title: i18nT('btn_mod_doctor').replace(/^\S+\s+/, ''), sub: i18nT('doc_title').replace(/^\S+\s+/, ''), tag: 'Doctor', run: () => runModDoctorUI(getActiveInstance(), null) },
    { icon: '👕', title: (i18nT('skin_studio_badge') || '3D Skin Studio').replace(/^\S+\s+/, ''), sub: 'Steve / Alex', tag: 'Skin', run: () => openSkinStudio() },
    { icon: '🔄', title: i18nT('upd_check_btn'), sub: `v${sys.appVersion}`, tag: 'Update', run: () => { navigateTo('updates'); window.api.checkForUpdates(); } },
    { icon: '🧹', title: i18nT('btn_clear_cache').replace(/^\S+\s+/, ''), sub: i18nT('set_advanced'), tag: 'Cache', run: () => $('btnClearCache').click() },
    { icon: '📂', title: i18nT('nav_folder'), sub: settings.gameDir, tag: 'Folder', run: () => window.api.openFolder() }
  );

  for (const inst of instances) {
    actions.push({
      icon: getInstIcon(inst),
      title: inst.name,
      sub: `${LOADER_LABELS[inst.loader] || inst.loader} ${inst.mcVersion}`,
      tag: i18nT('nav_instances'),
      run: () => {
        selectActiveInstance(inst.id);
        navigateTo('instances');
      }
    });
  }

  const themes = [
    ['aurora', 'Aurora'],
    ['emerald', 'Emerald'],
    ['nether', 'Nether'],
    ['cyber', 'Cyberpunk'],
    ['frost', 'Frost']
  ];
  for (const [tid, tname] of themes) {
    actions.push({
      icon: '🎨',
      title: `${tname}`,
      sub: i18nT('nav_appearance'),
      tag: 'Theme',
      run: () => {
        applyTheme(tid);
        persist({ theme: tid });
      }
    });
  }

  cmdPaletteItems = q
    ? actions.filter((a) => `${a.title} ${a.sub} ${a.tag}`.toLowerCase().includes(q))
    : actions;
  cmdPaletteActiveIdx = Math.min(cmdPaletteActiveIdx, Math.max(0, cmdPaletteItems.length - 1));

  cmdPaletteItems.slice(0, 12).forEach((item, idx) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `cmd-item${idx === cmdPaletteActiveIdx ? ' active' : ''}`;
    row.innerHTML = `
      <div class="cmd-item-left">
        <span>${item.icon}</span>
        <div>
          <strong></strong>
          <small></small>
        </div>
      </div>
      <span class="cmd-item-tag"></span>
    `;
    row.querySelector('strong').textContent = item.title;
    row.querySelector('small').textContent = item.sub || '';
    row.querySelector('.cmd-item-tag').textContent = item.tag || '';
    row.onclick = () => {
      toggleCmdPalette(false);
      item.run();
    };
    listEl.appendChild(row);
  });
}

$('btnOpenCmdPalette').onclick = () => toggleCmdPalette(true);
$('cmdPaletteInput').addEventListener('input', () => {
  cmdPaletteActiveIdx = 0;
  renderCmdPalette();
});
$('cmdPaletteInput').addEventListener('keydown', (e) => {
  const maxIdx = Math.min(cmdPaletteItems.length, 12) - 1;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdPaletteActiveIdx = Math.min(maxIdx, cmdPaletteActiveIdx + 1);
    renderCmdPalette();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdPaletteActiveIdx = Math.max(0, cmdPaletteActiveIdx - 1);
    renderCmdPalette();
  } else if (e.key === 'Enter' && cmdPaletteItems[cmdPaletteActiveIdx]) {
    e.preventDefault();
    const picked = cmdPaletteItems[cmdPaletteActiveIdx];
    toggleCmdPalette(false);
    picked.run();
  } else if (e.key === 'Escape') {
    toggleCmdPalette(false);
  }
});
$('cmdPaletteModal').addEventListener('click', (e) => {
  if (e.target === $('cmdPaletteModal')) toggleCmdPalette(false);
});
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggleCmdPalette();
  } else if (e.key === 'Escape') {
    $('cmdPaletteModal').classList.add('hidden');
    $('screenshotPreviewModal').classList.add('hidden');
  }
});

async function launchWithQuickPlay({ server = null, world = null, skipDoctor = false } = {}) {
  if (!validateUsername()) {
    navigateTo('home');
    $('username').focus();
    return toast('Önce geçerli bir kullanıcı adı girin', true);
  }
  const inst = getActiveInstance();
  if (!inst) return toast('Lütfen bir profil seçin', true);

  if (!skipDoctor && inst.loader !== 'vanilla' && inst.loader !== 'optifine' && (inst.modsCount || 0) > 0) {
    try {
      const doc = await window.api.runModDoctor(inst.id);
      if (doc && doc.ok && doc.issues && doc.issues.length > 0) {
        return runModDoctorUI(inst, () => launchWithQuickPlay({ server, world, skipDoctor: true }));
      }
    } catch {}
  }

  navigateTo('home');
  let javaPath = settings.javaPath;
  if (!javaPath && requiredJava) {
    const best = bestJavaFor(requiredJava);
    javaPath = best ? best.path : '';
  }

  const targetDesc = server ? ` -> Sunucu: ${server}` : world ? ` -> Dünya: ${world}` : '';
  log(
    `> ${settings.username} olarak "${inst.name}" (${LOADER_LABELS[inst.loader]} ${inst.mcVersion}) başlatılıyor${targetDesc}...`,
    'info'
  );
  const res = await window.api.launch({
    ...settings,
    activeInstanceId: inst.id,
    version: inst.mcVersion,
    javaPath,
    quickPlayServer: server,
    quickPlayWorld: world
  });
  if (!res.ok) {
    toast(res.error, true);
    log(res.error, 'err');
  }
}

window.api.onProgress((p) => {
  const pct = p.total ? (p.task / p.total) * 100 : null;
  setProgress(`${TASK_NAMES[p.type] || 'İndiriliyor'} (${p.task}/${p.total})`, pct);
});

window.api.onLog(({ level, msg }) => {
  const isErr = /error|exception|failed/i.test(msg);
  log(msg.trimEnd(), isErr ? 'err' : level === 'debug' ? 'debug' : '');
});

window.api.onState((state) => {
  if (state === 'preparing') {
    playBtn.disabled = true;
    playBtn.querySelector('.play-label').textContent = 'HAZIRLANIYOR';
    setProgress('Profil ve mod yükleyici hazırlanıyor...', null);
  } else if (state === 'running') {
    playBtn.querySelector('.play-label').textContent = 'OYUNDA';
    setProgress('Oyun başlatıldı, iyi eğlenceler!', 100);
    setTimeout(() => progressWrap.classList.remove('show'), 3000);
  } else if (state === 'closed') {
    playBtn.disabled = false;
    playBtn.querySelector('.play-label').textContent = 'OYNA';
    progressWrap.classList.remove('show');
    refreshInstances();
  }
});

playBtn.onclick = () => launchWithQuickPlay();

function applyActiveLanguage(lang) {
  const chosen = window.LumoraI18n ? window.LumoraI18n.applyLanguage(lang) : 'tr';
  settings.language = chosen;
  const sel = $('titlebarLangSelect');
  if (sel) sel.value = chosen;
  applyTheme(settings.theme || 'aurora');
  updateGreeting();
  const isMs = settings.authMode === 'microsoft';
  const badge = $('accountModeBadge');
  if (badge && window.LumoraI18n) {
    badge.textContent = window.LumoraI18n.t(isMs ? 'pill_original' : 'pill_offline');
  }
  const chPill = $('releaseChannelPill');
  if (chPill) chPill.textContent = i18nT(sys && sys.isBeta ? 'ch_beta' : 'ch_stable');

  if (versionData) {
    validateUsername();
    checkJavaCompat();
    renderJavaSelect();
    $('javaSelect').value = settings.javaPath || '';
  }
  if (instances && instances.length) {
    renderInstanceCards();
    renderActiveInstanceDetails();
    updateModrinthFilterBadge();
  }
  if (lastModrinthHits && lastModrinthHits.length) {
    const box = $('modrinthResults');
    box.innerHTML = '';
    for (const hit of lastModrinthHits) box.appendChild(createModrinthCard(hit));
    $('modrinthCountBadge').textContent = i18nFmt('mr_showing', {
      shown: currentModrinthOffset,
      total: fmtNum(currentModrinthTotal)
    });
    const loadMoreBtn = $('btnModrinthLoadMore');
    if (loadMoreBtn && !loadMoreBtn.classList.contains('hidden')) {
      loadMoreBtn.textContent = i18nFmt('mr_load_more', {
        shown: currentModrinthOffset,
        total: fmtNum(currentModrinthTotal)
      });
    }
  }
  if ($('serversList') && $('serversList').children.length > 0) {
    refreshServers();
  }
}

$('titlebarLangSelect').addEventListener('change', (e) => {
  const lang = e.target.value;
  applyActiveLanguage(lang);
  persist({ language: lang });
});

// ---------------- Başlangıç ----------------
(async function init() {
  sys = await window.api.systemInfo();
  settings = await window.api.getSettings();
  activeInstanceId = settings.activeInstanceId || 'default-vanilla';

  const isBeta = !!sys.isBeta;
  document.documentElement.setAttribute('data-channel', isBeta ? 'beta' : 'stable');

  $('appVersionBadge').textContent = `v${sys.appVersion}`;
  $('currentVerText').textContent = `v${sys.appVersion}`;

  const detectedLang =
    window.LumoraI18n && window.LumoraI18n.detectSystemLanguage
      ? window.LumoraI18n.detectSystemLanguage()
      : 'tr';
  const initialLang = settings.language || detectedLang;
  applyActiveLanguage(initialLang);
  applyTheme(settings.theme || 'aurora');
  applyLayout(settings.layoutStyle || 'modern');
  $('animationsEnabled').checked = settings.animationsEnabled !== false;
  $('splashEnabled').checked = settings.splashEnabled !== false;
  applyAnimations(settings.animationsEnabled !== false);
  playSplashIntro(false);

  $('username').value = settings.username || '';
  validateUsername();
  updateGreeting();
  syncSkinStudioControls();

  // RAM kaydırıcısı
  const slider = $('ramSlider');
  const maxRam = Math.max(2048, Math.floor(sys.totalRam / 512) * 512);
  slider.max = maxRam;
  $('ramMaxLabel').textContent = gb(maxRam);
  settings.ramMax = Math.min(settings.ramMax, maxRam);
  slider.value = settings.ramMax;
  document.querySelectorAll('#ramPresets .chip').forEach((c) => {
    c.disabled = Number(c.dataset.ram) > maxRam;
  });
  updateRamUI(settings.ramMax);

  $('fullscreen').checked = !!settings.fullscreen;
  $('width').value = settings.width;
  $('height').value = settings.height;
  $('discordRpc').checked = settings.discordRpc !== false;
  $('minimizeToTray').checked = settings.minimizeToTray !== false;
  $('closeOnLaunch').checked = !!settings.closeOnLaunch;
  $('showSnapshots').checked = !!settings.showSnapshots;
  $('gameDir').value = settings.gameDir;
  $('jvmArgs').value = settings.jvmArgs || '';
  $('autoUpdateCheck').checked = settings.autoUpdateCheck !== false;
  $('receiveBetaUpdates').checked = settings.receiveBetaUpdates !== false;

  updateResRow();
  checkNetworkStatus();

  await Promise.all([scanJava(), loadVersions(), refreshInstances(), refreshAccountsUI()]);

  if (settings.autoUpdateCheck !== false) {
    window.api.checkForUpdates().catch(() => {});
  }
})();
