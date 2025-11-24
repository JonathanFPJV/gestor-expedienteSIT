// preload.js - El Puente Seguro
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script cargado correctamente');

contextBridge.exposeInMainWorld('api', {
  enviar: (canal, datos) => {
    console.log(`📤 Enviando al canal: ${canal}`, datos);
    return ipcRenderer.send(canal, datos);
  },
  recibir: (canal, callback) => {
    console.log(`👂 Escuchando canal: ${canal}`);
    ipcRenderer.on(canal, (event, ...args) => {
      console.log(`📨 Datos recibidos del canal ${canal}:`, args);
      callback(...args);
    });
  },
  // **Función para invoke con respuesta**
  invoke: async (canal, ...datos) => {
    console.log(`🔄 Invocando canal: ${canal}`, datos);
    try {
      const result = await ipcRenderer.invoke(canal, ...datos);
      console.log(`✅ Respuesta recibida del canal ${canal}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error en invoke del canal ${canal}:`, error);
      throw error;
    }
  },
  // **Función para abrir diálogo de PDF**
  abrirDialogoPdf: async () => {
    console.log('📁 Solicitando diálogo de PDF...');
    try {
      const result = await ipcRenderer.invoke('abrir-dialogo-pdf');
      console.log('📄 Resultado del diálogo:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en abrirDialogoPdf:', error);
      return null;
    }
  },
  
  // **Función para leer archivo PDF completo (para OCR)**
  readPdfFile: async (pdfPath) => {
    console.log('📖 Solicitando lectura de PDF:', pdfPath);
    try {
      const arrayBuffer = await ipcRenderer.invoke('leer-archivo-pdf', pdfPath);
      console.log('✅ PDF leído:', arrayBuffer.byteLength, 'bytes');
      return arrayBuffer;
    } catch (error) {
      console.error('❌ Error en readPdfFile:', error);
      throw error;
    }
  },

  // **Función para crear directorio**
  createDirectory: async (dirPath) => {
    console.log('📁 Creando directorio:', dirPath);
    try {
      const result = await ipcRenderer.invoke('crear-directorio', dirPath);
      console.log('✅ Directorio creado:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en createDirectory:', error);
      throw error;
    }
  },

  // **Función para guardar página de PDF**
  savePdfPage: async (outputDir, fileName, pdfBytes) => {
    console.log('💾 Guardando página PDF:', fileName);
    try {
      const result = await ipcRenderer.invoke('guardar-pagina-pdf', outputDir, fileName, pdfBytes);
      console.log('✅ Página guardada:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en savePdfPage:', error);
      throw error;
    }
  },

  // **Función para abrir diálogo de carpeta**
  abrirDialogoCarpeta: async () => {
    console.log('📁 Solicitando diálogo de carpeta...');
    try {
      const result = await ipcRenderer.invoke('abrir-dialogo-carpeta');
      console.log('📂 Carpeta seleccionada:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en abrirDialogoCarpeta:', error);
      return null;
    }
  },

  // **Función para imprimir PDF**
  imprimirPdf: async (fileName) => {
    console.log('🖨️ Solicitando impresión de PDF:', fileName);
    try {
      const result = await ipcRenderer.invoke('imprimir-pdf', fileName);
      console.log('✅ PDF enviado a impresora:', result);
      return result;
    } catch (error) {
      console.error('❌ Error al imprimir PDF:', error);
      throw error;
    }
  },

  // **Función para obtener impresoras disponibles**
  obtenerImpresoras: async () => {
    console.log('🖨️ Obteniendo lista de impresoras...');
    try {
      const printers = await ipcRenderer.invoke('obtener-impresoras');
      console.log('📋 Impresoras disponibles:', printers.length);
      return printers;
    } catch (error) {
      console.error('❌ Error al obtener impresoras:', error);
      return [];
    }
  },
  
  // **Utilidades del shell**
  shell: {
    openPath: async (path) => {
      console.log('📂 Abriendo ruta:', path);
      try {
        const result = await ipcRenderer.invoke('shell-open-path', path);
        return result;
      } catch (error) {
        console.error('❌ Error abriendo ruta:', error);
        return null;
      }
    }
  },

  // **API de Tarjetas - Gestión de Estado**
  tarjeta: {
    obtenerPorEstado: async (estado) => {
      console.log('📥 Obteniendo tarjetas por estado:', estado);
      try {
        const result = await ipcRenderer.invoke('tarjeta:obtener-por-estado', estado);
        console.log('✅ Tarjetas obtenidas:', result);
        return result;
      } catch (error) {
        console.error('❌ Error al obtener tarjetas por estado:', error);
        throw error;
      }
    },
    
    cambiarEstado: async (tarjetaId, nuevoEstado) => {
      console.log('🔄 Cambiando estado de tarjeta:', tarjetaId, '→', nuevoEstado);
      try {
        const result = await ipcRenderer.invoke('tarjeta:cambiar-estado', tarjetaId, nuevoEstado);
        console.log('✅ Estado cambiado:', result);
        return result;
      } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        throw error;
      }
    },
    
    cancelar: async (tarjetaId) => {
      console.log('❌ Cancelando tarjeta:', tarjetaId);
      try {
        const result = await ipcRenderer.invoke('tarjeta:cancelar', tarjetaId);
        console.log('✅ Tarjeta cancelada:', result);
        return result;
      } catch (error) {
        console.error('❌ Error al cancelar tarjeta:', error);
        throw error;
      }
    },
    
    activar: async (tarjetaId) => {
      console.log('✅ Activando tarjeta:', tarjetaId);
      try {
        const result = await ipcRenderer.invoke('tarjeta:activar', tarjetaId);
        console.log('✅ Tarjeta activada:', result);
        return result;
      } catch (error) {
        console.error('❌ Error al activar tarjeta:', error);
        throw error;
      }
    }
  },
  
  // Método para escuchar eventos del proceso principal
  on: (canal, callback) => {
    console.log(`🎯 Registrando listener para canal: ${canal}`);
    ipcRenderer.on(canal, (event, ...args) => {
      console.log(`🔔 Evento recibido del canal ${canal}:`, args);
      callback(...args);
    });
  },
  
  // Método para remover listeners
  removeListener: (canal, callback) => {
    ipcRenderer.removeListener(canal, callback);
  }
});

console.log('API expuesta en window.api con métodos extendidos');