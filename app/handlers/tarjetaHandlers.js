// app/handlers/tarjetaHandlers.js
/**
 * Manejadores IPC para operaciones de Tarjetas
 * Define los canales de comunicación entre el renderer y el main process
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Este archivo ahora actúa como punto de entrada que exporta los handlers modulares.
 * La implementación real está en ./tarjetaHandlers/
 * 
 * Estructura modular:
 * - createHandler.js: Crear tarjetas
 * - readHandler.js: Consultar tarjetas
 * - updateHandler.js: Actualizar tarjetas
 * - deleteHandler.js: Eliminar tarjetas
 * - statsHandler.js: Estadísticas
 * - pdfHandler.js: Manejo de PDFs
 * - utils.js: Utilidades compartidas
 */

const TarjetaHandlers = require('./tarjetaHandlers/index');

module.exports = TarjetaHandlers;
