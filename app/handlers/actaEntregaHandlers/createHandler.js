// app/handlers/actaEntregaHandlers/createHandler.js
/**
 * Handlers de Creación para Actas de Entrega
 * 
 * Responsabilidades:
 * - Crear nuevas actas de entrega
 * - Asociar tarjetas a las actas
 * - Notificar creación a ventanas
 * 
 * Canales IPC: 1
 * - acta-entrega:crear
 * 
 * @module actaEntregaHandlers/createHandler
 */

const { ipcMain } = require('electron');
const { handleError, broadcastToAllWindows } = require('./utils');

/**
 * Registra los handlers de creación de actas de entrega
 * 
 * @param {ActaEntregaService} actaEntregaService - Servicio de actas de entrega
 */
function registerCreateHandlers(actaEntregaService) {
    console.log('➕ Registrando handlers de creación de actas de entrega...');

    /**
     * Crear nueva acta de entrega
     * 
     * Proceso:
     * 1. Validar datos de entrada
     * 2. Crear acta en BD
     * 3. Asociar tarjetas seleccionadas
     * 4. Guardar archivo PDF (si existe)
     * 5. Notificar a todas las ventanas
     */
    ipcMain.handle('acta-entrega:crear', (event, actaData, tarjetasIds = []) => {
        try {
            console.log('📥 Solicitud crear acta de entrega:', actaData);
            const result = actaEntregaService.createActaEntrega(actaData, tarjetasIds);
            
            if (result.success) {
                // Notificar a todas las ventanas sobre la creación
                broadcastToAllWindows('acta-entrega-creada', {
                    acta: result.acta
                });
                
                console.log('✅ Acta de entrega creada exitosamente:', result.acta._id);
            }
            
            return result;
        } catch (error) {
            return handleError(error, 'crear acta de entrega');
        }
    });

    console.log('✅ Create Handlers registrados (1 canal)');
}

module.exports = registerCreateHandlers;
