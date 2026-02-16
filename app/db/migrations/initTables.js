// app/db/migrations/initTables.js
/**
 * Inicialización de tablas e índices de la base de datos
 * Define el schema completo de la aplicación
 */

/**
 * Inicializar las tablas de la base de datos
 * @param {Database} db - Instancia de better-sqlite3
 */
function initializeTables(db) {
    console.log(' Inicializando tablas...');

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
            estado TEXT DEFAULT 'ACTIVA',
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

    console.log(' Tablas inicializadas correctamente');
}

module.exports = initializeTables;
