// app/db/database.js
/**
 * Sistema de Base de Datos SQLite3 usando better-sqlite3
 * Migración desde NeDB a SQLite para mayor escalabilidad y relaciones nativas
 * 
 * ARQUITECTURA MODULAR:
 * - database.js: Inicialización de conexión y orquestación de modelos
 * - models/: Modelos de datos (expedienteModel, tarjetaModel, actaEntregaModel)
 * - models/utils.js: Funciones helper para construcción de queries
 * - migrations/: Scripts de creación/actualización de schema
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const pathConfig = require('../config/pathConfig');
const initializeTables = require('./migrations/initTables');

// Inicializar configuración de rutas (portable o estándar)
pathConfig.initialize();

// Define la ruta del directorio de datos de la aplicación usando pathConfig
const dbDir = pathConfig.getDatabasePath();

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

// Inicializar tablas y schema
initializeTables(db);

// Importar modelos
const expedienteModel = require('./models/expedienteModel');
const tarjetaModel = require('./models/tarjetaModel');
const actaEntregaModel = require('./models/actaEntregaModel');

// Instanciar modelos con la conexión de base de datos
const expedientes = expedienteModel(db);
const tarjetas = tarjetaModel(db);
const actasEntrega = actaEntregaModel(db);

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