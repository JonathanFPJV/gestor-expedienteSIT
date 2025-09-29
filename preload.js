// preload.js - El Puente Seguro
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script cargado correctamente');

contextBridge.exposeInMainWorld('api', {
  enviar: (canal, datos) => {
    console.log(`Enviando al canal: ${canal}`, datos);
    ipcRenderer.send(canal, datos);
  },
  recibir: (canal, callback) => {
    console.log(`Escuchando canal: ${canal}`);
    ipcRenderer.on(canal, (event, ...args) => {
      console.log(`Datos recibidos del canal ${canal}:`, args);
      callback(...args);
    });
  },
  // **Función para abrir diálogo de PDF**
  abrirDialogoPdf: async () => {
    console.log('Solicitando diálogo de PDF...');
    try {
      const result = await ipcRenderer.invoke('abrir-dialogo-pdf');
      console.log('Resultado del diálogo:', result);
      return result;
    } catch (error) {
      console.error('Error en abrirDialogoPdf:', error);
      return null;
    }
  },
  // Exponer método invoke para llamadas IPC con respuesta
  invoke: (canal, datos) => ipcRenderer.invoke(canal, datos),
  
  // Método para escuchar eventos del proceso principal
  on: (canal, callback) => {
    console.log(`Registrando listener para canal: ${canal}`);
    ipcRenderer.on(canal, (event, ...args) => {
      console.log(`Evento recibido del canal ${canal}:`, args);
      callback(...args);
    });
  },
  
  // Método para remover listeners
  removeListener: (canal, callback) => {
    ipcRenderer.removeListener(canal, callback);
  }
});

console.log('API expuesta en window.api con métodos extendidos');