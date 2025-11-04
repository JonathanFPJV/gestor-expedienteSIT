// app/db/models/expedienteModel.js
/**
 * Modelo para ActasResolucion (Expedientes)
 * Gestiona el CRUD de expedientes con prepared statements
 */

const { buildWhereClause, buildSetClause } = require('./utils');

/**
 * Crea el modelo de expedientes
 * @param {Database} db - Instancia de better-sqlite3
 * @returns {Object} API del modelo
 */
module.exports = (db) => ({
    /**
     * Insertar nuevo expediente
     * @param {Object} doc - Datos del expediente
     * @returns {Object} Expediente insertado con _id
     */
    insert: (doc) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO ActasResolucion (
                    numeroExpediente, anioExpediente, numeroResolucion, fechaExpediente,
                    unidadNegocio, nombreEmpresa, numeroFichero, observaciones,
                    pdfPathActa, informeTecnico
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                doc.expediente || doc.numeroExpediente,
                doc.anioExpediente,
                doc.numeroResolucion,
                doc.fecha || doc.fechaExpediente,
                doc.unidadNegocio,
                doc.nombreEmpresa,
                doc.numeroFichero,
                doc.observaciones,
                doc.pdfPath || doc.pdfPathActa,
                doc.informeTecnico
            );

            return {
                _id: info.lastInsertRowid,
                ...doc
            };
        } catch (error) {
            console.error('❌ Error al insertar expediente:', error);
            throw error;
        }
    },

    /**
     * Buscar expedientes con query
     * @param {Object} query - Condiciones de búsqueda
     * @returns {Array} Lista de expedientes
     */
    find: (query = {}) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM ActasResolucion ${clause} ORDER BY _id DESC`;
            const stmt = db.prepare(sql);
            return stmt.all(...params);
        } catch (error) {
            console.error('❌ Error al buscar expedientes:', error);
            throw error;
        }
    },

    /**
     * Buscar un solo expediente
     * @param {Object} query - Condiciones de búsqueda
     * @returns {Object|null} Expediente encontrado o null
     */
    findOne: (query) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM ActasResolucion ${clause} LIMIT 1`;
            const stmt = db.prepare(sql);
            return stmt.get(...params) || null;
        } catch (error) {
            console.error('❌ Error al buscar expediente:', error);
            throw error;
        }
    },

    /**
     * Actualizar expediente
     * @param {Object} query - Condiciones para identificar el expediente
     * @param {Object} update - Datos a actualizar
     * @param {Object} options - Opciones adicionales
     * @returns {number} Número de registros actualizados
     */
    update: (query, update, options = {}) => {
        try {
            const { clause: whereClause, params: whereParams } = buildWhereClause(query);
            const { clause: setClause, params: setParams } = buildSetClause(update);

            const sql = `UPDATE ActasResolucion SET ${setClause} ${whereClause}`;
            const stmt = db.prepare(sql);
            const info = stmt.run(...setParams, ...whereParams);

            return info.changes;
        } catch (error) {
            console.error('❌ Error al actualizar expediente:', error);
            throw error;
        }
    },

    /**
     * Eliminar expediente (CASCADE eliminará tarjetas asociadas)
     * @param {Object} query - Condiciones para identificar el expediente
     * @param {Object} options - Opciones adicionales
     * @returns {number} Número de registros eliminados
     */
    remove: (query, options = {}) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `DELETE FROM ActasResolucion ${clause}`;
            const stmt = db.prepare(sql);
            const info = stmt.run(...params);

            return info.changes;
        } catch (error) {
            console.error('❌ Error al eliminar expediente:', error);
            throw error;
        }
    },

    /**
     * Buscar con paginación
     * @param {Object} query - Condiciones de búsqueda
     * @param {number} skip - Número de registros a saltar
     * @param {number} limit - Número máximo de registros a devolver
     * @returns {Array} Lista de expedientes paginada
     */
    findWithPagination: (query, skip, limit) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM ActasResolucion ${clause} ORDER BY _id DESC LIMIT ? OFFSET ?`;
            const stmt = db.prepare(sql);
            return stmt.all(...params, limit, skip);
        } catch (error) {
            console.error('❌ Error en paginación:', error);
            throw error;
        }
    }
});
