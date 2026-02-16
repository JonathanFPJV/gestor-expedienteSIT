// app/services/actaEntregaService/actaManager.js
/**
 * Gestor de Actas de Entrega
 * Maneja operaciones CRUD de actas
 */

const queries = require('./queries');
const { buildFilteredQuery } = require('./utils');

/**
 * Crear módulo de gestión de actas
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar actas
 */
module.exports = function createActaManager(db) {
    return {
        /**
         * Crear nueva acta de entrega
         * @param {Object} actaData - Datos del acta
         * @returns {number} ID del acta creada
         */
        createActa(actaData) {
            const stmt = db.prepare(queries.insertActa);

            const result = stmt.run(
                actaData.n_tarjetas_entregadas || 0,
                actaData.fechaEntrega,
                null, // PDF se actualizará después
                actaData.observaciones || null
            );


            return actaId;
        },

        /**
         * Obtener acta por ID
         * @param {number} actaId - ID del acta
         * @returns {Object} Datos del acta
         */
        getActaById(actaId) {
            const stmt = db.prepare(queries.getActaById);
            const acta = stmt.get(actaId);

            if (!acta) {
                throw new Error(`Acta de entrega ${actaId} no encontrada`);
            }

            return acta;
        },

        /**
         * Obtener todas las actas con filtros opcionales
         * @param {Object} filtros - Filtros opcionales
         * @returns {Array} Lista de actas
         */
        getAllActas(filtros = {}) {
            const { query, params } = buildFilteredQuery(queries.getAllActas, filtros);

            const stmt = db.prepare(query);
            const actas = stmt.all(...params);

            return actas;
        },

        /**
         * Actualizar datos del acta
         * @param {number} actaId - ID del acta
         * @param {Object} actaData - Nuevos datos
         * @param {Object} actaExistente - Datos actuales (para mantener valores no modificados)
         */
        updateActa(actaId, actaData, actaExistente) {
            const stmt = db.prepare(queries.updateActa);

            stmt.run(
                actaData.n_tarjetas_entregadas || actaExistente.n_tarjetas_entregadas,
                actaData.fechaEntrega || actaExistente.fechaEntrega,
                actaData.observaciones !== undefined ? actaData.observaciones : actaExistente.observaciones,
                actaId
            );
        },

        /**
         * Eliminar acta
         * @param {number} actaId - ID del acta
         */
        deleteActa(actaId) {
            const stmt = db.prepare(queries.deleteActa);
            stmt.run(actaId);
        },

        /**
         * Buscar actas por término
         * @param {string} searchTerm - Término de búsqueda
         * @returns {Array} Actas encontradas
         */
        searchActas(searchTerm) {
            if (!searchTerm || searchTerm.trim() === '') {
                return this.getAllActas();
            }

            const term = `%${searchTerm.toLowerCase()}%`;
            const stmt = db.prepare(queries.searchActas);

            return stmt.all(term, term, term, term, term, term);
        },

        /**
         * Verificar si existe un acta
         * @param {number} actaId - ID del acta
         * @returns {boolean} true si existe
         */
        existsActa(actaId) {
            try {
                this.getActaById(actaId);
                return true;
            } catch (error) {
                return false;
            }
        }
    };
};
