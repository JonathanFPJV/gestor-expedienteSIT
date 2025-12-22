// app/services/dashboardService/chartDataBuilder.js
/**
 * Chart Data Builder - Construye datos formateados para gráficos
 * Compatible con Chart.js
 * 
 * @module dashboardService/chartDataBuilder
 */

const db = require('../../db/database');

class ChartDataBuilder {
    /**
     * Colores predefinidos para gráficos
     */
    get colors() {
        return {
            primary: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
            success: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
            warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
            danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
            info: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
            neutral: ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
            estados: {
                'ACTIVA': '#10b981',
                'ENTREGADA': '#3b82f6',
                'PENDIENTE': '#f59e0b',
                'ANULADA': '#ef4444',
                'Sin Estado': '#6b7280'
            }
        };
    }

    /**
     * Nombres de meses en español
     */
    get meses() {
        return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    }

    /**
     * Construye datos según el tipo de gráfico
     * @param {string} chartType - Tipo de gráfico
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Datos del gráfico
     */
    async buildChartData(chartType, filters = {}) {
        const builders = {
            'tarjetasPorEstado': () => this.buildTarjetasPorEstado(filters),
            'expedientesPorMes': () => this.buildExpedientesPorMes(filters),
            'expedientesPorAnio': () => this.buildExpedientesPorAnio(filters),
            'entregas': () => this.buildEntregas(filters),
            'tarjetasPorMes': () => this.buildTarjetasPorMes(filters),
            'comparativaMensual': () => this.buildComparativaMensual(filters),
            'topPlacas': () => this.buildTopPlacas(filters),
            'tarjetasPorUnidadNegocio': () => this.buildTarjetasPorUnidadNegocio(filters),
            'expedientesPorUnidadNegocio': () => this.buildExpedientesPorUnidadNegocio(filters)
        };

        if (!builders[chartType]) {
            throw new Error(`Tipo de gráfico no soportado: ${chartType}`);
        }

        return await builders[chartType]();
    }

    /**
     * Tarjetas por estado (Doughnut chart)
     */
    async buildTarjetasPorEstado(filters) {
        try {
            let query = `
                SELECT 
                    COALESCE(t.estado, 'Sin Estado') as estado,
                    COUNT(t._id) as cantidad
                FROM TarjetasVehiculos t
            `;

            const params = [];
            const conditions = [];

            if (filters.anio || filters.unidadNegocio) {
                query += ` LEFT JOIN ActasResolucion e ON t.resolucionId = e._id`;
                
                if (filters.anio) {
                    conditions.push(`e.anioExpediente = ?`);
                    params.push(filters.anio);
                }
                if (filters.unidadNegocio) {
                    conditions.push(`e.unidadNegocio = ?`);
                    params.push(filters.unidadNegocio);
                }
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` GROUP BY t.estado ORDER BY cantidad DESC`;

            const data = db.db.prepare(query).all(...params);

            return {
                type: 'doughnut',
                title: 'Tarjetas por Estado',
                data: {
                    labels: data.map(r => r.estado),
                    datasets: [{
                        data: data.map(r => r.cantidad),
                        backgroundColor: data.map(r => this.colors.estados[r.estado] || this.colors.neutral[0]),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildTarjetasPorEstado:', error);
            throw error;
        }
    }

    /**
     * Expedientes por mes (Bar chart)
     */
    async buildExpedientesPorMes(filters) {
        try {
            const anio = filters.anio || new Date().getFullYear();
            
            let query = `
                SELECT 
                    CAST(strftime('%m', fechaExpediente) AS INTEGER) as mes,
                    COUNT(*) as cantidad
                FROM ActasResolucion
                WHERE anioExpediente = ?
            `;
            const params = [anio];

            if (filters.unidadNegocio) {
                query += ` AND unidadNegocio = ?`;
                params.push(filters.unidadNegocio);
            }

            query += ` GROUP BY mes ORDER BY mes ASC`;

            const rows = db.db.prepare(query).all(...params);

            // Crear array con 12 meses (0 si no hay datos)
            const dataPorMes = new Array(12).fill(0);
            rows.forEach(r => {
                dataPorMes[r.mes - 1] = r.cantidad;
            });

            return {
                type: 'bar',
                title: `Expedientes por Mes - ${anio}`,
                data: {
                    labels: this.meses,
                    datasets: [{
                        label: `Expedientes ${anio}`,
                        data: dataPorMes,
                        backgroundColor: this.colors.primary[0],
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildExpedientesPorMes:', error);
            throw error;
        }
    }

    /**
     * Expedientes por año (Line chart)
     */
    async buildExpedientesPorAnio(filters) {
        try {
            let query = `
                SELECT 
                    anioExpediente as anio,
                    COUNT(*) as cantidad
                FROM ActasResolucion
            `;
            const params = [];

            if (filters.unidadNegocio) {
                query += ` WHERE unidadNegocio = ?`;
                params.push(filters.unidadNegocio);
            }

            query += ` GROUP BY anioExpediente ORDER BY anio ASC`;

            const data = db.db.prepare(query).all(...params);

            return {
                type: 'line',
                title: 'Expedientes por Año',
                data: {
                    labels: data.map(r => r.anio.toString()),
                    datasets: [{
                        label: 'Expedientes por Año',
                        data: data.map(r => r.cantidad),
                        borderColor: this.colors.info[0],
                        backgroundColor: this.colors.info[0] + '20',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildExpedientesPorAnio:', error);
            throw error;
        }
    }

    /**
     * Entregas realizadas (Bar chart agrupado)
     */
    async buildEntregas(filters) {
        try {
            const query = `
                SELECT 
                    strftime('%Y-%m', ae.fechaEntrega) as mes,
                    COUNT(DISTINCT ae._id) as actas,
                    COALESCE(SUM(ae.n_tarjetas_entregadas), 0) as tarjetas
                FROM ActasEntrega ae
                WHERE ae.fechaEntrega >= date('now', '-6 months')
                GROUP BY mes
                ORDER BY mes ASC
            `;

            const data = db.db.prepare(query).all();

            const formatMes = (mesStr) => {
                if (!mesStr) return '';
                const [anio, mes] = mesStr.split('-');
                return `${this.meses[parseInt(mes) - 1]} ${anio.slice(-2)}`;
            };

            return {
                type: 'bar',
                title: 'Entregas Últimos 6 Meses',
                data: {
                    labels: data.map(r => formatMes(r.mes)),
                    datasets: [
                        {
                            label: 'Actas de Entrega',
                            data: data.map(r => r.actas),
                            backgroundColor: this.colors.success[0],
                            borderRadius: 4
                        },
                        {
                            label: 'Tarjetas Entregadas',
                            data: data.map(r => r.tarjetas),
                            backgroundColor: this.colors.info[0],
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildEntregas:', error);
            throw error;
        }
    }

    /**
     * Tarjetas creadas por mes (Area chart)
     */
    async buildTarjetasPorMes(filters) {
        try {
            let query = `
                SELECT 
                    strftime('%Y-%m', t.fechaCreacion) as mes,
                    COUNT(*) as cantidad
                FROM TarjetasVehiculos t
            `;
            const params = [];
            const conditions = ['t.fechaCreacion >= date(\'now\', \'-12 months\')'];

            if (filters.anio || filters.unidadNegocio) {
                query += ` LEFT JOIN ActasResolucion e ON t.resolucionId = e._id`;
                
                if (filters.anio) {
                    conditions.push(`e.anioExpediente = ?`);
                    params.push(filters.anio);
                }
                if (filters.unidadNegocio) {
                    conditions.push(`e.unidadNegocio = ?`);
                    params.push(filters.unidadNegocio);
                }
            }

            query += ` WHERE ${conditions.join(' AND ')}`;
            query += ` GROUP BY mes ORDER BY mes ASC`;

            const data = db.db.prepare(query).all(...params);

            const formatMes = (mesStr) => {
                if (!mesStr) return '';
                const [anio, mes] = mesStr.split('-');
                return `${this.meses[parseInt(mes) - 1]} ${anio.slice(-2)}`;
            };

            return {
                type: 'line',
                title: 'Tarjetas Creadas (Últimos 12 meses)',
                data: {
                    labels: data.map(r => formatMes(r.mes)),
                    datasets: [{
                        label: 'Tarjetas Creadas',
                        data: data.map(r => r.cantidad),
                        borderColor: this.colors.success[0],
                        backgroundColor: this.colors.success[0] + '30',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            };
        } catch (error) {
            console.error('❌ Error en buildTarjetasPorMes:', error);
            throw error;
        }
    }

    /**
     * Comparativa mensual (Mixed chart)
     */
    async buildComparativaMensual(filters) {
        try {
            let query = `
                SELECT 
                    strftime('%Y-%m', e.fechaExpediente) as mes,
                    COUNT(DISTINCT e._id) as expedientes,
                    COUNT(t._id) as tarjetas
                FROM ActasResolucion e
                LEFT JOIN TarjetasVehiculos t ON t.resolucionId = e._id
                WHERE e.fechaExpediente >= date('now', '-6 months')
            `;
            const params = [];

            if (filters.unidadNegocio) {
                query += ` AND e.unidadNegocio = ?`;
                params.push(filters.unidadNegocio);
            }

            query += ` GROUP BY mes ORDER BY mes ASC`;

            const data = db.db.prepare(query).all(...params);

            const formatMes = (mesStr) => {
                if (!mesStr) return '';
                const [anio, mes] = mesStr.split('-');
                return `${this.meses[parseInt(mes) - 1]} ${anio.slice(-2)}`;
            };

            return {
                type: 'bar',
                title: 'Comparativa Mensual',
                data: {
                    labels: data.map(r => formatMes(r.mes)),
                    datasets: [
                        {
                            type: 'line',
                            label: 'Expedientes',
                            data: data.map(r => r.expedientes),
                            borderColor: this.colors.primary[0],
                            backgroundColor: 'transparent',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            type: 'bar',
                            label: 'Tarjetas',
                            data: data.map(r => r.tarjetas),
                            backgroundColor: this.colors.info[0] + '80',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: { display: true, text: 'Expedientes' }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            title: { display: true, text: 'Tarjetas' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildComparativaMensual:', error);
            throw error;
        }
    }

    /**
     * Top placas más frecuentes (Horizontal bar)
     */
    async buildTopPlacas(filters) {
        try {
            let query = `
                SELECT 
                    t.placa,
                    COUNT(*) as cantidad
                FROM TarjetasVehiculos t
            `;
            const params = [];
            const conditions = [];

            if (filters.anio || filters.unidadNegocio) {
                query += ` LEFT JOIN ActasResolucion e ON t.resolucionId = e._id`;
                
                if (filters.anio) {
                    conditions.push(`e.anioExpediente = ?`);
                    params.push(filters.anio);
                }
                if (filters.unidadNegocio) {
                    conditions.push(`e.unidadNegocio = ?`);
                    params.push(filters.unidadNegocio);
                }
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` GROUP BY t.placa ORDER BY cantidad DESC LIMIT 10`;

            const data = db.db.prepare(query).all(...params);

            return {
                type: 'bar',
                title: 'Top 10 Placas Más Frecuentes',
                data: {
                    labels: data.map(r => r.placa),
                    datasets: [{
                        label: 'Frecuencia',
                        data: data.map(r => r.cantidad),
                        backgroundColor: this.colors.warning[0],
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildTopPlacas:', error);
            throw error;
        }
    }

    /**
     * Tarjetas por Unidad de Negocio (Pie chart)
     */
    async buildTarjetasPorUnidadNegocio(filters) {
        try {
            let query = `
                SELECT 
                    COALESCE(e.unidadNegocio, 'Sin Unidad') as unidadNegocio,
                    COUNT(t._id) as cantidad
                FROM TarjetasVehiculos t
                LEFT JOIN ActasResolucion e ON t.resolucionId = e._id
            `;
            const params = [];
            const conditions = [];

            if (filters.anio) {
                conditions.push(`e.anioExpediente = ?`);
                params.push(filters.anio);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` GROUP BY e.unidadNegocio ORDER BY cantidad DESC`;

            const data = db.db.prepare(query).all(...params);

            return {
                type: 'pie',
                title: 'Tarjetas por Unidad de Negocio',
                data: {
                    labels: data.map(r => r.unidadNegocio),
                    datasets: [{
                        data: data.map(r => r.cantidad),
                        backgroundColor: this.colors.primary.concat(this.colors.info),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildTarjetasPorUnidadNegocio:', error);
            throw error;
        }
    }

    /**
     * Expedientes por Unidad de Negocio (Bar chart)
     */
    async buildExpedientesPorUnidadNegocio(filters) {
        try {
            let query = `
                SELECT 
                    COALESCE(unidadNegocio, 'Sin Unidad') as unidadNegocio,
                    COUNT(*) as cantidad
                FROM ActasResolucion
            `;
            const params = [];
            const conditions = [];

            if (filters.anio) {
                conditions.push(`anioExpediente = ?`);
                params.push(filters.anio);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` GROUP BY unidadNegocio ORDER BY cantidad DESC`;

            const data = db.db.prepare(query).all(...params);

            return {
                type: 'bar',
                title: 'Expedientes por Unidad de Negocio',
                data: {
                    labels: data.map(r => r.unidadNegocio),
                    datasets: [{
                        label: 'Expedientes',
                        data: data.map(r => r.cantidad),
                        backgroundColor: this.colors.primary.slice(0, data.length),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            };
        } catch (error) {
            console.error('❌ Error en buildExpedientesPorUnidadNegocio:', error);
            throw error;
        }
    }
}

module.exports = new ChartDataBuilder();
