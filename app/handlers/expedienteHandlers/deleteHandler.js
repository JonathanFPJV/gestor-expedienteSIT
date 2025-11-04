// app/handlers/expedienteHandlers/deleteHandler.js
/**
 * Handlers de Eliminación para Expedientes
 * 
 * Responsabilidades:
 * - Eliminar expedientes con cascada
 * - Notificar a ventanas sobre eliminaciones
 * 
 * Canales IPC: 1
 * - eliminar-expediente
 * 
 * Nota: El canal 'obtener-info-eliminacion' está en readHandler.js
 * 
 * @module expedienteHandlers/deleteHandler
 */

const { ipcMain } = require('electron');
const { handleError, notifyAllWindows } = require('./utils');

/**
 * Registra los handlers de eliminación de expedientes
 * 
 * @param {ExpedienteService} expedienteService - Servicio de expedientes
 */
function registerDeleteHandlers(expedienteService) {
    console.log('🗑️ Registrando handlers de eliminación de expedientes...');

    /**
     * Eliminar expediente con cascada (tarjetas y archivos)
     * 
     * Proceso:
     * 1. Eliminar archivos PDF asociados
     * 2. Eliminar tarjetas asociadas
     * 3. Eliminar expediente
     * 4. Notificar a todas las ventanas
     */
    ipcMain.handle('eliminar-expediente', async (event, expedienteId) => {
        try {
            console.log('📥 Solicitud eliminar expediente:', expedienteId);
            const result = await expedienteService.deleteExpediente(expedienteId);

            // Notificar a todas las ventanas con resumen de eliminación
            notifyAllWindows('expediente-eliminado', {
                expedienteId,
                summary: result.summary
            });

            return result;
        } catch (error) {
            return handleError(error, 'eliminar expediente');
        }
    });

    console.log('✅ Delete Handlers registrados (1 canal)');
}

module.exports = registerDeleteHandlers;
