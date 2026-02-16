// app/handlers/expedienteHandlers/createHandler.js
/**
 * Handlers de Creación para Expedientes
 * 
 * Responsabilidades:
 * - Crear nuevos expedientes
 * - Guardar expedientes (alias para compatibilidad)
 * - Notificar a ventanas sobre creaciones
 * 
 * Canales IPC: 2
 * - crear-expediente
 * - guardar-expediente (alias de crear-expediente)
 * 
 * @module expedienteHandlers/createHandler
 */

const { ipcMain } = require('electron');
const { handleError, notifyAllWindows, prepareExpedientePayload } = require('./utils');

/**
 * Registra los handlers de creación de expedientes
 * 
 * @param {ExpedienteService} expedienteService - Servicio de expedientes
 */
function registerCreateHandlers(expedienteService) {
    console.log('Registrando handlers de creación de expedientes...');

    /**
     * Crear nuevo expediente (Acta de Resolución completa)
     * Crea el expediente y sus tarjetas asociadas
     */
    ipcMain.handle('crear-expediente', async (event, expedienteData) => {
        try {
            console.log('Solicitud crear expediente:', expedienteData);
            const result = await expedienteService.createExpediente(expedienteData);

            // Preparar payload para notificación
            const payload = prepareExpedientePayload(result.expediente, result.tarjetas);

            // Notificar a todas las ventanas
            notifyAllWindows('expediente-guardado', payload);

            return result;
        } catch (error) {
            return handleError(error, 'crear expediente');
        }
    });

    /**
     * Guardar expediente (alias de crear para compatibilidad)
     * Mantiene compatibilidad con código legacy
     */
    ipcMain.handle('guardar-expediente', async (event, expedienteData) => {
        try {
            console.log('Solicitud guardar expediente (compatibilidad):', expedienteData);
            const result = await expedienteService.createExpediente(expedienteData);

            // Preparar payload para notificación
            const payload = prepareExpedientePayload(result.expediente, result.tarjetas);

            // Notificar a todas las ventanas
            notifyAllWindows('expediente-guardado', payload);

            return result;
        } catch (error) {
            return handleError(error, 'guardar expediente');
        }
    });

    console.log('Create Handlers registrados (2 canales)');
}

module.exports = registerCreateHandlers;
