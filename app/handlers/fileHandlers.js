// app/handlers/fileHandlers.js
/**
 * FileHandlers - Punto de Entrada
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Este archivo ahora actúa como punto de entrada que exporta la clase orquestadora.
 * La implementación real está en ./fileHandlers/
 * 
 * Estructura modular:
 * - index.js: Clase orquestadora principal (FileHandlers)
 * - pathUtils.js: Utilidades de rutas y nombres sanitizados
 * - folderManager.js: Gestión de carpetas (crear, limpiar)
 * - dialogManager.js: Diálogos de usuario (PDF, errores)
 * - pdfFileManager.js: Operaciones con archivos PDF (guardar, abrir, eliminar)
 * 
 * Funcionalidades:
 * - Gestión de rutas absolutas y relativas
 * - Sanitización de nombres de archivos
 * - Organización en carpetas por resolución/expediente
 * - Diálogos de selección de archivos
 * - Operaciones CRUD sobre archivos PDF
 * - Limpieza automática de carpetas vacías
 * 
 * @module fileHandlers
 */

const FileHandlers = require('./fileHandlers/index');

module.exports = FileHandlers;