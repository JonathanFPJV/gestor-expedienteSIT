// app/handlers/expedienteHandlers/statsHandler.js
/**
 * Handlers de Estadísticas para Expedientes
 * 
 * Responsabilidades:
 * - Obtener estadísticas generales de expedientes
 * - Calcular métricas y promedios
 * 
 * Canales IPC: 1
 * - expediente:estadisticas
 * 
 * @module expedienteHandlers/statsHandler
 */

const { ipcMain } = require('electron');
const { handleError } = require('./utils');

/**
 * Registra los handlers de estadísticas de expedientes
 * 
 * @param {Object} db - Base de datos con APIs
 */
function registerStatsHandlers(db) {
    console.log('📊 Registrando handlers de estadísticas de expedientes...');

    /**
     * Obtener estadísticas generales de expedientes
     * 
     * Incluye:
     * - Total de expedientes
     * - Expedientes con/sin tarjetas
     * - Total de tarjetas
     * - Promedio de tarjetas por expediente
     */
    ipcMain.handle('expediente:estadisticas', () => {
        try {
            console.log('📥 Solicitud estadísticas de expedientes');
            
            const todosExpedientes = db.expedientes.find({});
            const expedientesConTarjetas = todosExpedientes.filter(exp => {
                const tarjetas = db.tarjetas.find({ resolucionId: exp._id });
                return tarjetas.length > 0;
            });

            const totalTarjetas = db.tarjetas.find({}).length;

            const estadisticas = {
                totalExpedientes: todosExpedientes.length,
                expedientesConTarjetas: expedientesConTarjetas.length,
                expedientesSinTarjetas: todosExpedientes.length - expedientesConTarjetas.length,
                totalTarjetas: totalTarjetas,
                promedioTarjetasPorExpediente: todosExpedientes.length > 0 
                    ? (totalTarjetas / todosExpedientes.length).toFixed(2) 
                    : 0
            };

            console.log('✅ Estadísticas calculadas:', estadisticas);

            return {
                success: true,
                estadisticas
            };
        } catch (error) {
            return handleError(error, 'obtener estadísticas');
        }
    });

    console.log('✅ Stats Handlers registrados (1 canal)');
}

module.exports = registerStatsHandlers;
