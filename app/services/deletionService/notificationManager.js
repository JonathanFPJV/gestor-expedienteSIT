// app/services/deletionService/notificationManager.js
/**
 * Gestor de Notificaciones para DeletionService
 * Maneja el envío de notificaciones a ventanas sobre eliminaciones
 */

const { BrowserWindow } = require('electron');
const { createDeletionNotification } = require('./utils');

/**
 * Crear módulo de notificaciones
 * @returns {Object} Métodos para enviar notificaciones
 */
module.exports = function createNotificationManager() {
    return {
        /**
         * Notificar a todas las ventanas sobre la eliminación
         * @param {Object} operation - Información de la operación
         */
        notifyDeletion(operation) {
            const tarjetasEliminadas = operation.steps
                .find(s => s.step === 'delete_tarjetas_db')?.result?.deletedCount || 0;

            const notification = createDeletionNotification(operation, tarjetasEliminadas);

            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('expediente-eliminado', notification);
            });

            console.log('📢 Notificación enviada a todas las ventanas:', notification);
        }
    };
};
