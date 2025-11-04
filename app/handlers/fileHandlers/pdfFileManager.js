// app/handlers/fileHandlers/pdfFileManager.js
/**
 * Gestor de Archivos PDF
 * 
 * Responsabilidades:
 * - Guardar archivos PDF en el sistema
 * - Abrir PDFs con la aplicación predeterminada
 * - Eliminar archivos PDF
 * 
 * @module pdfFileManager
 */

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { showErrorDialog } = require('./dialogManager');
const { cleanupEmptyFolder } = require('./folderManager');

/**
 * Guarda un archivo PDF copiándolo al sistema de archivos
 * 
 * Proceso:
 * 1. Genera carpeta basada en resolución/expediente
 * 2. Asegura que la carpeta exista
 * 3. Copia el archivo a la ubicación de destino
 * 4. Retorna ruta relativa para almacenar en BD
 * 
 * @param {string} filePath - Ruta del archivo origen
 * @param {string} fileName - Nombre para el archivo destino
 * @param {Object} options - Opciones adicionales
 * @param {string} options.resolutionNumber - Número de resolución
 * @param {string} options.expedienteNumero - Número de expediente
 * @param {Function} getResolutionFolderFn - Función para generar nombre de carpeta
 * @param {Function} ensureFolderFn - Función para asegurar carpeta
 * @param {string} dataDir - Directorio base de datos
 * @returns {Promise<Object>} Resultado con success, path y folder
 * 
 * @example
 * const result = await savePdf('/tmp/doc.pdf', 'acta-123.pdf', {
 *   resolutionNumber: '123/2024',
 *   expedienteNumero: 'EXP-456'
 * });
 * // { success: true, path: 'resolucion-123-2024/acta-123.pdf', folder: 'resolucion-123-2024' }
 */
function savePdf(filePath, fileName, options, getResolutionFolderFn, ensureFolderFn, dataDir) {
    const { resolutionNumber, expedienteNumero } = options;
    
    // Generar nombre de carpeta
    const folderName = getResolutionFolderFn(resolutionNumber, expedienteNumero);
    
    // Asegurar que la carpeta exista
    const baseDir = ensureFolderFn(folderName, dataDir);
    
    // Ruta de destino completa
    const destinationPath = path.join(baseDir, fileName);

    return new Promise((resolve, reject) => {
        fs.copyFile(filePath, destinationPath, (err) => {
            if (err) {
                console.error('❌ Error al guardar el archivo:', err);
                return reject(err);
            }
            
            console.log('💾 Archivo guardado exitosamente:', destinationPath);
            
            // Retornar ruta relativa para la BD
            const relativePath = path.relative(dataDir, destinationPath);
            resolve({ 
                success: true, 
                path: relativePath, 
                folder: folderName 
            });
        });
    });
}

/**
 * Abre un archivo PDF con la aplicación predeterminada del sistema
 * 
 * Validaciones:
 * - Verifica que la ruta no sea nula
 * - Verifica que el archivo exista
 * - Muestra error si falla
 * 
 * @param {string} fullPath - Ruta completa del archivo
 * 
 * @example
 * openPdf('/app/data/resolucion-123/acta.pdf');
 */
function openPdf(fullPath) {
    if (!fullPath) {
        showErrorDialog('Archivo no encontrado', 'No se proporcionó una ruta de archivo válida.');
        return;
    }
    
    if (fs.existsSync(fullPath)) {
        console.log('🔗 Abriendo PDF con shell:', fullPath);
        shell.openPath(fullPath).catch(err => {
            console.error('❌ Error al abrir el archivo:', err);
            showErrorDialog('Error', `No se pudo abrir el archivo: ${err.message}`);
        });
    } else {
        showErrorDialog('Archivo no encontrado', 'El archivo no existe en la ruta especificada.');
    }
}

/**
 * Elimina un archivo PDF del sistema de archivos
 * 
 * Características:
 * - Si no hay ruta, no hace nada (éxito silencioso)
 * - Si el archivo no existe, reporta éxito (idempotente)
 * - Limpia carpeta vacía después de eliminar
 * 
 * @param {string} fullPath - Ruta completa del archivo
 * @param {string} dataDir - Directorio base de datos
 * @returns {Promise<Object>} Resultado con success, path o message
 * 
 * @example
 * const result = await deletePdf('/app/data/resolucion-123/acta.pdf');
 * // { success: true, path: '/app/data/resolucion-123/acta.pdf' }
 */
function deletePdf(fullPath, dataDir) {
    return new Promise((resolve, reject) => {
        // Si no hay ruta, no hacer nada
        if (!fullPath) {
            console.warn('⚠️ No se proporcionó ruta para eliminar PDF');
            return resolve({ success: true, message: 'Ruta no especificada' });
        }
        
        // Si el archivo no existe, no hacer nada (idempotente)
        if (!fs.existsSync(fullPath)) {
            console.warn('⚠️ Archivo PDF no existe, omitiendo eliminación:', fullPath);
            return resolve({ success: true, message: 'Archivo no existía' });
        }
        
        // Eliminar archivo
        fs.unlink(fullPath, (err) => {
            if (err) {
                console.error('❌ Error al eliminar el archivo:', err);
                return reject(err);
            }
            
            console.log('🗑️ Archivo PDF eliminado exitosamente:', fullPath);
            
            // Limpiar carpeta vacía
            cleanupEmptyFolder(fullPath, dataDir);
            
            resolve({ success: true, path: fullPath });
        });
    });
}

module.exports = {
    savePdf,
    openPdf,
    deletePdf
};
