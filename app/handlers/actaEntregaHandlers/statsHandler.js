// app/handlers/actaEntregaHandlers/statsHandler.js
/**
 * Handlers de Estadísticas para Actas de Entrega
 * 
 * Responsabilidades:
 * - Obtener estadísticas generales de actas
 * - Calcular métricas y totales
 * 
 * Canales IPC: 1
 * - acta-entrega:estadisticas
 * 
 * @module actaEntregaHandlers/statsHandler
 */

const { ipcMain } = require('electron');
const { handleError, handleSuccess } = require('./utils');

/**
 * Registra los handlers de estadísticas de actas de entrega
 * 
 * @param {ActaEntregaService} actaEntregaService - Servicio de actas de entrega
 */
function registerStatsHandlers(actaEntregaService) {
    console.log('Registrando handlers de estadísticas de actas de entrega...');

    /**
     * Obtener estadísticas generales de actas de entrega
     * 
     * Incluye:
     * - Total de actas
     * - Total de tarjetas entregadas
     * - Promedio de tarjetas por acta
     * - Actas con/sin PDF
     */
    ipcMain.handle('acta-entrega:estadisticas', (event) => {
        try {
            console.log('Solicitud estadísticas de actas');
            const stats = actaEntregaService.getEstadisticas();

            console.log('Estadísticas calculadas');

            return handleSuccess({ estadisticas: stats });
        } catch (error) {
            return handleError(error, 'obtener estadísticas');
        }
    });

    console.log('Stats Handlers registrados (1 canal)');
}

module.exports = registerStatsHandlers;
