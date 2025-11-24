// app/config/pathConfig.js
/**
 * Configuración de rutas para aplicación portable
 * 
 * Este módulo determina las rutas de almacenamiento de datos de la aplicación.
 * En modo portable, todos los datos se guardan en una carpeta 'data' junto al ejecutable.
 * En modo desarrollo, se mantiene el comportamiento por defecto de Electron.
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Determina si la aplicación está ejecutándose como portable
 * @returns {boolean}
 */
function isPortable() {
    // La aplicación SIEMPRE usa modo portable (guarda datos junto al ejecutable)
    return true;
}

/**
 * Determina si estamos en modo desarrollo
 * @returns {boolean}
 */
function isDevelopment() {
    // En desarrollo, el ejecutable está en node_modules/electron/dist/
    return process.execPath.includes('node_modules');
}

/**
 * Obtiene la ruta base para almacenamiento de datos
 * @returns {string}
 */
function getDataPath() {
    if (isPortable()) {
        // Modo portable: carpeta 'data' junto al ejecutable
        const exePath = process.execPath;
        const exeDir = path.dirname(exePath);
        
        if (isDevelopment()) {
            // EN DESARROLLO: Usar carpeta data en la raíz del proyecto
            // Esto evita que se borre al recompilar dist/
            const projectRoot = path.join(__dirname, '..', '..');
            const dataPath = path.join(projectRoot, 'data');
            console.log('🔧 MODO DESARROLLO - Datos en:', dataPath);
            return dataPath;
        } else {
            // EN PRODUCCIÓN: Carpeta data junto al .exe
            const dataPath = path.join(exeDir, 'data');
            console.log('🎒 MODO PRODUCCIÓN - Datos en:', dataPath);
            return dataPath;
        }
    } else {
        // Modo desarrollo/instalado: usar userData por defecto
        return app.getPath('userData');
    }
}

/**
 * Obtiene la ruta para la base de datos
 * @returns {string}
 */
function getDatabasePath() {
    const dataPath = getDataPath();
    return path.join(dataPath, 'database');
}

/**
 * Obtiene la ruta para archivos PDF
 * @returns {string}
 */
function getFilesPath() {
    const dataPath = getDataPath();
    return path.join(dataPath, 'archivos-vehiculos');
}

/**
 * Asegura que todas las carpetas necesarias existan
 */
function ensureDirectories() {
    const dirs = [
        getDataPath(),
        getDatabasePath(),
        getFilesPath()
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Carpeta creada: ${dir}`);
        }
    });
}

/**
 * Inicializa la configuración de rutas
 * Debe llamarse antes de usar cualquier otra funcionalidad
 */
function initialize() {
    const devMode = isDevelopment() ? '🔧 DESARROLLO' : '🚀 PRODUCCIÓN';
    const portableMode = isPortable() ? '🎒 PORTABLE' : '💻 INSTALADO';
    const dataPath = getDataPath();
    
    console.log('========================================')
    console.log(`📂 Entorno: ${devMode}`);
    console.log(`📦 Modo: ${portableMode}`);
    console.log(`📍 Ruta de datos: ${dataPath}`);
    console.log(`🗄️  Base de datos: ${getDatabasePath()}`);
    console.log(`📄 Archivos PDF: ${getFilesPath()}`);
    console.log('========================================')
    
    ensureDirectories();
}

module.exports = {
    isPortable,
    isDevelopment,
    getDataPath,
    getDatabasePath,
    getFilesPath,
    ensureDirectories,
    initialize
};
