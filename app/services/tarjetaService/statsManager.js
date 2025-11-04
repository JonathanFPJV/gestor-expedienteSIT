// app/services/tarjetaService/statsManager.js
/**
 * Gestor de Estadísticas de Tarjetas
 * Calcula métricas y estadísticas
 */

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
            const todasTarjetas = db.tarjetas.find({});
            const tarjetasConResolucion = todasTarjetas.filter(t => t.resolucionId);
            const tarjetasSinResolucion = todasTarjetas.filter(t => !t.resolucionId);
            const tarjetasConActaEntrega = todasTarjetas.filter(t => t.actaEntregaId);

            return {
                total: todasTarjetas.length,
                conResolucion: tarjetasConResolucion.length,
                sinResolucion: tarjetasSinResolucion.length,
                conActaEntrega: tarjetasConActaEntrega.length
            };
        },

        /**
         * Obtener total de tarjetas
         * @returns {number} Total de tarjetas
         */
        getTotalTarjetas() {
            return db.tarjetas.find({}).length;
        },

        /**
         * Obtener tarjetas con resolución
         * @returns {number} Cantidad con resolución
         */
        getTarjetasConResolucion() {
            return db.tarjetas.find({}).filter(t => t.resolucionId).length;
        },

        /**
         * Obtener tarjetas sin resolución
         * @returns {number} Cantidad sin resolución
         */
        getTarjetasSinResolucion() {
            return db.tarjetas.find({}).filter(t => !t.resolucionId).length;
        },

        /**
         * Obtener tarjetas con acta de entrega
         * @returns {number} Cantidad con acta
         */
        getTarjetasConActaEntrega() {
            return db.tarjetas.find({}).filter(t => t.actaEntregaId).length;
        }
    };
};
