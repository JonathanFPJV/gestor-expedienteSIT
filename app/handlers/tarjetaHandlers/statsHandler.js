// app/handlers/tarjetaHandlers/statsHandler.js
/**
 * Handler para estadísticas de tarjetas
 * Responsabilidad: Manejar consultas de estadísticas y métricas
 */

const { handleErrorNoEvent } = require('./utils');

/**
 * Registra el handler para obtener estadísticas de tarjetas
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} tarjetaService - Servicio de tarjetas
 */
function registerStatsHandler(ipcMain, tarjetaService) {
    ipcMain.handle('tarjeta:estadisticas', handleErrorNoEvent(
        async () => {
            console.log('Solicitud estadísticas de tarjetas');
            return await tarjetaService.getEstadisticas();
        },
        'Error al obtener estadísticas'
    ));
}

module.exports = registerStatsHandler;
