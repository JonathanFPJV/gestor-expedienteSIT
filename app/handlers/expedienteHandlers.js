// app/handlers/expedienteHandlers.js
/**
 * ExpedienteHandlers - Punto de Entrada
 * 
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * Este archivo ahora actúa como punto de entrada que exporta la clase orquestadora.
 * La implementación real está en ./expedienteHandlers/
 * 
 * Estructura modular:
 * - index.js: Clase orquestadora principal (ExpedienteHandlers)
 * - utils.js: Utilidades de mapeo y notificación
 * - readHandler.js: Operaciones de lectura (4 canales)
 * - createHandler.js: Operaciones de creación (2 canales)
 * - updateHandler.js: Operaciones de actualización (1 canal)
 * - deleteHandler.js: Operaciones de eliminación (1 canal)
 * - statsHandler.js: Estadísticas (1 canal)
 * 
 * Canales IPC totales: 9
 * - obtener-expediente-detalle
 * - obtener-todos-expedientes
 * - buscar-expediente
 * - obtener-info-eliminacion
 * - crear-expediente
 * - guardar-expediente (alias de crear)
 * - actualizar-expediente
 * - eliminar-expediente
 * - expediente:estadisticas
 * 
 * Funcionalidades:
 * - CRUD completo de expedientes
 * - Búsqueda y filtrado
 * - Estadísticas y métricas
 * - Eliminación en cascada (tarjetas + archivos)
 * - Notificaciones a ventanas (eventos IPC)
 * - Mapeo de compatibilidad con frontend legacy
 * 
 * @module expedienteHandlers
 */

const ExpedienteHandlers = require('./expedienteHandlers/index');

module.exports = ExpedienteHandlers;
