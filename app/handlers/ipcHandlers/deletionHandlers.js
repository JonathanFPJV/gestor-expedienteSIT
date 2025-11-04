// app/handlers/ipcHandlers/deletionHandlers.js
/**
 * Handlers de Eliminación
 * 
 * ⚠️ NOTA IMPORTANTE:
 * Este módulo está preparado para futuras operaciones de eliminación complejas.
 * 
 * Actualmente, los canales de eliminación ya están registrados en:
 * - expedienteHandlers.js: 'eliminar-expediente' y 'obtener-info-eliminacion'
 * 
 * Este archivo queda como placeholder para futuras funcionalidades de eliminación
 * que puedan necesitar el DeletionService.
 * 
 * @module deletionHandlers
 */

/**
 * Registra handlers de eliminación
 * Actualmente no registra canales para evitar duplicados
 * 
 * @param {DeletionService} deletionService - Servicio de eliminación con cascada
 */
function registerDeletionHandlers(deletionService) {
    console.log('✅ DeletionHandlers: Servicio inicializado (sin canales propios)');
    console.log('   ℹ️  Los canales de eliminación están en ExpedienteHandlers');
    
    // TODO: Si en el futuro necesitamos más handlers de eliminación
    // complejos (ej: eliminar múltiples expedientes, eliminar por criterio),
    // se pueden agregar aquí sin conflictos con los handlers existentes.
}

module.exports = registerDeletionHandlers;

