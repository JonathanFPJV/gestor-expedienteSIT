// app/services/expedienteService.js
/**
 * ExpedienteService - Punto de Entrada
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Módulos especializados:
 * - expedienteManager: CRUD de expedientes
 * - tarjetaManager: Gestión de tarjetas asociadas
 * - actaEntregaManager: Gestión de actas de entrega
 * - pdfManager: Manejo de PDFs
 * - deletionManager: Eliminación en cascada
 * - queries: Consultas SQL centralizadas
 * - utils: Utilidades compartidas
 */

const ExpedienteService = require('./expedienteService/index');
module.exports = ExpedienteService;
