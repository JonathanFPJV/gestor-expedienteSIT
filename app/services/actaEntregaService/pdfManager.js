// app/services/actaEntregaService/pdfManager.js
/**
 * Gestor de PDFs para Actas de Entrega
 * Maneja operaciones de archivos PDF
 */

const fs = require('fs');
const queries = require('./queries');
const { copyPdfFile, deletePdfFile } = require('./utils');

/**
 * Crear módulo de gestión de PDFs
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar PDFs
 */
module.exports = function createPdfManager(db) {
    return {
        /**
         * Copiar PDF y actualizar ruta en BD
         * @param {string} sourcePath - Ruta del archivo original
         * @param {number} actaId - ID del acta
         * @returns {string} Ruta del archivo copiado
         */
        copyAndUpdatePdf(sourcePath, actaId) {
            if (!sourcePath || !fs.existsSync(sourcePath)) {
                return null;
            }

            const pdfPath = copyPdfFile(sourcePath, actaId);
            
            // Actualizar ruta en BD
            const stmt = db.prepare(queries.updateActaPdf);
            stmt.run(pdfPath, actaId);

            return pdfPath;
        },

        /**
         * Reemplazar PDF existente
         * @param {string} oldPdfPath - Ruta del PDF anterior
         * @param {string} newPdfSource - Ruta del nuevo PDF
         * @param {number} actaId - ID del acta
         * @returns {string} Ruta del nuevo PDF
         */
        replacePdf(oldPdfPath, newPdfSource, actaId) {
            // Eliminar PDF anterior si existe
            if (oldPdfPath && fs.existsSync(oldPdfPath)) {
                deletePdfFile(oldPdfPath);
            }

            // Copiar y actualizar nuevo PDF
            return this.copyAndUpdatePdf(newPdfSource, actaId);
        },

        /**
         * Eliminar PDF de un acta
         * @param {string} pdfPath - Ruta del PDF a eliminar
         * @returns {boolean} true si se eliminó
         */
        deletePdf(pdfPath) {
            return deletePdfFile(pdfPath);
        }
    };
};
