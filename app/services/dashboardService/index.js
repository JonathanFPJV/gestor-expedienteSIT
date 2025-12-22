// app/services/dashboardService/index.js
/**
 * Dashboard Service - Punto de entrada principal
 * Centraliza todas las operaciones del dashboard
 * 
 * @module dashboardService
 */

const statsCalculator = require('./statsCalculator');
const chartDataBuilder = require('./chartDataBuilder');
const filterManager = require('./filterManager');

class DashboardService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Obtiene todas las estadísticas del dashboard
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Estadísticas completas
     */
    async getDashboardStats(filters = {}) {
        const sanitizedFilters = filterManager.sanitizeFilters(filters);
        const cacheKey = `stats_${JSON.stringify(sanitizedFilters)}`;
        
        // Verificar caché
        if (this.isCacheValid(cacheKey)) {
            console.log('📊 Dashboard stats desde caché');
            return this.cache.get(cacheKey).data;
        }

        try {
            console.log('📊 Calculando estadísticas del dashboard con filtros:', sanitizedFilters);
            
            const [
                resumenGeneral,
                estadisticasTarjetas,
                estadisticasExpedientes,
                tendencias
            ] = await Promise.all([
                statsCalculator.getResumenGeneral(sanitizedFilters),
                statsCalculator.getEstadisticasTarjetas(sanitizedFilters),
                statsCalculator.getEstadisticasExpedientes(sanitizedFilters),
                statsCalculator.getTendencias(sanitizedFilters)
            ]);

            const result = {
                resumenGeneral,
                estadisticasTarjetas,
                estadisticasExpedientes,
                tendencias,
                filtrosAplicados: sanitizedFilters,
                generatedAt: new Date().toISOString()
            };

            // Guardar en caché
            this.setCache(cacheKey, result);
            
            console.log('✅ Estadísticas calculadas correctamente');
            return result;
        } catch (error) {
            console.error('❌ Error obteniendo stats del dashboard:', error);
            throw error;
        }
    }

    /**
     * Obtiene datos formateados para gráficos
     * @param {string} chartType - Tipo de gráfico
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Datos del gráfico
     */
    async getChartData(chartType, filters = {}) {
        const sanitizedFilters = filterManager.sanitizeFilters(filters);
        
        try {
            console.log(`📈 Generando datos para gráfico: ${chartType}`);
            return await chartDataBuilder.buildChartData(chartType, sanitizedFilters);
        } catch (error) {
            console.error(`❌ Error obteniendo datos para gráfico ${chartType}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene opciones de filtros disponibles
     * @returns {Promise<Object>} Opciones de filtros
     */
    async getFilterOptions() {
        try {
            return await filterManager.getAvailableFilters();
        } catch (error) {
            console.error('❌ Error obteniendo opciones de filtros:', error);
            throw error;
        }
    }

    /**
     * Aplica filtros y retorna datos actualizados
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>} Dashboard filtrado
     */
    async applyFilters(filters) {
        // Invalidar caché al aplicar nuevos filtros
        this.clearCache();
        
        const sanitizedFilters = filterManager.sanitizeFilters(filters);
        
        try {
            const [stats, charts] = await Promise.all([
                this.getDashboardStats(sanitizedFilters),
                this.getAllCharts(sanitizedFilters)
            ]);

            return {
                stats,
                charts,
                filtrosAplicados: sanitizedFilters
            };
        } catch (error) {
            console.error('❌ Error aplicando filtros:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los gráficos disponibles
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Todos los gráficos
     */
    async getAllCharts(filters = {}) {
        const chartTypes = [
            'tarjetasPorEstado',
            'expedientesPorMes',
            'expedientesPorAnio',
            'entregas',
            'tarjetasPorMes',
            'tarjetasPorUnidadNegocio',
            'expedientesPorUnidadNegocio'
        ];

        const charts = {};
        
        for (const chartType of chartTypes) {
            try {
                charts[chartType] = await this.getChartData(chartType, filters);
            } catch (error) {
                console.warn(`⚠️ Error obteniendo gráfico ${chartType}:`, error.message);
                charts[chartType] = null;
            }
        }

        return charts;
    }

    /**
     * Exporta datos del dashboard
     * @param {string} format - Formato de exportación ('json', 'csv')
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Datos exportados
     */
    async exportData(format = 'json', filters = {}) {
        const stats = await this.getDashboardStats(filters);
        
        if (format === 'json') {
            return {
                format: 'json',
                data: JSON.stringify(stats, null, 2),
                filename: `dashboard_export_${new Date().toISOString().split('T')[0]}.json`
            };
        }
        
        // Para CSV, convertir a formato tabular
        if (format === 'csv') {
            return {
                format: 'csv',
                data: this.convertToCSV(stats),
                filename: `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`
            };
        }
        
        return { format: 'json', data: stats };
    }

    /**
     * Convierte estadísticas a formato CSV
     * @param {Object} stats - Estadísticas a convertir
     * @returns {string} Datos en formato CSV
     */
    convertToCSV(stats) {
        const lines = [];
        lines.push('Métrica,Valor');
        lines.push(`Total Expedientes,${stats.resumenGeneral.totalExpedientes}`);
        lines.push(`Total Tarjetas,${stats.resumenGeneral.totalTarjetas}`);
        lines.push(`Tarjetas Entregadas,${stats.resumenGeneral.tarjetasEntregadas}`);
        lines.push(`Tarjetas Pendientes,${stats.resumenGeneral.tarjetasPendientes}`);
        lines.push(`Total Actas,${stats.resumenGeneral.totalActas}`);
        lines.push(`Porcentaje Entregadas,${stats.resumenGeneral.porcentajeEntregadas}%`);
        return lines.join('\n');
    }

    // Métodos de caché
    isCacheValid(key) {
        if (!this.cache.has(key)) return false;
        const cached = this.cache.get(key);
        return Date.now() - cached.timestamp < this.cacheExpiry;
    }

    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    clearCache() {
        this.cache.clear();
        console.log('🧹 Caché del dashboard limpiado');
    }
}

module.exports = new DashboardService();
