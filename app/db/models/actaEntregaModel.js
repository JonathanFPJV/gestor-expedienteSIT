// app/db/models/actaEntregaModel.js
/**
 * Modelo para ActasEntrega (Actas de Entrega)
 * Gestiona el CRUD de actas de entrega con prepared statements
 */

const { buildWhereClause, buildSetClause } = require('./utils');

/**
 * Crea el modelo de actas de entrega
 * @param {Database} db - Instancia de better-sqlite3
 * @returns {Object} API del modelo
 */
module.exports = (db) => ({
    /**
     * Insertar acta de entrega
     * @param {Object} doc - Datos del acta de entrega
     * @returns {Object} Acta insertada con _id
     */
    insert: (doc) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO ActasEntrega (
                    n_tarjetas_entregadas, fechaEntrega, pdfPathEntrega, observaciones
                ) VALUES (?, ?, ?, ?)
            `);

            const info = stmt.run(
                doc.n_tarjetas_entregadas || doc.n_tarjetas || 0,
                doc.fechaEntrega,
                doc.pdfPathEntrega || doc.pdf,
                doc.observaciones || null
            );

            return {
                _id: info.lastInsertRowid,
                ...doc
            };
        } catch (error) {
            console.error('❌ Error al insertar acta de entrega:', error);
            throw error;
        }
    },

    /**
     * Buscar actas de entrega
     * @param {Object} query - Condiciones de búsqueda
     * @returns {Array} Lista de actas de entrega
     */
    find: (query = {}) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM ActasEntrega ${clause} ORDER BY _id DESC`;
            const stmt = db.prepare(sql);
            return stmt.all(...params);
        } catch (error) {
            console.error('❌ Error al buscar actas de entrega:', error);
            throw error;
        }
    },

    /**
     * Buscar una sola acta
     * @param {Object} query - Condiciones de búsqueda
     * @returns {Object|null} Acta encontrada o null
     */
    findOne: (query) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM ActasEntrega ${clause} LIMIT 1`;
            const stmt = db.prepare(sql);
            return stmt.get(...params) || null;
        } catch (error) {
            console.error('❌ Error al buscar acta de entrega:', error);
            throw error;
        }
    },

    /**
     * Actualizar acta de entrega
     * @param {Object} query - Condiciones para identificar el acta
     * @param {Object} update - Datos a actualizar
     * @param {Object} options - Opciones adicionales
     * @returns {number} Número de registros actualizados
     */
    update: (query, update, options = {}) => {
        try {
            const { clause: whereClause, params: whereParams } = buildWhereClause(query);
            const { clause: setClause, params: setParams } = buildSetClause(update);

            const sql = `UPDATE ActasEntrega SET ${setClause} ${whereClause}`;
            const stmt = db.prepare(sql);
            const info = stmt.run(...setParams, ...whereParams);

            return info.changes;
        } catch (error) {
            console.error('❌ Error al actualizar acta de entrega:', error);
            throw error;
        }
    },

    /**
     * Eliminar acta de entrega
     * @param {Object} query - Condiciones para identificar el acta
     * @param {Object} options - Opciones adicionales
     * @returns {number} Número de registros eliminados
     */
    remove: (query, options = {}) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `DELETE FROM ActasEntrega ${clause}`;
            const stmt = db.prepare(sql);
            const info = stmt.run(...params);

            return info.changes;
        } catch (error) {
            console.error('❌ Error al eliminar acta de entrega:', error);
            throw error;
        }
    }
});
