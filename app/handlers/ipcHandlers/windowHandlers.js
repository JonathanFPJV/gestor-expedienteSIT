// app/handlers/ipcHandlers/windowHandlers.js
/**
 * Handlers para gestión de ventanas
 * Responsabilidad: Manejar apertura, cierre y enfoque de ventanas de la aplicación
 */

const { ipcMain } = require('electron');
const { createExpedienteEditorWindow } = require('../../windows/expedienteEditorWindow');

/**
 * Registra handlers de gestión de ventanas
 * @param {Object} appInstance - Instancia de la aplicación Electron
 * @param {Map} editorWindows - Mapa de ventanas de editor abiertas
 */
function registerWindowHandlers(appInstance, editorWindows) {
    /**
     * Abre una ventana de edición para un expediente específico
     * Gestiona ventanas únicas por expediente (no duplicados)
     */
    ipcMain.on('abrir-editor-expediente', (event, expedienteId) => {
        if (!expedienteId) {
            console.warn('⚠️ abrir-editor-expediente llamado sin expedienteId');
            return;
        }

        // Verificar si ya existe una ventana para este expediente
        const existingWindow = editorWindows.get(expedienteId);
        if (existingWindow && !existingWindow.isDestroyed()) {
            existingWindow.focus();
            console.log(`📌 Ventana existente enfocada para expediente: ${expedienteId}`);
            return;
        }

        // Crear nueva ventana de edición
        const window = createExpedienteEditorWindow(appInstance, expedienteId);
        editorWindows.set(expedienteId, window);
        console.log(`🪟 Nueva ventana de edición creada para expediente: ${expedienteId}`);

        // Limpiar del mapa cuando se cierra
        window.on('closed', () => {
            editorWindows.delete(expedienteId);
            console.log(`🗑️ Ventana cerrada para expediente: ${expedienteId}`);
        });
    });

    console.log('✅ Window Handlers registrados (1 canal IPC)');
}

module.exports = registerWindowHandlers;
