// app/handlers/ipcHandlers.js
/**
 * Orquestador de Handlers IPC
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Este archivo ahora actúa como punto de entrada que exporta el orquestador modular.
 * La implementación real está en ./ipcHandlers/
 * 
 * Estructura modular:
 * - index.js: Orquestador principal que coordina todos los handlers
 * - windowHandlers.js: Gestión de ventanas (abrir, cerrar, enfocar)
 * - pdfHandlers.js: Operaciones con PDFs (abrir, leer, descargar)
 * - deletionHandlers.js: Eliminaciones complejas con cascada
 * 
 * Handlers de entidades (en archivos separados):
 * - expedienteHandlers.js: CRUD de expedientes (7 canales)
 * - tarjetaHandlers.js: CRUD de tarjetas (13+ canales)
 * - actaEntregaHandlers.js: CRUD de actas de entrega (10+ canales)
 * 
 * @module ipcHandlers
 */

const { registerIpcHandlers } = require('./ipcHandlers/index');

module.exports = { registerIpcHandlers };