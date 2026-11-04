// ============================================================
//  Lumora Launcher - Ana süreç (Electron main process)
//  Resmi GitHub: https://github.com/lumora-launcher/lumora-launcher
// ============================================================
const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const net = require('net');
const { execFile } = require('child_process');
const AdmZip = require('adm-zip');
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
let tray = null;
let isQuitting = false;
let gameRunning = false;
let manifestCache = null;

// ---------------- Ayarlar & Profiller (Instances) ----------------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const instancesFile = () => path.join(app.getPath('userData'), 'instances.json');
const accountsFile = () => path.join(app.getPath('userData'), 'accounts.json');

function defaultSettings() {
  return {
    username: '',
    authMode: 'offline', // 'offline' | 'microsoft'
    activeAccountId: '',
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
    minimizeToTray: true,
    discordRpc: true,
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

// ---------------- Sistem Tepsisi (System Tray) & Discord Rich Presence ----------------
function setupTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  const targetIcon = fs.existsSync(iconPath) ? iconPath : pngPath;
  if (!fs.existsSync(targetIcon)) return;

  try {
    tray = new Tray(nativeImage.createFromPath(targetIcon));
    tray.setToolTip(`${APP_NAME} Launcher v${getAppVersion()}`);
    const updateMenu = () => {
      const s = loadSettings();
      const instances = loadInstances();
      const activeInst = instances.find((x) => x.id === s.activeInstanceId) || instances[0];
      const menu = Menu.buildFromTemplate([
        {
          label: `${APP_NAME} Launcher v${getAppVersion()}`,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Launcher Penceresini Göster',
          click: () => {
            if (win) {
              win.show();
              win.focus();
            }
          }
        },
        {
          label: `Aktif Profil Klasörü (${activeInst ? activeInst.name : 'Varsayılan'})`,
          click: () => {
            const dir = getInstanceDir(activeInst ? activeInst.id : 'default-vanilla', s.gameDir);
            shell.openPath(dir);
          }
        },
        {
          label: 'Ana Lumora Klasörünü Aç',
          click: () => {
            fs.mkdirSync(s.gameDir, { recursive: true });
            shell.openPath(s.gameDir);
          }
        },
        { type: 'separator' },
        {
          label: 'Tamamen Çıkış Yap',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]);
      tray.setContextMenu(menu);
    };
    updateMenu();
    tray.on('click', () => {
      if (!win) return;
      if (win.isVisible()) {
        win.focus();
      } else {
        win.show();
        win.focus();
      }
    });
  } catch {
    // Tray oluşturulamazsa sessizce devam et
  }
}

// Saf Node.js Discord IPC (Rich Presence) İstemcisi
const DISCORD_CLIENT_ID = '1214954349014515762'; // Genel Minecraft / Lumora RPC Uygulama Kimliği
let discordSocket = null;
let discordReady = false;
let lastDiscordState = null;

function encodeDiscordFrame(op, data) {
  const payload = Buffer.from(JSON.stringify(data), 'utf8');
  const frame = Buffer.alloc(8 + payload.length);
  frame.writeInt32LE(op, 0);
  frame.writeInt32LE(payload.length, 4);
  payload.copy(frame, 8);
  return frame;
}

function connectDiscordRpc(pipeIndex = 0) {
  if (discordSocket || pipeIndex > 9) return;
  if (!loadSettings().discordRpc) return;

  const pipePath = `\\\\?\\pipe\\discord-ipc-${pipeIndex}`;
  const sock = net.createConnection(pipePath);
  let connected = false;

  sock.once('connect', () => {
    connected = true;
    discordSocket = sock;
    sock.write(encodeDiscordFrame(0, { v: 1, client_id: DISCORD_CLIENT_ID }));
  });

  sock.on('data', () => {
    if (!discordReady) {
      discordReady = true;
      if (lastDiscordState) setDiscordActivity(lastDiscordState);
    }
  });

  sock.once('error', () => {
    sock.destroy();
    if (!connected) {
      connectDiscordRpc(pipeIndex + 1);
    } else {
      discordSocket = null;
      discordReady = false;
    }
  });

  sock.once('close', () => {
    if (discordSocket === sock) {
      discordSocket = null;
      discordReady = false;
    }
  });
}

function setDiscordActivity(activity) {
  lastDiscordState = activity;
  const s = loadSettings();
  if (!s.discordRpc) {
    if (discordSocket) {
      try {
        discordSocket.write(encodeDiscordFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: crypto.randomUUID() }));
        discordSocket.destroy();
      } catch {}
      discordSocket = null;
      discordReady = false;
    }
    return;
  }

  if (!discordSocket) {
    connectDiscordRpc(0);
    return;
  }
  if (!discordReady) return;

  try {
    discordSocket.write(
      encodeDiscordFrame(1, {
        cmd: 'SET_ACTIVITY',
        args: {
          pid: process.pid,
          activity: {
            details: activity.details || 'Lumora Launcher',
            state: activity.state || 'Menüde Geziyor',
            timestamps: { start: activity.startTimestamp || Date.now() },
            assets: {
              large_image: 'minecraft',
              large_text: `Lumora Launcher v${getAppVersion()}`
            },
            buttons: [
              { label: 'Lumora Launcher (GitHub)', url: GITHUB_URL }
            ]
          }
        },
        nonce: crypto.randomUUID()
      })
    );
  } catch {
    // Sessizce geç
  }
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
  setupTray();
  setupAutoUpdater();
  setDiscordActivity({
    details: 'Menüde Geziyor',
    state: 'Profil Hazırlanıyor',
    startTimestamp: Date.now()
  });
});
app.on('before-quit', () => {
  isQuitting = true;
});
app.on('window-all-closed', () => app.quit());

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

// ---------------- Pencere kontrolleri ----------------
ipcMain.on('win:minimize', () => win.minimize());
ipcMain.on('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.on('win:hideToTray', () => {
  if (win) win.hide();
});
ipcMain.on('win:close', () => {
  if (gameRunning && loadSettings().minimizeToTray && win) {
    win.hide();
  } else if (win) {
    isQuitting = true;
    win.close();
  }
});

// ---------------- Ayar IPC ----------------
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:save', (_e, s) => {
  const merged = { ...loadSettings(), ...s };
  saveSettings(merged);
  if (!merged.discordRpc) {
    setDiscordActivity(lastDiscordState || { details: 'Menüde Geziyor', state: 'Hazır' });
  } else if (!discordSocket) {
    connectDiscordRpc(0);
  }
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
  for (const sub of ['mods', 'resourcepacks', 'shaderpacks', 'config', 'saves', 'screenshots', 'backups']) {
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

// ---------------- Modpack (.mrpack) İçe ve Dışa Aktarma + Modrinth Modpack Kurulumu ----------------
async function installMrpackArchive(zipPathOrBuffer, customName) {
  const zip = new AdmZip(zipPathOrBuffer);
  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) {
    throw new Error('Geçersiz .mrpack dosyası (modrinth.index.json bulunamadı).');
  }
  const index = JSON.parse(zip.readAsText(indexEntry));
  const deps = index.dependencies || {};
  const mcVersion = deps.minecraft || '1.21.4';

  let loader = 'vanilla';
  let loaderVersion = '';
  if (deps['fabric-loader']) {
    loader = 'fabric';
    loaderVersion = deps['fabric-loader'];
  } else if (deps['quilt-loader']) {
    loader = 'quilt';
    loaderVersion = deps['quilt-loader'];
  } else if (deps.forge || deps.neoforge) {
    loader = 'forge';
    loaderVersion = deps.forge || deps.neoforge || '';
  }

  const packName = String(customName || index.name || 'Modpack Profili').trim().slice(0, 40);
  const id = 'inst-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const inst = {
    id,
    name: packName,
    mcVersion,
    loader,
    loaderVersion,
    icon: loader,
    ramMax: 0,
    createdAt: Date.now(),
    lastPlayed: 0,
    playTimeMs: 0
  };

  const list = loadInstances();
  list.unshift(inst);
  saveInstances(list);

  const instDir = getInstanceDir(id);
  for (const sub of ['mods', 'resourcepacks', 'shaderpacks', 'config', 'saves', 'screenshots', 'backups']) {
    fs.mkdirSync(path.join(instDir, sub), { recursive: true });
  }

  // 1) Overrides klasöründeki dosyaları (config, options, vb.) çıkart
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const relMatch = entry.entryName.match(/^(?:overrides|client-overrides)\/(.+)$/);
    if (relMatch && relMatch[1]) {
      const safeRel = path.normalize(relMatch[1]).replace(/^(\.\.(\/|\\|$))+/, '');
      const dest = path.join(instDir, safeRel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, entry.getData());
    }
  }

  // 2) files dizisindeki mod / shader / kaynak paketlerini paralel indir
  const files = (index.files || []).filter((f) => !f.env || f.env.client !== 'unsupported');
  let done = 0;
  const queue = [...files];
  const meta = loadModMetaFile(instDir);

  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      const safeRel = path.normalize(f.path).replace(/^(\.\.(\/|\\|$))+/, '');
      const dest = path.join(instDir, safeRel);
      const urls = Array.isArray(f.downloads) ? f.downloads : [];
      if (urls.length > 0) {
        await downloadFileTo(urls[0], dest);
        const baseName = path.basename(dest);
        meta[baseName] = {
          title: baseName.replace(/\.(jar|zip)$/i, ''),
          versionNumber: '',
          installedAt: Date.now()
        };
      }
      done++;
      send('game:progress', { type: 'mrpack', task: done, total: files.length });
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  saveModMetaFile(instDir, meta);

  const s = loadSettings();
  saveSettings({ ...s, activeInstanceId: id, version: mcVersion });
  return enrichInstance(inst);
}

ipcMain.handle('mrpack:importFile', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Modrinth Modpack (.mrpack) Dosyası Seç',
    filters: [{ name: 'Modrinth Modpack', extensions: ['mrpack', 'zip'] }],
    properties: ['openFile']
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try {
    const inst = await installMrpackArchive(r.filePaths[0]);
    return { ok: true, instance: inst };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('modrinth:installModpack', async (_e, { projectId, title }) => {
  try {
    const res = await fetch(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) throw new Error('Modpack sürümleri alınamadı.');
    const versions = await res.json();
    if (!Array.isArray(versions) || !versions.length) {
      throw new Error('Bu modpack için indirilebilir sürüm bulunamadı.');
    }
    const ver = versions[0];
    const file = ver.files.find((f) => f.primary) || ver.files[0];
    if (!file || !file.url) throw new Error('Modpack dosyası bulunamadı.');

    send('game:log', { level: 'debug', msg: `[Modrinth]: ${title} (.mrpack) indiriliyor...` });
    const dlRes = await fetch(file.url, { headers: { 'User-Agent': USER_AGENT } });
    if (!dlRes.ok) throw new Error(`Modpack indirilemedi (HTTP ${dlRes.status})`);
    const buf = Buffer.from(await dlRes.arrayBuffer());

    const inst = await installMrpackArchive(buf, title);
    return { ok: true, instance: inst };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('mrpack:exportInstance', async (_e, { instanceId }) => {
  const list = loadInstances();
  const inst = list.find((x) => x.id === instanceId);
  if (!inst) return { ok: false, error: 'Profil bulunamadı.' };

  const saveDialog = await dialog.showSaveDialog(win, {
    title: 'Profili .mrpack Olarak Dışa Aktar',
    defaultPath: `${inst.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mrpack`,
    filters: [{ name: 'Modrinth Modpack', extensions: ['mrpack'] }]
  });
  if (saveDialog.canceled || !saveDialog.filePath) return { ok: false, canceled: true };

  try {
    const instDir = getInstanceDir(inst.id);
    const zip = new AdmZip();
    const dependencies = { minecraft: inst.mcVersion };
    if (inst.loader === 'fabric') dependencies['fabric-loader'] = inst.loaderVersion || '0.16.10';
    else if (inst.loader === 'quilt') dependencies['quilt-loader'] = inst.loaderVersion || '0.26.0';
    else if (inst.loader === 'forge') dependencies.forge = inst.loaderVersion || 'latest';

    const indexJson = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: '1.0.0',
      name: inst.name,
      summary: 'Lumora Launcher ile dışa aktarıldı',
      files: [],
      dependencies
    };

    zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(indexJson, null, 2), 'utf8'));

    for (const folder of ['mods', 'config', 'resourcepacks', 'shaderpacks']) {
      const full = path.join(instDir, folder);
      if (fs.existsSync(full)) {
        zip.addLocalFolder(full, `overrides/${folder}`);
      }
    }
    zip.writeZip(saveDialog.filePath);
    return { ok: true, filePath: saveDialog.filePath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// ---------------- Dünya (Saves) Yöneticisi & Ekran Görüntüleri (Screenshots) ----------------
function getFolderSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) {
        try {
          total += fs.statSync(p).size;
        } catch {}
      }
    }
  }
  return total;
}

ipcMain.handle('worlds:list', (_e, { instanceId }) => {
  const instDir = getInstanceDir(instanceId);
  const savesDir = path.join(instDir, 'saves');
  const backupsDir = path.join(instDir, 'backups');
  fs.mkdirSync(savesDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });

  const entries = fs.readdirSync(savesDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  const worlds = entries.map((e) => {
    const wDir = path.join(savesDir, e.name);
    const st = fs.statSync(wDir);
    const iconFile = path.join(wDir, 'icon.png');
    let iconData = null;
    if (fs.existsSync(iconFile)) {
      try {
        iconData = 'data:image/png;base64,' + fs.readFileSync(iconFile).toString('base64');
      } catch {}
    }
    return {
      folderName: e.name,
      lastModified: st.mtimeMs,
      sizeBytes: getFolderSize(wDir),
      iconData
    };
  });
  worlds.sort((a, b) => b.lastModified - a.lastModified);

  const backups = fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.zip$/i.test(e.name))
    .map((e) => {
      const st = fs.statSync(path.join(backupsDir, e.name));
      return { fileName: e.name, sizeBytes: st.size, createdAt: st.mtimeMs };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return { worlds, backups };
});

ipcMain.handle('worlds:backup', (_e, { instanceId, folderName }) => {
  const instDir = getInstanceDir(instanceId);
  const worldDir = path.join(instDir, 'saves', folderName);
  if (!fs.existsSync(worldDir)) return { ok: false, error: 'Dünya klasörü bulunamadı.' };

  const backupsDir = path.join(instDir, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipName = `${folderName}_${stamp}.zip`;
  const zipPath = path.join(backupsDir, zipName);

  const zip = new AdmZip();
  zip.addLocalFolder(worldDir, folderName);
  zip.writeZip(zipPath);
  return { ok: true, zipName };
});

ipcMain.handle('worlds:restore', (_e, { instanceId, backupFileName }) => {
  const instDir = getInstanceDir(instanceId);
  const zipPath = path.join(instDir, 'backups', backupFileName);
  if (!fs.existsSync(zipPath)) return { ok: false, error: 'Yedek dosyası bulunamadı.' };

  const savesDir = path.join(instDir, 'saves');
  fs.mkdirSync(savesDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(savesDir, true);
  return { ok: true };
});

ipcMain.handle('worlds:delete', (_e, { instanceId, folderName }) => {
  const instDir = getInstanceDir(instanceId);
  const worldDir = path.join(instDir, 'saves', folderName);
  if (fs.existsSync(worldDir)) {
    fs.rmSync(worldDir, { recursive: true, force: true });
  }
  return { ok: true };
});

ipcMain.handle('screenshots:list', (_e, { instanceId }) => {
  const instDir = getInstanceDir(instanceId);
  const scDir = path.join(instDir, 'screenshots');
  fs.mkdirSync(scDir, { recursive: true });

  const files = fs
    .readdirSync(scDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(png|jpg|jpeg)$/i.test(e.name))
    .map((e) => {
      const full = path.join(scDir, e.name);
      const st = fs.statSync(full);
      let dataUrl = null;
      try {
        dataUrl = 'data:image/png;base64,' + fs.readFileSync(full).toString('base64');
      } catch {}
      return {
        fileName: e.name,
        fullPath: full,
        createdAt: st.mtimeMs,
        sizeBytes: st.size,
        dataUrl
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 36);
  return files;
});

// ---------------- Sunucu Listesi & Canlı Ping (Minecraft SLP) ----------------
const serversFile = () => path.join(app.getPath('userData'), 'servers.json');

function defaultServers() {
  return [
    { id: 'srv-hypixel', name: 'Hypixel Network', address: 'mc.hypixel.net' },
    { id: 'srv-wynncraft', name: 'Wynncraft MMORPG', address: 'play.wynncraft.com' },
    { id: 'srv-cubecraft', name: 'CubeCraft Games', address: 'play.cubecraft.net' },
    { id: 'srv-minemen', name: 'Minemen Club (PvP)', address: 'na.minemen.club' }
  ];
}

function loadServers() {
  try {
    const list = JSON.parse(fs.readFileSync(serversFile(), 'utf8'));
    if (Array.isArray(list)) return list;
    return defaultServers();
  } catch {
    return defaultServers();
  }
}

function saveServers(list) {
  fs.mkdirSync(path.dirname(serversFile()), { recursive: true });
  fs.writeFileSync(serversFile(), JSON.stringify(list, null, 2));
}

function writeVarInt(val) {
  const bytes = [];
  let v = val >>> 0;
  while ((v & ~0x7f) !== 0) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v & 0x7f);
  return Buffer.from(bytes);
}

function readVarInt(buf, offset = 0) {
  let num = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos++];
    num |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value: num, nextOffset: pos };
    shift += 7;
    if (shift > 35) break;
  }
  return null;
}

function pingMinecraftServer(address, timeoutMs = 4000) {
  const [host, portStr] = String(address || '').trim().split(':');
  const port = Number(portStr) || 25565;

  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    let chunks = Buffer.alloc(0);

    const finish = (res) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {}
      resolve(res);
    };

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish({ online: false, error: 'Zaman aşımı' }));
    socket.on('error', () => finish({ online: false, error: 'Bağlanılamadı' }));

    socket.connect(port, host, () => {
      const pingMs = Date.now() - start;
      const hostBuf = Buffer.from(host, 'utf8');
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port, 0);

      // Handshake packet (ID 0x00, protocol 767, host, port, nextState=1)
      const handshakeBody = Buffer.concat([
        writeVarInt(0x00),
        writeVarInt(767),
        writeVarInt(hostBuf.length),
        hostBuf,
        portBuf,
        writeVarInt(1)
      ]);
      const handshakePacket = Buffer.concat([writeVarInt(handshakeBody.length), handshakeBody]);
      const statusReqPacket = Buffer.from([0x01, 0x00]); // length 1, packet ID 0x00
      socket.write(Buffer.concat([handshakePacket, statusReqPacket]));

      socket.on('data', (chunk) => {
        chunks = Buffer.concat([chunks, chunk]);
        const lenInfo = readVarInt(chunks, 0);
        if (!lenInfo) return;
        if (chunks.length < lenInfo.nextOffset + lenInfo.value) return;

        const pktIdInfo = readVarInt(chunks, lenInfo.nextOffset);
        if (!pktIdInfo || pktIdInfo.value !== 0x00) return;

        const strLenInfo = readVarInt(chunks, pktIdInfo.nextOffset);
        if (!strLenInfo) return;

        const jsonStart = strLenInfo.nextOffset;
        const jsonEnd = jsonStart + strLenInfo.value;
        if (chunks.length < jsonEnd) return;

        try {
          const jsonStr = chunks.slice(jsonStart, jsonEnd).toString('utf8');
          const parsed = JSON.parse(jsonStr);
          let motd = '';
          if (typeof parsed.description === 'string') motd = parsed.description;
          else if (parsed.description && parsed.description.text) motd = parsed.description.text;
          else if (parsed.description && Array.isArray(parsed.description.extra)) {
            motd = parsed.description.extra.map((x) => x.text || '').join('');
          }
          motd = motd.replace(/§[0-9a-fk-or]/gi, '').trim();

          finish({
            online: true,
            pingMs,
            playersOnline: parsed.players ? parsed.players.online : 0,
            playersMax: parsed.players ? parsed.players.max : 0,
            versionName: parsed.version ? parsed.version.name : '',
            favicon: parsed.favicon || null,
            motd
          });
        } catch {
          finish({ online: true, pingMs, playersOnline: 0, playersMax: 0, versionName: '', motd: '' });
        }
      });
    });
  });
}

ipcMain.handle('servers:list', () => loadServers());
ipcMain.handle('servers:add', (_e, { name, address }) => {
  const list = loadServers();
  const srv = {
    id: 'srv-' + Date.now().toString(36),
    name: String(name || address || 'Minecraft Sunucusu').trim().slice(0, 40),
    address: String(address || '').trim()
  };
  list.push(srv);
  saveServers(list);
  return list;
});
ipcMain.handle('servers:delete', (_e, id) => {
  const list = loadServers().filter((x) => x.id !== id);
  saveServers(list);
  return list;
});
ipcMain.handle('servers:ping', (_e, address) => pingMinecraftServer(address));

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

let directDownloadedInstallerPath = null;

function cleanReleaseNotes(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
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
      releaseNotes: cleanReleaseNotes(info.releaseNotes),
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
    directDownloadedInstallerPath = null;
    send('update:event', {
      state: 'downloaded',
      version: info.version,
      message: 'Güncelleme indirildi! Şimdi yeniden başlatıp kurabilirsin.'
    });
  });

  autoUpdater.on('error', () => {
    // Hata durumunda update:download içindeki doğrudan GitHub .exe indiricisi devreye girer
  });
}

async function downloadInstallerDirectly(exeUrl) {
  const dest = path.join(app.getPath('temp'), `Lumora-Launcher-Update-${Date.now()}.exe`);
  const res = await fetch(exeUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`İndirme hatası (HTTP ${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let transferred = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    transferred += value.length;
    const percent = total > 0 ? Math.round((transferred / total) * 100) : 50;
    send('update:event', {
      state: 'downloading',
      percent,
      transferred,
      total
    });
  }

  fs.writeFileSync(dest, Buffer.concat(chunks));
  directDownloadedInstallerPath = dest;
  send('update:event', {
    state: 'downloaded',
    version: 'Yeni Sürüm',
    message: 'Güncelleme paketi indirildi! Şimdi yeniden başlatıp kurabilirsin.'
  });
  return dest;
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
      releaseNotes: cleanReleaseNotes(data.body) || 'Yeni sürüm yayınlandı.',
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
    releaseNotes: cleanReleaseNotes(data.body) || '',
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
      // Eğer latest.yml içindeki dosya adı ile GitHub'daki .exe adı farklıysa doğrudan .exe'yi indir
      try {
        let exeUrl = fallbackUrl;
        if (!exeUrl || !/\.exe$/i.test(exeUrl)) {
          const rel = await checkOfficialGithubRelease();
          exeUrl = rel.downloadUrl;
        }
        if (exeUrl && /\.exe$/i.test(exeUrl)) {
          await downloadInstallerDirectly(exeUrl);
          return { ok: true, mode: 'direct-installer' };
        }
      } catch {}
      if (fallbackUrl) {
        shell.openExternal(fallbackUrl);
        return { ok: true, mode: 'browser' };
      }
      return { ok: false, error: err.message || String(err) };
    }
  } else {
    if (fallbackUrl && /\.exe$/i.test(fallbackUrl)) {
      try {
        await downloadInstallerDirectly(fallbackUrl);
        return { ok: true, mode: 'direct-installer' };
      } catch {}
    }
    if (fallbackUrl && /^https?:\/\//i.test(fallbackUrl)) {
      shell.openExternal(fallbackUrl);
      return { ok: true, mode: 'browser' };
    }
    return { ok: false, error: 'Geliştirici modunda otomatik kurulum yapılamaz.' };
  }
});

ipcMain.handle('update:install', () => {
  if (directDownloadedInstallerPath && fs.existsSync(directDownloadedInstallerPath)) {
    isQuitting = true;
    shell.openPath(directDownloadedInstallerPath);
    setTimeout(() => app.quit(), 600);
    return { ok: true };
  }
  if (app.isPackaged) {
    isQuitting = true;
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

// ---------------- Resmi Microsoft (Xbox Live) Hesap Girişi & Çoklu Hesap Yöneticisi ----------------
const MS_CLIENT_ID = '00000000402b5328';
const MS_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
const MS_AUTH_URL =
  `https://login.live.com/oauth20_authorize.srf?client_id=${MS_CLIENT_ID}` +
  `&response_type=code&scope=${encodeURIComponent('service::user.auth.xboxlive.com::MBI_SSL')}` +
  `&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}&prompt=select_account`;

function loadAccounts() {
  try {
    const list = JSON.parse(fs.readFileSync(accountsFile(), 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveAccounts(list) {
  fs.mkdirSync(path.dirname(accountsFile()), { recursive: true });
  fs.writeFileSync(accountsFile(), JSON.stringify(list, null, 2));
}

async function exchangeCodeOrRefreshForMcAccount(paramsObj) {
  // 1) Microsoft OAuth2 Token
  const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      redirect_uri: MS_REDIRECT_URI,
      ...paramsObj
    }).toString()
  });
  if (!tokenRes.ok) {
    throw new Error(`Microsoft OAuth hatası (HTTP ${tokenRes.status})`);
  }
  const msToken = await tokenRes.json();

  // 2) Xbox Live (XBL) Doğrulaması
  const xblRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msToken.access_token}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    })
  });
  if (!xblRes.ok) {
    throw new Error(`Xbox Live doğrulaması başarısız oldu (HTTP ${xblRes.status})`);
  }
  const xblData = await xblRes.json();
  const uhs = xblData.DisplayClaims?.xui?.[0]?.uhs;
  if (!uhs) throw new Error('Xbox Live kullanıcı kimliği (UHS) alınamadı.');

  // 3) XSTS Doğrulaması
  const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xblData.Token]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    })
  });
  if (!xstsRes.ok) {
    const errJson = await xstsRes.json().catch(() => ({}));
    if (errJson.XErr === 2148916233) {
      throw new Error('Bu Microsoft hesabına bağlı bir Xbox profili bulunamadı.');
    }
    if (errJson.XErr === 2148916238) {
      throw new Error('Reşit olmayan hesaplar için ebeveyn (Xbox Aile) izni gereklidir.');
    }
    throw new Error(`XSTS doğrulaması başarısız oldu (HTTP ${xstsRes.status})`);
  }
  const xstsData = await xstsRes.json();

  // 4) Minecraft Services Login
  const mcLoginRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${uhs};${xstsData.Token}`
    })
  });
  if (!mcLoginRes.ok) {
    throw new Error(`Minecraft oturumu açılamadı (HTTP ${mcLoginRes.status})`);
  }
  const mcLogin = await mcLoginRes.json();

  // 5) Minecraft Oyuncu Profili (Orijinal Lisans Kontrolü)
  const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${mcLogin.access_token}` }
  });
  if (!profileRes.ok) {
    throw new Error('Bu Microsoft hesabında orijinal Minecraft: Java Edition lisansı bulunamadı.');
  }
  const profile = await profileRes.json();
  if (!profile || !profile.id || !profile.name) {
    throw new Error('Minecraft oyuncu profili alınamadı.');
  }

  return {
    id: profile.id,
    uuid: profile.id,
    name: profile.name,
    type: 'microsoft',
    accessToken: mcLogin.access_token,
    refreshToken: msToken.refresh_token || paramsObj.refresh_token || '',
    expiresAt: Date.now() + (Number(mcLogin.expires_in) || 86400) * 1000 - 120000
  };
}

ipcMain.handle('auth:listAccounts', () => {
  const s = loadSettings();
  return {
    accounts: loadAccounts().map((a) => ({
      id: a.id,
      uuid: a.uuid,
      name: a.name,
      type: a.type
    })),
    authMode: s.authMode || 'offline',
    activeAccountId: s.activeAccountId || ''
  };
});

ipcMain.handle('auth:loginMicrosoft', async () => {
  return new Promise((resolve) => {
    const authWin = new BrowserWindow({
      width: 520,
      height: 660,
      parent: win || undefined,
      modal: true,
      title: 'Microsoft Hesabı ile Giriş Yap — Lumora Launcher',
      backgroundColor: '#0b0d14',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      try {
        if (!authWin.isDestroyed()) authWin.close();
      } catch {}
      resolve(result);
    };

    const handleUrl = async (urlStr) => {
      if (!urlStr || !urlStr.startsWith(MS_REDIRECT_URI)) return;
      try {
        const u = new URL(urlStr);
        const code = u.searchParams.get('code');
        const err = u.searchParams.get('error');
        if (err) {
          return finish({ ok: false, error: 'Microsoft girişi iptal edildi.' });
        }
        if (!code) return;

        const acc = await exchangeCodeOrRefreshForMcAccount({
          grant_type: 'authorization_code',
          code
        });

        const accounts = loadAccounts().filter((x) => x.id !== acc.id);
        accounts.unshift(acc);
        saveAccounts(accounts);

        const s = loadSettings();
        s.authMode = 'microsoft';
        s.activeAccountId = acc.id;
        s.username = acc.name;
        saveSettings(s);

        finish({
          ok: true,
          account: { id: acc.id, uuid: acc.uuid, name: acc.name, type: acc.type }
        });
      } catch (e) {
        finish({ ok: false, error: e.message || String(e) });
      }
    };

    authWin.webContents.on('will-redirect', (_e, url) => handleUrl(url));
    authWin.webContents.on('did-navigate', (_e, url) => handleUrl(url));
    authWin.on('closed', () => finish({ ok: false, error: 'Giriş penceresi kapatıldı.' }));
    authWin.loadURL(MS_AUTH_URL);
  });
});

ipcMain.handle('auth:selectAccount', (_e, { authMode, accountId }) => {
  const s = loadSettings();
  s.authMode = authMode === 'microsoft' ? 'microsoft' : 'offline';
  if (s.authMode === 'microsoft' && accountId) {
    const acc = loadAccounts().find((x) => x.id === accountId);
    if (acc) {
      s.activeAccountId = acc.id;
      s.username = acc.name;
    }
  }
  saveSettings(s);
  return { ok: true, settings: s };
});

ipcMain.handle('auth:removeAccount', (_e, accountId) => {
  const accounts = loadAccounts().filter((x) => x.id !== accountId);
  saveAccounts(accounts);
  const s = loadSettings();
  if (s.activeAccountId === accountId) {
    s.activeAccountId = accounts[0] ? accounts[0].id : '';
    if (!s.activeAccountId) s.authMode = 'offline';
    saveSettings(s);
  }
  return { ok: true };
});

async function getAuthorizationForLaunch(s) {
  if (s.authMode === 'microsoft') {
    const accounts = loadAccounts();
    let acc = accounts.find((x) => x.id === s.activeAccountId) || accounts[0];
    if (!acc) {
      throw new Error('Kayıtlı bir Microsoft hesabı bulunamadı. Lütfen önce Microsoft ile giriş yapın veya Çevrimdışı moda geçin.');
    }
    if (Date.now() > (acc.expiresAt || 0) && acc.refreshToken) {
      send('game:log', { level: 'debug', msg: `[Lumora]: Microsoft oturum anahtarı (${acc.name}) yenileniyor...` });
      acc = await exchangeCodeOrRefreshForMcAccount({
        grant_type: 'refresh_token',
        refresh_token: acc.refreshToken
      });
      const updated = accounts.map((x) => (x.id === acc.id ? acc : x));
      saveAccounts(updated);
    }
    return {
      access_token: acc.accessToken,
      client_token: acc.uuid,
      uuid: acc.uuid,
      name: acc.name,
      user_properties: '{}',
      meta: {
        type: 'msa',
        demo: false
      }
    };
  }
  return Authenticator.getAuth(s.username);
}

// ---------------- Diğer Launcher'lardan Profil Göçü (Import Wizard) ----------------
function inspectExternalInstanceDir(dir, sourceName, fallbackName) {
  if (!fs.existsSync(dir)) return null;
  try {
    let name = fallbackName || path.basename(dir);
    let mcVersion = '1.21.4';
    let loader = 'vanilla';

    // 1) CurseForge: minecraftinstance.json
    const cfFile = path.join(dir, 'minecraftinstance.json');
    if (fs.existsSync(cfFile)) {
      try {
        const cf = JSON.parse(fs.readFileSync(cfFile, 'utf8'));
        if (cf.name) name = cf.name;
        if (cf.gameVersion) mcVersion = cf.gameVersion;
        const ml = JSON.stringify(cf.baseModLoader || {}).toLowerCase();
        if (ml.includes('fabric')) loader = 'fabric';
        else if (ml.includes('quilt')) loader = 'quilt';
        else if (ml.includes('forge')) loader = 'forge';
      } catch {}
    }

    // 2) Prism / MultiMC: mmc-pack.json & instance.cfg
    const mmcRoot = fs.existsSync(path.join(dir, 'mmc-pack.json'))
      ? dir
      : fs.existsSync(path.join(path.dirname(dir), 'mmc-pack.json'))
      ? path.dirname(dir)
      : null;
    if (mmcRoot) {
      try {
        const mmc = JSON.parse(fs.readFileSync(path.join(mmcRoot, 'mmc-pack.json'), 'utf8'));
        for (const comp of mmc.components || []) {
          if (comp.uid === 'net.minecraft' && comp.version) mcVersion = comp.version;
          if (comp.uid === 'net.fabricmc.fabric-loader') loader = 'fabric';
          if (comp.uid === 'org.quiltmc.quilt-loader') loader = 'quilt';
          if (comp.uid === 'net.minecraftforge') loader = 'forge';
        }
        const cfgPath = path.join(mmcRoot, 'instance.cfg');
        if (fs.existsSync(cfgPath)) {
          const cfgText = fs.readFileSync(cfgPath, 'utf8');
          const m = cfgText.match(/^name=(.+)$/m);
          if (m && m[1]) name = m[1].trim();
        }
      } catch {}
    }

    // 3) Resmi .minecraft / versions klasörü
    const versionsDir = path.join(dir, 'versions');
    if (fs.existsSync(versionsDir)) {
      try {
        const vers = fs.readdirSync(versionsDir);
        const rel = vers.find((v) => /^1\.\d+(\.\d+)?$/.test(v));
        if (rel) mcVersion = rel;
        if (vers.some((v) => /fabric/i.test(v))) loader = 'fabric';
        else if (vers.some((v) => /optifine/i.test(v))) loader = 'optifine';
        else if (vers.some((v) => /forge/i.test(v))) loader = 'forge';
      } catch {}
    }

    const modsCount = countDirFiles(path.join(dir, 'mods'), /\.jar(\.disabled)?$/i);
    const savesCount = fs.existsSync(path.join(dir, 'saves'))
      ? fs.readdirSync(path.join(dir, 'saves'), { withFileTypes: true }).filter((d) => d.isDirectory()).length
      : 0;
    const packsCount = countDirFiles(path.join(dir, 'resourcepacks'), /\.zip$/i);
    const shadersCount = countDirFiles(path.join(dir, 'shaderpacks'), /\.zip$/i);

    if (modsCount > 0 && loader === 'vanilla') loader = 'fabric';

    return {
      sourceName,
      name,
      dir,
      mcVersion,
      loader,
      modsCount,
      savesCount,
      packsCount,
      shadersCount
    };
  } catch {
    return null;
  }
}

ipcMain.handle('import:scanExternal', () => {
  const results = [];
  const appData = app.getPath('appData');
  const home = app.getPath('home');

  // 1) Resmi .minecraft
  const dotMc = path.join(appData, '.minecraft');
  if (fs.existsSync(dotMc)) {
    const info = inspectExternalInstanceDir(dotMc, 'Resmi Minecraft (.minecraft)', 'Resmi .minecraft Profilim');
    if (info) results.push(info);
  }

  // 2) CurseForge Instances
  const cfInstances = path.join(home, 'curseforge', 'minecraft', 'Instances');
  if (fs.existsSync(cfInstances)) {
    try {
      for (const d of fs.readdirSync(cfInstances, { withFileTypes: true })) {
        if (d.isDirectory()) {
          const info = inspectExternalInstanceDir(path.join(cfInstances, d.name), 'CurseForge', d.name);
          if (info) results.push(info);
        }
      }
    } catch {}
  }

  // 3) Prism Launcher & MultiMC Instances
  for (const [label, rootDir] of [
    ['Prism Launcher', path.join(appData, 'PrismLauncher', 'instances')],
    ['MultiMC', path.join(appData, 'MultiMC', 'instances')]
  ]) {
    if (fs.existsSync(rootDir)) {
      try {
        for (const d of fs.readdirSync(rootDir, { withFileTypes: true })) {
          if (!d.isDirectory() || d.name.startsWith('_')) continue;
          const mcSub = path.join(rootDir, d.name, '.minecraft');
          const minecraftSub = path.join(rootDir, d.name, 'minecraft');
          const target = fs.existsSync(mcSub) ? mcSub : fs.existsSync(minecraftSub) ? minecraftSub : null;
          if (target) {
            const info = inspectExternalInstanceDir(target, label, d.name);
            if (info) results.push(info);
          }
        }
      } catch {}
    }
  }

  // 4) Modrinth App Profiles
  for (const mrPath of [
    path.join(appData, 'ModrinthApp', 'profiles'),
    path.join(appData, 'com.modrinth.theseus', 'profiles')
  ]) {
    if (fs.existsSync(mrPath)) {
      try {
        for (const d of fs.readdirSync(mrPath, { withFileTypes: true })) {
          if (d.isDirectory()) {
            const info = inspectExternalInstanceDir(path.join(mrPath, d.name), 'Modrinth App', d.name);
            if (info) results.push(info);
          }
        }
      } catch {}
    }
  }

  return results;
});

function copyFolderRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sPath = path.join(src, entry.name);
    const dPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderRecursiveSync(sPath, dPath);
    } else {
      fs.copyFileSync(sPath, dPath);
    }
  }
}

function migrateExternalDirectoryToLumora(info) {
  const list = loadInstances();
  const id = `migrated-${Date.now().toString(36)}`;
  const newInst = {
    id,
    name: String(info.name || 'İçe Aktarılan Profil').slice(0, 42),
    mcVersion: info.mcVersion || '1.21.4',
    loader: info.loader || 'fabric',
    loaderVersion: '',
    icon: info.loader || 'grass',
    ramMax: 0,
    createdAt: Date.now(),
    lastPlayed: 0,
    playTimeMs: 0
  };
  list.push(newInst);
  saveInstances(list);

  const destDir = getInstanceDir(id);
  for (const sub of ['mods', 'saves', 'shaderpacks', 'resourcepacks', 'config']) {
    const srcSub = path.join(info.dir, sub);
    if (fs.existsSync(srcSub)) {
      copyFolderRecursiveSync(srcSub, path.join(destDir, sub));
    }
  }
  for (const file of ['options.txt', 'optionsof.txt', 'servers.dat']) {
    const srcFile = path.join(info.dir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(destDir, file));
    }
  }

  return enrichInstance(newInst);
}

ipcMain.handle('import:migrateFolder', async (_e, info) => {
  try {
    if (!info || !info.dir || !fs.existsSync(info.dir)) {
      throw new Error('Kaynak klasör bulunamadı.');
    }
    const inst = migrateExternalDirectoryToLumora(info);
    return { ok: true, instance: inst };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('import:pickCustomFolder', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'İçe Aktarılacak Minecraft / Profil Klasörünü Seçin',
    properties: ['openDirectory']
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  const chosenDir = r.filePaths[0];
  const subMc = path.join(chosenDir, '.minecraft');
  const actualDir = fs.existsSync(subMc) ? subMc : chosenDir;
  const info = inspectExternalInstanceDir(actualDir, 'Özel Klasör', path.basename(chosenDir));
  if (!info) return { ok: false, error: 'Seçilen klasör geçerli bir Minecraft klasörü değil.' };
  const inst = migrateExternalDirectoryToLumora(info);
  return { ok: true, instance: inst };
});

// ---------------- Gelişmiş Akıllı Çökme Analizcisi (Smart Crash Analyzer) ----------------
function readLatestCrashOrLogFile(instanceDir) {
  if (!instanceDir || !fs.existsSync(instanceDir)) return '';
  let extra = '';
  try {
    const crashDir = path.join(instanceDir, 'crash-reports');
    if (fs.existsSync(crashDir)) {
      const files = fs
        .readdirSync(crashDir)
        .filter((f) => f.endsWith('.txt'))
        .map((f) => ({ name: f, mtime: fs.statSync(path.join(crashDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files[0]) {
        extra += '\n' + fs.readFileSync(path.join(crashDir, files[0].name), 'utf8').slice(0, 20000);
      }
    }
    const latestLog = path.join(instanceDir, 'logs', 'latest.log');
    if (fs.existsSync(latestLog)) {
      extra += '\n' + fs.readFileSync(latestLog, 'utf8').slice(-20000);
    }
  } catch {}
  return extra;
}

function analyzeCrashLog(logsText, code, instanceDir) {
  const combined = `${logsText || ''}\n${readLatestCrashOrLogFile(instanceDir)}`;
  if (code === 0 && !/Exception|Error|CrashReport/i.test(combined)) return null;

  if (/UnsupportedClassVersionError/i.test(combined)) {
    const classVer = combined.match(/class file version (\d+)\.0/i);
    const reqJava =
      classVer && Number(classVer[1]) >= 65
        ? 'Java 21'
        : classVer && Number(classVer[1]) >= 61
        ? 'Java 17'
        : 'daha yeni bir Java';
    return {
      title: `Java Sürümü Uyumsuzluğu (${reqJava} Gerekli)`,
      detail: `Seçili Minecraft sürümü veya kurulu modlardan biri ${reqJava} gerektiriyor. Ayarlar > Java kısmını "Otomatik" moda aldığınızda Lumora uygun resmi Java sürümünü kendisi indirip kullanacaktır.`,
      suggestedAction: 'java-auto'
    };
  }
  if (/OutOfMemoryError/i.test(combined)) {
    return {
      title: 'Yetersiz Bellek (Java Heap Space / RAM Doldu)',
      detail: 'Oyuna veya mod paketine ayrılan RAM miktarı yetersiz kaldı. Ayarlar sekmesinden RAM çubuğunu 4 GB veya 6 GB seviyesine yükseltip tekrar deneyin.',
      suggestedAction: 'increase-ram'
    };
  }
  if (/optifine/i.test(combined) && /(sodium|iris)/i.test(combined)) {
    return {
      title: 'OptiFine ile Sodium / Iris Çakışması',
      detail: 'OptiFine ve Sodium/Iris aynı anda çalışamaz. Profiller sekmesinden birini devre dışı bırakıp tekrar başlatın.',
      suggestedAction: 'open-mods'
    };
  }
  if (/Incompatible mods found|Mod resolution failed|net\.fabricmc\.loader\.impl\.FormattedException|MissingModsException/i.test(combined)) {
    const missingMatch =
      combined.match(/requires ([a-z0-9_-]{3,})/i) ||
      combined.match(/Mod ID:\s*'([a-z0-9_-]+)'/i);
    const missingMod = missingMatch ? missingMatch[1] : null;
    return {
      title: missingMod ? `Eksik Kütüphane Modu: "${missingMod}"` : 'Eksik veya Uyumsuz Mod Tespit Edildi',
      detail: missingMod
        ? `Yüklü modlardan biri çalışmak için "${missingMod}" (örn. Fabric API, Cloth Config, Architectury) kütüphanesine ihtiyaç duyuyor. Modrinth mağazasından bu modu tek tıkla kurabilirsiniz.`
        : 'Profildeki bazı modlar birbiriyle veya seçili Minecraft sürümüyle uyumsuz. Profiller sekmesinden son eklediğiniz modu kapatıp tekrar deneyin.',
      missingMod
    };
  }
  if (/MixinApplyError|MixinTransformerError|spongepowered\.asm\.mixin/i.test(combined)) {
    const mixinMatch = combined.match(/from mod ([a-z0-9_-]+)/i);
    return {
      title: mixinMatch ? `"${mixinMatch[1]}" Modu Çökmeye Sebep Oldu (Mixin Hatası)` : 'Mod Enjeksiyon (Mixin) Çakışması',
      detail: mixinMatch
        ? `"${mixinMatch[1]}" modu oyun koduna müdahale ederken çakışma yaşadı. Bu modu Profiller sekmesinden güncellemeyi veya devre dışı bırakmayı deneyin.`
        : 'İki farklı mod aynı oyun özelliğini değiştirmeye çalıştığı için çakıştı. Mod Güncellemelerini Denetle butonunu kullanın.'
    };
  }
  if (/GLFW error 65542|WGL: The driver does not appear to support OpenGL/i.test(combined)) {
    return {
      title: 'Ekran Kartı Sürücüsü (OpenGL) Hatası',
      detail: 'Ekran kartı sürücünüz güncel OpenGL sürümünü başlatamadı. Ekran kartı (NVIDIA / AMD / Intel) sürücünüzü güncelleyin.'
    };
  }
  return {
    title: code !== undefined && code !== 0 ? `Oyun Beklenmedik Şekilde Kapandı (Kod: ${code})` : 'Log Tarama Sonucu',
    detail: 'Kritik bir bilinen mod/Java çakışması imzası bulunamadı veya oyun normal kapandı. Detaylı satırlar için Konsol çıktısını inceleyebilirsiniz.'
  };
}

ipcMain.handle('crash:analyzeInstance', (_e, { logsText } = {}) => {
  const s = loadSettings();
  const instances = loadInstances();
  const activeInst = instances.find((x) => x.id === s.activeInstanceId) || instances[0];
  const instanceDir = getInstanceDir(activeInst ? activeInst.id : 'default-vanilla', s.gameDir);
  return (
    analyzeCrashLog(logsText || '', 1, instanceDir) || {
      title: 'Sorun Tespit Edilmedi',
      detail: 'Aktif profilin son oyun kayıtlarında (latest.log / crash-reports) bilinen bir çökme hatası bulunmadı.'
    }
  );
});

// ---------------- Oyunu başlat (İzole Profil + Mod Yükleyici + Microsoft Auth Desteği) ----------------
ipcMain.handle('game:launch', async (_e, s) => {
  if (gameRunning) return { ok: false, error: 'Oyun zaten çalışıyor.' };
  const mergedSettings = { ...loadSettings(), ...s };
  saveSettings(mergedSettings);

  const instances = loadInstances();
  const activeInst = instances.find((x) => x.id === mergedSettings.activeInstanceId) || instances[0];
  const mcVersion = activeInst ? activeInst.mcVersion : mergedSettings.version;
  const loader = activeInst ? activeInst.loader : 'vanilla';
  const instanceDir = getInstanceDir(activeInst ? activeInst.id : 'default-vanilla', mergedSettings.gameDir);
  const ramMax = (activeInst && activeInst.ramMax > 0) ? activeInst.ramMax : mergedSettings.ramMax;

  const m = await getManifest().catch(() => null);
  const meta = m && m.versions.find((v) => v.id === mcVersion);
  const launcher = new Client();

  let recentLogs = '';
  const launchStart = Date.now();

  try {
    gameRunning = true;
    send('game:state', 'preparing');

    // 0) Hesap Doğrulaması (Microsoft Orijinal veya Offline)
    const authPayload = await getAuthorizationForLaunch(mergedSettings);

    // 1) Java hazırla
    let javaExe = mergedSettings.javaPath;
    if (!javaExe) {
      const vjson = await getVersionJson(mcVersion);
      const component = (vjson.javaVersion && vjson.javaVersion.component) || 'jre-legacy';
      javaExe = await downloadJavaRuntime(component, mergedSettings.gameDir);
    }

    // 2) Önce ana (Vanilla) sürümün (.jar + .json) tam olduğundan emin ol
    await ensureBaseVanillaVersion(mcVersion, mergedSettings.gameDir);

    // 3) Mod Loader (Fabric / Quilt / Forge / OptiFine) hazırla
    const versionConfig = {
      number: mcVersion,
      type: meta ? meta.type : 'release'
    };
    const vanillaDir = path.join(mergedSettings.gameDir, 'versions', mcVersion);
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
        mergedSettings.gameDir
      );
    } else if (loader === 'optifine') {
      versionConfig.custom = await prepareOptiFineProfile(mcVersion, mergedSettings.gameDir, javaExe);
    } else if (loader === 'forge') {
      forgeInstallerPath = await prepareForgeInstaller(mcVersion, mergedSettings.gameDir);
    }

    const opts = {
      authorization: authPayload,
      root: mergedSettings.gameDir,
      version: versionConfig,
      javaPath: javaExe,
      memory: {
        max: `${ramMax}M`,
        min: `${Math.min(1024, ramMax)}M`
      },
      window: mergedSettings.fullscreen
        ? { fullscreen: true }
        : { width: Number(mergedSettings.width) || 1280, height: Number(mergedSettings.height) || 720 },
      customArgs: (mergedSettings.jvmArgs || '').split(' ').map((a) => a.trim()).filter(Boolean),
      overrides
    };
    if (forgeInstallerPath) opts.forge = forgeInstallerPath;

    // Doğrudan sunucuya veya dünyaya bağlanma (QuickPlay - 1.20+ ve Legacy desteği)
    if (s.quickPlayServer) {
      const minor = parseInt(String(mcVersion).split('.')[1], 10);
      const isModern = String(mcVersion).startsWith('26.') || minor >= 20;
      opts.quickPlay = {
        type: isModern ? 'multiplayer' : 'legacy',
        identifier: s.quickPlayServer
      };
    } else if (s.quickPlayWorld) {
      opts.quickPlay = {
        type: 'singleplayer',
        identifier: s.quickPlayWorld
      };
    }

    const modsCount = countDirFiles(path.join(instanceDir, 'mods'), /\.jar$/i);
    setDiscordActivity({
      details: `${activeInst ? activeInst.name : 'Minecraft'} (${loader.toUpperCase()} ${mcVersion})`,
      state: s.quickPlayServer
        ? `Sunucu: ${s.quickPlayServer}`
        : modsCount > 0
        ? `${modsCount} Mod ile oynuyor`
        : 'Oyunda',
      startTimestamp: launchStart
    });

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
      if (mergedSettings.closeOnLaunch) setTimeout(() => win && win.hide(), 2500);
    });
    launcher.on('close', (code) => {
      gameRunning = false;
      setDiscordActivity({
        details: 'Menüde Geziyor',
        state: 'Hazır',
        startTimestamp: Date.now()
      });
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

      const crashInfo = analyzeCrashLog(recentLogs, code, instanceDir);
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
