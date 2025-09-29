// app/main.js - Proceso Principal (Backend)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./handlers/ipcHandlers');

// Función para crear la ventana principal de la aplicación
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  win.loadFile('src/index.html');
  // Habilitar DevTools para debugging (comentado para producción)
  // win.webContents.openDevTools();
}

// -- Escuchadores de eventos de la aplicación --
app.whenReady().then(() => {
    createWindow();
    // Pasa la instancia de 'app' al registrar los manejadores
    registerIpcHandlers(app);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});