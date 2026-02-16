// app/handlers/tarjetaHandlers/index.js
/**
 * Orquestador de Handlers de Tarjetas
 * Responsabilidad: Registrar y coordinar todos los handlers de tarjetas
 * 
 * Arquitectura Limpia:
 * - Separación de responsabilidades por tipo de operación
 * - Cada handler en su propio archivo
 * - Reutilización de código con utils
 * - Fácil mantenimiento y escalabilidad
 */

const { ipcMain } = require('electron');
const TarjetaService = require('../../services/tarjetaService');

// Importar handlers modulares
const registerCreateHandler = require('./createHandler');
const registerReadHandlers = require('./readHandler');
const registerUpdateHandler = require('./updateHandler');
const registerDeleteHandlers = require('./deleteHandler');
const registerStatsHandler = require('./statsHandler');
const registerPdfHandlers = require('./pdfHandler');
const registerEstadoHandlers = require('./estadoHandler');

/**
 * Clase para gestionar todos los handlers de tarjetas
 */
class TarjetaHandlers {
    constructor(db, fileHandlers = null) {
        this.db = db;
        this.tarjetaService = new TarjetaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
    }

    /**
     * Registrar todos los manejadores IPC para tarjetas
     */
    registerHandlers() {
        console.log('Registrando manejadores IPC para Tarjetas...');

        // Registrar handlers por categoría
        registerCreateHandler(ipcMain, this.tarjetaService);
        registerReadHandlers(ipcMain, this.tarjetaService, this.db);
        registerUpdateHandler(ipcMain, this.tarjetaService);
        registerDeleteHandlers(ipcMain, this.tarjetaService);
        registerStatsHandler(ipcMain, this.tarjetaService);
        registerPdfHandlers(ipcMain, this.fileHandlers);
        registerEstadoHandlers(ipcMain, this.tarjetaService);

        console.log('Manejadores IPC de Tarjetas registrados exitosamente');
        console.log('   📂 Handlers organizados en módulos:');
        console.log('      - createHandler: 1 canal (crear)');
        console.log('      - readHandler: 6 canales (consultas)');
        console.log('      - updateHandler: 1 canal (actualizar)');
        console.log('      - deleteHandler: 2 canales (eliminar)');
        console.log('      - statsHandler: 1 canal (estadísticas)');
        console.log('      - pdfHandler: 2 canales (PDFs)');
        console.log('      - estadoHandler: 6 canales (estado extensible)');
        console.log('   📊 Total: 19 canales IPC activos');
    }

    /**
     * Remover todos los manejadores IPC (útil para cleanup)
     */
    removeHandlers() {
        const handlers = [
            'tarjeta:crear',
            'tarjeta:obtener-todas',
            'tarjeta:obtener-por-id',
            'tarjeta:buscar',
            'tarjeta:obtener-por-expediente',
            'tarjeta:actualizar',
            'tarjeta:eliminar',
            'tarjeta:eliminar-por-expediente',
            'tarjeta:estadisticas',
            'tarjeta:buscar-por-placa',
            'tarjeta:obtener-por-acta-entrega',
            'tarjeta:seleccionar-pdf',
            'tarjeta:abrir-pdf',
            'buscar-tarjeta'
        ];

        handlers.forEach(handler => {
            ipcMain.removeHandler(handler);
        });

        console.log('Manejadores IPC de Tarjetas removidos (14 canales)');
    }
}

module.exports = TarjetaHandlers;
