// app/handlers/ipcHandlers/index.js
/**
 * Orquestador de Handlers IPC - Arquitectura Limpia
 * 
 * Responsabilidad: Coordinar el registro de todos los handlers IPC modulares
 * Este archivo NO contiene lógica de negocio, solo orquestación
 * 
 * Arquitectura modular:
 * - windowHandlers: Gestión de ventanas (abrir, cerrar, enfocar)
 * - pdfHandlers: Operaciones con PDFs (abrir, leer, descargar)
 * - deletionHandlers: Eliminaciones complejas con cascada
 * 
 * Handlers de entidades (en archivos separados):
 * - ExpedienteHandlers: CRUD de expedientes
 * - TarjetaHandlers: CRUD de tarjetas
 * - ActaEntregaHandlers: CRUD de actas de entrega
 * 
 * @module ipcHandlers
 */

const database = require('../../db/database');
const FileHandlers = require('../fileHandlers');
const DeletionService = require('../../services/deletionService');
const ExpedienteHandlers = require('../expedienteHandlers');
const TarjetaHandlers = require('../tarjetaHandlers');
const ActaEntregaHandlers = require('../actaEntregaHandlers');

// Importar handlers modulares
const registerWindowHandlers = require('./windowHandlers');
const registerPdfHandlers = require('./pdfHandlers');
const registerDeletionHandlers = require('./deletionHandlers');

// Extraer la instancia real de la base de datos Y las APIs
const db = database.db;  // Para servicios que usan SQLite3 directamente
const dbAPI = database;  // Para handlers que usan las APIs (expedientes, tarjetas)

/**
 * Registra todos los handlers IPC de la aplicación
 * 
 * @param {Electron.App} appInstance - Instancia de la aplicación Electron
 */
function registerIpcHandlers(appInstance) {
    console.log('🚀 Iniciando registro de handlers IPC...');
    
    // ============================================
    // 1. INICIALIZACIÓN DE SERVICIOS
    // ============================================
    const fileHandlers = new FileHandlers(appInstance);
    const deletionService = new DeletionService(appInstance);
    const editorWindows = new Map();
    
    console.log('✅ Servicios inicializados:');
    console.log('   - FileHandlers');
    console.log('   - DeletionService');
    console.log('   - EditorWindows (Map)');
    
    // ============================================
    // 2. REGISTRAR HANDLERS DE ENTIDADES
    // ============================================
    console.log('\n📦 Registrando handlers de entidades...');
    
    // Handlers de Expedientes (CRUD completo) - Usa APIs de alto nivel
    const expedienteHandlers = new ExpedienteHandlers(dbAPI, fileHandlers);
    expedienteHandlers.registerHandlers();
    
    // Handlers de Tarjetas (CRUD completo + búsquedas) - Usa APIs de alto nivel
    const tarjetaHandlers = new TarjetaHandlers(dbAPI, fileHandlers);
    tarjetaHandlers.registerHandlers();
    
    // Handlers de Actas de Entrega (CRUD completo) - Usa SQLite3 directamente
    const actaEntregaHandlers = new ActaEntregaHandlers(db, fileHandlers);
    actaEntregaHandlers.registerHandlers();
    
    console.log('\n✅ Handlers de entidades registrados:');
    console.log('   - ExpedienteHandlers (7 canales IPC)');
    console.log('   - TarjetaHandlers (13+ canales IPC)');
    console.log('   - ActaEntregaHandlers (10+ canales IPC)');
    
    // ============================================
    // 3. REGISTRAR HANDLERS MODULARES
    // ============================================
    console.log('\n🔧 Registrando handlers modulares...');
    
    registerWindowHandlers(appInstance, editorWindows);
    registerPdfHandlers(fileHandlers);
    registerDeletionHandlers(deletionService);
    
    // ============================================
    // 4. RESUMEN FINAL
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS LOS HANDLERS IPC REGISTRADOS EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('📊 Resumen de canales IPC activos:');
    console.log('   📂 Expedientes: 7 canales (incluye eliminación)');
    console.log('   🎫 Tarjetas: 13+ canales');
    console.log('   📄 Actas de Entrega: 10+ canales');
    console.log('   🪟 Ventanas: 1 canal');
    console.log('   📋 PDFs: 4 canales');
    console.log('   📈 Total estimado: 35+ canales IPC');
    console.log('='.repeat(60));
}

module.exports = { registerIpcHandlers };
