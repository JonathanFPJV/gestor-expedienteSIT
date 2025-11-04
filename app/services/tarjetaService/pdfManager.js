// app/services/tarjetaService/pdfManager.js
/**
 * Gestor de PDFs para Tarjetas
 * Maneja operaciones de archivos PDF
 */

const { buildTarjetaFileName } = require('./utils');

/**
 * Crear módulo de gestión de PDFs
 * @param {Object} fileHandlers - Manejador de archivos
 * @returns {Object} Métodos para gestionar PDFs
 */
module.exports = function createPdfManager(fileHandlers) {
    if (!fileHandlers) {
        console.warn('⚠️ PdfManager inicializado sin fileHandlers');
        return {
            savePdf: () => null,
            deletePdf: () => false,
            hasPdf: () => false
        };
    }

    return {
        /**
         * Guardar PDF de tarjeta
         * @param {string} pdfFilePath - Ruta temporal del PDF
         * @param {Object} tarjetaData - Datos de la tarjeta
         * @param {Object} resolucion - Datos de la resolución
         * @returns {string|null} Ruta del PDF guardado
         */
        async savePdf(pdfFilePath, tarjetaData, resolucion) {
            if (!pdfFilePath) {
                return null;
            }

            try {
                const fileName = buildTarjetaFileName(tarjetaData);
                const saveResult = await fileHandlers.savePdf(
                    pdfFilePath,
                    fileName,
                    {
                        resolutionNumber: resolucion.numeroResolucion,
                        expedienteNumero: resolucion.numeroExpediente,
                        placa: tarjetaData.placa
                    }
                );

                console.log('📄 PDF de tarjeta guardado:', saveResult.path);
                return saveResult.path;

            } catch (error) {
                console.warn('⚠️ No se pudo guardar el PDF de la tarjeta:', error);
                throw error;
            }
        },

        /**
         * Eliminar PDF de tarjeta
         * @param {string} pdfPath - Ruta del PDF a eliminar
         * @returns {boolean} true si se eliminó
         */
        async deletePdf(pdfPath) {
            if (!pdfPath) {
                return false;
            }

            try {
                const result = await fileHandlers.deletePdf(pdfPath);
                console.log('🗑️ PDF de tarjeta eliminado:', pdfPath);
                return result.success;

            } catch (error) {
                console.warn('⚠️ No se pudo eliminar el PDF:', error.message);
                return false;
            }
        },

        /**
         * Verificar si existe PDF
         * @param {string} pdfPath - Ruta del PDF
         * @returns {boolean} true si existe
         */
        hasPdf(pdfPath) {
            return !!(pdfPath && pdfPath.trim() !== '');
        }
    };
};
