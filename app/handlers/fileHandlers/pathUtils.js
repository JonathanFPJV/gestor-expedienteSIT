// app/handlers/fileHandlers/pathUtils.js
/**
 * Utilidades de Rutas y Nombres
 * 
 * Responsabilidades:
 * - Generar rutas absolutas desde nombres de archivo
 * - Sanitizar nombres de archivos y carpetas
 * - Generar nombres de carpetas basados en resoluciones
 * 
 * @module pathUtils
 */

const path = require('path');

/**
 * Obtiene la ruta completa de un archivo
 * Si el archivo ya es una ruta absoluta, la retorna tal cual
 * Si es relativa, la combina con el directorio de datos
 * 
 * @param {string} fileName - Nombre o ruta del archivo
 * @param {string} dataDir - Directorio base de datos
 * @returns {string|null} Ruta completa o null si no hay fileName
 */
function getFullPath(fileName, dataDir) {
    if (!fileName) return null;
    const isAbsolute = path.isAbsolute(fileName);
    return isAbsolute ? fileName : path.join(dataDir, fileName);
}

/**
 * Sanitiza un nombre de archivo o carpeta
 * 
 * Proceso:
 * 1. Normaliza caracteres Unicode (elimina acentos)
 * 2. Reemplaza caracteres especiales por guiones
 * 3. Elimina guiones duplicados y de bordes
 * 4. Convierte a minúsculas
 * 
 * @param {string} name - Nombre a sanitizar
 * @returns {string|null} Nombre sanitizado o null si no hay nombre
 * 
 * @example
 * sanitizeName('Resolución #123/2024') // 'resolucion-123-2024'
 */
function sanitizeName(name) {
    if (!name) return null;
    return String(name)
        .normalize('NFKD')                    // Normalizar Unicode
        .replace(/[\u0300-\u036f]/g, '')      // Quitar acentos
        .replace(/[^a-zA-Z0-9_-]/g, '-')      // Solo caracteres válidos
        .replace(/-+/g, '-')                   // Evitar guiones duplicados
        .replace(/^-|-$/g, '')                 // Quitar guiones de bordes
        .toLowerCase();
}

/**
 * Genera el nombre de carpeta para una resolución
 * 
 * Estrategia:
 * 1. Si hay número de resolución, usar "resolucion-{numero}"
 * 2. Si no hay resolución pero sí expediente, usar "expediente-{numero}"
 * 3. Si no hay ninguno, usar "sin-resolucion"
 * 
 * @param {string} resolutionNumber - Número de resolución
 * @param {string} expedienteNumero - Número de expediente (fallback)
 * @returns {string} Nombre de carpeta sanitizado
 * 
 * @example
 * getResolutionFolder('123/2024', null) // 'resolucion-123-2024'
 * getResolutionFolder(null, 'EXP-456') // 'expediente-exp-456'
 * getResolutionFolder(null, null) // 'sin-resolucion'
 */
function getResolutionFolder(resolutionNumber, expedienteNumero) {
    // Intentar con número de resolución
    const sanitizedResolution = sanitizeName(resolutionNumber);
    if (sanitizedResolution) {
        return `resolucion-${sanitizedResolution}`;
    }

    // Fallback a número de expediente
    const sanitizedExpediente = sanitizeName(expedienteNumero);
    if (sanitizedExpediente) {
        return `expediente-${sanitizedExpediente}`;
    }

    // Fallback final
    return 'sin-resolucion';
}

module.exports = {
    getFullPath,
    sanitizeName,
    getResolutionFolder
};
