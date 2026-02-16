// app/handlers/actaEntregaHandlers/utils.js
/**
 * Utilidades para ActaEntrega Handlers
 * 
 * Responsabilidades:
 * - Notificación broadcast a todas las ventanas
 * - Manejo centralizado de errores
 * - Validaciones comunes
 * 
 * @module actaEntregaHandlers/utils
 */

const { BrowserWindow } = require('electron');

/**
 * Notifica a todas las ventanas sobre cambios en actas de entrega
 * Solo envía a ventanas válidas y no destruidas
 * 
 * @param {string} channel - Nombre del canal IPC
 * @param {Object} payload - Datos a enviar
 * 
 * @example
 * broadcastToAllWindows('acta-entrega-creada', { acta: {...} });
 */
function broadcastToAllWindows(channel, payload) {
    BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, payload);
        }
    });
    console.log(`Evento enviado a todas las ventanas: ${channel}`);
}

/**
 * Manejo centralizado de errores para handlers
 * Retorna un objeto de error estructurado y consistente
 * 
 * @param {Error} error - Error capturado
 * @param {string} operation - Nombre de la operación que falló
 * @param {Object} additionalData - Datos adicionales (opcional)
 * @returns {Object} Objeto de error estructurado
 * 
 * @example
 * return handleError(error, 'crear acta de entrega', { actaId: 123 });
 */
function handleError(error, operation, additionalData = {}) {
    console.error(`Error en ${operation}:`, error);
    return {
        success: false,
        message: error.message || `Error al ${operation}`,
        ...additionalData
    };
}

/**
 * Manejo de respuesta exitosa estructurada
 * 
 * @param {Object} data - Datos de la respuesta
 * @param {string} message - Mensaje de éxito (opcional)
 * @returns {Object} Objeto de respuesta exitosa
 * 
 * @example
 * return handleSuccess({ acta: {...} }, 'Acta creada exitosamente');
 */
function handleSuccess(data, message = null) {
    const response = {
        success: true,
        ...data
    };

    if (message) {
        response.message = message;
    }

    return response;
}

/**
 * Valida que un ID sea válido (no nulo, no undefined, no vacío)
 * 
 * @param {any} id - ID a validar
 * @returns {boolean} true si es válido
 */
function isValidId(id) {
    return id !== null && id !== undefined && id !== '';
}

module.exports = {
    broadcastToAllWindows,
    handleError,
    handleSuccess,
    isValidId
};
