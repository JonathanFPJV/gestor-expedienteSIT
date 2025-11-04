// app/services/deletionService/fileCleanupManager.js
/**
 * Gestor de Limpieza de Archivos para DeletionService
 * Maneja la eliminación de archivos PDF de tarjetas, expedientes y actas
 */

/**
 * Crear módulo de limpieza de archivos
 * @param {Object} fileHandlers - Manejador de archivos
 * @returns {Object} Métodos para limpiar archivos
 */
module.exports = function createFileCleanupManager(fileHandlers) {
    return {
        /**
         * Eliminar PDFs de tarjetas
         * @param {Array} tarjetas - Array de tarjetas
         * @param {Array} warnings - Array de warnings de la operación
         * @returns {Promise<Array>} Array con información de archivos eliminados
         */
        async deleteTarjetaFiles(tarjetas, warnings) {
            const deletedFiles = [];
            
            for (const tarjeta of tarjetas) {
                if (tarjeta.pdfPath) {
                    try {
                        const deleteResult = await fileHandlers.deletePdf(tarjeta.pdfPath);
                        deletedFiles.push({
                            placa: tarjeta.placa,
                            file: tarjeta.pdfPath,
                            success: deleteResult.success
                        });
                    } catch (error) {
                        warnings.push(`No se pudo eliminar archivo PDF de tarjeta ${tarjeta.placa}: ${error.message}`);
                        deletedFiles.push({
                            placa: tarjeta.placa,
                            file: tarjeta.pdfPath,
                            success: false,
                            error: error.message
                        });
                    }
                }
            }

            return deletedFiles;
        },

        /**
         * Eliminar PDF de expediente
         * @param {Object} expediente - Expediente
         * @param {Array} warnings - Array de warnings de la operación
         * @returns {Promise<boolean>} true si se eliminó
         */
        async deleteExpedienteFile(expediente, warnings) {
            if (!expediente.pdfPath) {
                return false;
            }

            try {
                const deleteResult = await fileHandlers.deletePdf(expediente.pdfPath);
                return deleteResult.success;
            } catch (error) {
                warnings.push(`No se pudo eliminar archivo PDF del expediente: ${error.message}`);
                return false;
            }
        },

        /**
         * Eliminar PDF de acta de entrega
         * @param {Object} actaEntrega - Acta de entrega
         * @param {Array} warnings - Array de warnings de la operación
         * @returns {Promise<boolean>} true si se eliminó
         */
        async deleteActaEntregaFile(actaEntrega, warnings) {
            if (!actaEntrega || !actaEntrega.pdfPathEntrega) {
                return false;
            }

            try {
                const deleteResult = await fileHandlers.deletePdf(actaEntrega.pdfPathEntrega);
                console.log('✅ PDF del Acta de Entrega eliminado:', actaEntrega.pdfPathEntrega);
                return deleteResult.success;
            } catch (error) {
                warnings.push(`No se pudo eliminar archivo PDF del acta de entrega: ${error.message}`);
                return false;
            }
        }
    };
};
