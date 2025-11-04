// app/services/expedienteService/utils.js
/**
 * Utilidades para ExpedienteService
 * Funciones compartidas: validaciones, formateo, construcción de queries
 */

/**
 * Construir etiqueta de expediente (formato: numeroExpediente-año)
 * @param {Object} param0 - numeroExpediente y anioExpediente
 * @returns {string} Etiqueta formateada
 */
function buildExpedienteLabel({ numeroExpediente, anioExpediente }) {
    if (!numeroExpediente && !anioExpediente) return null;
    const numero = numeroExpediente || 'sin-numero';
    const anio = anioExpediente || new Date().getFullYear();
    return `${numero}-${anio}`;
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
 * Construir query de búsqueda
 * @param {Object} filtros - Filtros a aplicar
 * @returns {Object} Query para SQLite
 */
function buildExpedienteQuery(filtros) {
    const query = {};

    if (filtros.anioExpediente) {
        query.anioExpediente = filtros.anioExpediente;
    }

    if (filtros.unidadNegocio) {
        query.unidadNegocio = filtros.unidadNegocio;
    }

    if (filtros.numeroResolucion) {
        query.numeroResolucion = filtros.numeroResolucion;
    }

    return query;
}

/**
 * Convertir ID a número si viene como string
 * @param {string|number} id - ID a convertir
 * @returns {number} ID numérico
 */
function normalizeId(id) {
    return typeof id === 'string' ? parseInt(id, 10) : id;
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
        ...data
    };
}

/**
 * Formatear respuesta de error
 * @param {Error} error - Error capturado
 * @param {Object} summary - Resumen de la operación (opcional)
 * @returns {Object} Respuesta de error estructurada
 */
function formatErrorResponse(error, summary = null) {
    const response = {
        success: false,
        message: error.message || 'Error en operación de expediente',
        error: error.message
    };

    if (summary) {
        response.summary = summary;
    }

    return response;
}

module.exports = {
    buildExpedienteLabel,
    buildTarjetaFileName,
    buildExpedienteQuery,
    normalizeId,
    formatSuccessResponse,
    formatErrorResponse
};
