// app/handlers/tarjetaHandlers/utils.js
/**
 * Utilidades para handlers de tarjetas
 * Funciones helper para manejo de errores y respuestas
 */

/**
 * Wrapper para manejo centralizado de errores en handlers
 * @param {Function} handler - Función handler a ejecutar
 * @param {string} errorMessage - Mensaje de error personalizado
 * @returns {Function} Handler con manejo de errores
 */
function handleError(handler, errorMessage = 'Error en operación') {
    return async (event, ...args) => {
        try {
            return await handler(...args);
        } catch (error) {
            console.error(`❌ ${errorMessage}:`, error);
            return {
                success: false,
                message: error.message || errorMessage
            };
        }
    };
}

/**
 * Wrapper para handlers sin event parameter
 * @param {Function} handler - Función handler a ejecutar
 * @param {string} errorMessage - Mensaje de error personalizado
 * @returns {Function} Handler con manejo de errores
 */
function handleErrorNoEvent(handler, errorMessage = 'Error en operación') {
    return async () => {
        try {
            return await handler();
        } catch (error) {
            console.error(`❌ ${errorMessage}:`, error);
            return {
                success: false,
                message: error.message || errorMessage
            };
        }
    };
}

module.exports = {
    handleError,
    handleErrorNoEvent
};
