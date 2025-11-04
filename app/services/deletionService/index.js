// app/services/deletionService/index.js
/**
 * DeletionService - Orquestador Principal
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Coordina todos los módulos especializados:
 * - expedienteManager: Obtención y validación de expedientes
 * - tarjetaManager: Gestión de tarjetas
 * - fileCleanupManager: Limpieza de archivos PDF
 * - cascadeManager: Orquestación de eliminación en cascada
 * - notificationManager: Notificaciones a ventanas
 * - utils: Utilidades compartidas
 */

const createExpedienteManager = require('./expedienteManager');
const createTarjetaManager = require('./tarjetaManager');
const createFileCleanupManager = require('./fileCleanupManager');
const createCascadeManager = require('./cascadeManager');
const createNotificationManager = require('./notificationManager');

class DeletionService {
    constructor(appInstance) {
        // Obtener dependencias desde appInstance
        const db = require('../../db/database');
        const FileHandlers = require('../../handlers/fileHandlers');
        this.fileHandlers = new FileHandlers(appInstance);
        
        // Inicializar módulos especializados
        this.expedienteManager = createExpedienteManager(db);
        this.tarjetaManager = createTarjetaManager(db);
        this.fileCleanupManager = createFileCleanupManager(this.fileHandlers);
        this.cascadeManager = createCascadeManager(
            db,
            this.expedienteManager,
            this.tarjetaManager,
            this.fileCleanupManager
        );
        this.notificationManager = createNotificationManager();
    }

    /**
     * Elimina un expediente y todas sus dependencias en cascada
     * @param {string} expedienteId - ID del expediente a eliminar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async deleteExpedienteWithCascade(expedienteId) {
        try {
            const result = await this.cascadeManager.deleteExpedienteWithCascade(expedienteId);
            
            // Notificar a las ventanas
            this.notificationManager.notifyDeletion(result.operation);

            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtiene información detallada de un expediente antes de eliminarlo
     * @param {string} expedienteId - ID del expediente
     * @returns {Promise<Object>} Información del expediente y dependencias
     */
    async getExpedienteDeleteInfo(expedienteId) {
        try {
            return await this.expedienteManager.getExpedienteDeleteInfo(expedienteId);
        } catch (error) {
            console.error('Error obteniendo información para eliminación:', error);
            throw error;
        }
    }
}

module.exports = DeletionService;
