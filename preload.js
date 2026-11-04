const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const handler = (_e, data) => cb(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  hideToTray: () => ipcRenderer.send('win:hideToTray'),
  close: () => ipcRenderer.send('win:close'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  systemInfo: () => ipcRenderer.invoke('system:info'),
  networkStatus: () => ipcRenderer.invoke('network:status'),

  // Hesap Yönetimi (Microsoft OAuth2 & Offline)
  listAccounts: () => ipcRenderer.invoke('auth:listAccounts'),
  loginMicrosoft: () => ipcRenderer.invoke('auth:loginMicrosoft'),
  selectAccount: (opts) => ipcRenderer.invoke('auth:selectAccount', opts),
  removeAccount: (id) => ipcRenderer.invoke('auth:removeAccount', id),

  // Başka Launcher'dan Profil Göçü (Import Wizard)
  scanExternalInstances: () => ipcRenderer.invoke('import:scanExternal'),
  migrateExternalFolder: (info) => ipcRenderer.invoke('import:migrateFolder', info),
  pickCustomImportFolder: () => ipcRenderer.invoke('import:pickCustomFolder'),

  // Akıllı Çökme & Log Analizi
  analyzeInstanceCrash: (opts) => ipcRenderer.invoke('crash:analyzeInstance', opts),

  pickJava: () => ipcRenderer.invoke('dialog:java'),
  pickFolder: () => ipcRenderer.invoke('dialog:folder'),
  openFolder: (dir) => ipcRenderer.invoke('folder:open', dir),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),

  listVersions: () => ipcRenderer.invoke('versions:list'),
  versionJava: (id) => ipcRenderer.invoke('versions:java', id),
  ensureBaseVersion: (id) => ipcRenderer.invoke('versions:ensureBase', id),
  scanJava: () => ipcRenderer.invoke('java:scan'),

  // İzole Profiller (Instances)
  listInstances: () => ipcRenderer.invoke('instances:list'),
  createInstance: (data) => ipcRenderer.invoke('instances:create', data),
  updateInstance: (data) => ipcRenderer.invoke('instances:update', data),
  deleteInstance: (id) => ipcRenderer.invoke('instances:delete', id),
  openInstanceFolder: (id, sub) => ipcRenderer.invoke('instances:openFolder', id, sub),

  // Profil İçeriği (Mod / Shader / ResourcePack yönetimi)
  listInstanceContent: (opts) => ipcRenderer.invoke('instance:content:list', opts),
  toggleInstanceContent: (opts) => ipcRenderer.invoke('instance:content:toggle', opts),
  deleteInstanceContent: (opts) => ipcRenderer.invoke('instance:content:delete', opts),

  // Modpack (.mrpack) İçe / Dışa Aktarma
  importMrpackFile: () => ipcRenderer.invoke('mrpack:importFile'),
  exportInstanceMrpack: (opts) => ipcRenderer.invoke('mrpack:exportInstance', opts),
  modrinthInstallModpack: (opts) => ipcRenderer.invoke('modrinth:installModpack', opts),

  // Dünya (Saves) & Ekran Görüntüsü (Screenshots) Yöneticisi
  listWorlds: (opts) => ipcRenderer.invoke('worlds:list', opts),
  backupWorld: (opts) => ipcRenderer.invoke('worlds:backup', opts),
  restoreWorld: (opts) => ipcRenderer.invoke('worlds:restore', opts),
  deleteWorld: (opts) => ipcRenderer.invoke('worlds:delete', opts),
  listScreenshots: (opts) => ipcRenderer.invoke('screenshots:list', opts),

  // Sunucu Listesi & Canlı Ping
  listServers: () => ipcRenderer.invoke('servers:list'),
  addServer: (opts) => ipcRenderer.invoke('servers:add', opts),
  deleteServer: (id) => ipcRenderer.invoke('servers:delete', id),
  pingServer: (address) => ipcRenderer.invoke('servers:ping', address),

  // Modrinth API
  modrinthSearch: (opts) => ipcRenderer.invoke('modrinth:search', opts),
  modrinthInstall: (opts) => ipcRenderer.invoke('modrinth:install', opts),
  modrinthCheckUpdates: (opts) => ipcRenderer.invoke('modrinth:checkUpdates', opts),
  modrinthApplyUpdates: (opts) => ipcRenderer.invoke('modrinth:applyUpdates', opts),
  modrinthInstallFpsPack: (opts) => ipcRenderer.invoke('modrinth:installFpsPack', opts),
  onModrinthStatus: on('modrinth:status'),

  // Oyun başlatma & olaylar
  launch: (s) => ipcRenderer.invoke('game:launch', s),
  onLog: on('game:log'),
  onProgress: on('game:progress'),
  onDownload: on('game:download'),
  onState: on('game:state'),
  onCrash: on('game:crash'),

  // Güncelleme
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: (url) => ipcRenderer.invoke('update:download', url),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateEvent: on('update:event')
});
