// app/db/migrations/addEstadoToTarjetas.js
/**
 * Migración: Agregar campo 'estado' a TarjetasVehiculos
 * Fecha: 2025-11-21
 * Descripción: Agrega campo para indicar si una tarjeta está ACTIVA o CANCELADA
 */

/**
 * Ejecutar migración
 * @param {Database} db - Instancia de better-sqlite3
 */
function migrate(db) {
    console.log('🔄 Ejecutando migración: Agregar campo estado a TarjetasVehiculos');

    try {
        // Verificar si la columna ya existe
        const tableInfo = db.prepare("PRAGMA table_info(TarjetasVehiculos)").all();
        const estadoExists = tableInfo.some(col => col.name === 'estado');

        if (estadoExists) {
            console.log('⚠️ El campo "estado" ya existe en TarjetasVehiculos');
            return;
        }

        // Agregar columna estado con valor por defecto 'ACTIVA'
        // SIN restricción CHECK para permitir extensibilidad futura
        db.exec(`
            ALTER TABLE TarjetasVehiculos 
            ADD COLUMN estado TEXT DEFAULT 'ACTIVA'
        `);

        // Actualizar todas las tarjetas existentes a 'ACTIVA'
        db.exec(`
            UPDATE TarjetasVehiculos 
            SET estado = 'ACTIVA' 
            WHERE estado IS NULL
        `);

        // Crear índice para el campo estado
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tarjetas_estado 
            ON TarjetasVehiculos(estado)
        `);

        console.log('✅ Campo "estado" agregado exitosamente a TarjetasVehiculos');
        console.log('✅ Todas las tarjetas existentes marcadas como ACTIVA');
        console.log('ℹ️  Estados permitidos se validan en capa de aplicación (extensible)');

    } catch (error) {
        console.error('❌ Error en migración addEstadoToTarjetas:', error);
        throw error;
    }
}

/**
 * Revertir migración (rollback)
 * SQLite no soporta DROP COLUMN, se requeriría recrear la tabla
 */
function rollback(db) {
    console.warn('⚠️ Rollback no soportado para esta migración en SQLite');
    console.warn('⚠️ Se requiere recrear la tabla para eliminar la columna');
}

module.exports = { migrate, rollback };
