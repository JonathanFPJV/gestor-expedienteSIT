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
    // SIEMPRE PORTABLE: La aplicación SIEMPRE guarda datos junto al ejecutable
    // tanto en desarrollo como en producción
    return true;
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
        return path.join(exeDir, 'data');
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
    const mode = isPortable() ? '🎒 PORTABLE' : '💻 DESARROLLO/INSTALADO';
    const dataPath = getDataPath();
    
    console.log('========================================');
    console.log(`📂 Modo de ejecución: ${mode}`);
    console.log(`📍 Ruta de datos: ${dataPath}`);
    console.log(`🗄️  Base de datos: ${getDatabasePath()}`);
    console.log(`📄 Archivos PDF: ${getFilesPath()}`);
    console.log('========================================');
    
    ensureDirectories();
}

module.exports = {
    isPortable,
    getDataPath,
    getDatabasePath,
    getFilesPath,
    ensureDirectories,
    initialize
};
