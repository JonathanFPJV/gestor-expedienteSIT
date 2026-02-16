// app/handlers/actaEntregaHandlers/deleteHandler.js
/**
 * Handlers de Eliminación para Actas de Entrega
 * 
 * Responsabilidades:
 * - Eliminar actas de entrega
 * - Limpiar asociaciones con tarjetas
 * - Eliminar archivos PDF
 * - Notificar eliminación a ventanas
 * 
 * Canales IPC: 1
 * - acta-entrega:eliminar
 * 
 * Nota: El canal 'acta-entrega:info-eliminar' está en readHandler.js
 * 
 * @module actaEntregaHandlers/deleteHandler
 */

const { ipcMain } = require('electron');
const { handleError, broadcastToAllWindows } = require('./utils');

/**
 * Registra los handlers de eliminación de actas de entrega
 * 
 * @param {ActaEntregaService} actaEntregaService - Servicio de actas de entrega
 */
function registerDeleteHandlers(actaEntregaService) {
    console.log('Registrando handlers de eliminación de actas de entrega...');

    /**
     * Eliminar acta de entrega
     * 
     * Proceso:
     * 1. Validar ID de acta
     * 2. Obtener tarjetas asociadas
     * 3. Eliminar archivo PDF (si existe)
     * 4. Desvincular tarjetas (SET NULL)
     * 5. Eliminar acta de BD
     * 6. Notificar a todas las ventanas
     */
    ipcMain.handle('acta-entrega:eliminar', (event, actaId) => {
        try {
            console.log('Solicitud eliminar acta de entrega:', actaId);
            const result = actaEntregaService.deleteActaEntrega(actaId);

            if (result.success) {
                // Notificar a todas las ventanas sobre la eliminación
                broadcastToAllWindows('acta-entrega-eliminada', {
                    actaId: actaId,
                    summary: result.summary
                });

                console.log('Acta de entrega eliminada exitosamente:', actaId);
                console.log('Resumen:', result.summary);
            }

            return result;
        } catch (error) {
            return handleError(error, 'eliminar acta de entrega');
        }
    });

    console.log('Delete Handlers registrados (1 canal)');
}

module.exports = registerDeleteHandlers;
