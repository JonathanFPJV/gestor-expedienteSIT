// app/services/deletionService/utils.js
/**
 * Utilidades para DeletionService
 * Funciones compartidas: formateo, estructuras de datos
 */

/**
 * Crear estructura de operación de eliminación
 * @param {string|number} expedienteId - ID del expediente
 * @returns {Object} Estructura de operación
 */
function createOperationStructure(expedienteId) {
    return {
        id: `delete_${expedienteId}_${Date.now()}`,
        startTime: new Date(),
        expediente: null,
        steps: [],
        success: false,
        errors: [],
        warnings: []
    };
}

/**
 * Agregar paso a la operación
 * @param {Array} steps - Array de pasos
 * @param {string} stepName - Nombre del paso
 * @param {string} status - Estado ('started', 'completed', 'failed')
 * @param {*} result - Resultado del paso (opcional)
 * @param {string} error - Error del paso (opcional)
 */
function addOperationStep(steps, stepName, status, result = null, error = null) {
    const step = {
        step: stepName,
        status: status,
        timestamp: new Date()
    };

    if (result) {
        step.result = result;
    }

    if (error) {
        step.error = error;
    }

    steps.push(step);
}

/**
 * Formatear información de expediente
 * @param {Object} expediente - Datos del expediente
 * @returns {Object} Información formateada
 */
function formatExpedienteInfo(expediente) {
    return {
        id: expediente._id,
        numero: expediente.numeroExpediente,
        anio: expediente.anioExpediente,
        completo: `${expediente.numeroExpediente}-${expediente.anioExpediente}`,
        empresa: expediente.nombreEmpresa,
        pdfPath: expediente.pdfPathActa
    };
}

/**
 * Formatear información de tarjetas
 * @param {Array} tarjetas - Array de tarjetas
 * @returns {Array} Array de información formateada
 */
function formatTarjetasInfo(tarjetas) {
    return tarjetas.map(t => ({
        id: t._id,
        placa: t.placa,
        tarjeta: t.numeroTarjeta,
        pdfPath: t.pdfPath,
        actaEntregaId: t.actaEntregaId
    }));
}

/**
 * Crear resumen de eliminación
 * @param {Object} operation - Operación de eliminación
 * @param {number} deletedTarjetasCount - Cantidad de tarjetas eliminadas
 * @param {Array} deletedTarjetaFiles - Archivos de tarjetas eliminados
 * @param {boolean} expedienteFileDeleted - PDF del expediente eliminado
 * @param {boolean} actaEntregaFileDeleted - PDF del acta eliminada
 * @param {boolean} actaEntregaId - ID del acta de entrega
 * @returns {Object} Resumen formateado
 */
function createDeletionSummary(
    operation,
    deletedTarjetasCount,
    deletedTarjetaFiles,
    expedienteFileDeleted,
    actaEntregaFileDeleted,
    actaEntregaId
) {
    return {
        expediente: operation.expediente.completo,
        empresa: operation.expediente.empresa,
        tarjetasEliminadas: deletedTarjetasCount,
        archivosEliminados: deletedTarjetaFiles.filter(f => f.success).length + 
                          (expedienteFileDeleted ? 1 : 0) + 
                          (actaEntregaFileDeleted ? 1 : 0),
        warnings: operation.warnings.length,
        duration: operation.duration,
        actaEntregaEliminada: !!actaEntregaId
    };
}

/**
 * Crear notificación para ventanas
 * @param {Object} operation - Operación de eliminación
 * @param {number} tarjetasCount - Cantidad de tarjetas eliminadas
 * @returns {Object} Notificación
 */
function createDeletionNotification(operation, tarjetasCount) {
    return {
        type: 'expediente-eliminado',
        expedienteId: operation.expediente.id,
        expedienteCompleto: operation.expediente.completo,
        empresa: operation.expediente.empresa,
        tarjetasEliminadas: tarjetasCount,
        timestamp: operation.endTime
    };
}

module.exports = {
    createOperationStructure,
    addOperationStep,
    formatExpedienteInfo,
    formatTarjetasInfo,
    createDeletionSummary,
    createDeletionNotification
};
