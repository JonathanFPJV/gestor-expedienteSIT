// app/services/expedienteService/deletionManager.js
/**
 * Gestor de Eliminación en Cascada para Expedientes
 * Maneja la eliminación completa de expedientes con sus dependencias
 */

const { normalizeId } = require('./utils');

/**
 * Crear módulo de eliminación en cascada
 * @param {Database} db - Instancia de base de datos
 * @param {Object} expedienteManager - Gestor de expedientes
 * @param {Object} tarjetaManager - Gestor de tarjetas
 * @param {Object} actaEntregaManager - Gestor de actas de entrega
 * @param {Object} pdfManager - Gestor de PDFs
 * @returns {Object} Métodos para eliminación en cascada
 */
module.exports = function createDeletionManager(
    db,
    expedienteManager,
    tarjetaManager,
    actaEntregaManager,
    pdfManager
) {
    return {
        /**
         * Eliminar expediente con todas sus dependencias en cascada
         * @param {string|number} expedienteId - ID del expediente a eliminar
         * @returns {Promise<Object>} Resultado de la eliminación con resumen
         */
        async deleteExpedienteWithCascade(expedienteId) {
            console.log(`🗑️ deleteExpediente llamado con ID: "${expedienteId}" (tipo: ${typeof expedienteId})`);
            
            const numericId = normalizeId(expedienteId);
            console.log(`🔄 ID convertido a número: ${numericId} (tipo: ${typeof numericId})`);
            
            const startTime = Date.now();
            const summary = {
                expediente: null,
                empresa: null,
                tarjetasEliminadas: 0,
                archivosEliminados: 0,
                warnings: 0,
                duration: 0
            };

            try {
                console.log('🗑️ Iniciando eliminación en cascada para expediente:', numericId);

                // 1. Obtener expediente
                const expediente = expedienteManager.getExpedienteById(numericId);
                console.log(`🔎 Resultado de búsqueda:`, expediente ? `✅ Encontrado: ${expediente.numeroExpediente}` : '❌ NO encontrado');

                summary.expediente = expediente.numeroExpediente;
                summary.empresa = expediente.nombreEmpresa || 'Sin empresa';

                console.log('📋 Expediente a eliminar:', {
                    id: numericId,
                    numero: expediente.numeroExpediente,
                    resolucion: expediente.numeroResolucion
                });

                // 2. Obtener todas las tarjetas asociadas
                const tarjetas = tarjetaManager.getTarjetasByExpediente(numericId);
                console.log(`🎫 Tarjetas asociadas encontradas: ${tarjetas.length}`);

                // 3. Identificar acta de entrega asociada (si existe)
                let actaEntregaId = null;
                let actaEntrega = null;
                if (tarjetas.length > 0 && tarjetas[0].actaEntregaId) {
                    actaEntregaId = tarjetas[0].actaEntregaId;
                    actaEntrega = actaEntregaManager.getActaEntregaById(actaEntregaId);
                    if (actaEntrega) {
                        console.log(`📄 Acta de Entrega asociada encontrada: ${actaEntregaId}`);
                    }
                }

                // 4. Eliminar PDFs de todas las tarjetas
                for (const tarjeta of tarjetas) {
                    if (tarjeta.pdfPath) {
                        try {
                            await pdfManager.deletePdf(tarjeta.pdfPath);
                            summary.archivosEliminados++;
                            console.log('✅ PDF de tarjeta eliminado:', tarjeta.pdfPath);
                        } catch (error) {
                            console.warn('⚠️ No se pudo eliminar PDF de tarjeta:', tarjeta.pdfPath, error.message);
                            summary.warnings++;
                        }
                    }
                }

                // 5. Eliminar PDF del expediente (acta de resolución)
                if (expediente.pdfPathActa) {
                    try {
                        await pdfManager.deletePdf(expediente.pdfPathActa);
                        summary.archivosEliminados++;
                        console.log('✅ PDF del expediente eliminado:', expediente.pdfPathActa);
                    } catch (error) {
                        console.warn('⚠️ No se pudo eliminar PDF del expediente:', expediente.pdfPathActa, error.message);
                        summary.warnings++;
                    }
                }

                // 6. Eliminar PDF del acta de entrega (si existe)
                if (actaEntrega && actaEntrega.pdfPathEntrega) {
                    try {
                        await pdfManager.deletePdf(actaEntrega.pdfPathEntrega);
                        summary.archivosEliminados++;
                        console.log('✅ PDF del Acta de Entrega eliminado:', actaEntrega.pdfPathEntrega);
                    } catch (error) {
                        console.warn('⚠️ No se pudo eliminar PDF del Acta de Entrega:', actaEntrega.pdfPathEntrega, error.message);
                        summary.warnings++;
                    }
                }

                // 7. Eliminar todas las tarjetas de la base de datos
                summary.tarjetasEliminadas = tarjetaManager.deleteTarjetasByExpediente(numericId);

                // 8. Eliminar el acta de entrega de la base de datos (si existe)
                if (actaEntregaId) {
                    try {
                        actaEntregaManager.deleteActaEntrega(actaEntregaId);
                    } catch (error) {
                        console.warn('⚠️ No se pudo eliminar Acta de Entrega de la BD:', error.message);
                        summary.warnings++;
                    }
                }

                // 9. Eliminar el expediente de la base de datos
                expedienteManager.deleteExpediente(numericId);

                // 10. Calcular duración
                summary.duration = Date.now() - startTime;

                console.log('✅ Eliminación en cascada completada:', summary);
                return {
                    success: true,
                    message: `Expediente, ${summary.tarjetasEliminadas} tarjeta(s) y ${actaEntregaId ? 'acta de entrega' : 'sin acta de entrega'} eliminados correctamente`,
                    summary,
                    actaEntregaEliminada: !!actaEntregaId
                };

            } catch (error) {
                summary.duration = Date.now() - startTime;
                console.error('❌ Error en eliminación en cascada:', error);
                throw error;
            }
        }
    };
};
