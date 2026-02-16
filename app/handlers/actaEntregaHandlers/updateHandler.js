// app/handlers/actaEntregaHandlers/updateHandler.js
/**
 * Handlers de Actualización para Actas de Entrega
 * 
 * Responsabilidades:
 * - Actualizar actas de entrega existentes
 * - Reasignar tarjetas
 * - Notificar actualización a ventanas
 * 
 * Canales IPC: 1
 * - acta-entrega:actualizar
 * 
 * @module actaEntregaHandlers/updateHandler
 */

const { ipcMain } = require('electron');
const { handleError, broadcastToAllWindows } = require('./utils');

/**
 * Registra los handlers de actualización de actas de entrega
 * 
 * @param {ActaEntregaService} actaEntregaService - Servicio de actas de entrega
 */
function registerUpdateHandlers(actaEntregaService) {
    console.log('Registrando handlers de actualización de actas de entrega...');

    /**
     * Actualizar acta de entrega existente
     * 
     * Proceso:
     * 1. Validar ID de acta
     * 2. Actualizar datos del acta
     * 3. Reasignar tarjetas (si se especifica)
     * 4. Actualizar archivo PDF (si cambió)
     * 5. Notificar a todas las ventanas
     */
    ipcMain.handle('acta-entrega:actualizar', (event, actaId, actaData, tarjetasIds = null) => {
        try {
            console.log('Solicitud actualizar acta de entrega:', actaId);
            const result = actaEntregaService.updateActaEntrega(actaId, actaData, tarjetasIds);

            if (result.success) {
                // Notificar a todas las ventanas sobre la actualización
                broadcastToAllWindows('acta-entrega-actualizada', {
                    acta: result.acta
                });

                console.log('Acta de entrega actualizada exitosamente:', actaId);
            }

            return result;
        } catch (error) {
            return handleError(error, 'actualizar acta de entrega');
        }
    });

    console.log('Update Handlers registrados (1 canal)');
}

module.exports = registerUpdateHandlers;
