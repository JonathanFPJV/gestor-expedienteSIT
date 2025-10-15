/**
 * Script de Migración: NeDB → SQLite3
 * 
 * Este script migra todos los datos de las colecciones NeDB (.db files)
 * a la nueva base de datos SQLite3
 * 
 * INSTRUCCIONES:
 * 1. Asegúrate de tener una copia de seguridad de tus datos
 * 2. Ejecuta: node scripts/migrate-nedb-to-sqlite.js
 * 3. Verifica que los datos se migraron correctamente
 */

const Datastore = require('nedb');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Rutas de los archivos
const userDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');

const nedbDir = path.join(userDataPath, 'gestor-electron', 'database');
const sqliteDbPath = path.join(nedbDir, 'gestor-sit.db');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     🔄 MIGRACIÓN DE NEDB A SQLITE3                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Verificar que existan los archivos NeDB
const expedientesDbPath = path.join(nedbDir, 'expedientes.db');
const tarjetasDbPath = path.join(nedbDir, 'tarjetas.db');

if (!fs.existsSync(expedientesDbPath)) {
    console.error('❌ No se encontró expedientes.db en:', expedientesDbPath);
    process.exit(1);
}

if (!fs.existsSync(tarjetasDbPath)) {
    console.error('❌ No se encontró tarjetas.db en:', tarjetasDbPath);
    process.exit(1);
}

console.log('✅ Archivos NeDB encontrados');
console.log('📂 expedientes.db:', expedientesDbPath);
console.log('📂 tarjetas.db:', tarjetasDbPath);
console.log('📂 SQLite destino:', sqliteDbPath);
console.log('');

// Cargar bases de datos NeDB
const expedientesNedb = new Datastore({ filename: expedientesDbPath, autoload: true });
const tarjetasNedb = new Datastore({ filename: tarjetasDbPath, autoload: true });

// Crear/abrir base de datos SQLite
const db = new Database(sqliteDbPath);
db.pragma('foreign_keys = ON');

// Crear tablas si no existen
console.log('🔧 Creando tablas SQLite...');

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

console.log('✅ Tablas creadas\n');

// Función para migrar expedientes
function migrateExpedientes() {
    return new Promise((resolve, reject) => {
        console.log('📦 Migrando expedientes...');
        
        expedientesNedb.find({}, (err, expedientes) => {
            if (err) return reject(err);
            
            if (expedientes.length === 0) {
                console.log('⚠️  No hay expedientes para migrar');
                return resolve({ count: 0, errors: [] });
            }

            const stmt = db.prepare(`
                INSERT INTO ActasResolucion (
                    numeroExpediente, anioExpediente, numeroResolucion, fechaExpediente,
                    unidadNegocio, nombreEmpresa, numeroFichero, observaciones,
                    pdfPathActa, informeTecnico
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let migrados = 0;
            const errores = [];

            // Crear un mapa de _id antiguo a nuevo
            const idMap = new Map();

            for (const exp of expedientes) {
                try {
                    const info = stmt.run(
                        exp.expediente || exp.numeroExpediente,
                        exp.anioExpediente,
                        exp.numeroResolucion,
                        exp.fecha || exp.fechaExpediente,
                        exp.unidadNegocio,
                        exp.nombreEmpresa,
                        exp.numeroFichero,
                        exp.observaciones,
                        exp.pdfPath || exp.pdfPathActa,
                        exp.informeTecnico
                    );

                    idMap.set(exp._id, info.lastInsertRowid);
                    migrados++;
                    console.log(`  ✓ ${exp.expediente || exp.numeroExpediente}`);
                } catch (error) {
                    errores.push({ expediente: exp.expediente, error: error.message });
                    console.error(`  ✗ Error en ${exp.expediente}:`, error.message);
                }
            }

            console.log(`✅ ${migrados}/${expedientes.length} expedientes migrados\n`);
            resolve({ count: migrados, errors: errores, idMap });
        });
    });
}

// Función para migrar tarjetas
function migrateTarjetas(expedienteIdMap) {
    return new Promise((resolve, reject) => {
        console.log('🎫 Migrando tarjetas...');
        
        tarjetasNedb.find({}, (err, tarjetas) => {
            if (err) return reject(err);
            
            if (tarjetas.length === 0) {
                console.log('⚠️  No hay tarjetas para migrar');
                return resolve({ count: 0, errors: [] });
            }

            const stmt = db.prepare(`
                INSERT INTO TarjetasVehiculos (
                    placa, numeroTarjeta, resolucionId, pdfPath
                ) VALUES (?, ?, ?, ?)
            `);

            let migrados = 0;
            const errores = [];

            for (const tarjeta of tarjetas) {
                try {
                    // Mapear el expedienteId antiguo al nuevo resolucionId
                    const newResolucionId = expedienteIdMap.get(tarjeta.expedienteId) || null;

                    stmt.run(
                        tarjeta.placa,
                        tarjeta.numeroTarjeta,
                        newResolucionId,
                        tarjeta.pdfPath
                    );

                    migrados++;
                    console.log(`  ✓ ${tarjeta.placa} → N° ${tarjeta.numeroTarjeta || 'N/A'}`);
                } catch (error) {
                    errores.push({ placa: tarjeta.placa, error: error.message });
                    console.error(`  ✗ Error en ${tarjeta.placa}:`, error.message);
                }
            }

            console.log(`✅ ${migrados}/${tarjetas.length} tarjetas migradas\n`);
            resolve({ count: migrados, errors: errores });
        });
    });
}

// Ejecutar migración
async function runMigration() {
    try {
        // Migrar expedientes primero
        const expResult = await migrateExpedientes();
        
        // Migrar tarjetas (con mapeo de IDs)
        const tarResult = await migrateTarjetas(expResult.idMap);

        // Resumen final
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊                  RESUMEN DE MIGRACIÓN');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ Expedientes migrados: ${expResult.count}`);
        console.log(`✅ Tarjetas migradas: ${tarResult.count}`);
        console.log(`❌ Errores en expedientes: ${expResult.errors.length}`);
        console.log(`❌ Errores en tarjetas: ${tarResult.errors.length}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        if (expResult.errors.length > 0 || tarResult.errors.length > 0) {
            console.log('⚠️  Algunos registros no se pudieron migrar. Revisa los errores arriba.');
        } else {
            console.log('🎉 ¡Migración completada exitosamente!\n');
            console.log('📝 Próximos pasos:');
            console.log('   1. Verifica los datos en la aplicación');
            console.log('   2. Si todo está correcto, puedes hacer backup de los .db antiguos');
            console.log('   3. Los archivos NeDB antiguos NO se han eliminado por seguridad\n');
        }

        db.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fatal durante migración:', error);
        db.close();
        process.exit(1);
    }
}

// Iniciar migración
runMigration();
