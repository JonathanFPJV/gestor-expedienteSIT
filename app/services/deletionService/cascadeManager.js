// app/services/deletionService/cascadeManager.js
/**
 * Gestor de Eliminación en Cascada para DeletionService
 * Orquesta la eliminación completa de expedientes con todas sus dependencias
 */

const {
    createOperationStructure,
    addOperationStep,
    formatExpedienteInfo,
    formatTarjetasInfo,
    createDeletionSummary
} = require('./utils');

/**
 * Crear módulo de eliminación en cascada
 * @param {Database} db - Instancia de base de datos
 * @param {Object} expedienteManager - Gestor de expedientes
 * @param {Object} tarjetaManager - Gestor de tarjetas
 * @param {Object} fileCleanupManager - Gestor de limpieza de archivos
 * @returns {Object} Métodos para eliminación en cascada
 */
module.exports = function createCascadeManager(
    db,
    expedienteManager,
    tarjetaManager,
    fileCleanupManager
) {
    return {
        /**
         * Eliminar expediente y todas sus dependencias en cascada
         * @param {string} expedienteId - ID del expediente a eliminar
         * @returns {Promise<Object>} Resultado de la operación
         */
        async deleteExpedienteWithCascade(expedienteId) {
            const operation = createOperationStructure(expedienteId);

            try {
                // Paso 1: Verificar expediente
                addOperationStep(operation.steps, 'verify_expediente', 'started');
                
                const expediente = await expedienteManager.getExpedienteById(expedienteId);
                operation.expediente = formatExpedienteInfo(expediente);

                operation.steps[operation.steps.length - 1].status = 'completed';
                operation.steps[operation.steps.length - 1].result = operation.expediente;

                // Paso 2: Obtener tarjetas relacionadas
                addOperationStep(operation.steps, 'get_related_tarjetas', 'started');
                
                const tarjetas = await tarjetaManager.getTarjetasByExpediente(expedienteId);
                const tarjetasInfo = formatTarjetasInfo(tarjetas);

                operation.steps[operation.steps.length - 1].status = 'completed';
                operation.steps[operation.steps.length - 1].result = { 
                    count: tarjetas.length, 
                    tarjetas: tarjetasInfo 
                };

                // Paso 2.1: Identificar acta de entrega asociada (si existe)
                let actaEntregaId = null;
                let actaEntrega = null;
                if (tarjetas.length > 0 && tarjetas[0].actaEntregaId) {
                    actaEntregaId = tarjetas[0].actaEntregaId;
                    actaEntrega = await db.actasEntrega.findOne({ _id: actaEntregaId });
                    if (actaEntrega) {
                        console.log(`📄 Acta de Entrega asociada encontrada: ${actaEntregaId}`);
                    }
                }

                // Paso 3: Eliminar archivos PDF de tarjetas
                addOperationStep(operation.steps, 'delete_tarjetas_files', 'started');
                
                const deletedTarjetaFiles = await fileCleanupManager.deleteTarjetaFiles(
                    tarjetas,
                    operation.warnings
                );

                operation.steps[operation.steps.length - 1].status = 'completed';
                operation.steps[operation.steps.length - 1].result = { deletedFiles: deletedTarjetaFiles };

                // Paso 4: Eliminar tarjetas de la base de datos
                addOperationStep(operation.steps, 'delete_tarjetas_db', 'started');
                
                const deletedTarjetasCount = await tarjetaManager.deleteTarjetasByExpediente(expedienteId);
                
                operation.steps[operation.steps.length - 1].status = 'completed';
                operation.steps[operation.steps.length - 1].result = { deletedCount: deletedTarjetasCount };

                // Paso 5: Eliminar archivo PDF del expediente
                addOperationStep(operation.steps, 'delete_expediente_file', 'started');
                
                const expedienteFileDeleted = await fileCleanupManager.deleteExpedienteFile(
                    expediente,
                    operation.warnings
                );

                operation.steps[operation.steps.length - 1].status = 'completed';
                operation.steps[operation.steps.length - 1].result = { 
                    fileDeleted: expedienteFileDeleted,
                    fileName: expediente.pdfPath || 'N/A'
                };

                // Paso 5.1: Eliminar archivo PDF del acta de entrega (si existe)
                let actaEntregaFileDeleted = false;
                if (actaEntrega && actaEntrega.pdfPathEntrega) {
                    addOperationStep(operation.steps, 'delete_acta_entrega_file', 'started');
                    
                    actaEntregaFileDeleted = await fileCleanupManager.deleteActaEntregaFile(
                        actaEntrega,
                        operation.warnings
                    );

                    operation.steps[operation.steps.length - 1].status = 'completed';
                    operation.steps[operation.steps.length - 1].result = { 
                        fileDeleted: actaEntregaFileDeleted,
                        fileName: actaEntrega.pdfPathEntrega
                    };
                }

                // Paso 6: Eliminar acta de entrega de la base de datos (si existe)
                if (actaEntregaId) {
                    addOperationStep(operation.steps, 'delete_acta_entrega_db', 'started');
                    
                    try {
                        const deletedActaCount = await db.actasEntrega.remove({ _id: actaEntregaId });
                        console.log('✅ Acta de Entrega eliminada de la BD');
                        
                        operation.steps[operation.steps.length - 1].status = 'completed';
                        operation.steps[operation.steps.length - 1].result = { deletedCount: deletedActaCount };
                    } catch (error) {
                        operation.warnings.push(`No se pudo eliminar acta de entrega de la BD: ${error.message}`);
                        operation.steps[operation.steps.length - 1].status = 'failed';
                        operation.steps[operation.steps.length - 1].error = error.message;
                    }
                }

                // Paso 7: Eliminar expediente de la base de datos
                addOperationStep(operation.steps, 'delete_expediente_db', 'started');
                
                const deletedExpedienteCount = await db.expedientes.remove({ _id: expedienteId });
                if (deletedExpedienteCount === 0) {
                    throw new Error('No se pudo eliminar el expediente de la base de datos');
                }

                operation.steps[operation.steps.length - 1].status = 'completed';
                operation.steps[operation.steps.length - 1].result = { deletedCount: deletedExpedienteCount };

                // Operación exitosa
                operation.success = true;
                operation.endTime = new Date();
                operation.duration = operation.endTime - operation.startTime;

                return {
                    success: true,
                    operation: operation,
                    summary: createDeletionSummary(
                        operation,
                        deletedTarjetasCount,
                        deletedTarjetaFiles,
                        expedienteFileDeleted,
                        actaEntregaFileDeleted,
                        actaEntregaId
                    ),
                    message: `Expediente ${operation.expediente.completo} eliminado correctamente con ${deletedTarjetasCount} tarjeta(s)${actaEntregaId ? ' y acta de entrega' : ''}`
                };

            } catch (error) {
                operation.success = false;
                operation.endTime = new Date();
                operation.duration = operation.endTime - operation.startTime;
                operation.errors.push(error.message);

                // Marcar el último paso como fallido
                if (operation.steps.length > 0) {
                    operation.steps[operation.steps.length - 1].status = 'failed';
                    operation.steps[operation.steps.length - 1].error = error.message;
                }

                console.error('❌ Error en eliminación en cascada:', error);
                console.error('📊 Estado de la operación:', operation);

                throw {
                    success: false,
                    operation: operation,
                    error: error.message,
                    message: `Error al eliminar expediente: ${error.message}`
                };
            }
        }
    };
};
