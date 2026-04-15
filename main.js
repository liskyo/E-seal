const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile('index.html');
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-pdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths || !filePaths[0]) return null;
  const filePath = filePaths[0];
  const data = await fs.promises.readFile(filePath);
  return {
    filePath,
    base64: data.toString('base64'),
  };
});

ipcMain.handle('list-seals', async () => {
  const sealDir = path.join(__dirname, 'seal_model');
  const files = await fs.promises.readdir(sealDir);
  const allowed = ['.png', '.jpg', '.jpeg'];
  const seals = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!allowed.includes(ext)) continue;
    const full = path.join(sealDir, file);
    const data = await fs.promises.readFile(full);
    seals.push({
      name: path.basename(file, ext),
      file,
      ext,
      base64: data.toString('base64'),
      path: full,
    });
  }
  return seals;
});

ipcMain.handle('choose-save-path', async (_event, suggestedName) => {
  const result = await dialog.showSaveDialog({
    defaultPath: suggestedName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle('write-pdf', async (_event, { filePath, base64 }) => {
  if (!filePath || !base64) return { ok: false, message: '缺少路徑或資料' };
  const buffer = Buffer.from(base64, 'base64');
  await fs.promises.writeFile(filePath, buffer);
  return { ok: true };
});
