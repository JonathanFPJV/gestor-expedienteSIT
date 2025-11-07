// app/handlers/expedienteHandlers/utils.js
/**
 * Utilidades para Expediente Handlers
 * 
 * Responsabilidades:
 * - Mapeo de datos para compatibilidad con frontend
 * - Centralización de manejo de errores
 * - Notificación a ventanas
 * 
 * @module expedienteHandlers/utils
 */

const { BrowserWindow } = require('electron');

/**
 * Mapea un expediente completo con sus tarjetas asociadas
 * Centraliza el mapeo que se usa en múltiples handlers
 * 
 * @param {Object} expediente - Expediente desde la base de datos
 * @param {Object} db - Base de datos con APIs
 * @returns {Object} Expediente completo con tarjetas mapeadas
 */
function mapExpedienteCompleto(expediente, db) {
    try {
        // Buscar tarjetas asociadas
        const tarjetasAsociadas = db.tarjetas.find({ resolucionId: expediente._id });
        
        // Retornar expediente con todos los campos
        return {
            _id: expediente._id,
            numeroExpediente: expediente.numeroExpediente,
            anioExpediente: expediente.anioExpediente,
            numeroResolucion: expediente.numeroResolucion,
            fechaExpediente: expediente.fechaExpediente,
            unidadNegocio: expediente.unidadNegocio,
            nombreEmpresa: expediente.nombreEmpresa,
            numeroFichero: expediente.numeroFichero,
            observaciones: expediente.observaciones,
            pdfPathActa: expediente.pdfPathActa,
            informeTecnico: expediente.informeTecnico,
            // Campos legacy para retrocompatibilidad
            expediente: expediente.numeroExpediente,
            fecha: expediente.fechaExpediente,
            pdfPath: expediente.pdfPathActa,
            // Tarjetas asociadas
            tarjetasAsociadas: tarjetasAsociadas || []
        };
    } catch (error) {
        console.error(`❌ Error mapeando expediente ${expediente._id}:`, error);
        return {
            ...mapExpedienteForFrontend(expediente),
            tarjetasAsociadas: []
        };
    }
}

/**
 * Mapea un expediente de BD a formato compatible con frontend
 * Mantiene retrocompatibilidad con versiones anteriores
 * 
 * @param {Object} expediente - Expediente desde la base de datos
 * @returns {Object} Expediente mapeado con campos legacy
 */
function mapExpedienteForFrontend(expediente) {
    return {
        ...expediente,
        // Campos legacy para compatibilidad
        expediente: expediente.numeroExpediente,
        fecha: expediente.fechaExpediente,
        pdfPath: expediente.pdfPathActa
    };
}

/**
 * Mapea una tarjeta de BD a formato compatible con frontend
 * 
 * @param {Object} tarjeta - Tarjeta desde la base de datos
 * @returns {Object} Tarjeta mapeada
 */
function mapTarjetaForFrontend(tarjeta) {
    return {
        _id: tarjeta._id,
        placa: tarjeta.placa,
        tarjeta: tarjeta.numeroTarjeta,
        numeroTarjeta: tarjeta.numeroTarjeta,
        pdfPath: tarjeta.pdfPath
    };
}

/**
 * Notifica a todas las ventanas de un evento relacionado con expedientes
 * 
 * @param {string} eventName - Nombre del evento
 * @param {Object} payload - Datos a enviar
 */
function notifyAllWindows(eventName, payload) {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send(eventName, payload);
    });
    console.log(`📢 Evento enviado a todas las ventanas: ${eventName}`);
}

/**
 * Manejo centralizado de errores para handlers
 * Retorna un objeto de error estructurado
 * 
 * @param {Error} error - Error capturado
 * @param {string} operation - Nombre de la operación que falló
 * @returns {Object} Objeto de error estructurado
 */
function handleError(error, operation) {
    console.error(`❌ Error en ${operation}:`, error);
    return {
        success: false,
        message: error.message || `Error al ${operation}`,
        error: error
    };
}

/**
 * Prepara un payload completo para eventos de expediente
 * Incluye expediente mapeado y tarjetas
 * 
 * @param {Object} expediente - Expediente desde servicio
 * @param {Array} tarjetas - Tarjetas asociadas (opcional)
 * @returns {Object} Payload formateado
 */
function prepareExpedientePayload(expediente, tarjetas = []) {
    return {
        expediente: mapExpedienteForFrontend(expediente),
        tarjetas: tarjetas
    };
}

module.exports = {
    mapExpedienteCompleto,
    mapExpedienteForFrontend,
    mapTarjetaForFrontend,
    notifyAllWindows,
    handleError,
    prepareExpedientePayload
};
