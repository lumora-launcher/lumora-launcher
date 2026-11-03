// ============================================================
//  Lumora Launcher - Ana süreç (Electron main process)
//  Resmi GitHub: https://github.com/lumora-launcher/lumora-launcher
// ============================================================
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
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

let win = null;
let gameRunning = false;
let manifestCache = null;

// ---------------- Ayarlar ----------------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function defaultSettings() {
  return {
    username: '',
    version: '',
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

// ---------------- Pencere ----------------
function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  win = new BrowserWindow({
    width: 1120,
    height: 700,
    minWidth: 960,
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
  fs.mkdirSync(dir, { recursive: true });
  shell.openPath(dir);
});

ipcMain.handle('external:open', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
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

// ---------------- Sürümler ----------------
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

// ---------------- Oyunu başlat ----------------
ipcMain.handle('game:launch', async (_e, s) => {
  if (gameRunning) return { ok: false, error: 'Oyun zaten çalışıyor.' };
  saveSettings({ ...loadSettings(), ...s });

  const m = await getManifest().catch(() => null);
  const meta = m && m.versions.find((v) => v.id === s.version);
  const launcher = new Client();

  const opts = {
    authorization: Authenticator.getAuth(s.username),
    root: s.gameDir,
    version: { number: s.version, type: meta ? meta.type : 'release' },
    memory: {
      max: `${s.ramMax}M`,
      min: `${Math.min(1024, s.ramMax)}M`
    },
    window: s.fullscreen
      ? { fullscreen: true }
      : { width: Number(s.width) || 1280, height: Number(s.height) || 720 },
    customArgs: (s.jvmArgs || '').split(' ').map((a) => a.trim()).filter(Boolean),
    overrides: { detached: false }
  };

  launcher.on('debug', (msg) => send('game:log', { level: 'debug', msg: String(msg) }));
  launcher.on('data', (msg) => send('game:log', { level: 'game', msg: String(msg) }));
  launcher.on('progress', (p) => send('game:progress', p));
  launcher.on('download-status', (d) => send('game:download', d));
  launcher.on('arguments', () => {
    send('game:state', 'running');
    if (s.closeOnLaunch) setTimeout(() => win && win.hide(), 2500);
  });
  launcher.on('close', (code) => {
    gameRunning = false;
    send('game:state', 'closed');
    send('game:log', { level: 'debug', msg: `Oyun kapandı (kod: ${code})` });
    if (win && !win.isVisible()) win.show();
  });

  try {
    gameRunning = true;
    send('game:state', 'preparing');
    if (s.javaPath) {
      opts.javaPath = s.javaPath;
    } else {
      const vjson = await getVersionJson(s.version);
      const component = (vjson.javaVersion && vjson.javaVersion.component) || 'jre-legacy';
      opts.javaPath = await downloadJavaRuntime(component, s.gameDir);
    }
    const proc = await launcher.launch(opts);
    if (!proc) throw new Error('Oyun başlatılamadı. Konsolu kontrol et (Java sürümü uygun olmayabilir).');
    return { ok: true };
  } catch (err) {
    gameRunning = false;
    send('game:state', 'closed');
    return { ok: false, error: err.message || String(err) };
  }
});
