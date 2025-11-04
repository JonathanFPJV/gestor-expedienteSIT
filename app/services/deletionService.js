// app/services/deletionService.js
/**
 * DeletionService - Punto de Entrada
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Módulos especializados:
 * - expedienteManager: Obtención y validación de expedientes
 * - tarjetaManager: Gestión de tarjetas
 * - fileCleanupManager: Limpieza de archivos PDF
 * - cascadeManager: Orquestación de eliminación en cascada
 * - notificationManager: Notificaciones a ventanas
 * - queries: Consultas SQL centralizadas
 * - utils: Utilidades compartidas
 */

const DeletionService = require('./deletionService/index');
module.exports = DeletionService;
