// app/handlers/actaEntregaHandlers/index.js
/**
 * ActaEntregaHandlers - Clase Orquestadora
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Esta clase coordina todos los módulos de gestión de actas de entrega.
 * 
 * Módulos coordinados:
 * - utils: Utilidades de broadcast y manejo de errores
 * - readHandler: Operaciones de lectura (5 canales)
 * - createHandler: Operaciones de creación (1 canal)
 * - updateHandler: Operaciones de actualización (1 canal)
 * - deleteHandler: Operaciones de eliminación (1 canal)
 * - statsHandler: Estadísticas (1 canal)
 * - pdfHandler: Operaciones con PDFs (2 canales)
 * 
 * Total: 11 canales IPC
 * 
 * Responsabilidad Principal:
 * - Coordinar módulos
 * - Mantener referencias (service, db, fileHandlers)
 * - Proveer API de registro
 * 
 * @class ActaEntregaHandlers
 */

const ActaEntregaService = require('../../services/actaEntregaService');

// Importar handlers modulares
const registerReadHandlers = require('./readHandler');
const registerCreateHandlers = require('./createHandler');
const registerUpdateHandlers = require('./updateHandler');
const registerDeleteHandlers = require('./deleteHandler');
const registerStatsHandlers = require('./statsHandler');
const registerPdfHandlers = require('./pdfHandler');

class ActaEntregaHandlers {
    /**
     * Crea una instancia de ActaEntregaHandlers
     * 
     * @param {Database} db - Instancia de base de datos SQLite3
     * @param {FileHandlers} fileHandlers - Gestor de archivos (opcional)
     */
    constructor(db, fileHandlers = null) {
        console.log('🔍 ActaEntregaHandlers constructor:');
        console.log('   - db recibido:', !!db);
        console.log('   - Tipo de db:', typeof db);
        console.log('   - Tiene prepare?:', typeof db?.prepare);
        console.log('   - Constructor:', db?.constructor?.name);
        console.log('   - fileHandlers recibido:', !!fileHandlers);
        
        this.db = db;
        this.actaEntregaService = new ActaEntregaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
        
        console.log('✅ ActaEntregaService inicializado con db válido');
    }

    /**
     * Registrar todos los manejadores IPC para actas de entrega
     * Coordina el registro de todos los módulos
     */
    registerHandlers() {
        console.log('📝 Registrando manejadores IPC para Actas de Entrega...');
        console.log('='.repeat(60));

        // Registrar handlers modulares
        registerReadHandlers(this.actaEntregaService);
        registerCreateHandlers(this.actaEntregaService);
        registerUpdateHandlers(this.actaEntregaService);
        registerDeleteHandlers(this.actaEntregaService);
        registerStatsHandlers(this.actaEntregaService);
        registerPdfHandlers(this.fileHandlers);

        // Resumen final
        console.log('='.repeat(60));
        console.log('✅ Manejadores IPC de Actas de Entrega registrados exitosamente');
        console.log('   📊 Handlers organizados en módulos:');
        console.log('      - readHandler: 5 canales (todas, por-id, buscar, tarjetas, info-eliminar)');
        console.log('      - createHandler: 1 canal (crear)');
        console.log('      - updateHandler: 1 canal (actualizar)');
        console.log('      - deleteHandler: 1 canal (eliminar)');
        console.log('      - statsHandler: 1 canal (estadísticas)');
        console.log('      - pdfHandler: 2 canales (seleccionar, abrir)');
        console.log('   📈 Total: 11 canales IPC activos');
        console.log('='.repeat(60));
    }
}

module.exports = ActaEntregaHandlers;
