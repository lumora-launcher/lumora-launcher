// ============================================================
//  Lumora Launcher - Arayüz mantığı (Temalar, Animasyonlar, Güncelleme)
// ============================================================
const $ = (id) => document.getElementById(id);

let settings = {};
let sys = { totalRam: 8192, appVersion: '1.0.0', isPackaged: false };
let versionData = null;
let javaList = [];
let requiredJava = null;
let saveTimer = null;
let latestUpdateInfo = null;

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

// ---------------- Yardımcılar ----------------
function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = 'toast'), 3500);
}

const gb = (mb) => `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;

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

function navigateTo(page) {
  document.querySelectorAll('.nav-btn[data-page]').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
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
  status.textContent = 'Lumora çekirdeği başlatılıyor...';

  setTimeout(() => {
    fill.style.width = '55%';
    status.textContent = 'Java ve Mojang profilleri taranıyor...';
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
  $('activeThemeBadge').textContent = THEME_LABELS[t];
  $('statTheme').textContent = THEME_LABELS[t];

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
$('btnFolder').onclick = () => window.api.openFolder(settings.gameDir);
$('appVersionBadge').onclick = () => navigateTo('updates');

document.querySelectorAll('.nav-btn[data-page]').forEach((btn) => {
  btn.onclick = () => navigateTo(btn.dataset.page);
});

document.querySelectorAll('.stat[data-goto]').forEach((card) => {
  card.onclick = () => navigateTo(card.dataset.goto);
});

// ---------------- Kullanıcı adı ----------------
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
let avatarTimer = null;

function validateUsername() {
  const v = $('username').value.trim();
  const hint = $('usernameHint');
  if (!v) {
    hint.textContent = '3-16 karakter, harf, rakam ve _';
    hint.className = 'hint';
    return false;
  }
  if (!USERNAME_RE.test(v)) {
    hint.textContent = 'Sadece harf, rakam ve _ (3-16 karakter)';
    hint.className = 'hint error';
    return false;
  }
  hint.textContent = 'Kullanıcı adı uygun ✓';
  hint.className = 'hint ok';
  return true;
}

function updateGreeting() {
  const h = new Date().getHours();
  const part = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const name = $('username').value.trim();
  $('greeting').textContent = name ? `${part}, ${name}` : `${part}!`;
  $('avatarTag').textContent = name || 'Steve';
}

$('username').addEventListener('input', () => {
  const ok = validateUsername();
  updateGreeting();
  persist({ username: $('username').value.trim() });
  clearTimeout(avatarTimer);
  avatarTimer = setTimeout(() => {
    $('avatar').src = `https://mc-heads.net/avatar/${ok ? $('username').value.trim() : 'Steve'}/128`;
  }, 500);
});
$('avatar').onerror = function () {
  if (this.src.startsWith('data:')) return;
  this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="%237c5cff"/></svg>';
};

// ---------------- Sürümler ----------------
function renderVersions() {
  const sel = $('version');
  sel.innerHTML = '';
  if (!versionData) return;
  const list = versionData.versions.filter(
    (v) => v.type === 'release' || (settings.showSnapshots && v.type === 'snapshot')
  );
  for (const v of list) {
    const o = document.createElement('option');
    o.value = v.id;
    o.textContent = v.type === 'snapshot' ? `${v.id}  (snapshot)` : v.id;
    if (v.id === versionData.latest.release) o.textContent += '  — en yeni';
    sel.appendChild(o);
  }
  if (settings.version && list.some((v) => v.id === settings.version)) {
    sel.value = settings.version;
  } else {
    sel.value = versionData.latest.release;
  }
  onVersionChange();
}

async function loadVersions() {
  try {
    versionData = await window.api.listVersions();
    renderVersions();
  } catch (e) {
    $('version').innerHTML = '<option>İnternet bağlantısı yok</option>';
    $('javaHint').textContent = 'Sürüm listesi alınamadı';
    $('javaHint').className = 'hint error';
  }
}

async function onVersionChange() {
  const id = $('version').value;
  persist({ version: id });
  $('javaHint').textContent = 'Java gereksinimi kontrol ediliyor...';
  $('javaHint').className = 'hint';
  requiredJava = await window.api.versionJava(id);
  checkJavaCompat();
}
$('version').addEventListener('change', onVersionChange);

function selectedJava() {
  return javaList.find((j) => j.path === settings.javaPath) || null;
}

function bestJavaFor(major) {
  return javaList.find((j) => j.major === major) || javaList.find((j) => j.major >= major) || null;
}

function checkJavaCompat() {
  const hint = $('javaHint');
  if (!requiredJava) {
    hint.innerHTML = '&nbsp;';
    return;
  }
  let java = selectedJava();
  if (!settings.javaPath) java = bestJavaFor(requiredJava);

  if (!java) {
    hint.textContent = `Java ${requiredJava} gerekli — bulunamadı, OYNA'ya basınca otomatik indirilecek`;
    hint.className = 'hint warn';
  } else if (java.major < requiredJava) {
    hint.textContent = `Bu sürüm Java ${requiredJava} istiyor, seçili: Java ${java.major}`;
    hint.className = 'hint error';
  } else {
    hint.textContent = `Java ${requiredJava} gerekli · Kullanılacak: Java ${java.major}${settings.javaPath ? '' : ' (otomatik)'}`;
    hint.className = 'hint ok';
  }
  updateStats();
}

// ---------------- Java ----------------
function renderJavaSelect() {
  const sel = $('javaSelect');
  sel.innerHTML = '';
  const auto = document.createElement('option');
  auto.value = '';
  auto.textContent = 'Otomatik (sürüme göre en uygun Java)';
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
$('closeOnLaunch').addEventListener('change', (e) => persist({ closeOnLaunch: e.target.checked }));
$('showSnapshots').addEventListener('change', (e) => {
  persist({ showSnapshots: e.target.checked });
  renderVersions();
});
$('gameDir').addEventListener('change', (e) => persist({ gameDir: e.target.value.trim() }));
$('jvmArgs').addEventListener('change', (e) => persist({ jvmArgs: e.target.value }));
$('btnPickDir').onclick = async () => {
  const dir = await window.api.pickFolder();
  if (dir) {
    $('gameDir').value = dir;
    persist({ gameDir: dir });
  }
};
$('btnClearLog').onclick = () => ($('console').innerHTML = '');

function updateStats() {
  $('statRam').textContent = gb(settings.ramMax || 4096);
  $('statScreen').textContent = settings.fullscreen ? 'Tam ekran' : `${settings.width}×${settings.height}`;
  let java = selectedJava();
  if (!settings.javaPath && requiredJava) java = bestJavaFor(requiredJava);
  $('statJava').textContent = java
    ? `Java ${java.major}${settings.javaPath ? '' : ' · Oto'}`
    : requiredJava ? `Java ${requiredJava} indirilecek` : 'Otomatik';
}

const OFFICIAL_GITHUB_URL = 'https://github.com/lumora-launcher/lumora-launcher';

// ---------------- Güncelleme Sistemi (Sabit Resmi GitHub Deposu) ----------------
function handleUpdateEvent(ev) {
  if (!ev) return;
  const checkBtn = $('btnCheckUpdate');
  const dlBtn = $('btnDownloadUpdate');
  const instBtn = $('btnInstallUpdate');
  const progWrap = $('updateProgressWrap');
  const notesBox = $('releaseNotesBox');
  const title = $('updateStatusTitle');

  if (ev.state === 'checking') {
    checkBtn.disabled = true;
    checkBtn.querySelector('.play-label').textContent = 'DENETLENİYOR...';
    title.textContent = ev.message || 'Resmi GitHub sunucusu üzerinden yeni sürüm aranıyor...';
    return;
  }

  checkBtn.disabled = false;
  checkBtn.querySelector('.play-label').textContent = 'GÜNCELLEMELERİ DENETLE';

  if (ev.state === 'available') {
    latestUpdateInfo = ev;
    title.textContent = `Yeni sürüm bulundu: v${ev.version} (Mevcut: v${sys.appVersion})`;
    dlBtn.classList.remove('hidden');
    instBtn.classList.add('hidden');
    $('navUpdateDot').classList.add('show');
    $('updateBannerText').textContent = `Lumora v${ev.version} yayınlandı! Yeni özellikler ve iyileştirmeler hazır.`;
    $('updateBanner').classList.add('show');

    if (ev.releaseNotes) {
      notesBox.classList.remove('hidden');
      $('releaseNotesTitle').textContent = `${ev.releaseName || 'v' + ev.version} Sürüm Notları`;
      $('releaseNotesBody').textContent = ev.releaseNotes;
    }
  } else if (ev.state === 'downloading') {
    progWrap.classList.remove('hidden');
    $('updateProgressBar').style.width = `${ev.percent || 0}%`;
    $('updateProgressPct').textContent = `${ev.percent || 0}%`;
    $('updateProgressText').textContent = 'Güncelleme paketi indiriliyor...';
  } else if (ev.state === 'downloaded') {
    progWrap.classList.add('hidden');
    dlBtn.classList.add('hidden');
    instBtn.classList.remove('hidden');
    title.textContent = `v${ev.version} indirildi! Kurulum için yeniden başlatmaya hazır.`;
    toast('Güncelleme indirildi!');
  } else if (ev.state === 'up-to-date') {
    dlBtn.classList.add('hidden');
    instBtn.classList.add('hidden');
    notesBox.classList.add('hidden');
    $('navUpdateDot').classList.remove('show');
    $('updateBanner').classList.remove('show');
    title.textContent = ev.message || `En güncel sürümü kullanıyorsun (v${sys.appVersion}).`;
  } else if (ev.state === 'no-release') {
    dlBtn.classList.add('hidden');
    instBtn.classList.add('hidden');
    notesBox.classList.add('hidden');
    title.textContent = ev.message;
  } else if (ev.state === 'error') {
    title.textContent = `Hata: ${ev.message}`;
  }
}

window.api.onUpdateEvent(handleUpdateEvent);

$('btnCheckUpdate').onclick = async () => {
  const r = await window.api.checkForUpdates();
  if (r && r.state === 'up-to-date') toast('Lumora güncel!');
  else if (r && r.state === 'available') toast(`Yeni sürüm mevcut: v${r.version}`);
  else if (r && r.state === 'no-release') toast('Henüz yayınlanmış yeni bir Release yok');
};

$('btnDownloadUpdate').onclick = async () => {
  const url = latestUpdateInfo && (latestUpdateInfo.downloadUrl || latestUpdateInfo.htmlUrl);
  const res = await window.api.downloadUpdate(url);
  if (!res.ok) toast(res.error, true);
  else if (res.mode === 'browser') toast('İndirme sayfası tarayıcıda açıldı');
};

$('btnInstallUpdate').onclick = async () => {
  const res = await window.api.installUpdate();
  if (!res.ok) toast(res.error, true);
};

$('btnOpenReleasePage').onclick = () => {
  window.api.openExternal((latestUpdateInfo && latestUpdateInfo.htmlUrl) || OFFICIAL_GITHUB_URL);
};

$('btnOpenGithubRepo').onclick = () => {
  window.api.openExternal(OFFICIAL_GITHUB_URL);
};

$('btnBannerUpdate').onclick = () => {
  navigateTo('updates');
};
$('btnBannerDismiss').onclick = () => {
  $('updateBanner').classList.remove('show');
};

$('autoUpdateCheck').addEventListener('change', (e) => persist({ autoUpdateCheck: e.target.checked }));

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
  assets: 'Oyun dosyaları indiriliyor',
  natives: 'Native dosyalar indiriliyor',
  classes: 'Kütüphaneler indiriliyor',
  'classes-custom': 'Kütüphaneler indiriliyor',
  'classes-maven-custom': 'Kütüphaneler indiriliyor'
};

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
    setProgress('Hazırlanıyor...', null);
  } else if (state === 'running') {
    playBtn.querySelector('.play-label').textContent = 'OYUNDA';
    setProgress('Oyun başlatıldı, iyi eğlenceler!', 100);
    setTimeout(() => progressWrap.classList.remove('show'), 3000);
  } else if (state === 'closed') {
    playBtn.disabled = false;
    playBtn.querySelector('.play-label').textContent = 'OYNA';
    progressWrap.classList.remove('show');
  }
});

playBtn.onclick = async () => {
  if (!validateUsername()) {
    $('username').focus();
    return toast('Geçerli bir kullanıcı adı gir', true);
  }
  if (!versionData) return toast('Sürüm listesi yüklenemedi', true);

  let javaPath = settings.javaPath;
  if (!javaPath && requiredJava) {
    const best = bestJavaFor(requiredJava);
    javaPath = best ? best.path : '';
  }

  log(`> ${settings.username} olarak ${settings.version} başlatılıyor (RAM: ${gb(settings.ramMax)})`, 'info');
  const res = await window.api.launch({ ...settings, javaPath });
  if (!res.ok) {
    toast(res.error, true);
    log(res.error, 'err');
  }
};

// ---------------- Başlangıç ----------------
(async function init() {
  sys = await window.api.systemInfo();
  settings = await window.api.getSettings();

  // Sürüm bilgisi
  $('appVersionBadge').textContent = `v${sys.appVersion}`;
  $('currentVerText').textContent = `v${sys.appVersion}`;

  // Tema, düzen ve animasyonlar
  applyTheme(settings.theme || 'aurora');
  applyLayout(settings.layoutStyle || 'modern');
  $('animationsEnabled').checked = settings.animationsEnabled !== false;
  $('splashEnabled').checked = settings.splashEnabled !== false;
  applyAnimations(settings.animationsEnabled !== false);
  playSplashIntro(false);

  $('username').value = settings.username || '';
  validateUsername();
  updateGreeting();
  if (USERNAME_RE.test(settings.username || '')) {
    $('avatar').src = `https://mc-heads.net/avatar/${settings.username}/128`;
  }

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
  $('closeOnLaunch').checked = !!settings.closeOnLaunch;
  $('showSnapshots').checked = !!settings.showSnapshots;
  $('gameDir').value = settings.gameDir;
  $('jvmArgs').value = settings.jvmArgs || '';
  $('autoUpdateCheck').checked = settings.autoUpdateCheck !== false;

  updateResRow();
  updateStats();

  await Promise.all([scanJava(), loadVersions()]);

  // Açılışta resmi GitHub deposundan otomatik güncelleme kontrolü
  if (settings.autoUpdateCheck !== false) {
    window.api.checkForUpdates().catch(() => {});
  }
})();
