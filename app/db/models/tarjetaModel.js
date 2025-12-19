// app/db/models/tarjetaModel.js
/**
 * Modelo para TarjetasVehiculos (Tarjetas)
 * Gestiona el CRUD de tarjetas con prepared statements
 */

const { buildWhereClause, buildSetClause } = require('./utils');

/**
 * Crea el modelo de tarjetas
 * @param {Database} db - Instancia de better-sqlite3
 * @returns {Object} API del modelo
 */
module.exports = (db) => ({
    /**
     * Insertar nueva tarjeta
     * @param {Object} doc - Datos de la tarjeta
     * @returns {Object} Tarjeta insertada con _id
     */
    insert: (doc) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO TarjetasVehiculos (
                    placa, numeroTarjeta, estado, resolucionId, actaEntregaId, pdfPath
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                doc.placa,
                doc.numeroTarjeta,
                doc.estado || 'ACTIVA',
                doc.expedienteId || doc.resolucionId,
                doc.actaEntregaId || null,
                doc.pdfPath || null
            );

            return {
                _id: info.lastInsertRowid,
                ...doc,
                estado: doc.estado || 'ACTIVA'
            };
        } catch (error) {
            console.error('❌ Error al insertar tarjeta:', error);
            throw error;
        }
    },

    /**
     * Buscar tarjetas
     * @param {Object} query - Condiciones de búsqueda
     * @returns {Array} Lista de tarjetas
     */
    find: (query = {}) => {
        try {
            // Mapear expedienteId a resolucionId para compatibilidad
            if (query.expedienteId) {
                query.resolucionId = query.expedienteId;
                delete query.expedienteId;
            }

            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM TarjetasVehiculos ${clause} ORDER BY _id DESC`;
            const stmt = db.prepare(sql);
            return stmt.all(...params);
        } catch (error) {
            console.error('❌ Error al buscar tarjetas:', error);
            throw error;
        }
    },

    /**
     * Buscar una sola tarjeta
     * @param {Object} query - Condiciones de búsqueda
     * @returns {Object|null} Tarjeta encontrada o null
     */
    findOne: (query) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const sql = `SELECT * FROM TarjetasVehiculos ${clause} LIMIT 1`;
            const stmt = db.prepare(sql);
            return stmt.get(...params) || null;
        } catch (error) {
            console.error('❌ Error al buscar tarjeta:', error);
            throw error;
        }
    },

    /**
     * Actualizar tarjeta
     * @param {Object} query - Condiciones para identificar la tarjeta
     * @param {Object} update - Datos a actualizar
     * @param {Object} options - Opciones adicionales
     * @returns {number} Número de registros actualizados
     */
    update: (query, update, options = {}) => {
        try {
            console.log('🔍 UPDATE Query:', query);
            console.log('🔍 UPDATE Data:', update);
            
            const { clause: whereClause, params: whereParams } = buildWhereClause(query);
            const { clause: setClause, params: setParams } = buildSetClause(update);

            console.log('🔍 WHERE Clause:', whereClause, 'Params:', whereParams);
            console.log('🔍 SET Clause:', setClause, 'Params:', setParams);

            const sql = `UPDATE TarjetasVehiculos SET ${setClause} ${whereClause}`;
            console.log('🔍 SQL Final:', sql);
            console.log('🔍 Todos los params:', [...setParams, ...whereParams]);
            
            const stmt = db.prepare(sql);
            const info = stmt.run(...setParams, ...whereParams);

            return info.changes;
        } catch (error) {
            console.error('❌ Error al actualizar tarjeta:', error);
            throw error;
        }
    },

    /**
     * Eliminar tarjeta
     * @param {Object} query - Condiciones para identificar la tarjeta
     * @param {Object} options - Opciones adicionales (multi para eliminar múltiples)
     * @returns {number} Número de registros eliminados
     */
    remove: (query, options = {}) => {
        try {
            const { clause, params } = buildWhereClause(query);
            const multi = options.multi || false;
            const sql = `DELETE FROM TarjetasVehiculos ${clause}`;
            const stmt = db.prepare(sql);
            const info = stmt.run(...params);

            return info.changes;
        } catch (error) {
            console.error('❌ Error al eliminar tarjeta:', error);
            throw error;
        }
    }
});
