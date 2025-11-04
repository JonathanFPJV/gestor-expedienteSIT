// app/services/deletionService/tarjetaManager.js
/**
 * Gestor de Tarjetas para DeletionService
 * Maneja la obtención y eliminación de tarjetas
 */

/**
 * Crear módulo de gestión de tarjetas
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar tarjetas
 */
module.exports = function createTarjetaManager(db) {
    return {
        /**
         * Obtener todas las tarjetas de un expediente
         * @param {string|number} expedienteId - ID del expediente
         * @returns {Promise<Array>} Tarjetas encontradas
         */
        async getTarjetasByExpediente(expedienteId) {
            return await db.tarjetas.find({ expedienteId: expedienteId });
        },

        /**
         * Eliminar todas las tarjetas de un expediente
         * @param {string|number} expedienteId - ID del expediente
         * @returns {Promise<number>} Cantidad eliminada
         */
        async deleteTarjetasByExpediente(expedienteId) {
            return await db.tarjetas.remove({ expedienteId: expedienteId }, { multi: true });
        }
    };
};
