// app/handlers/tarjetaHandlers/deleteHandler.js
/**
 * Handlers para eliminar tarjetas
 * Responsabilidad: Manejar todas las operaciones de eliminación de tarjetas
 */

const { handleError } = require('./utils');

/**
 * Registra todos los handlers de eliminación de tarjetas
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} tarjetaService - Servicio de tarjetas
 */
function registerDeleteHandlers(ipcMain, tarjetaService) {
    // Eliminar tarjeta individual
    ipcMain.handle('tarjeta:eliminar', handleError(
        async (tarjetaId) => {
            console.log('📥 Solicitud eliminar tarjeta:', tarjetaId);
            return await tarjetaService.deleteTarjeta(tarjetaId);
        },
        'Error al eliminar tarjeta'
    ));

    // Eliminar tarjetas por expediente
    ipcMain.handle('tarjeta:eliminar-por-expediente', handleError(
        async (expedienteId) => {
            console.log('📥 Solicitud eliminar tarjetas por expediente:', expedienteId);
            return await tarjetaService.deleteTarjetasByExpediente(expedienteId);
        },
        'Error al eliminar tarjetas del expediente'
    ));
}

module.exports = registerDeleteHandlers;
