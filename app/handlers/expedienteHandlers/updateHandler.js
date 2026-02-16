// app/handlers/expedienteHandlers/updateHandler.js
/**
 * Handlers de Actualización para Expedientes
 * 
 * Responsabilidades:
 * - Actualizar expedientes existentes
 * - Notificar a ventanas sobre actualizaciones
 * 
 * Canales IPC: 1
 * - actualizar-expediente
 * 
 * @module expedienteHandlers/updateHandler
 */

const { ipcMain } = require('electron');
const { handleError, notifyAllWindows, prepareExpedientePayload } = require('./utils');

/**
 * Registra los handlers de actualización de expedientes
 * 
 * @param {ExpedienteService} expedienteService - Servicio de expedientes
 */
function registerUpdateHandlers(expedienteService) {
    console.log('Registrando handlers de actualización de expedientes...');

    /**
     * Actualizar expediente existente
     * Actualiza los datos del expediente y puede afectar sus tarjetas
     */
    ipcMain.handle('actualizar-expediente', async (event, expedienteId, expedienteData) => {
        try {
            console.log('Solicitud actualizar expediente ID:', expedienteId, `(tipo: ${typeof expedienteId})`);
            console.log('📝 Datos a actualizar:', expedienteData);

            const result = await expedienteService.updateExpediente(expedienteId, expedienteData);
            console.log('Expediente actualizado exitosamente');

            // Preparar payload para notificación
            const payload = prepareExpedientePayload(result.expediente, result.tarjetas);

            // Notificar a todas las ventanas
            notifyAllWindows('expediente-actualizado', payload);

            return result;
        } catch (error) {
            return handleError(error, 'actualizar expediente');
        }
    });

    console.log('Update Handlers registrados (1 canal)');
}

module.exports = registerUpdateHandlers;
