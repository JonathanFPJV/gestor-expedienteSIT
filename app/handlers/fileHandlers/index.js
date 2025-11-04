// app/handlers/fileHandlers/index.js
/**
 * FileHandlers - Clase Orquestadora
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Esta clase coordina todos los módulos de gestión de archivos.
 * 
 * Módulos coordinados:
 * - pathUtils: Rutas y nombres sanitizados
 * - folderManager: Gestión de carpetas
 * - dialogManager: Diálogos de usuario
 * - pdfFileManager: Operaciones con PDFs
 * 
 * Responsabilidad Principal:
 * - Coordinar módulos
 * - Mantener estado (dataDir)
 * - Proveer API unificada
 * 
 * @class FileHandlers
 */

const pathConfig = require('../../config/pathConfig');
const { getFullPath, sanitizeName, getResolutionFolder } = require('./pathUtils');
const { ensureFolder, ensureDataDirectory } = require('./folderManager');
const { openPdfDialog } = require('./dialogManager');
const { savePdf, openPdf, deletePdf } = require('./pdfFileManager');

class FileHandlers {
    /**
     * Crea una instancia de FileHandlers
     * 
     * @param {Electron.App} appInstance - Instancia de la aplicación Electron
     */
    constructor(appInstance) {
        this.app = appInstance;
        
        // Usar pathConfig para obtener la ruta de archivos (portable o estándar)
        this.dataDir = pathConfig.getFilesPath();
        
        // Asegurar que la carpeta raíz exista
        ensureDataDirectory(this.dataDir);
        
        console.log('📁 FileHandlers inicializado. DataDir:', this.dataDir);
    }

    // ============================================
    // MÓDULO: PATH UTILS
    // ============================================

    /**
     * Obtiene la ruta completa de un archivo
     * Delega a pathUtils.getFullPath()
     * 
     * @param {string} fileName - Nombre o ruta del archivo
     * @returns {string|null} Ruta completa o null
     */
    getFullPath(fileName) {
        return getFullPath(fileName, this.dataDir);
    }

    /**
     * Sanitiza un nombre de archivo o carpeta
     * Delega a pathUtils.sanitizeName()
     * 
     * @param {string} name - Nombre a sanitizar
     * @returns {string|null} Nombre sanitizado o null
     */
    sanitizeName(name) {
        return sanitizeName(name);
    }

    /**
     * Genera el nombre de carpeta para una resolución
     * Delega a pathUtils.getResolutionFolder()
     * 
     * @param {string} resolutionNumber - Número de resolución
     * @param {string} expedienteNumero - Número de expediente (fallback)
     * @returns {string} Nombre de carpeta sanitizado
     */
    getResolutionFolder(resolutionNumber, expedienteNumero) {
        return getResolutionFolder(resolutionNumber, expedienteNumero);
    }

    // ============================================
    // MÓDULO: FOLDER MANAGER
    // ============================================

    /**
     * Asegura que una carpeta exista
     * Delega a folderManager.ensureFolder()
     * 
     * @param {string} folderName - Nombre de la carpeta
     * @returns {string} Ruta completa de la carpeta
     */
    ensureFolder(folderName) {
        return ensureFolder(folderName, this.dataDir);
    }

    // ============================================
    // MÓDULO: DIALOG MANAGER
    // ============================================

    /**
     * Abre un diálogo para seleccionar un archivo PDF
     * Delega a dialogManager.openPdfDialog()
     * 
     * @returns {Promise<string|null>} Ruta del archivo seleccionado o null
     */
    async openPdfDialog() {
        return openPdfDialog();
    }

    // ============================================
    // MÓDULO: PDF FILE MANAGER
    // ============================================

    /**
     * Guarda un archivo PDF en el sistema
     * Delega a pdfFileManager.savePdf()
     * 
     * @param {string} filePath - Ruta del archivo origen
     * @param {string} fileName - Nombre para el archivo destino
     * @param {Object} options - Opciones (resolutionNumber, expedienteNumero)
     * @returns {Promise<Object>} Resultado con success, path y folder
     */
    savePdf(filePath, fileName, options = {}) {
        return savePdf(
            filePath, 
            fileName, 
            options, 
            getResolutionFolder,  // Inyectar función
            ensureFolder,         // Inyectar función
            this.dataDir
        );
    }

    /**
     * Abre un archivo PDF con la aplicación predeterminada
     * Delega a pdfFileManager.openPdf()
     * 
     * @param {string} fileName - Nombre o ruta del archivo
     */
    openPdf(fileName) {
        const fullPath = this.getFullPath(fileName);
        return openPdf(fullPath);
    }

    /**
     * Elimina un archivo PDF del sistema
     * Delega a pdfFileManager.deletePdf()
     * 
     * @param {string} fileName - Nombre o ruta del archivo
     * @returns {Promise<Object>} Resultado con success, path o message
     */
    deletePdf(fileName) {
        const fullPath = this.getFullPath(fileName);
        return deletePdf(fullPath, this.dataDir);
    }
}

module.exports = FileHandlers;
