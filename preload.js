const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const handler = (_e, data) => cb(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  systemInfo: () => ipcRenderer.invoke('system:info'),

  pickJava: () => ipcRenderer.invoke('dialog:java'),
  pickFolder: () => ipcRenderer.invoke('dialog:folder'),
  openFolder: (dir) => ipcRenderer.invoke('folder:open', dir),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),

  listVersions: () => ipcRenderer.invoke('versions:list'),
  versionJava: (id) => ipcRenderer.invoke('versions:java', id),
  scanJava: () => ipcRenderer.invoke('java:scan'),

  launch: (s) => ipcRenderer.invoke('game:launch', s),
  onLog: on('game:log'),
  onProgress: on('game:progress'),
  onDownload: on('game:download'),
  onState: on('game:state'),

  checkForUpdates: (repo) => ipcRenderer.invoke('update:check', repo),
  downloadUpdate: (url) => ipcRenderer.invoke('update:download', url),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateEvent: on('update:event')
});
