// app/services/actaEntregaService.js
/**
 * ActaEntregaService - Punto de Entrada
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Módulos especializados:
 * - actaManager: CRUD de actas
 * - tarjetaManager: Gestión de tarjetas
 * - pdfManager: Manejo de PDFs
 * - statsManager: Estadísticas
 * - queries: Consultas SQL centralizadas
 * - utils: Utilidades compartidas
 */

const ActaEntregaService = require('./actaEntregaService/index');
module.exports = ActaEntregaService;
