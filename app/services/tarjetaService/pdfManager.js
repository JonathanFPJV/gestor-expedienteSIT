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
         * @param {string} pdfPath - Ruta del PDF a eliminar (relativa o absoluta)
         * @returns {Promise<boolean>} true si se eliminó correctamente
         */
        async deletePdf(pdfPath) {
            if (!pdfPath || pdfPath.trim() === '') {
                console.log('ℹ️ No hay PDF para eliminar (ruta vacía)');
                return true; // No es un error, simplemente no hay nada que eliminar
            }

            try {
                console.log('🗑️ Intentando eliminar PDF de tarjeta:', pdfPath);
                const result = await fileHandlers.deletePdf(pdfPath);
                
                if (result && result.success) {
                    console.log('✅ PDF de tarjeta eliminado exitosamente:', pdfPath);
                    return true;
                } else {
                    console.warn('⚠️ La eliminación del PDF retornó resultado no exitoso:', result);
                    return false;
                }

            } catch (error) {
                console.error('❌ Error al eliminar el PDF:', error.message);
                console.error('   Ruta intentada:', pdfPath);
                throw error; // Propagar el error para que el llamador pueda manejarlo
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
