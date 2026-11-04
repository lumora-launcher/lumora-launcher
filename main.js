// ============================================================
//  Lumora Launcher - Ana süreç (Electron main process)
//  Resmi GitHub: https://github.com/lumora-launcher/lumora-launcher
// ============================================================
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const { autoUpdater } = require('electron-updater');

const APP_NAME = 'Lumora';
const GITHUB_OWNER = 'lumora-launcher';
const GITHUB_REPO = 'lumora-launcher';
const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

const pkg = require('./package.json');
const getAppVersion = () => pkg.version || app.getVersion();
const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const MODRINTH_API = 'https://api.modrinth.com/v2';
const USER_AGENT = `Lumora-Launcher/${getAppVersion()} (github.com/lumora-launcher/lumora-launcher)`;

let win = null;
let gameRunning = false;
let manifestCache = null;

// ---------------- Ayarlar & Profiller (Instances) ----------------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const instancesFile = () => path.join(app.getPath('userData'), 'instances.json');

function defaultSettings() {
  return {
    username: '',
    version: '',
    activeInstanceId: 'default-vanilla',
    ramMax: Math.min(4096, Math.floor(os.totalmem() / 1024 / 1024 / 2 / 512) * 512),
    javaPath: '',
    fullscreen: false,
    width: 1280,
    height: 720,
    gameDir: path.join(app.getPath('appData'), '.lumora'),
    showSnapshots: false,
    closeOnLaunch: true,
    jvmArgs: '',
    theme: 'aurora',
    layoutStyle: 'modern',
    animationsEnabled: true,
    splashEnabled: true,
    autoUpdateCheck: true
  };
}

function loadSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    return { ...defaultSettings(), ...data };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
}

function defaultInstances() {
  return [
    {
      id: 'default-vanilla',
      name: 'Vanilla Son Sürüm',
      mcVersion: '1.21.4',
      loader: 'vanilla', // 'vanilla' | 'fabric' | 'quilt' | 'forge'
      loaderVersion: '',
      icon: 'grass',
      ramMax: 0, // 0 = genel ayarı kullan
      createdAt: Date.now(),
      lastPlayed: 0,
      playTimeMs: 0
    },
    {
      id: 'default-fabric',
      name: 'Fabric Performans (1.21.4)',
      mcVersion: '1.21.4',
      loader: 'fabric',
      loaderVersion: '',
      icon: 'fabric',
      ramMax: 0,
      createdAt: Date.now(),
      lastPlayed: 0,
      playTimeMs: 0
    }
  ];
}

function loadInstances() {
  try {
    const list = JSON.parse(fs.readFileSync(instancesFile(), 'utf8'));
    if (Array.isArray(list) && list.length > 0) return list;
    const def = defaultInstances();
    saveInstances(def);
    return def;
  } catch {
    const def = defaultInstances();
    saveInstances(def);
    return def;
  }
}

function saveInstances(list) {
  fs.mkdirSync(path.dirname(instancesFile()), { recursive: true });
  fs.writeFileSync(instancesFile(), JSON.stringify(list, null, 2));
}

function getInstanceDir(instanceId, baseGameDir) {
  const root = baseGameDir || loadSettings().gameDir;
  const safeId = String(instanceId || 'default-vanilla').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(root, 'instances', safeId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------- Pencere ----------------
function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  win = new BrowserWindow({
    width: 1160,
    height: 720,
    minWidth: 980,
    minHeight: 620,
    frame: false,
    backgroundColor: '#0b0d14',
    title: `${APP_NAME} Launcher`,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});
app.on('window-all-closed', () => app.quit());

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

// ---------------- Pencere kontrolleri ----------------
ipcMain.on('win:minimize', () => win.minimize());
ipcMain.on('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.on('win:close', () => win.close());

// ---------------- Ayar IPC ----------------
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:save', (_e, s) => {
  saveSettings({ ...loadSettings(), ...s });
  return true;
});
ipcMain.handle('system:info', () => ({
  totalRam: Math.floor(os.totalmem() / 1024 / 1024),
  appName: APP_NAME,
  appVersion: getAppVersion(),
  githubUrl: GITHUB_URL,
  isPackaged: app.isPackaged
}));

// ---------------- Gerçek Ağ / Mojang API Durum Kontrolü ----------------
ipcMain.handle('network:status', async () => {
  const start = Date.now();
  try {
    const res = await fetch(MANIFEST_URL, { method: 'HEAD' });
    const ms = Date.now() - start;
    return { online: res.ok, pingMs: ms };
  } catch {
    return { online: false, pingMs: null };
  }
});

ipcMain.handle('dialog:java', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Java dosyasını seç (javaw.exe)',
    filters: [{ name: 'Java', extensions: ['exe'] }],
    properties: ['openFile']
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const info = await javaVersion(r.filePaths[0]);
  return { path: r.filePaths[0], ...info };
});

ipcMain.handle('dialog:folder', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Oyun klasörünü seç',
    properties: ['openDirectory', 'createDirectory']
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('folder:open', (_e, dir) => {
  const target = dir || loadSettings().gameDir;
  fs.mkdirSync(target, { recursive: true });
  shell.openPath(target);
});

ipcMain.handle('external:open', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

// ---------------- İzole Profil (Instance) Yönetimi ----------------
function isBaseVersionInstalled(mcVersion, baseGameDir) {
  const root = baseGameDir || loadSettings().gameDir;
  const vDir = path.join(root, 'versions', mcVersion);
  return (
    fs.existsSync(path.join(vDir, `${mcVersion}.jar`)) &&
    fs.existsSync(path.join(vDir, `${mcVersion}.json`))
  );
}

function countDirFiles(dir, extFilter) {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter((f) => !extFilter || extFilter.test(f)).length;
  } catch {
    return 0;
  }
}

function enrichInstance(inst) {
  const s = loadSettings();
  const dir = getInstanceDir(inst.id, s.gameDir);
  return {
    ...inst,
    dir,
    baseInstalled: isBaseVersionInstalled(inst.mcVersion, s.gameDir),
    modsCount: countDirFiles(path.join(dir, 'mods'), /\.jar(\.disabled)?$/i),
    packsCount: countDirFiles(path.join(dir, 'resourcepacks'), /\.zip$/i),
    shadersCount: countDirFiles(path.join(dir, 'shaderpacks'), /\.zip$/i)
  };
}

ipcMain.handle('instances:list', () => {
  const list = loadInstances();
  return list.map(enrichInstance);
});

ipcMain.handle('instances:create', (_e, data) => {
  const list = loadInstances();
  const id = 'inst-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const inst = {
    id,
    name: String(data.name || 'Yeni Profil').trim().slice(0, 40),
    mcVersion: String(data.mcVersion || '1.21.4'),
    loader: ['vanilla', 'fabric', 'quilt', 'forge', 'optifine'].includes(data.loader) ? data.loader : 'vanilla',
    loaderVersion: String(data.loaderVersion || ''),
    icon: String(data.icon || 'grass'),
    ramMax: Number(data.ramMax) || 0,
    createdAt: Date.now(),
    lastPlayed: 0,
    playTimeMs: 0
  };
  list.unshift(inst);
  saveInstances(list);

  // Alt klasörleri hazırla
  const dir = getInstanceDir(id);
  for (const sub of ['mods', 'resourcepacks', 'shaderpacks', 'config', 'saves']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }

  const s = loadSettings();
  saveSettings({ ...s, activeInstanceId: id, version: inst.mcVersion });
  return enrichInstance(inst);
});

ipcMain.handle('instances:update', (_e, data) => {
  const list = loadInstances();
  const idx = list.findIndex((x) => x.id === data.id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  saveInstances(list);
  return enrichInstance(list[idx]);
});

ipcMain.handle('instances:delete', (_e, id) => {
  let list = loadInstances();
  if (list.length <= 1) {
    return { ok: false, error: 'En az bir profil kalmalıdır.' };
  }
  const inst = list.find((x) => x.id === id);
  if (!inst) return { ok: false, error: 'Profil bulunamadı.' };

  list = list.filter((x) => x.id !== id);
  saveInstances(list);

  // Klasörü temizle
  const dir = getInstanceDir(id);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Klasör açıksa sorun etme
  }

  const s = loadSettings();
  if (s.activeInstanceId === id) {
    saveSettings({ ...s, activeInstanceId: list[0].id, version: list[0].mcVersion });
  }
  return { ok: true, activeId: list[0].id };
});

ipcMain.handle('instances:openFolder', (_e, id, subFolder) => {
  const dir = getInstanceDir(id);
  const target = subFolder ? path.join(dir, subFolder) : dir;
  fs.mkdirSync(target, { recursive: true });
  shell.openPath(target);
});

// ---------------- Mod / Shader / Kaynak Paketi Dosya Yönetimi + Modrinth ----------------
function folderForType(projectType) {
  if (projectType === 'shader') return 'shaderpacks';
  if (projectType === 'resourcepack') return 'resourcepacks';
  return 'mods';
}

function sha1File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function loadModMetaFile(instanceDir) {
  const p = path.join(instanceDir, '.lumora-content.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function saveModMetaFile(instanceDir, meta) {
  const p = path.join(instanceDir, '.lumora-content.json');
  fs.writeFileSync(p, JSON.stringify(meta, null, 2));
}

ipcMain.handle('instance:content:list', (_e, { instanceId, type }) => {
  const instDir = getInstanceDir(instanceId);
  const sub = folderForType(type);
  const targetDir = path.join(instDir, sub);
  fs.mkdirSync(targetDir, { recursive: true });

  const meta = loadModMetaFile(instDir);
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const items = [];

  for (const e of entries) {
    if (!e.isFile()) continue;
    const enabled = !e.name.endsWith('.disabled');
    const baseName = enabled ? e.name : e.name.slice(0, -'.disabled'.length);
    if (!/\.(jar|zip)$/i.test(baseName)) continue;

    const fullPath = path.join(targetDir, e.name);
    const stat = fs.statSync(fullPath);
    const info = meta[baseName] || {};

    items.push({
      fileName: e.name,
      baseName,
      enabled,
      size: stat.size,
      title: info.title || baseName.replace(/\.(jar|zip)$/i, ''),
      versionNumber: info.versionNumber || '',
      projectId: info.projectId || null,
      versionId: info.versionId || null,
      iconUrl: info.iconUrl || null,
      author: info.author || ''
    });
  }
  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
});

ipcMain.handle('instance:content:toggle', (_e, { instanceId, type, fileName }) => {
  const instDir = getInstanceDir(instanceId);
  const targetDir = path.join(instDir, folderForType(type));
  const oldPath = path.join(targetDir, fileName);
  if (!fs.existsSync(oldPath)) return { ok: false, error: 'Dosya bulunamadı' };

  const newName = fileName.endsWith('.disabled')
    ? fileName.slice(0, -'.disabled'.length)
    : `${fileName}.disabled`;
  const newPath = path.join(targetDir, newName);
  fs.renameSync(oldPath, newPath);
  return { ok: true, fileName: newName };
});

ipcMain.handle('instance:content:delete', (_e, { instanceId, type, fileName }) => {
  const instDir = getInstanceDir(instanceId);
  const targetDir = path.join(instDir, folderForType(type));
  const fullPath = path.join(targetDir, fileName);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  const baseName = fileName.replace(/\.disabled$/i, '');
  const meta = loadModMetaFile(instDir);
  delete meta[baseName];
  saveModMetaFile(instDir, meta);
  return { ok: true };
});

// ---------------- Modrinth API Entegrasyonu ----------------
ipcMain.handle('modrinth:search', async (_e, { query, projectType, mcVersion, loader, category = '', offset = 0, limit = 48, sort = 'downloads' }) => {
  const facets = [];
  facets.push([`project_type:${projectType || 'mod'}`]);
  if (mcVersion) facets.push([`versions:${mcVersion}`]);
  if ((projectType || 'mod') === 'mod' && loader && loader !== 'vanilla' && loader !== 'optifine') {
    facets.push([`categories:${loader}`]);
  }
  if (category) {
    facets.push([`categories:${category}`]);
  }

  const params = new URLSearchParams({
    query: query || '',
    limit: String(Math.min(100, Number(limit) || 48)),
    offset: String(offset || 0),
    index: sort || 'downloads',
    facets: JSON.stringify(facets)
  });

  const res = await fetch(`${MODRINTH_API}/search?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error(`Modrinth hatası (HTTP ${res.status})`);
  return res.json();
});

async function resolveModrinthVersion(projectIdOrSlug, mcVersion, loader, projectType) {
  const params = new URLSearchParams();
  if (mcVersion) params.set('game_versions', JSON.stringify([mcVersion]));
  if (projectType === 'mod' && loader && loader !== 'vanilla') {
    params.set('loaders', JSON.stringify([loader]));
  }
  const url = `${MODRINTH_API}/project/${encodeURIComponent(projectIdOrSlug)}/version?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Sürüm bilgisi alınamadı (${projectIdOrSlug})`);
  const versions = await res.json();
  if (!Array.isArray(versions) || versions.length === 0) {
    // Shader veya kaynak paketlerinde sürüm filtresi bazen katı olabilir, filtresiz dene
    if (projectType !== 'mod') {
      const resAll = await fetch(`${MODRINTH_API}/project/${encodeURIComponent(projectIdOrSlug)}/version`, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (resAll.ok) {
        const allVers = await resAll.json();
        if (allVers.length > 0) return allVers[0];
      }
    }
    return null;
  }
  return versions[0];
}

async function downloadFileTo(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`İndirme hatası (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function installModrinthProject({
  instance,
  projectId,
  title,
  iconUrl,
  author,
  projectType,
  visited = new Set()
}) {
  if (visited.has(projectId)) return [];
  visited.add(projectId);

  const ver = await resolveModrinthVersion(projectId, instance.mcVersion, instance.loader, projectType);
  if (!ver) {
    throw new Error(`${title || projectId} için ${instance.mcVersion} (${instance.loader}) uyumlu sürüm bulunamadı.`);
  }

  const primaryFile = ver.files.find((f) => f.primary) || ver.files[0];
  if (!primaryFile) throw new Error('İndirilebilir dosya bulunamadı.');

  const instDir = getInstanceDir(instance.id);
  const subFolder = folderForType(projectType);
  const destPath = path.join(instDir, subFolder, primaryFile.filename);

  send('modrinth:status', {
    projectId,
    state: 'downloading',
    message: `${title || primaryFile.filename} indiriliyor...`
  });

  await downloadFileTo(primaryFile.url, destPath);

  const meta = loadModMetaFile(instDir);
  meta[primaryFile.filename] = {
    projectId: ver.project_id,
    versionId: ver.id,
    versionNumber: ver.version_number,
    title: title || primaryFile.filename.replace(/\.(jar|zip)$/i, ''),
    iconUrl: iconUrl || null,
    author: author || '',
    projectType: projectType || 'mod',
    installedAt: Date.now()
  };
  saveModMetaFile(instDir, meta);

  const installedList = [primaryFile.filename];

  // Zorunlu bağımlılıkları (required dependencies) otomatik kur (ör. Fabric API)
  if (projectType === 'mod' && Array.isArray(ver.dependencies)) {
    for (const dep of ver.dependencies) {
      if (dep.dependency_type === 'required' && dep.project_id) {
        try {
          const pRes = await fetch(`${MODRINTH_API}/project/${dep.project_id}`, {
            headers: { 'User-Agent': USER_AGENT }
          });
          const pInfo = pRes.ok ? await pRes.json() : { id: dep.project_id, title: 'Gerekli Kütüphane' };
          const subInstalled = await installModrinthProject({
            instance,
            projectId: dep.project_id,
            title: pInfo.title || dep.project_id,
            iconUrl: pInfo.icon_url || null,
            author: '',
            projectType: 'mod',
            visited
          });
          installedList.push(...subInstalled);
        } catch (e) {
          send('game:log', { level: 'debug', msg: `[Modrinth]: Bağımlılık kurulamadı (${dep.project_id}): ${e.message}` });
        }
      }
    }
  }

  return installedList;
}

ipcMain.handle('modrinth:install', async (_e, { instanceId, projectId, title, iconUrl, author, projectType }) => {
  const list = loadInstances();
  const instance = list.find((x) => x.id === instanceId);
  if (!instance) return { ok: false, error: 'Profil bulunamadı.' };

  if ((projectType || 'mod') === 'mod' && (instance.loader === 'vanilla' || instance.loader === 'optifine')) {
    return {
      ok: false,
      error: `Seçili profil ${instance.loader === 'optifine' ? 'OptiFine (Bağımsız)' : 'Vanilla'}! Mod kurmak için Fabric, Quilt veya Forge profili seçin (OptiFine'da doğrudan Shader ve Kaynak Paketi kurabilirsiniz).`
    };
  }

  try {
    const files = await installModrinthProject({
      instance,
      projectId,
      title,
      iconUrl,
      author,
      projectType: projectType || 'mod'
    });
    send('modrinth:status', { projectId, state: 'installed', files });
    return { ok: true, files };
  } catch (err) {
    send('modrinth:status', { projectId, state: 'error', message: err.message });
    return { ok: false, error: err.message || String(err) };
  }
});

// Kurulu modlar için tek tıkla güncelleme kontrolü (SHA1 hash ile Modrinth sorgusu)
ipcMain.handle('modrinth:checkUpdates', async (_e, { instanceId }) => {
  const list = loadInstances();
  const instance = list.find((x) => x.id === instanceId);
  if (!instance) return { ok: false, error: 'Profil bulunamadı.' };

  const instDir = getInstanceDir(instanceId);
  const modsDir = path.join(instDir, 'mods');
  if (!fs.existsSync(modsDir)) return { ok: true, updates: [] };

  const files = fs.readdirSync(modsDir).filter((f) => /\.jar$/i.test(f));
  if (files.length === 0) return { ok: true, updates: [] };

  const hashToFile = {};
  for (const f of files) {
    const h = sha1File(path.join(modsDir, f));
    hashToFile[h] = f;
  }

  const res = await fetch(`${MODRINTH_API}/version_files/update`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      hashes: Object.keys(hashToFile),
      algorithm: 'sha1',
      loaders: [instance.loader === 'vanilla' ? 'fabric' : instance.loader],
      game_versions: [instance.mcVersion]
    })
  });

  if (!res.ok) return { ok: false, error: `Modrinth güncelleme kontrolü başarısız (HTTP ${res.status})` };
  const data = await res.json();
  const meta = loadModMetaFile(instDir);
  const updates = [];

  for (const [oldHash, newVer] of Object.entries(data)) {
    const oldFileName = hashToFile[oldHash];
    const primary = newVer.files.find((f) => f.primary) || newVer.files[0];
    if (primary && primary.hashes && primary.hashes.sha1 !== oldHash) {
      updates.push({
        oldFileName,
        title: (meta[oldFileName] && meta[oldFileName].title) || oldFileName,
        newVersionNumber: newVer.version_number,
        newFileName: primary.filename,
        downloadUrl: primary.url,
        projectId: newVer.project_id,
        versionId: newVer.id
      });
    }
  }
  return { ok: true, updates };
});

ipcMain.handle('modrinth:applyUpdates', async (_e, { instanceId, updates }) => {
  const instDir = getInstanceDir(instanceId);
  const modsDir = path.join(instDir, 'mods');
  const meta = loadModMetaFile(instDir);
  let count = 0;

  for (const u of updates || []) {
    const oldPath = path.join(modsDir, u.oldFileName);
    const newPath = path.join(modsDir, u.newFileName);
    await downloadFileTo(u.downloadUrl, newPath);
    if (u.oldFileName !== u.newFileName && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
    const prev = meta[u.oldFileName] || {};
    delete meta[u.oldFileName];
    meta[u.newFileName] = {
      ...prev,
      projectId: u.projectId,
      versionId: u.versionId,
      versionNumber: u.newVersionNumber,
      title: u.title,
      installedAt: Date.now()
    };
    count++;
  }
  saveModMetaFile(instDir, meta);
  return { ok: true, count };
});

// Tek Tıkla FPS / Performans Paketi Kurucu (Fabric / Quilt)
ipcMain.handle('modrinth:installFpsPack', async (_e, { instanceId }) => {
  const list = loadInstances();
  const instance = list.find((x) => x.id === instanceId);
  if (!instance) return { ok: false, error: 'Profil bulunamadı.' };
  if (instance.loader !== 'fabric' && instance.loader !== 'quilt') {
    return { ok: false, error: 'FPS Paketi yalnızca Fabric veya Quilt profillerinde kurulabilir.' };
  }

  const slugs = [
    { slug: 'fabric-api', title: 'Fabric API' },
    { slug: 'sodium', title: 'Sodium (FPS Artırıcı)' },
    { slug: 'lithium', title: 'Lithium (Fizik & AI Optimizasyonu)' },
    { slug: 'ferrite-core', title: 'FerriteCore (RAM Tasarrufu)' },
    { slug: 'entityculling', title: 'EntityCulling (Görünmeyen Varlıkları Gizler)' },
    { slug: 'immediatelyfast', title: 'ImmediatelyFast (Arayüz & Render Hızı)' }
  ];

  const installed = [];
  const skipped = [];
  const visited = new Set();

  for (const item of slugs) {
    try {
      const files = await installModrinthProject({
        instance,
        projectId: item.slug,
        title: item.title,
        iconUrl: null,
        author: 'Modrinth',
        projectType: 'mod',
        visited
      });
      installed.push(...files);
    } catch {
      skipped.push(item.title);
    }
  }
  return { ok: true, installed, skipped };
});

// ---------------- Otomatik Güncelleyici (Sabit Resmi GitHub Deposu) ----------------
function compareSemver(a, b) {
  const clean = (v) => String(v || '').replace(/^v/i, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pa = clean(a);
  const pb = clean(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    send('update:event', { state: 'checking', message: 'Resmi GitHub sunucusundan güncellemeler denetleniyor...' });
  });

  autoUpdater.on('update-available', (info) => {
    send('update:event', {
      state: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      releaseDate: info.releaseDate || null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    send('update:event', {
      state: 'up-to-date',
      version: (info && info.version) || getAppVersion(),
      message: 'En güncel Lumora sürümünü kullanıyorsun!'
    });
  });

  autoUpdater.on('download-progress', (p) => {
    send('update:event', {
      state: 'downloading',
      percent: Math.round(p.percent || 0),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    send('update:event', {
      state: 'downloaded',
      version: info.version,
      message: 'Güncelleme indirildi! Şimdi yeniden başlatıp kurabilirsin.'
    });
  });

  autoUpdater.on('error', (err) => {
    send('update:event', {
      state: 'error',
      message: (err && err.message) || String(err)
    });
  });
}

async function checkOfficialGithubRelease() {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const currentVer = getAppVersion();
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': `${APP_NAME}-Launcher/${currentVer}` }
  });
  if (res.status === 404) {
    return {
      state: 'no-release',
      currentVersion: currentVer,
      repoUrl: GITHUB_URL,
      message: 'Resmi GitHub deposunda henüz yeni bir Release yayınlanmadı (v' + currentVer + ' aktif).'
    };
  }
  if (!res.ok) {
    return { state: 'error', message: `GitHub sunucusuna ulaşılamadı (HTTP ${res.status})` };
  }
  const data = await res.json();
  const latestVer = String(data.tag_name || data.name || '').replace(/^v/i, '');
  const exeAsset = Array.isArray(data.assets)
    ? data.assets.find((a) => /\.exe$/i.test(a.name))
    : null;

  if (compareSemver(latestVer, currentVer) > 0) {
    return {
      state: 'available',
      currentVersion: currentVer,
      version: latestVer,
      releaseName: data.name || `v${latestVer}`,
      releaseNotes: data.body || 'Yeni sürüm yayınlandı.',
      releaseDate: data.published_at,
      htmlUrl: data.html_url,
      downloadUrl: exeAsset ? exeAsset.browser_download_url : data.html_url,
      canAutoInstall: app.isPackaged
    };
  }
  return {
    state: 'up-to-date',
    currentVersion: currentVer,
    version: latestVer || currentVer,
    htmlUrl: data.html_url || GITHUB_URL,
    releaseNotes: data.body || '',
    releaseName: data.name || `v${latestVer || currentVer}`,
    message: `Lumora v${currentVer} güncel!`
  };
}

ipcMain.handle('update:check', async () => {
  send('update:event', {
    state: 'checking',
    message: 'Resmi GitHub deposu (lumora-launcher/lumora-launcher) kontrol ediliyor...'
  });

  if (app.isPackaged) {
    try {
      autoUpdater.setFeedURL({ provider: 'github', owner: GITHUB_OWNER, repo: GITHUB_REPO });
      autoUpdater.checkForUpdates().catch(() => {});
    } catch {
      // GitHub API kontrolü aşağıda devam eder
    }
  }

  try {
    const result = await checkOfficialGithubRelease();
    send('update:event', result);
    return result;
  } catch (err) {
    const errPayload = { state: 'error', message: err.message || 'Güncelleme kontrolü başarısız oldu.' };
    send('update:event', errPayload);
    return errPayload;
  }
});

ipcMain.handle('update:download', async (_e, fallbackUrl) => {
  if (app.isPackaged) {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true, mode: 'updater' };
    } catch (err) {
      if (fallbackUrl) {
        shell.openExternal(fallbackUrl);
        return { ok: true, mode: 'browser' };
      }
      return { ok: false, error: err.message || String(err) };
    }
  } else {
    if (fallbackUrl && /^https?:\/\//i.test(fallbackUrl)) {
      shell.openExternal(fallbackUrl);
      return { ok: true, mode: 'browser' };
    }
    return { ok: false, error: 'Geliştirici modunda otomatik kurulum yapılamaz (.exe olarak paketlendiğinde aktif olur).' };
  }
});

ipcMain.handle('update:install', () => {
  if (app.isPackaged) {
    autoUpdater.quitAndInstall();
    return { ok: true };
  }
  return { ok: false, error: 'Yalnızca kurulu (.exe) sürümde yeniden başlatıp kurabilirsin.' };
});

// ---------------- Sürümler & Mod Yükleyiciler (Fabric / Quilt / Forge) ----------------
async function getManifest() {
  if (manifestCache) return manifestCache;
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error('Sürüm listesi alınamadı');
  manifestCache = await res.json();
  return manifestCache;
}

ipcMain.handle('versions:list', async () => {
  const m = await getManifest();
  return {
    latest: m.latest,
    versions: m.versions.map((v) => ({ id: v.id, type: v.type }))
  };
});

ipcMain.handle('versions:java', async (_e, id) => {
  try {
    const m = await getManifest();
    const v = m.versions.find((x) => x.id === id);
    if (!v) return null;
    const res = await fetch(v.url);
    const json = await res.json();
    return json.javaVersion ? json.javaVersion.majorVersion : 8;
  } catch {
    return null;
  }
});

async function prepareFabricOrQuiltProfile(loader, mcVersion, loaderVersion, gameDir) {
  const baseUrl = loader === 'quilt' ? 'https://meta.quiltmc.org/v3' : 'https://meta.fabricmc.net/v2';
  let chosenLoaderVer = loaderVersion;

  if (!chosenLoaderVer) {
    const lRes = await fetch(`${baseUrl}/versions/loader/${encodeURIComponent(mcVersion)}`);
    if (!lRes.ok) throw new Error(`${loader} bu Minecraft sürümünü (${mcVersion}) desteklemiyor.`);
    const lList = await lRes.json();
    if (!Array.isArray(lList) || lList.length === 0) {
      throw new Error(`${mcVersion} için ${loader} sürümü bulunamadı.`);
    }
    chosenLoaderVer = lList[0].loader.version;
  }

  const customId = `${loader}-loader-${chosenLoaderVer}-${mcVersion}`;
  const customDir = path.join(gameDir, 'versions', customId);
  const customJsonPath = path.join(customDir, `${customId}.json`);

  if (!fs.existsSync(customJsonPath)) {
    send('game:log', { level: 'debug', msg: `[Lumora]: ${loader.toUpperCase()} profili hazırlanıyor (${customId})...` });
    const pRes = await fetch(
      `${baseUrl}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(chosenLoaderVer)}/profile/json`
    );
    if (!pRes.ok) throw new Error(`${loader} profil JSON dosyası indirilemedi.`);
    const profileJson = await pRes.json();
    fs.mkdirSync(customDir, { recursive: true });
    fs.writeFileSync(customJsonPath, JSON.stringify(profileJson, null, 2));
  }

  return customId;
}

async function prepareForgeInstaller(mcVersion, gameDir) {
  const promoRes = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
  if (!promoRes.ok) throw new Error('Forge sürüm listesi alınamadı.');
  const promoData = await promoRes.json();
  const promos = promoData.promos || {};
  const forgeVer = promos[`${mcVersion}-recommended`] || promos[`${mcVersion}-latest`];
  if (!forgeVer) {
    throw new Error(`Minecraft ${mcVersion} için uygun bir Forge sürümü bulunamadı.`);
  }

  const fullVer = `${mcVersion}-${forgeVer}`;
  const forgeDir = path.join(gameDir, 'forge-installers');
  const installerPath = path.join(forgeDir, `forge-${fullVer}-installer.jar`);

  if (!fs.existsSync(installerPath)) {
    send('game:log', { level: 'debug', msg: `[Lumora]: Forge ${fullVer} installer indiriliyor...` });
    const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVer}/forge-${fullVer}-installer.jar`;
    await downloadFileTo(url, installerPath);
  }
  return installerPath;
}

// Ana (Vanilla) sürüm dosyalarını denetle ve eksikse indir (Fabric/Forge/OptiFine ön koşulu)
async function ensureBaseVanillaVersion(mcVersion, gameDir) {
  const vDir = path.join(gameDir, 'versions', mcVersion);
  const jarPath = path.join(vDir, `${mcVersion}.jar`);
  const jsonPath = path.join(vDir, `${mcVersion}.json`);
  fs.mkdirSync(vDir, { recursive: true });

  let vjson = null;
  if (fs.existsSync(jsonPath)) {
    try {
      vjson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch {
      vjson = null;
    }
  }
  if (!vjson) {
    send('game:log', { level: 'debug', msg: `[Lumora]: Ana sürüm (${mcVersion}) meta verisi indiriliyor...` });
    vjson = await getVersionJson(mcVersion);
    fs.writeFileSync(jsonPath, JSON.stringify(vjson, null, 2));
  }

  const clientDl = vjson.downloads && vjson.downloads.client;
  if (!clientDl || !clientDl.url) {
    throw new Error(`${mcVersion} ana istemci (client.jar) indirme adresi bulunamadı.`);
  }

  let needDownload = !fs.existsSync(jarPath);
  if (!needDownload && clientDl.size) {
    const st = fs.statSync(jarPath);
    if (st.size !== clientDl.size) needDownload = true;
  }

  if (needDownload) {
    send('game:log', { level: 'debug', msg: `[Lumora]: Ana sürüm (${mcVersion}.jar) indiriliyor...` });
    send('game:progress', { type: 'base-jar', task: 0, total: 1 });
    await downloadFileTo(clientDl.url, jarPath);
    send('game:progress', { type: 'base-jar', task: 1, total: 1 });
  }
  return { vjson, jarPath, jsonPath };
}

ipcMain.handle('versions:ensureBase', async (_e, mcVersion) => {
  try {
    const s = loadSettings();
    await ensureBaseVanillaVersion(mcVersion, s.gameDir);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// OptiFine otomatik indirme ve sessiz kurulum (BMCLAPI aynası + LumoraOptiFineInstall)
async function prepareOptiFineProfile(mcVersion, gameDir, javaExe) {
  // Önce ana sürümün (.jar ve .json) tam olduğundan emin ol
  await ensureBaseVanillaVersion(mcVersion, gameDir);

  const listRes = await fetch('https://bmclapi2.bangbang93.com/optifine/versionList', {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!listRes.ok) throw new Error('OptiFine sürüm listesi alınamadı.');
  const all = await listRes.json();
  const matches = all.filter((x) => x.mcversion === mcVersion);
  if (!matches.length) {
    throw new Error(`Minecraft ${mcVersion} için henüz yayınlanmış bir OptiFine sürümü bulunamadı.`);
  }

  // Kararlı sürüm varsa onu, yoksa en son önizleme (pre) sürümünü seç
  const stable = matches.filter((x) => !x.patch || !/^pre/i.test(x.patch));
  const chosen = stable.length ? stable[stable.length - 1] : matches[matches.length - 1];
  const edition = chosen.patch ? `${chosen.type}_${chosen.patch}` : chosen.type;
  const customId = `${mcVersion}-OptiFine_${edition}`;
  const customJsonPath = path.join(gameDir, 'versions', customId, `${customId}.json`);

  if (fs.existsSync(customJsonPath)) {
    return customId;
  }

  const cacheDir = path.join(gameDir, 'optifine-installers');
  fs.mkdirSync(cacheDir, { recursive: true });
  const installerJar = path.join(cacheDir, chosen.filename || `OptiFine_${mcVersion}_${edition}.jar`);

  if (!fs.existsSync(installerJar)) {
    send('game:log', { level: 'debug', msg: `[Lumora]: OptiFine (${edition}) indiriliyor...` });
    send('game:progress', { type: 'optifine', task: 0, total: 1 });
    const dlUrl = `https://bmclapi2.bangbang93.com/optifine/${encodeURIComponent(chosen.mcversion)}/${encodeURIComponent(chosen.type)}/${encodeURIComponent(chosen.patch)}`;
    await downloadFileTo(dlUrl, installerJar);
    send('game:progress', { type: 'optifine', task: 1, total: 1 });
  }

  // OptiFine Installer'ın hata vermemesi için launcher_profiles.json hazırla
  const lpFile = path.join(gameDir, 'launcher_profiles.json');
  if (!fs.existsSync(lpFile)) {
    fs.writeFileSync(lpFile, JSON.stringify({ profiles: {} }, null, 2));
  }

  // LumoraOptiFineInstall.class dosyasını önbellek klasörüne kopyala ve çalıştır
  const helperSrc = path.join(__dirname, 'assets', 'LumoraOptiFineInstall.class');
  const helperDest = path.join(cacheDir, 'LumoraOptiFineInstall.class');
  fs.copyFileSync(helperSrc, helperDest);

  send('game:log', { level: 'debug', msg: `[Lumora]: OptiFine (${customId}) ana sürüm üzerine kuruluyor...` });
  const runJava = (javaExe || 'java').replace(/javaw\.exe$/i, 'java.exe');

  await new Promise((resolve, reject) => {
    execFile(
      runJava,
      ['-Djava.awt.headless=true', '-cp', `${cacheDir};${installerJar}`, 'LumoraOptiFineInstall', gameDir],
      { timeout: 60000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`OptiFine kurulum hatası: ${stderr || stdout || err.message}`));
        }
        resolve();
      }
    );
  });

  if (!fs.existsSync(customJsonPath)) {
    throw new Error(`OptiFine profili oluşturulamadı (${customId}).`);
  }
  return customId;
}

// ---------------- Java tespiti ----------------
function javaVersion(exe) {
  const checkExe = exe.replace(/javaw\.exe$/i, 'java.exe');
  return new Promise((resolve) => {
    execFile(checkExe, ['-version'], { timeout: 6000, windowsHide: true }, (err, stdout, stderr) => {
      const out = `${stderr}${stdout}`;
      const m = out.match(/version "([^"]+)"/);
      if (!m) return resolve({ version: null, major: null });
      const parts = m[1].split('.');
      const major = parts[0] === '1' ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
      resolve({ version: m[1], major });
    });
  });
}

function findJavaExes(dir, depth, found) {
  if (depth < 0 || !fs.existsSync(dir)) return;
  const candidate = path.join(dir, 'bin', 'javaw.exe');
  if (fs.existsSync(candidate)) {
    found.add(candidate);
    return;
  }
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) findJavaExes(path.join(dir, e.name), depth - 1, found);
  }
}

ipcMain.handle('java:scan', async () => {
  const found = new Set();
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env['LOCALAPPDATA'] || '';
  const roots = [
    path.join(pf, 'Java'),
    path.join(pf, 'Eclipse Adoptium'),
    path.join(pf, 'Microsoft'),
    path.join(pf, 'Zulu'),
    path.join(pf, 'BellSoft'),
    path.join(pf, 'Amazon Corretto'),
    path.join(pf86, 'Java'),
    path.join(pf86, 'Minecraft Launcher', 'runtime'),
    path.join(local, 'Packages', 'Microsoft.4297127D64EC6_8wekyb3d8bbwe', 'LocalCache', 'Local', 'runtime'),
    path.join(app.getPath('appData'), '.minecraft', 'runtime'),
    path.join(loadSettings().gameDir, 'runtime')
  ];
  if (process.env.JAVA_HOME) findJavaExes(process.env.JAVA_HOME, 0, found);
  for (const r of roots) findJavaExes(r, 4, found);

  const list = [];
  for (const exe of found) {
    const info = await javaVersion(exe);
    if (info.major) list.push({ path: exe, ...info });
  }
  const pathJava = await javaVersion('java');
  if (pathJava.major) list.unshift({ path: 'javaw', version: pathJava.version, major: pathJava.major, isPath: true });
  list.sort((a, b) => b.major - a.major);
  return list;
});

// ---------------- Otomatik Java indirme (Mojang resmi runtime) ----------------
const JAVA_RUNTIME_URL =
  'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json';

async function getVersionJson(id) {
  const m = await getManifest();
  const v = m.versions.find((x) => x.id === id);
  if (!v) throw new Error(`Sürüm bulunamadı: ${id}`);
  return (await fetch(v.url)).json();
}

async function downloadJavaRuntime(component, gameDir) {
  const platform = process.arch === 'ia32' ? 'windows-x86' : process.arch === 'arm64' ? 'windows-arm64' : 'windows-x64';
  const all = await (await fetch(JAVA_RUNTIME_URL)).json();
  const entry = all[platform] && all[platform][component] && all[platform][component][0];
  if (!entry) throw new Error(`Bu sistem için Java runtime bulunamadı (${component})`);

  const target = path.join(gameDir, 'runtime', component);
  const javaw = path.join(target, 'bin', 'javaw.exe');
  const marker = path.join(target, '.version');
  if (fs.existsSync(javaw) && fs.existsSync(marker) && fs.readFileSync(marker, 'utf8') === entry.version.name) {
    return javaw;
  }

  send('game:log', { level: 'debug', msg: `[Lumora]: Java ${entry.version.name} indiriliyor (${component})` });
  const manifest = await (await fetch(entry.manifest.url)).json();
  const files = Object.entries(manifest.files);
  for (const [rel, f] of files) {
    if (f.type === 'directory') fs.mkdirSync(path.join(target, rel), { recursive: true });
  }
  const toDownload = files.filter(([, f]) => f.type === 'file');
  let done = 0;
  const queue = [...toDownload];
  const worker = async () => {
    while (queue.length) {
      const [rel, f] = queue.shift();
      const dest = path.join(target, rel);
      const raw = f.downloads.raw;
      if (!(fs.existsSync(dest) && fs.statSync(dest).size === raw.size)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        let lastErr;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(raw.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (lastErr) throw new Error(`Java dosyası indirilemedi: ${rel}`);
      }
      done++;
      send('game:progress', { type: 'java', task: done, total: toDownload.length });
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  fs.writeFileSync(marker, entry.version.name);
  return javaw;
}

// ---------------- Çökme Analizcisi (Crash Analyzer) ----------------
function analyzeCrashLog(logsText, code) {
  if (code === 0) return null;
  if (/UnsupportedClassVersionError/i.test(logsText)) {
    return {
      title: 'Java Sürümü Uyumsuzluğu',
      detail: 'Seçili Minecraft sürümü veya modlardan biri daha yeni bir Java sürümü gerektiriyor. Ayarlar > Java kısmını "Otomatik" moda alıp tekrar deneyin.'
    };
  }
  if (/OutOfMemoryError/i.test(logsText)) {
    return {
      title: 'Yetersiz Bellek (RAM)',
      detail: 'Oyuna ayrılan RAM doldu. Ayarlar sekmesinden RAM miktarını artırıp tekrar başlatın.'
    };
  }
  if (/Incompatible mods found|Mod resolution failed|net\.fabricmc\.loader\.impl\.FormattedException/i.test(logsText)) {
    const missingMatch = logsText.match(/requires ([a-z0-9_-]+)/i);
    return {
      title: 'Eksik veya Uyumsuz Mod Tespit Edildi',
      detail: missingMatch
        ? `Yüklü modlardan biri "${missingMatch[1]}" moduna (örn. Fabric API) ihtiyaç duyuyor. Modrinth sekmesinden eksik kütüphaneyi kurun.`
        : 'Profillerdeki bazı modlar birbiriyle veya seçili Minecraft sürümüyle uyumsuz. Konsol sekmesindeki hata detayını kontrol edin.'
    };
  }
  return {
    title: `Oyun Beklenmedik Şekilde Kapandı (Kod: ${code})`,
    detail: 'Detaylı hata raporu için sol menüdeki Konsol sekmesini inceleyebilirsiniz.'
  };
}

// ---------------- Oyunu başlat (İzole Profil + Mod Yükleyici Desteği) ----------------
ipcMain.handle('game:launch', async (_e, s) => {
  if (gameRunning) return { ok: false, error: 'Oyun zaten çalışıyor.' };
  saveSettings({ ...loadSettings(), ...s });

  const instances = loadInstances();
  const activeInst = instances.find((x) => x.id === s.activeInstanceId) || instances[0];
  const mcVersion = activeInst ? activeInst.mcVersion : s.version;
  const loader = activeInst ? activeInst.loader : 'vanilla';
  const instanceDir = getInstanceDir(activeInst ? activeInst.id : 'default-vanilla', s.gameDir);
  const ramMax = (activeInst && activeInst.ramMax > 0) ? activeInst.ramMax : s.ramMax;

  const m = await getManifest().catch(() => null);
  const meta = m && m.versions.find((v) => v.id === mcVersion);
  const launcher = new Client();

  let recentLogs = '';
  const launchStart = Date.now();

  try {
    gameRunning = true;
    send('game:state', 'preparing');

    // 1) Java hazırla
    let javaExe = s.javaPath;
    if (!javaExe) {
      const vjson = await getVersionJson(mcVersion);
      const component = (vjson.javaVersion && vjson.javaVersion.component) || 'jre-legacy';
      javaExe = await downloadJavaRuntime(component, s.gameDir);
    }

    // 2) Önce ana (Vanilla) sürümün (.jar + .json) tam olduğundan emin ol
    await ensureBaseVanillaVersion(mcVersion, s.gameDir);

    // 3) Mod Loader (Fabric / Quilt / Forge / OptiFine) hazırla
    const versionConfig = {
      number: mcVersion,
      type: meta ? meta.type : 'release'
    };
    const vanillaDir = path.join(s.gameDir, 'versions', mcVersion);
    const overrides = {
      detached: false,
      gameDirectory: instanceDir,
      cwd: instanceDir,
      directory: vanillaDir,
      versionJson: path.join(vanillaDir, `${mcVersion}.json`),
      minecraftJar: path.join(vanillaDir, `${mcVersion}.jar`),
      assetIndex: mcVersion
    };

    let forgeInstallerPath = null;
    if (loader === 'fabric' || loader === 'quilt') {
      versionConfig.custom = await prepareFabricOrQuiltProfile(
        loader,
        mcVersion,
        activeInst.loaderVersion,
        s.gameDir
      );
    } else if (loader === 'optifine') {
      versionConfig.custom = await prepareOptiFineProfile(mcVersion, s.gameDir, javaExe);
    } else if (loader === 'forge') {
      forgeInstallerPath = await prepareForgeInstaller(mcVersion, s.gameDir);
    }

    const opts = {
      authorization: Authenticator.getAuth(s.username),
      root: s.gameDir,
      version: versionConfig,
      javaPath: javaExe,
      memory: {
        max: `${ramMax}M`,
        min: `${Math.min(1024, ramMax)}M`
      },
      window: s.fullscreen
        ? { fullscreen: true }
        : { width: Number(s.width) || 1280, height: Number(s.height) || 720 },
      customArgs: (s.jvmArgs || '').split(' ').map((a) => a.trim()).filter(Boolean),
      overrides
    };
    if (forgeInstallerPath) opts.forge = forgeInstallerPath;

    launcher.on('debug', (msg) => {
      const str = String(msg);
      recentLogs += str + '\n';
      send('game:log', { level: 'debug', msg: str });
    });
    launcher.on('data', (msg) => {
      const str = String(msg);
      recentLogs += str + '\n';
      if (recentLogs.length > 40000) recentLogs = recentLogs.slice(-30000);
      send('game:log', { level: 'game', msg: str });
    });
    launcher.on('progress', (p) => send('game:progress', p));
    launcher.on('download-status', (d) => send('game:download', d));
    launcher.on('arguments', () => {
      send('game:state', 'running');
      if (s.closeOnLaunch) setTimeout(() => win && win.hide(), 2500);
    });
    launcher.on('close', (code) => {
      gameRunning = false;
      // Oynama süresini kaydet
      if (activeInst) {
        const list = loadInstances();
        const idx = list.findIndex((x) => x.id === activeInst.id);
        if (idx !== -1) {
          list[idx].lastPlayed = Date.now();
          list[idx].playTimeMs = (list[idx].playTimeMs || 0) + (Date.now() - launchStart);
          saveInstances(list);
        }
      }
      send('game:state', 'closed');
      send('game:log', { level: 'debug', msg: `Oyun kapandı (kod: ${code})` });
      if (win && !win.isVisible()) win.show();

      const crashInfo = analyzeCrashLog(recentLogs, code);
      if (crashInfo) send('game:crash', crashInfo);
    });

    const proc = await launcher.launch(opts);
    if (!proc) throw new Error('Oyun başlatılamadı. Konsolu kontrol et.');
    return { ok: true };
  } catch (err) {
    gameRunning = false;
    send('game:state', 'closed');
    return { ok: false, error: err.message || String(err) };
  }
});
