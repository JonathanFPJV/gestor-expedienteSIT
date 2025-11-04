// app/services/actaEntregaService/statsManager.js
/**
 * Gestor de Estadísticas de Actas de Entrega
 * Calcula métricas y estadísticas
 */

const queries = require('./queries');

/**
 * Crear módulo de estadísticas
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para obtener estadísticas
 */
module.exports = function createStatsManager(db) {
    return {
        /**
         * Obtener estadísticas completas
         * @returns {Object} Objeto con todas las estadísticas
         */
        getEstadisticas() {
            const stats = {};

            // Total de actas
            const totalStmt = db.prepare(queries.countTotalActas);
            stats.totalActas = totalStmt.get().count;

            // Tarjetas entregadas
            const entregadasStmt = db.prepare(queries.countTarjetasEntregadas);
            stats.tarjetasEntregadas = entregadasStmt.get().count;

            // Tarjetas pendientes
            const pendientesStmt = db.prepare(queries.countTarjetasPendientes);
            stats.tarjetasPendientes = pendientesStmt.get().count;

            // Actas por año
            const porAnioStmt = db.prepare(queries.getActasPorAnio);
            stats.actasPorAnio = porAnioStmt.all();

            return stats;
        },

        /**
         * Obtener total de actas
         * @returns {number} Total de actas
         */
        getTotalActas() {
            const stmt = db.prepare(queries.countTotalActas);
            return stmt.get().count;
        },

        /**
         * Obtener total de tarjetas entregadas
         * @returns {number} Total de tarjetas con acta
         */
        getTotalTarjetasEntregadas() {
            const stmt = db.prepare(queries.countTarjetasEntregadas);
            return stmt.get().count;
        },

        /**
         * Obtener total de tarjetas pendientes
         * @returns {number} Total de tarjetas sin acta
         */
        getTotalTarjetasPendientes() {
            const stmt = db.prepare(queries.countTarjetasPendientes);
            return stmt.get().count;
        },

        /**
         * Obtener actas agrupadas por año
         * @returns {Array} Lista con estadísticas por año
         */
        getActasPorAnio() {
            const stmt = db.prepare(queries.getActasPorAnio);
            return stmt.all();
        }
    };
};
