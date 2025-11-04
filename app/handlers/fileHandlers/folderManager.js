// app/handlers/fileHandlers/folderManager.js
/**
 * Gestor de Carpetas
 * 
 * Responsabilidades:
 * - Asegurar existencia de carpetas (crear si no existen)
 * - Limpiar carpetas vacías después de eliminaciones
 * - Gestión del directorio de datos
 * 
 * @module folderManager
 */

const fs = require('fs');
const path = require('path');

/**
 * Asegura que una carpeta exista, creándola si es necesario
 * 
 * @param {string} folderName - Nombre de la carpeta (relativo al dataDir)
 * @param {string} dataDir - Directorio base de datos
 * @returns {string} Ruta completa de la carpeta creada/existente
 * 
 * @example
 * ensureFolder('resolucion-123-2024', '/app/data')
 * // Retorna: '/app/data/resolucion-123-2024'
 */
function ensureFolder(folderName, dataDir) {
    const targetDir = path.join(dataDir, folderName);
    
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log('📁 Carpeta creada:', targetDir);
    }
    
    return targetDir;
}

/**
 * Limpia carpetas vacías después de eliminar archivos
 * 
 * Seguridad:
 * - Solo limpia carpetas dentro de dataDir
 * - No limpia la carpeta raíz (dataDir)
 * - Elimina solo si está completamente vacía
 * 
 * @param {string} filePath - Ruta del archivo eliminado
 * @param {string} dataDir - Directorio base de datos
 * 
 * @example
 * cleanupEmptyFolder('/app/data/resolucion-123/doc.pdf', '/app/data')
 * // Elimina '/app/data/resolucion-123' si está vacía
 */
function cleanupEmptyFolder(filePath, dataDir) {
    const folderPath = path.dirname(filePath);

    // Validaciones de seguridad
    if (!folderPath.startsWith(dataDir) || folderPath === dataDir) {
        console.log('🛡️ Carpeta protegida, no se limpia:', folderPath);
        return;
    }

    try {
        const remaining = fs.readdirSync(folderPath);
        
        if (remaining.length === 0) {
            fs.rmdirSync(folderPath, { recursive: false });
            console.log('🗑️ Carpeta vacía eliminada:', folderPath);
        } else {
            console.log('📂 Carpeta tiene archivos restantes:', remaining.length);
        }
    } catch (error) {
        console.warn('⚠️ No se pudo limpiar la carpeta:', folderPath, error.message);
    }
}

/**
 * Asegura que el directorio de datos raíz exista
 * 
 * @param {string} dataDir - Directorio base de datos
 */
function ensureDataDirectory(dataDir) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('📁 Directorio de datos creado:', dataDir);
    }
}

module.exports = {
    ensureFolder,
    cleanupEmptyFolder,
    ensureDataDirectory
};
