// src/js/modules/dashboard/dashboardManager.js
// Gestor principal del Dashboard con actualizaciones reactivas

import { eventBus, APP_EVENTS } from '../eventBus.js';

export class DashboardManager {
    constructor() {
        this.charts = {};
        this.currentFilters = {};
        this.isLoading = false;
        this.lastUpdate = null;
        this.autoRefreshInterval = null;
        
        // Colores SIT
        this.sitColors = {
            orange: '#FF7F27',
            orangeLight: '#FFA055',
            green: '#00A651',
            greenLight: '#00C75F',
            blue: '#006699',
            blueLight: '#0080BB',
            yellow: '#FFC107',
            red: '#DC3545',
            gray: '#6C757D'
        };
        
        // Paleta de colores para gráficos
        this.chartPalette = [
            this.sitColors.orange,
            this.sitColors.blue,
            this.sitColors.green,
            this.sitColors.yellow,
            this.sitColors.orangeLight,
            this.sitColors.blueLight,
            this.sitColors.greenLight,
            this.sitColors.red,
            this.sitColors.gray
        ];
    }

    async initialize() {
        console.log('📊 Inicializando Dashboard Manager...');
        
        // Verificar que Chart.js esté disponible
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js no está cargado');
            return;
        }
        
        // Configurar defaults de Chart.js
        this.configureChartDefaults();
        
        // Cargar filtros disponibles
        await this.loadAvailableFilters();
        
        // Cargar datos iniciales
        await this.refreshDashboard();
        
        // Suscribirse a eventos de cambios
        this.subscribeToDataChanges();
        
        console.log('✅ Dashboard Manager inicializado');
    }

    configureChartDefaults() {
        Chart.defaults.font.family = "'Poppins', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#6C757D';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.padding = 15;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(51, 51, 51, 0.9)';
        Chart.defaults.plugins.tooltip.titleFont = { weight: 'bold' };
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 6;
    }

    subscribeToDataChanges() {
        // Eventos que disparan actualización del dashboard
        const updateEvents = [
            APP_EVENTS.TARJETA_CREATED,
            APP_EVENTS.TARJETA_UPDATED,
            APP_EVENTS.TARJETA_DELETED,
            APP_EVENTS.EXPEDIENTE_CREATED,
            APP_EVENTS.EXPEDIENTE_UPDATED,
            APP_EVENTS.EXPEDIENTE_DELETED,
            APP_EVENTS.ACTA_CREATED,
            APP_EVENTS.ACTA_UPDATED,
            APP_EVENTS.ACTA_DELETED
        ];
        
        updateEvents.forEach(event => {
            eventBus.on(event, () => {
                console.log(`📊 Evento detectado: ${event}, actualizando dashboard...`);
                // Solo actualizar si el dashboard está visible
                if (document.getElementById('vista-dashboard')?.classList.contains('active')) {
                    this.refreshDashboard();
                }
            });
        });
    }

    async loadAvailableFilters() {
        try {
            console.log('🔍 Solicitando filtros disponibles...');
            const filters = await window.api.dashboard.getFilters();
            console.log('🔍 Respuesta de getFilters:', JSON.stringify(filters, null, 2));
            if (filters.success) {
                console.log('✅ Filtros obtenidos correctamente, renderizando...');
                this.renderFilterOptions(filters.data);
            } else {
                console.error('❌ Error en respuesta de filtros:', filters.error);
            }
        } catch (error) {
            console.error('❌ Error cargando filtros:', error);
        }
    }

    renderFilterOptions(filterData) {
        console.log('🔍 Filtros recibidos:', filterData);
        
        // Renderizar años
        const anioSelect = document.getElementById('dashboard-filter-anio');
        if (anioSelect && filterData.anios) {
            anioSelect.innerHTML = '<option value="">Todos los años</option>';
            filterData.anios.forEach(item => {
                const value = item.value || item;
                const label = item.label || item;
                anioSelect.innerHTML += `<option value="${value}">${label}</option>`;
            });
            console.log('✅ Años renderizados:', filterData.anios.length);
        }
        
        // Renderizar unidades de negocio
        const unidadSelect = document.getElementById('dashboard-filter-unidad');
        if (unidadSelect && filterData.unidadesNegocio) {
            unidadSelect.innerHTML = '<option value="">Todas las unidades</option>';
            filterData.unidadesNegocio.forEach(item => {
                const value = item.value || item;
                const label = item.label || item;
                unidadSelect.innerHTML += `<option value="${value}">${label}</option>`;
            });
            console.log('✅ Unidades renderizadas:', filterData.unidadesNegocio.length);
        }
        
        // Renderizar estados
        const estadoSelect = document.getElementById('dashboard-filter-estado');
        if (estadoSelect && filterData.estados) {
            estadoSelect.innerHTML = '<option value="">Todos los estados</option>';
            filterData.estados.forEach(item => {
                const value = item.value || item;
                const label = item.label || value;
                estadoSelect.innerHTML += `<option value="${value}">${label}</option>`;
            });
            console.log('✅ Estados renderizados:', filterData.estados.length);
        }
        
        // Renderizar rangos predefinidos
        const rangoSelect = document.getElementById('dashboard-filter-rango');
        if (rangoSelect && filterData.rangos) {
            rangoSelect.innerHTML = '<option value="">Personalizado</option>';
            filterData.rangos.forEach(rango => {
                const key = rango.key || rango.value || rango;
                const label = rango.label || key;
                rangoSelect.innerHTML += `<option value="${key}">${label}</option>`;
            });
        }
    }

    async refreshDashboard() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            // Obtener todo el dashboard de una vez
            const result = await window.api.dashboard.getFull(this.currentFilters);
            
            if (result.success) {
                const { stats, charts, filters } = result.data;
                
                // Actualizar estadísticas
                this.updateStatsCards(stats);
                
                // Actualizar gráficos
                this.updateAllCharts(charts);
                
                // Actualizar indicador de tiempo
                this.lastUpdate = new Date();
                this.updateLastUpdateIndicator();
            }
        } catch (error) {
            console.error('Error actualizando dashboard:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    updateStatsCards(stats) {
        if (!stats) return;
        
        console.log('📊 Stats recibidas:', JSON.stringify(stats, null, 2));
        
        const resumen = stats.resumenGeneral || {};
        const tarjetas = stats.estadisticasTarjetas || {};
        const expedientes = stats.estadisticasExpedientes || {};
        
        console.log('📊 Tarjetas stats:', tarjetas);
        console.log('📊 Activas:', tarjetas.activas, '| Canceladas:', tarjetas.canceladas);
        
        // Total de tarjetas
        this.animateValue('stat-total-tarjetas', resumen.totalTarjetas || 0);
        
        // Tarjetas activas
        this.animateValue('stat-tarjetas-activas', tarjetas.activas || 0);
        
        // Total de expedientes
        this.animateValue('stat-total-expedientes', resumen.totalExpedientes || 0);
        
        // Entregas pendientes
        this.animateValue('stat-entregas-pendientes', resumen.entregasPendientes || 0);
        
        // Expedientes del mes
        const expedientesMes = expedientes.porMesActual || 0;
        this.animateValue('stat-expedientes-mes', expedientesMes);
        
        // Tarjetas canceladas
        this.animateValue('stat-tarjetas-canceladas', tarjetas.canceladas || 0);
    }

    animateValue(elementId, endValue, duration = 500) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = t => 1 - Math.pow(1 - t, 3);
            const currentValue = Math.round(startValue + (endValue - startValue) * easeOut(progress));
            
            element.textContent = currentValue.toLocaleString('es-PE');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    updateAllCharts(chartsData) {
        if (!chartsData) return;
        
        console.log('📊 Actualizando gráficos con datos:', Object.keys(chartsData));
        
        // Tarjetas por estado (Doughnut)
        if (chartsData.tarjetasPorEstado) {
            const chartInfo = chartsData.tarjetasPorEstado;
            this.updateChart('chart-tarjetas-estado', chartInfo.type || 'doughnut', chartInfo.data);
        }
        
        // Expedientes por mes (Bar)
        if (chartsData.expedientesPorMes) {
            const chartInfo = chartsData.expedientesPorMes;
            this.updateChart('chart-expedientes-mes', chartInfo.type || 'bar', chartInfo.data);
        }
        
        // Tarjetas por unidad de negocio (Bar horizontal)
        if (chartsData.tarjetasPorUnidadNegocio) {
            const chartInfo = chartsData.tarjetasPorUnidadNegocio;
            this.updateChart('chart-tarjetas-unidad', chartInfo.type || 'bar', chartInfo.data, {
                indexAxis: 'y'
            });
        }
        
        // Comparativa mensual (Line)
        if (chartsData.comparativaMensual) {
            const chartInfo = chartsData.comparativaMensual;
            this.updateChart('chart-comparativa', chartInfo.type || 'line', chartInfo.data);
        }
        
        // Entregas (Pie)
        if (chartsData.entregas) {
            const chartInfo = chartsData.entregas;
            this.updateChart('chart-entregas', chartInfo.type || 'pie', chartInfo.data);
        }
        
        // Expedientes por año (Bar)
        if (chartsData.expedientesPorAnio) {
            const chartInfo = chartsData.expedientesPorAnio;
            this.updateChart('chart-expedientes-anio', chartInfo.type || 'bar', chartInfo.data);
        }
    }

    updateChart(canvasId, type, chartData, extraOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`⚠️ Canvas no encontrado: ${canvasId}`);
            return;
        }
        
        // Validar datos
        if (!chartData || !chartData.labels) {
            console.warn(`⚠️ Datos inválidos para ${canvasId}:`, chartData);
            return;
        }
        
        console.log(`📈 Renderizando gráfico ${canvasId}:`, { type, labels: chartData.labels?.length, datasets: chartData.datasets?.length });
        
        const ctx = canvas.getContext('2d');
        
        // Destruir chart existente
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Los datasets ya vienen preparados del backend
        const datasets = chartData.datasets || [];
        
        // Si no hay colores, aplicar paleta SIT
        datasets.forEach((ds, index) => {
            if (!ds.backgroundColor) {
                if (type === 'line') {
                    ds.backgroundColor = this.chartPalette[index % this.chartPalette.length];
                    ds.borderColor = this.chartPalette[index % this.chartPalette.length];
                } else if (type === 'doughnut' || type === 'pie') {
                    ds.backgroundColor = this.chartPalette.slice(0, ds.data?.length || 5);
                    ds.borderColor = '#ffffff';
                } else {
                    ds.backgroundColor = this.chartPalette[index % this.chartPalette.length];
                    ds.borderColor = this.chartPalette[index % this.chartPalette.length];
                }
            }
        });
        
        // Opciones base
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: type === 'doughnut' || type === 'pie' || type === 'line',
                    position: 'bottom'
                }
            }
        };
        
        // Opciones específicas por tipo
        if (type === 'bar') {
            baseOptions.scales = {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            };
        }
        
        if (type === 'line') {
            baseOptions.scales = {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            };
            baseOptions.elements = {
                line: {
                    tension: 0.3
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            };
        }
        
        if (type === 'doughnut' || type === 'pie') {
            baseOptions.cutout = type === 'doughnut' ? '60%' : 0;
        }
        
        // Crear chart
        this.charts[canvasId] = new Chart(ctx, {
            type,
            data: {
                labels: chartData.labels || [],
                datasets
            },
            options: { ...baseOptions, ...extraOptions }
        });
        
        console.log(`✅ Gráfico ${canvasId} renderizado`);
    }

    prepareDatasets(data, type) {
        if (!data.datasets) {
            // Datos simples (sin datasets anidados)
            return [{
                data: data.data || [],
                backgroundColor: type === 'line' 
                    ? this.sitColors.orange 
                    : this.chartPalette.slice(0, (data.data || []).length),
                borderColor: type === 'line' 
                    ? this.sitColors.orange 
                    : this.chartPalette.slice(0, (data.data || []).length),
                borderWidth: type === 'line' ? 2 : 1,
                fill: type === 'line' ? false : undefined
            }];
        }
        
        // Múltiples datasets
        return data.datasets.map((ds, index) => ({
            ...ds,
            backgroundColor: ds.backgroundColor || this.chartPalette[index % this.chartPalette.length],
            borderColor: ds.borderColor || this.chartPalette[index % this.chartPalette.length],
            borderWidth: ds.borderWidth || (type === 'line' ? 2 : 1),
            fill: type === 'line' ? false : undefined
        }));
    }

    applyFilters() {
        const filters = {};
        
        const anio = document.getElementById('dashboard-filter-anio')?.value;
        const unidad = document.getElementById('dashboard-filter-unidad')?.value;
        const estado = document.getElementById('dashboard-filter-estado')?.value;
        const fechaDesde = document.getElementById('dashboard-filter-fecha-desde')?.value;
        const fechaHasta = document.getElementById('dashboard-filter-fecha-hasta')?.value;
        
        if (anio) filters.anio = parseInt(anio);
        if (unidad) filters.unidadNegocio = unidad;
        if (estado) filters.estado = estado;
        if (fechaDesde) filters.fechaDesde = fechaDesde;
        if (fechaHasta) filters.fechaHasta = fechaHasta;
        
        this.currentFilters = filters;
        this.refreshDashboard();
        
        // Mostrar indicador de filtros activos
        this.updateActiveFiltersIndicator();
    }

    clearFilters() {
        // Resetear todos los selects
        const filterIds = ['dashboard-filter-anio', 'dashboard-filter-unidad', 'dashboard-filter-estado', 'dashboard-filter-fecha-desde', 'dashboard-filter-fecha-hasta', 'dashboard-filter-rango'];
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        this.currentFilters = {};
        this.refreshDashboard();
        this.updateActiveFiltersIndicator();
    }

    updateActiveFiltersIndicator() {
        const filterCount = Object.keys(this.currentFilters).length;
        const indicator = document.getElementById('active-dashboard-filters-count');
        if (indicator) {
            indicator.textContent = filterCount > 0 ? `(${filterCount})` : '';
            indicator.style.display = filterCount > 0 ? 'inline' : 'none';
        }
    }

    showLoadingState() {
        document.querySelectorAll('.chart-loading').forEach(el => {
            el.style.display = 'flex';
        });
    }

    hideLoadingState() {
        document.querySelectorAll('.chart-loading').forEach(el => {
            el.style.display = 'none';
        });
    }

    showErrorState() {
        // Mostrar mensaje de error en los gráficos
        document.querySelectorAll('.chart-body').forEach(el => {
            const loading = el.querySelector('.chart-loading');
            if (loading) {
                loading.innerHTML = `
                    <span style="font-size: 2rem;">⚠️</span>
                    <span>Error al cargar datos</span>
                `;
            }
        });
    }

    updateLastUpdateIndicator() {
        const indicator = document.getElementById('last-update-time');
        if (indicator && this.lastUpdate) {
            const timeStr = this.lastUpdate.toLocaleTimeString('es-PE', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            indicator.textContent = timeStr;
        }
    }

    async exportDashboard(format = 'json') {
        try {
            const result = await window.api.dashboard.export(format, this.currentFilters);
            if (result.success) {
                // Crear y descargar archivo
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dashboard-sit-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error exportando dashboard:', error);
        }
    }

    toggleFiltersPanel() {
        const content = document.querySelector('.filters-content');
        const toggle = document.querySelector('.filters-toggle');
        if (content && toggle) {
            content.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        }
    }

    destroy() {
        // Destruir todos los charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        
        // Limpiar intervalo de auto-refresh
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// Singleton
export const dashboardManager = new DashboardManager();
