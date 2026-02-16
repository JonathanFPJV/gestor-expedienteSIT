// app/services/actaEntregaService/utils.js
/**
 * Utilidades para ActaEntregaService
 * Funciones compartidas: transacciones, validaciones, manejo de archivos
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Ejecutar función dentro de una transacción de base de datos
 * @param {Database} db - Instancia de base de datos SQLite3
 * @param {Function} transactionFn - Función a ejecutar en transacción
 * @returns {*} Resultado de la transacción
 */
function executeTransaction(db, transactionFn) {
    const transaction = db.transaction(transactionFn);
    return transaction();
}

/**
 * Copiar archivo PDF a la carpeta de actas de entrega
 * @param {string} sourcePath - Ruta del archivo original
 * @param {number} actaId - ID del acta
 * @returns {string} Ruta del archivo copiado
 */
function copyPdfFile(sourcePath, actaId) {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
        throw new Error('Archivo PDF no encontrado');
    }

    const pdfDir = path.join(app.getPath('userData'), 'pdfs', 'actas-entrega');

    // Crear directorio si no existe
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }

    const fileName = `acta_${actaId}_${Date.now()}.pdf`;
    const destPath = path.join(pdfDir, fileName);

    fs.copyFileSync(sourcePath, destPath);

    return destPath;
}

/**
 * Eliminar archivo PDF
 * @param {string} pdfPath - Ruta del archivo a eliminar
 * @returns {boolean} true si se eliminó, false si no
 */
function deletePdfFile(pdfPath) {
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        return false;
    }

    try {
        fs.unlinkSync(pdfPath);
        return true;
    } catch (error) {
        console.warn('No se pudo eliminar el PDF:', error.message);
        return false;
    }
}

/**
 * Validar ID (debe ser un número positivo)
 * @param {*} id - ID a validar
 * @returns {boolean} true si es válido
 */
function isValidId(id) {
    return id && Number.isInteger(Number(id)) && Number(id) > 0;
}

/**
 * Construir query con filtros dinámicos
 * @param {string} baseQuery - Query base
 * @param {Object} filtros - Objeto con filtros
 * @returns {Object} { query, params }
 */
function buildFilteredQuery(baseQuery, filtros) {
    const conditions = [];
    const params = [];

    if (filtros.fechaDesde) {
        conditions.push('ae.fechaEntrega >= ?');
        params.push(filtros.fechaDesde);
    }

    if (filtros.fechaHasta) {
        conditions.push('ae.fechaEntrega <= ?');
        params.push(filtros.fechaHasta);
    }

    if (filtros.anio) {
        conditions.push('strftime("%Y", ae.fechaEntrega) = ?');
        params.push(filtros.anio.toString());
    }

    let query = baseQuery;
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY ae._id ORDER BY ae.fechaEntrega DESC';

    return { query, params };
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
        acta: data
    };
}

/**
 * Validar que la base de datos es válida
 * @param {*} db - Instancia de base de datos
 * @throws {Error} Si la base de datos no es válida
 */
function validateDatabase(db) {
    if (!db) {
        throw new Error('ActaEntregaService: db es null o undefined');
    }

    if (typeof db.prepare !== 'function') {
        throw new Error('ActaEntregaService: db no tiene método prepare');
    }
}

module.exports = {
    executeTransaction,
    copyPdfFile,
    deletePdfFile,
    isValidId,
    buildFilteredQuery,
    formatSuccessResponse,
    validateDatabase
};
