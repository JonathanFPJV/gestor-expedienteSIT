// app/services/actaEntregaService/tarjetaManager.js
/**
 * Gestor de Tarjetas para Actas de Entrega
 * Maneja asociaciones entre tarjetas y actas
 */

const queries = require('./queries');

/**
 * Crear módulo de gestión de tarjetas
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar tarjetas
 */
module.exports = function createTarjetaManager(db) {
    return {
        /**
         * Asociar tarjetas a un acta
         * @param {number} actaId - ID del acta
         * @param {Array<number>} tarjetasIds - IDs de tarjetas
         * @returns {number} Cantidad de tarjetas asociadas
         */
        associateTarjetasToActa(actaId, tarjetasIds) {
            if (!tarjetasIds || tarjetasIds.length === 0) {
                return 0;
            }

            const stmt = db.prepare(queries.updateTarjetaActa);

            for (const tarjetaId of tarjetasIds) {
                stmt.run(actaId, tarjetaId);
            }

            return tarjetasIds.length;
        },

        /**
         * Desasociar todas las tarjetas de un acta
         * @param {number} actaId - ID del acta
         * @returns {number} Cantidad de tarjetas desasociadas
         */
        desassociateTarjetasFromActa(actaId) {
            const countStmt = db.prepare(queries.countTarjetasByActa);
            const count = countStmt.get(actaId).cantidad;

            const stmt = db.prepare(queries.desasociarTarjetasDeActa);
            stmt.run(actaId);

            return count;
        },

        /**
         * Reasociar tarjetas (desasociar actuales y asociar nuevas)
         * @param {number} actaId - ID del acta
         * @param {Array<number>} newTarjetasIds - IDs de nuevas tarjetas
         * @returns {Object} Resultado con contadores
         */
        reassociateTarjetas(actaId, newTarjetasIds) {
            // Desasociar actuales
            const desassociated = this.desassociateTarjetasFromActa(actaId);

            // Asociar nuevas
            const associated = this.associateTarjetasToActa(actaId, newTarjetasIds);

            return {
                desassociated,
                associated
            };
        },

        /**
         * Obtener tarjetas asociadas a un acta
         * @param {number} actaId - ID del acta
         * @returns {Array} Lista de tarjetas
         */
        getTarjetasByActaId(actaId) {
            const stmt = db.prepare(queries.getTarjetasByActaId);
            return stmt.all(actaId);
        },

        /**
         * Contar tarjetas de un acta
         * @param {number} actaId - ID del acta
         * @returns {number} Cantidad de tarjetas
         */
        countTarjetasByActa(actaId) {
            const stmt = db.prepare(queries.countTarjetasByActa);
            return stmt.get(actaId).cantidad;
        },

        /**
         * Obtener tarjetas disponibles (sin acta asignada)
         * @returns {Array} Lista de tarjetas disponibles
         */
        getTarjetasDisponibles() {
            const stmt = db.prepare(queries.getTarjetasDisponibles);
            return stmt.all();
        }
    };
};
