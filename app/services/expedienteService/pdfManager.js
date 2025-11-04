// app/services/expedienteService/pdfManager.js
/**
 * Gestor de PDFs para Expedientes
 * Maneja operaciones de archivos PDF de expedientes y actas
 */

/**
 * Crear módulo de gestión de PDFs
 * @param {Object} fileHandlers - Manejador de archivos
 * @returns {Object} Métodos para gestionar PDFs
 */
module.exports = function createPdfManager(fileHandlers) {
    if (!fileHandlers) {
        console.warn('⚠️ PdfManager inicializado sin fileHandlers');
        return {
            saveExpedientePdf: () => Promise.resolve(null),
            saveActaEntregaPdf: () => Promise.resolve(null),
            deletePdf: () => Promise.resolve(false)
        };
    }

    return {
        /**
         * Guardar PDF de expediente (acta de resolución)
         * @param {string} pdfSourcePath - Ruta temporal del PDF
         * @param {Object} expedienteData - Datos del expediente
         * @returns {Promise<string|null>} Ruta del PDF guardado
         */
        async saveExpedientePdf(pdfSourcePath, expedienteData) {
            if (!pdfSourcePath) {
                return null;
            }

            try {
                const fileName = expedienteData.pdfPath || `resolucion-${Date.now()}.pdf`;
                const saveResult = await fileHandlers.savePdf(
                    pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expedienteData.numeroResolucion,
                        expedienteNumero: expedienteData.numeroExpediente
                    }
                );

                console.log('📄 PDF de expediente guardado:', saveResult.path);
                return saveResult.path;

            } catch (error) {
                console.warn('⚠️ No se pudo guardar el PDF del expediente:', error);
                throw error;
            }
        },

        /**
         * Guardar PDF de acta de entrega
         * @param {string} pdfSourcePath - Ruta temporal del PDF
         * @param {Object} expedienteData - Datos del expediente
         * @returns {Promise<string|null>} Ruta del PDF guardado
         */
        async saveActaEntregaPdf(pdfSourcePath, expedienteData) {
            if (!pdfSourcePath) {
                return null;
            }

            try {
                const fileName = `acta-entrega-${Date.now()}.pdf`;
                const saveResult = await fileHandlers.savePdf(
                    pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expedienteData.numeroResolucion,
                        expedienteNumero: expedienteData.numeroExpediente
                    }
                );

                if (saveResult.success) {
                    console.log('✅ PDF del Acta de Entrega guardado en:', saveResult.path);
                    return saveResult.path;
                }

                return null;

            } catch (error) {
                console.warn('⚠️ No se pudo guardar el PDF del acta de entrega:', error);
                throw error;
            }
        },

        /**
         * Eliminar PDF
         * @param {string} pdfPath - Ruta del PDF a eliminar
         * @returns {Promise<boolean>} true si se eliminó
         */
        async deletePdf(pdfPath) {
            if (!pdfPath) {
                return false;
            }

            try {
                const result = await fileHandlers.deletePdf(pdfPath);
                console.log('🗑️ PDF eliminado:', pdfPath);
                return result.success;

            } catch (error) {
                console.warn('⚠️ No se pudo eliminar el PDF:', error.message);
                return false;
            }
        }
    };
};
