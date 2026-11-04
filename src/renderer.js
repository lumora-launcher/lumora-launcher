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
  optifine: 'OptiFine'
};

const LOADER_ICONS = {
  vanilla: '🟩',
  fabric: '🧵',
  quilt: '🟪',
  forge: '⚒️',
  optifine: '⚡'
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
  status.textContent = 'Lumora çekirdeği başlatılıyor...';

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
    const label = `${LOADER_ICONS[inst.loader] || '🟩'} ${inst.name} (${LOADER_LABELS[inst.loader]} ${inst.mcVersion})`;
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
    const playText = playMins > 0 ? `${playMins} dk oynandı` : 'Henüz oynanmadı';
    const baseTag = inst.baseInstalled
      ? `<span class="inst-tag" style="background:rgba(32,214,168,0.14);color:var(--accent-2)">✓ Ana Sürüm Hazır</span>`
      : `<span class="inst-tag" style="background:rgba(255,184,77,0.16);color:#ffb84d">⬇ Ana Sürüm İndirilecek</span>`;

    card.innerHTML = `
      <div class="inst-card-top">
        <div class="inst-avatar">${LOADER_ICONS[inst.loader] || '🟩'}</div>
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
        <span>${inst.modsCount || 0} Mod · ${inst.shadersCount || 0} Shader · ${playText}</span>
        <div class="inst-card-btns">
          <button class="icon-btn" data-act="folder" title="Profil Klasörünü Aç">📁</button>
          <button class="icon-btn danger" data-act="delete" title="Profili Sil">🗑</button>
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

  $('detailInstName').textContent = `${inst.name} — Kurulu İçerikler`;
  $('detailInstBadge').textContent = `${LOADER_LABELS[inst.loader]} ${inst.mcVersion}`;
  $('detailInstPath').textContent = `İzole Klasör: ${inst.dir}`;
  $('btnInstallFpsPack').style.display = inst.loader === 'fabric' || inst.loader === 'quilt' ? 'inline-block' : 'none';

  const baseBadge = $('detailBaseStatusBadge');
  const prepBtn = $('btnPrepareBaseVersion');
  if (inst.baseInstalled) {
    baseBadge.textContent = `✓ Ana Sürüm (${inst.mcVersion}) Kurulu`;
    baseBadge.className = 'badge ok-badge';
    prepBtn.classList.add('hidden');
  } else {
    baseBadge.textContent = `⚠ Ana Sürüm (${inst.mcVersion}) Kurulu Değil`;
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
    empty.textContent =
      currentContentTab === 'mod'
        ? 'Bu profilde henüz kurulu mod yok. "+ Modrinth\'ten Ekle" veya "⚡ Tek Tıkla FPS Paketi Kur" butonunu kullanabilirsin.'
        : 'Bu kategoride henüz kurulu paket bulunmuyor.';
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
          <span>${item.versionNumber ? `Sürüm: ${item.versionNumber} · ` : ''}${item.baseName} (${sizeKb} KB)</span>
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

// Dünyalar & Yedekler Sekmesi
async function renderWorldsTab(inst, container) {
  const { worlds, backups } = await window.api.listWorlds({ instanceId: inst.id });

  if (!worlds.length && !backups.length) {
    container.innerHTML =
      '<div class="empty-state">Bu profilde henüz oluşturulmuş bir tek oyunculu dünya (saves) veya yedek bulunmuyor.</div>';
    return;
  }

  for (const w of worlds) {
    const row = document.createElement('div');
    row.className = 'installed-item';
    const mb = (w.sizeBytes / 1024 / 1024).toFixed(1);
    const dateStr = new Date(w.lastModified).toLocaleDateString('tr-TR');

    row.innerHTML = `
      <div class="installed-left">
        ${w.iconData ? `<img class="installed-icon" src="${w.iconData}" alt="" />` : `<div class="installed-icon">🌍</div>`}
        <div class="installed-info">
          <strong></strong>
          <span>Boyut: ${mb} MB · Son oynama: ${dateStr}</span>
        </div>
      </div>
      <div class="installed-actions">
        <button class="ghost-btn accent-border" data-play-world="${w.folderName}">▶ Bu Dünyaya Gir</button>
        <button class="ghost-btn" data-backup-world="${w.folderName}">💾 ZIP Yedekle</button>
        <button class="icon-btn danger" data-del-world="${w.folderName}" title="Dünyayı Sil">🗑</button>
      </div>
    `;
    row.querySelector('strong').textContent = w.folderName;

    row.querySelector('[data-play-world]').onclick = () => launchWithQuickPlay({ world: w.folderName });
    row.querySelector('[data-backup-world]').onclick = async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Yedekleniyor...';
      const r = await window.api.backupWorld({ instanceId: inst.id, folderName: w.folderName });
      if (r.ok) toast(`Yedek oluşturuldu: ${r.zipName}`);
      else toast(r.error, true);
      await renderActiveInstanceDetails();
    };
    row.querySelector('[data-del-world]').onclick = async () => {
      await window.api.deleteWorld({ instanceId: inst.id, folderName: w.folderName });
      toast(`"${w.folderName}" dünyası silindi`);
      await renderActiveInstanceDetails();
    };
    container.appendChild(row);
  }

  if (backups.length) {
    const head = document.createElement('div');
    head.style.cssText = 'font-size:12px;font-weight:700;color:var(--accent-2);margin:10px 0 4px';
    head.textContent = `📦 Kayıtlı Dünya Yedekleri (${backups.length})`;
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
            <span>Yedek Arşivi · ${mb} MB</span>
          </div>
        </div>
        <div class="installed-actions">
          <button class="ghost-btn" data-restore="${b.fileName}">↩ Geri Yükle</button>
        </div>
      `;
      row.querySelector('strong').textContent = b.fileName;
      row.querySelector('[data-restore]').onclick = async () => {
        const r = await window.api.restoreWorld({ instanceId: inst.id, backupFileName: b.fileName });
        if (r.ok) toast('Dünya yedeği başarıyla geri yüklendi! ✓');
        else toast(r.error, true);
        await renderActiveInstanceDetails();
      };
      container.appendChild(row);
    }
  }
}

// Ekran Görüntüleri Sekmesi
async function renderScreenshotsTab(inst, container) {
  const shots = await window.api.listScreenshots({ instanceId: inst.id });
  if (!shots.length) {
    container.innerHTML =
      '<div class="empty-state">Bu profilde henüz çekilmiş bir ekran görüntüsü (F2) bulunmuyor.</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'screenshots-grid';
  for (const s of shots) {
    const card = document.createElement('div');
    card.className = 'sc-card';
    card.innerHTML = `
      <img src="${s.dataUrl || ''}" alt="" />
      <div class="sc-card-foot">${s.fileName}</div>
    `;
    card.onclick = () => window.api.openInstanceFolder(inst.id, 'screenshots');
    grid.appendChild(card);
  }
  container.appendChild(grid);
}

$('btnPrepareBaseVersion').onclick = async () => {
  const inst = getActiveInstance();
  if (!inst) return;
  const btn = $('btnPrepareBaseVersion');
  btn.disabled = true;
  btn.textContent = `⏳ ${inst.mcVersion} İndiriliyor...`;
  toast(`Ana sürüm (${inst.mcVersion}) indiriliyor, lütfen bekleyin...`);
  const res = await window.api.ensureBaseVersion(inst.mcVersion);
  btn.disabled = false;
  btn.textContent = '⬇ Ana Sürümü Şimdi İndir';
  if (!res.ok) return toast(res.error, true);
  toast(`Minecraft ${inst.mcVersion} ana sürümü başarıyla indirildi! ✓`);
  await refreshInstances();
};

$('btnOpenInstModrinth').onclick = () => {
  currentModrinthType = currentContentTab;
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
function updateModrinthFilterBadge() {
  const inst = getActiveInstance();
  if (!inst) return;
  const typeLabel =
    currentModrinthType === 'modpack'
      ? 'Modpack (.mrpack — Yeni Profil Olarak Kurulur)'
      : currentModrinthType === 'shader'
      ? 'Shader Paketi'
      : currentModrinthType === 'resourcepack'
      ? 'Kaynak Paketi'
      : `Mod (${LOADER_LABELS[inst.loader]})`;
  $('modrinthFilterBadge').textContent = `Aktif Profil: ${inst.name} · Minecraft ${inst.mcVersion} · Kategori: ${typeLabel}`;
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
          ${isInstalled ? '✓ Kurulu' : 'İndir'}
        </button>
      </div>
      <p class="mr-desc"></p>
      <div class="mr-foot">
        <span>⬇ ${fmtNum(hit.downloads)} indirme</span>
        <span>${(hit.categories || []).slice(0, 3).join(' · ')}</span>
      </div>
    </div>
  `;
  card.querySelector('.mr-title').textContent = hit.title;
  card.querySelector('.mr-author').textContent = `Yazar: ${hit.author || 'Modrinth'}`;
  card.querySelector('.mr-desc').textContent = hit.description || '';

  const btn = card.querySelector('.mr-install-btn');
  if (currentModrinthType === 'modpack') {
    btn.textContent = 'Profil Olarak Kur';
  }
  btn.onclick = async () => {
    if (currentModrinthType === 'modpack') {
      btn.disabled = true;
      btn.textContent = 'Modpack Kuruluyor...';
      toast(`${hit.title} modpack indiriliyor ve yeni profil hazırlanıyor...`);
      const res = await window.api.modrinthInstallModpack({
        projectId: hit.project_id,
        title: hit.title
      });
      if (!res.ok) {
        btn.disabled = false;
        btn.textContent = 'Profil Olarak Kur';
        return toast(res.error, true);
      }
      activeInstanceId = res.instance.id;
      btn.className = 'mr-install-btn installed';
      btn.textContent = '✓ Profil Oluşturuldu';
      toast(`"${res.instance.name}" modpack profili hazır! 🎉`);
      await refreshInstances();
      return;
    }

    const targetInst = getActiveInstance();
    if (!targetInst) return;
    if (currentModrinthType === 'mod' && (targetInst.loader === 'vanilla' || targetInst.loader === 'optifine')) {
      toast(
        `${LOADER_LABELS[targetInst.loader]} profiline mod kurulamaz! Lütfen üstten Fabric/Quilt/Forge profili seçin (OptiFine'a Shader ve Kaynak Paketi kurabilirsiniz).`,
        true
      );
      return;
    }
    btn.disabled = true;
    btn.textContent = 'İndiriliyor...';
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
      btn.textContent = 'İndir';
      toast(res.error, true);
      return;
    }
    installedProjectIds.add(hit.project_id);
    btn.className = 'mr-install-btn installed';
    btn.textContent = '✓ Kuruldu';
    const extra = res.files.length > 1 ? ` (+${res.files.length - 1} gerekli kütüphane)` : '';
    toast(`${hit.title} kuruldu!${extra}`);
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
    box.innerHTML = '<div class="empty-state" style="grid-column:span 2">Modrinth havuzu taranıyor...</div>';
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = '⏳ Yükleniyor...';
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

    if (!append && hits.length === 0) {
      box.innerHTML = `<div class="empty-state" style="grid-column:span 2">Bu sürüm (${inst.mcVersion}) ve filtre için sonuç bulunamadı.</div>`;
      countBadge.textContent = '0 sonuç';
      return;
    }

    for (const hit of hits) {
      box.appendChild(createModrinthCard(hit));
    }

    currentModrinthOffset += hits.length;
    countBadge.textContent = `${currentModrinthOffset} / ${fmtNum(currentModrinthTotal)} içerik gösteriliyor`;

    if (currentModrinthOffset < currentModrinthTotal) {
      loadMoreBtn.classList.remove('hidden');
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = `Daha Fazla Göster (${currentModrinthOffset} / ${fmtNum(currentModrinthTotal)})`;
    } else {
      loadMoreBtn.classList.add('hidden');
    }
  } catch (err) {
    if (!append) {
      box.innerHTML = `<div class="empty-state" style="grid-column:span 2">Modrinth bağlantı hatası: ${err.message}</div>`;
    } else {
      toast(`Daha fazla yüklenemedi: ${err.message}`, true);
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
    $('javaHint').textContent = 'Sürüm listesi alınamadı (çevrimdışı)';
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
  const baseStatusTxt = inst.baseInstalled ? 'Ana sürüm hazır ✓' : 'Ana sürüm otomatik indirilecek';
  if (!java) {
    hint.textContent = `${loaderTxt} · ${baseStatusTxt} · Java ${requiredJava} indirilecek`;
    hint.className = 'hint warn';
  } else if (java.major < requiredJava) {
    hint.textContent = `${loaderTxt} · Java ${requiredJava} istiyor, seçili: Java ${java.major}`;
    hint.className = 'hint error';
  } else {
    hint.textContent = `${loaderTxt} · ${baseStatusTxt} · Java ${java.major}${settings.javaPath ? '' : ' (oto)'} ✓`;
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
  renderVersionOptions();
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

$('btnBannerUpdate').onclick = () => navigateTo('updates');
$('btnBannerDismiss').onclick = () => $('updateBanner').classList.remove('show');
$('autoUpdateCheck').addEventListener('change', (e) => persist({ autoUpdateCheck: e.target.checked }));

// ---------------- Çökme Analizcisi Modalı ----------------
window.api.onCrash((info) => {
  if (!info) return;
  $('crashTitle').textContent = info.title || 'Oyun Beklenmedik Şekilde Kapandı';
  $('crashDetail').textContent = info.detail || '';
  $('crashModal').classList.remove('hidden');
});

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
  mrpack: 'Modpack (.mrpack) içerikleri indiriliyor',
  assets: 'Oyun dosyaları indiriliyor',
  natives: 'Native dosyalar indiriliyor',
  classes: 'Kütüphaneler indiriliyor',
  'classes-custom': 'Mod yükleyici kütüphaneleri indiriliyor',
  'classes-maven-custom': 'Forge kütüphaneleri indiriliyor'
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
          <div class="srv-motd" data-srv-motd>Sunucu durumu sorgulanıyor...</div>
        </div>
      </div>
      <div class="srv-right">
        <div class="srv-stats">
          <span class="srv-players" data-srv-players>— / —</span>
          <span class="srv-ping" data-srv-ping>Ping...</span>
        </div>
        <button class="play-btn sm-btn" data-join="${srv.address}">
          <span class="play-label">BAĞLAN ▶</span>
        </button>
        <button class="icon-btn danger" data-del-srv="${srv.id}" title="Sunucuyu Sil">🗑</button>
      </div>
    `;
    card.querySelector('strong').textContent = srv.name;
    card.querySelector('.srv-addr').textContent = srv.address;

    card.querySelector('[data-join]').onclick = () => launchWithQuickPlay({ server: srv.address });
    card.querySelector('[data-del-srv]').onclick = async () => {
      await window.api.deleteServer(srv.id);
      toast(`${srv.name} listeden kaldırıldı`);
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
        motdEl.textContent = st.motd || `${srv.name} — Çevrimiçi`;
        pEl.textContent = `${fmtNum(st.playersOnline)} / ${fmtNum(st.playersMax)} oyuncu`;
        pingEl.textContent = `● ${st.pingMs} ms`;
        pingEl.className = 'srv-ping';
        if (st.favicon) {
          iconEl.innerHTML = `<img class="srv-icon" src="${st.favicon}" alt="" />`;
        }
      } else {
        motdEl.textContent = 'Sunucuya şu an ulaşılamıyor.';
        pEl.textContent = 'Çevrimdışı';
        pingEl.textContent = '● Kapalı';
        pingEl.className = 'srv-ping offline';
      }
    });
  }
}

$('btnRefreshServers').onclick = () => refreshServers();
$('btnAddServer').onclick = async () => {
  const name = $('newServerName').value.trim();
  const address = $('newServerAddress').value.trim();
  if (!address) return toast('Lütfen geçerli bir sunucu IP veya adresi girin', true);
  await window.api.addServer({ name: name || address, address });
  $('newServerName').value = '';
  $('newServerAddress').value = '';
  toast('Sunucu listeye eklendi!');
  refreshServers();
};

async function launchWithQuickPlay({ server = null, world = null } = {}) {
  if (!validateUsername()) {
    navigateTo('home');
    $('username').focus();
    return toast('Önce geçerli bir kullanıcı adı girin', true);
  }
  const inst = getActiveInstance();
  if (!inst) return toast('Lütfen bir profil seçin', true);

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

// ---------------- Başlangıç ----------------
(async function init() {
  sys = await window.api.systemInfo();
  settings = await window.api.getSettings();
  activeInstanceId = settings.activeInstanceId || 'default-vanilla';

  $('appVersionBadge').textContent = `v${sys.appVersion}`;
  $('currentVerText').textContent = `v${sys.appVersion}`;

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
  checkNetworkStatus();

  await Promise.all([scanJava(), loadVersions(), refreshInstances()]);

  if (settings.autoUpdateCheck !== false) {
    window.api.checkForUpdates().catch(() => {});
  }
})();
