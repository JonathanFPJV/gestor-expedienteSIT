// app/handlers/dashboardHandlers/index.js
/**
 * Dashboard Handlers - Maneja comunicación IPC para el dashboard
 * 
 * Canales IPC: 6
 * - dashboard:get-stats
 * - dashboard:get-chart
 * - dashboard:get-filters
 * - dashboard:apply-filters
 * - dashboard:clear-cache
 * - dashboard:export
 * 
 * @module dashboardHandlers
 */

const { ipcMain } = require('electron');
const dashboardService = require('../../services/dashboardService');

/**
 * Registra todos los handlers del dashboard
 */
function registerDashboardHandlers() {
    console.log('📊 Registrando handlers del dashboard...');

    /**
     * Obtener estadísticas generales
     * @param {Object} filters - Filtros opcionales
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:get-stats', async (event, filters = {}) => {
        try {
            console.log('📊 [IPC] dashboard:get-stats - Filtros:', filters);
            const stats = await dashboardService.getDashboardStats(filters);
            return { success: true, data: stats };
        } catch (error) {
            console.error('❌ Error en dashboard:get-stats:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener datos de un gráfico específico
     * @param {string} chartType - Tipo de gráfico
     * @param {Object} filters - Filtros opcionales
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:get-chart', async (event, chartType, filters = {}) => {
        try {
            console.log(`📈 [IPC] dashboard:get-chart - Tipo: ${chartType}, Filtros:`, filters);
            const chartData = await dashboardService.getChartData(chartType, filters);
            return { success: true, data: chartData };
        } catch (error) {
            console.error(`❌ Error en dashboard:get-chart (${chartType}):`, error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener todos los gráficos
     * @param {Object} filters - Filtros opcionales
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:get-all-charts', async (event, filters = {}) => {
        try {
            console.log('📈 [IPC] dashboard:get-all-charts - Filtros:', filters);
            const charts = await dashboardService.getAllCharts(filters);
            return { success: true, data: charts };
        } catch (error) {
            console.error('❌ Error en dashboard:get-all-charts:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener opciones de filtros disponibles
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:get-filters', async () => {
        try {
            console.log('🔍 [IPC] dashboard:get-filters');
            const filters = await dashboardService.getFilterOptions();
            return { success: true, data: filters };
        } catch (error) {
            console.error('❌ Error en dashboard:get-filters:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Aplicar filtros y obtener todo actualizado
     * @param {Object} filters - Filtros a aplicar
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:apply-filters', async (event, filters) => {
        try {
            console.log('🔍 [IPC] dashboard:apply-filters - Filtros:', filters);
            const result = await dashboardService.applyFilters(filters);
            return { success: true, data: result };
        } catch (error) {
            console.error('❌ Error en dashboard:apply-filters:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Limpiar caché del dashboard
     * @returns {Object} { success } o { success, error }
     */
    ipcMain.handle('dashboard:clear-cache', async () => {
        try {
            console.log('🧹 [IPC] dashboard:clear-cache');
            dashboardService.clearCache();
            return { success: true };
        } catch (error) {
            console.error('❌ Error en dashboard:clear-cache:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Exportar datos del dashboard
     * @param {string} format - Formato de exportación ('json', 'csv')
     * @param {Object} filters - Filtros aplicados
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:export', async (event, format = 'json', filters = {}) => {
        try {
            console.log(`📤 [IPC] dashboard:export - Formato: ${format}`);
            const exportData = await dashboardService.exportData(format, filters);
            return { success: true, data: exportData };
        } catch (error) {
            console.error('❌ Error en dashboard:export:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener dashboard completo (stats + charts + filters)
     * @param {Object} filters - Filtros opcionales
     * @returns {Object} { success, data } o { success, error }
     */
    ipcMain.handle('dashboard:get-full', async (event, filters = {}) => {
        try {
            console.log('[IPC] dashboard:get-full - Filtros:', filters);
          
            const [stats, charts, filterOptions] = await Promise.all([
                dashboardService.getDashboardStats(filters),
                dashboardService.getAllCharts(filters),
                dashboardService.getFilterOptions()
            ]);

            return {
                success: true,
                data: {
                    stats,
                    charts,
                    filterOptions,
                    filtrosAplicados: filters,
                    generatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error en dashboard:get-full:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('✅ Handlers del dashboard registrados (8 canales)');
}

/**
 * Lista de canales IPC registrados
 */
const registeredChannels = [
    'dashboard:get-stats',
    'dashboard:get-chart',
    'dashboard:get-all-charts',
    'dashboard:get-filters',
    'dashboard:apply-filters',
    'dashboard:clear-cache',
    'dashboard:export',
    'dashboard:get-full'
];

module.exports = { 
    registerDashboardHandlers,
    registeredChannels
};
