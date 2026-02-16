// app/services/tarjetaService.js
/**
 * TarjetaService - Punto de Entrada
 * REFACTORIZADO - Arquitectura Limpia
 * 
 * Módulos especializados:
 * - tarjetaManager: CRUD de tarjetas
 * - pdfManager: Manejo de PDFs
 * - statsManager: Estadísticas
 * - queries: Consultas SQL centralizadas
 * - utils: Utilidades compartidas
 */

const TarjetaService = require('./tarjetaService/index');
module.exports = TarjetaService;
