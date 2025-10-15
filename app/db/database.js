// app/db/database.js
/**
 * Sistema de Base de Datos SQLite3 usando better-sqlite3
 * Migración desde NeDB a SQLite para mayor escalabilidad y relaciones nativas
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Define la ruta del directorio de datos de la aplicación
const dbDir = path.join(app.getPath('userData'), 'database');

// Asegura que el directorio de la base de datos exista
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Ruta del archivo de base de datos SQLite
const dbPath = path.join(dbDir, 'gestor-sit.db');

// Crear conexión a la base de datos
const db = new Database(dbPath, { 
    verbose: console.log // Para debug, remover en producción
});

// Habilitar claves foráneas (importante para integridad referencial)
db.pragma('foreign_keys = ON');

console.log('📂 Base de datos SQLite inicializada en:', dbPath);

/**
 * Inicializar las tablas de la base de datos
 */
function initializeTables() {
    console.log('🔧 Inicializando tablas...');

    // 1. ActasResolucion (Maestro - Expedientes)
    db.exec(`
        CREATE TABLE IF NOT EXISTS ActasResolucion (
            _id INTEGER PRIMARY KEY AUTOINCREMENT,
            numeroExpediente TEXT NOT NULL UNIQUE,
            anioExpediente INTEGER,
            numeroResolucion TEXT,
            fechaExpediente DATE,
            unidadNegocio TEXT,
            nombreEmpresa TEXT,
            numeroFichero TEXT,
            observaciones TEXT,
            pdfPathActa TEXT,
            informeTecnico TEXT,
            fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fechaModificacion DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. ActasEntrega (Maestro - Actas de Entrega)
    db.exec(`
        CREATE TABLE IF NOT EXISTS ActasEntrega (
            _id INTEGER PRIMARY KEY AUTOINCREMENT,
            n_tarjetas_entregadas INTEGER DEFAULT 0,
            fechaEntrega DATE,
            pdfPathEntrega TEXT,
            observaciones TEXT,
            fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fechaModificacion DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. TarjetasVehiculos (Detalle - Tarjetas)
    db.exec(`
        CREATE TABLE IF NOT EXISTS TarjetasVehiculos (
            _id INTEGER PRIMARY KEY AUTOINCREMENT,
            placa TEXT NOT NULL,
            numeroTarjeta TEXT,
            pdfPath TEXT,
            resolucionId INTEGER,
            actaEntregaId INTEGER,
            fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fechaModificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(resolucionId) REFERENCES ActasResolucion(_id) ON DELETE CASCADE,
            FOREIGN KEY(actaEntregaId) REFERENCES ActasEntrega(_id) ON DELETE SET NULL
        );
    `);

    // Crear índices para mejorar rendimiento
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_actas_resolucion_numero ON ActasResolucion(numeroExpediente);
        CREATE INDEX IF NOT EXISTS idx_actas_resolucion_anio ON ActasResolucion(anioExpediente);
        CREATE INDEX IF NOT EXISTS idx_tarjetas_placa ON TarjetasVehiculos(placa);
        CREATE INDEX IF NOT EXISTS idx_tarjetas_resolucion ON TarjetasVehiculos(resolucionId);
        CREATE INDEX IF NOT EXISTS idx_tarjetas_acta_entrega ON TarjetasVehiculos(actaEntregaId);
    `);

    console.log('✅ Tablas inicializadas correctamente');
}

// Inicializar tablas al cargar el módulo
initializeTables();

/**
 * Helper para construir cláusula WHERE desde un objeto query
 */
function buildWhereClause(query) {
    if (!query || Object.keys(query).length === 0) {
        return { clause: '', params: [] };
    }

    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(query)) {
        if (key === '_id' || key === 'id') {
            conditions.push('_id = ?');
            params.push(value);
        } else if (typeof value === 'object' && value.$ne !== undefined) {
            conditions.push(`${key} != ?`);
            params.push(value.$ne);
        } else {
            conditions.push(`${key} = ?`);
            params.push(value);
        }
    }

    return {
        clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params
    };
}

/**
 * Helper para construir SET clause desde un objeto update
 */
function buildSetClause(update) {
    const setClauses = [];
    const params = [];

    // Manejar operadores de actualización ($set, etc)
    const updateData = update.$set || update;

    for (const [key, value] of Object.entries(updateData)) {
        if (key !== '_id') {
            setClauses.push(`${key} = ?`);
            params.push(value);
        }
    }

    // Agregar fechaModificacion automáticamente
    setClauses.push('fechaModificacion = CURRENT_TIMESTAMP');

    return {
        clause: setClauses.join(', '),
        params
    };
}

/**
 * API para ActasResolucion (Expedientes)
 */
const expedientes = {
    /**
     * Insertar nuevo expediente
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
};

/**
 * API para TarjetasVehiculos (Tarjetas)
 */
const tarjetas = {
    /**
     * Insertar nueva tarjeta
     */
    insert: (doc) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO TarjetasVehiculos (
                    placa, numeroTarjeta, resolucionId, actaEntregaId, pdfPath
                ) VALUES (?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                doc.placa,
                doc.numeroTarjeta,
                doc.expedienteId || doc.resolucionId,
                doc.actaEntregaId || null,
                doc.pdfPath || null
            );

            return {
                _id: info.lastInsertRowid,
                ...doc
            };
        } catch (error) {
            console.error('❌ Error al insertar tarjeta:', error);
            throw error;
        }
    },

    /**
     * Buscar tarjetas
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
     */
    update: (query, update, options = {}) => {
        try {
            const { clause: whereClause, params: whereParams } = buildWhereClause(query);
            const { clause: setClause, params: setParams } = buildSetClause(update);

            const sql = `UPDATE TarjetasVehiculos SET ${setClause} ${whereClause}`;
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
};

/**
 * API para ActasEntrega
 */
const actasEntrega = {
    /**
     * Insertar acta de entrega
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
};

/**
 * Cerrar la base de datos (llamar al cerrar la aplicación)
 */
function close() {
    try {
        db.close();
        console.log('✅ Conexión a base de datos cerrada');
    } catch (error) {
        console.error('❌ Error al cerrar base de datos:', error);
    }
}

// Exportar API
module.exports = {
    db,                 // Conexión directa para consultas avanzadas
    expedientes,        // API de Expedientes (ActasResolucion)
    tarjetas,          // API de Tarjetas (TarjetasVehiculos)
    actasEntrega,      // API de Actas de Entrega
    close              // Cerrar conexión
};