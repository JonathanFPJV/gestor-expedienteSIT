// app/handlers/expedienteHandlers/index.js
/**
 * ExpedienteHandlers - Clase Orquestadora
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Esta clase coordina todos los módulos de gestión de expedientes.
 * 
 * Módulos coordinados:
 * - utils: Utilidades de mapeo y notificación
 * - readHandler: Operaciones de lectura (4 canales)
 * - createHandler: Operaciones de creación (2 canales)
 * - updateHandler: Operaciones de actualización (1 canal)
 * - deleteHandler: Operaciones de eliminación (1 canal)
 * - statsHandler: Estadísticas (1 canal)
 * 
 * Total: 9 canales IPC
 * 
 * Responsabilidad Principal:
 * - Coordinar módulos
 * - Mantener referencias (service, db, fileHandlers)
 * - Proveer API de registro/eliminación
 * 
 * @class ExpedienteHandlers
 */

const { ipcMain } = require('electron');
const ExpedienteService = require('../../services/expedienteService');

// Importar handlers modulares
const registerReadHandlers = require('./readHandler');
const registerCreateHandlers = require('./createHandler');
const registerUpdateHandlers = require('./updateHandler');
const registerDeleteHandlers = require('./deleteHandler');
const registerStatsHandlers = require('./statsHandler');
const registerExportHandler = require('./exportHandler');

class ExpedienteHandlers {
    /**
     * Crea una instancia de ExpedienteHandlers
     * 
     * @param {Object} db - Base de datos con APIs (expedientes, tarjetas)
     * @param {FileHandlers} fileHandlers - Gestor de archivos
     */
    constructor(db, fileHandlers) {
        this.expedienteService = new ExpedienteService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
        this.db = db;

        console.log('ExpedienteHandlers constructor:');
        console.log('   - db recibido:', !!db);
        console.log('   - fileHandlers recibido:', !!fileHandlers);
        console.log('   - expedienteService creado:', !!this.expedienteService);
    }

    /**
     * Registrar todos los manejadores IPC para expedientes
     * Coordina el registro de todos los módulos
     */
    registerHandlers() {
        console.log('Registrando manejadores IPC para Expedientes...');
        console.log('='.repeat(60));

        // Registrar handlers modulares
        registerReadHandlers(this.expedienteService, this.db);
        registerCreateHandlers(this.expedienteService);
        registerUpdateHandlers(this.expedienteService);
        registerDeleteHandlers(this.expedienteService);
        registerStatsHandlers(this.db);
        registerExportHandler(this.expedienteService, this.db);

        // Resumen final
        console.log('='.repeat(60));
        console.log('Manejadores IPC de Expedientes registrados exitosamente');
        console.log('   📊 Handlers organizados en módulos:');
        console.log('      - readHandler: 4 canales (detalle, todos, buscar, info-eliminación)');
        console.log('      - createHandler: 2 canales (crear, guardar)');
        console.log('      - updateHandler: 1 canal (actualizar)');
        console.log('      - deleteHandler: 1 canal (eliminar)');
        console.log('      - statsHandler: 1 canal (estadísticas)');
        console.log('      - exportHandler: 1 canal (exportar a Excel)');
        console.log('   📈 Total: 10 canales IPC activos');
        console.log('='.repeat(60));
    }

    /**
     * Remover todos los manejadores IPC (útil para cleanup)
     * Lista todos los canales y los elimina
     */
    removeHandlers() {
        const handlers = [
            // Read handlers (4)
            'obtener-expediente-detalle',
            'obtener-todos-expedientes',
            'buscar-expediente',
            'obtener-info-eliminacion',
            // Create handlers (2)
            'crear-expediente',
            'guardar-expediente',
            // Update handlers (1)
            'actualizar-expediente',
            // Delete handlers (1)
            'eliminar-expediente',
            // Stats handlers (1)
            'expediente:estadisticas'
        ];

        handlers.forEach(handler => {
            ipcMain.removeHandler(handler);
        });

        console.log('Manejadores IPC de Expedientes removidos (9 canales)');
    }
}

module.exports = ExpedienteHandlers;
