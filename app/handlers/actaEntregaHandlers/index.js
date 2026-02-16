// app/handlers/actaEntregaHandlers/index.js
/**
 * ActaEntregaHandlers - Clase Orquestadora
 * 
 *  REFACTORIZADO - Arquitectura Limpia
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
        this.db = db;
        this.actaEntregaService = new ActaEntregaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
    }

    /**
     * Registrar todos los manejadores IPC para actas de entrega
     * Coordina el registro de todos los módulos
     */
    registerHandlers() {
        console.log('Registrando manejadores IPC para Actas de Entrega...');

        // Registrar handlers modulares
        registerReadHandlers(this.actaEntregaService);
        registerCreateHandlers(this.actaEntregaService);
        registerUpdateHandlers(this.actaEntregaService);
        registerDeleteHandlers(this.actaEntregaService);
        registerStatsHandlers(this.actaEntregaService);
        registerPdfHandlers(this.fileHandlers);

        // Resumen final
        console.log('Manejadores IPC de Actas de Entrega registrados exitosamente');
    }
}

module.exports = ActaEntregaHandlers;
