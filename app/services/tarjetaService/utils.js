// app/services/tarjetaService/utils.js
/**
 * Utilidades para TarjetaService
 * Funciones compartidas: validaciones, formateo, manejo de archivos
 */

/**
 * Validar datos de tarjeta
 * @param {Object} tarjetaData - Datos a validar
 * @throws {Error} Si faltan campos requeridos
 */
function validateTarjetaData(tarjetaData) {
    if (!tarjetaData) {
        throw new Error('No se proporcionaron datos de tarjeta');
    }

    // Al menos debe tener placa o número de tarjeta
    if (!tarjetaData.placa && !tarjetaData.numeroTarjeta) {
        throw new Error('Debe proporcionar al menos la placa o el número de tarjeta');
    }
}

/**
 * Normalizar placa (convertir a mayúsculas)
 * @param {string} placa - Placa a normalizar
 * @returns {string|null} Placa normalizada
 */
function normalizePlaca(placa) {
    return placa ? placa.toUpperCase().trim() : null;
}

/**
 * Construir nombre de archivo para PDF de tarjeta
 * @param {Object} tarjetaData - Datos de la tarjeta
 * @returns {string} Nombre de archivo
 */
function buildTarjetaFileName(tarjetaData = {}) {
    const placa = (tarjetaData.placa || 'sin-placa').replace(/\s+/g, '-');
    const tarjetaNumero = (tarjetaData.tarjeta || tarjetaData.numeroTarjeta || 'sin-numero').replace(/\s+/g, '-');
    const timestamp = Date.now();
    return `tarjeta-${placa}-${tarjetaNumero}-${timestamp}.pdf`;
}

/**
 * Construir query de búsqueda (adaptado para SQLite3)
 * @param {Object} filtros - Filtros aplicados
 * @returns {Object} Query para SQLite
 */
function buildQuery(filtros) {
    const query = {};

    // Cambio: expedienteId → resolucionId
    if (filtros.expedienteId) {
        query.resolucionId = filtros.expedienteId;
    }

    if (filtros.resolucionId) {
        query.resolucionId = filtros.resolucionId;
    }

    if (filtros.placa) {
        query.placa = normalizePlaca(filtros.placa);
    }

    if (filtros.numeroTarjeta) {
        query.numeroTarjeta = filtros.numeroTarjeta;
    }

    if (filtros.actaEntregaId) {
        query.actaEntregaId = filtros.actaEntregaId;
    }

    return query;
}

/**
 * Formatear respuesta exitosa
 * @param {*} data - Datos a retornar
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Respuesta estructurada
 */
function formatSuccessResponse(data, message) {
    return {
        success: true,
        message: message,
        tarjeta: data
    };
}

/**
 * Formatear respuesta de error
 * @param {Error} error - Error capturado
 * @returns {Object} Respuesta de error estructurada
 */
function formatErrorResponse(error) {
    return {
        success: false,
        message: error.message || 'Error en operación de tarjeta',
        error: error
    };
}

module.exports = {
    validateTarjetaData,
    normalizePlaca,
    buildTarjetaFileName,
    buildQuery,
    formatSuccessResponse,
    formatErrorResponse
};
