const { contextBridge, ipcRenderer } = require('electron');

const api = {
  selectPdf: () => ipcRenderer.invoke('select-pdf'),
  listSeals: () => ipcRenderer.invoke('list-seals'),
  chooseSavePath: (suggestedName) => ipcRenderer.invoke('choose-save-path', suggestedName),
  writePdf: (payload) => ipcRenderer.invoke('write-pdf', payload),
};

contextBridge.exposeInMainWorld('api', api);
