// app/handlers/actaEntregaHandlers.js
/**
 * ActaEntregaHandlers - Punto de Entrada
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Este archivo ahora actúa como punto de entrada que exporta la clase orquestadora.
 * La implementación real está en ./actaEntregaHandlers/
 * 
 * Estructura modular:
 * - index.js: Clase orquestadora principal (ActaEntregaHandlers)
 * - utils.js: Utilidades de broadcast y manejo de errores
 * - readHandler.js: Operaciones de lectura (5 canales)
 * - createHandler.js: Operaciones de creación (1 canal)
 * - updateHandler.js: Operaciones de actualización (1 canal)
 * - deleteHandler.js: Operaciones de eliminación (1 canal)
 * - statsHandler.js: Estadísticas (1 canal)
 * - pdfHandler.js: Operaciones con PDFs (2 canales)
 * 
 * Canales IPC totales: 11
 * - acta-entrega:obtener-todas
 * - acta-entrega:obtener-por-id
 * - acta-entrega:buscar
 * - acta-entrega:tarjetas-disponibles
 * - acta-entrega:info-eliminar
 * - acta-entrega:crear
 * - acta-entrega:actualizar
 * - acta-entrega:eliminar
 * - acta-entrega:estadisticas
 * - acta-entrega:seleccionar-pdf
 * - acta-entrega:abrir-pdf
 * 
 * Funcionalidades:
 * - CRUD completo de actas de entrega
 * - Gestión de tarjetas asociadas
 * - Búsqueda y filtrado
 * - Estadísticas y métricas
 * - Operaciones con archivos PDF
 * - Notificaciones broadcast a ventanas
 * 
 * @module actaEntregaHandlers
 */

const ActaEntregaHandlers = require('./actaEntregaHandlers/index');

module.exports = ActaEntregaHandlers;

