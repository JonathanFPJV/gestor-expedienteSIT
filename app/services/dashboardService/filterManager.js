// app/services/dashboardService/filterManager.js
/**
 * Filter Manager - Gestiona filtros dinámicos del dashboard
 * 
 * @module dashboardService/filterManager
 */

const db = require('../../db/database');

class FilterManager {
    /**
     * Obtiene todas las opciones de filtros disponibles
     * @returns {Promise<Object>} Opciones de filtros
     */
    async getAvailableFilters() {
        try {
            console.log('🔍 Obteniendo opciones de filtros disponibles...');
            
            const [anios, unidadesNegocio, estados, meses] = await Promise.all([
                this.getAniosDisponibles(),
                this.getUnidadesNegocioDisponibles(),
                this.getEstadosDisponibles(),
                this.getMesesConDatos()
            ]);

            return {
                anios,
                unidadesNegocio,
                estados,
                meses,
                rangos: this.getRangosPredefinidos()
            };
        } catch (error) {
            console.error('❌ Error obteniendo filtros:', error);
            throw error;
        }
    }

    /**
     * Años con expedientes
     * @returns {Array} Lista de años
     */
    getAniosDisponibles() {
        try {
            const query = `
                SELECT DISTINCT anioExpediente as anio
                FROM ActasResolucion
                WHERE anioExpediente IS NOT NULL
                ORDER BY anio DESC
            `;

            const rows = db.db.prepare(query).all();
            
            return rows.map(r => ({
                value: r.anio,
                label: r.anio.toString()
            }));
        } catch (error) {
            console.error('❌ Error en getAniosDisponibles:', error);
            return [];
        }
    }

    /**
     * Unidades de negocio disponibles
     * @returns {Array} Lista de unidades
     */
    getUnidadesNegocioDisponibles() {
        try {
            const query = `
                SELECT DISTINCT unidadNegocio
                FROM ActasResolucion
                WHERE unidadNegocio IS NOT NULL AND unidadNegocio != ''
                ORDER BY unidadNegocio ASC
            `;

            const rows = db.db.prepare(query).all();
            
            return rows.map(r => ({
                value: r.unidadNegocio,
                label: r.unidadNegocio
            }));
        } catch (error) {
            console.error('❌ Error en getUnidadesNegocioDisponibles:', error);
            return [];
        }
    }

    /**
     * Estados de tarjetas disponibles
     * @returns {Array} Lista de estados
     */
    getEstadosDisponibles() {
        try {
            const query = `
                SELECT DISTINCT estado
                FROM TarjetasVehiculos
                WHERE estado IS NOT NULL AND estado != ''
                ORDER BY estado ASC
            `;

            const rows = db.db.prepare(query).all();
            
            const colores = {
                'ACTIVA': '#10b981',
                'ENTREGADA': '#3b82f6',
                'PENDIENTE': '#f59e0b',
                'ANULADA': '#ef4444'
            };

            return rows.map(r => ({
                value: r.estado,
                label: r.estado,
                color: colores[r.estado] || '#6b7280'
            }));
        } catch (error) {
            console.error('❌ Error en getEstadosDisponibles:', error);
            return [];
        }
    }

    /**
     * Meses con datos disponibles
     * @returns {Array} Lista de meses
     */
    getMesesConDatos() {
        try {
            const query = `
                SELECT DISTINCT 
                    strftime('%Y-%m', fechaExpediente) as mes
                FROM ActasResolucion
                WHERE fechaExpediente IS NOT NULL
                ORDER BY mes DESC
                LIMIT 24
            `;

            const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                                  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            const rows = db.db.prepare(query).all();
            
            return rows.map(r => {
                const [anio, mes] = r.mes.split('-');
                return {
                    value: r.mes,
                    label: `${mesesNombres[parseInt(mes) - 1]} ${anio}`
                };
            });
        } catch (error) {
            console.error('❌ Error en getMesesConDatos:', error);
            return [];
        }
    }

    /**
     * Rangos de fecha predefinidos
     * @returns {Array} Lista de rangos
     */
    getRangosPredefinidos() {
        const hoy = new Date();
        
        return [
            {
                value: 'hoy',
                label: 'Hoy',
                fechaDesde: hoy.toISOString().split('T')[0],
                fechaHasta: hoy.toISOString().split('T')[0]
            },
            {
                value: 'semana',
                label: 'Esta Semana',
                fechaDesde: this.getStartOfWeek(hoy),
                fechaHasta: hoy.toISOString().split('T')[0]
            },
            {
                value: 'mes',
                label: 'Este Mes',
                fechaDesde: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`,
                fechaHasta: hoy.toISOString().split('T')[0]
            },
            {
                value: 'trimestre',
                label: 'Último Trimestre',
                fechaDesde: this.subtractMonths(hoy, 3),
                fechaHasta: hoy.toISOString().split('T')[0]
            },
            {
                value: 'semestre',
                label: 'Último Semestre',
                fechaDesde: this.subtractMonths(hoy, 6),
                fechaHasta: hoy.toISOString().split('T')[0]
            },
            {
                value: 'anio',
                label: 'Este Año',
                fechaDesde: `${hoy.getFullYear()}-01-01`,
                fechaHasta: hoy.toISOString().split('T')[0]
            },
            {
                value: 'todo',
                label: 'Todo el Tiempo',
                fechaDesde: null,
                fechaHasta: null
            }
        ];
    }

    /**
     * Obtiene el inicio de la semana
     * @param {Date} date - Fecha base
     * @returns {string} Fecha en formato YYYY-MM-DD
     */
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    }

    /**
     * Resta meses a una fecha
     * @param {Date} date - Fecha base
     * @param {number} months - Meses a restar
     * @returns {string} Fecha en formato YYYY-MM-DD
     */
    subtractMonths(date, months) {
        const d = new Date(date);
        d.setMonth(d.getMonth() - months);
        return d.toISOString().split('T')[0];
    }

    /**
     * Valida y sanitiza filtros
     * @param {Object} filters - Filtros a validar
     * @returns {Object} Filtros sanitizados
     */
    sanitizeFilters(filters) {
        if (!filters || typeof filters !== 'object') {
            return {};
        }

        const sanitized = {};

        // Año
        if (filters.anio !== undefined && filters.anio !== null && filters.anio !== '') {
            const anio = parseInt(filters.anio);
            if (!isNaN(anio) && anio >= 2000 && anio <= 2100) {
                sanitized.anio = anio;
            }
        }

        // Unidad de Negocio
        if (filters.unidadNegocio && typeof filters.unidadNegocio === 'string' && filters.unidadNegocio.trim()) {
            sanitized.unidadNegocio = filters.unidadNegocio.trim();
        }

        // Estado
        if (filters.estado && typeof filters.estado === 'string' && filters.estado.trim()) {
            sanitized.estado = filters.estado.trim().toUpperCase();
        }

        // Fecha Desde
        if (filters.fechaDesde && this.isValidDate(filters.fechaDesde)) {
            sanitized.fechaDesde = filters.fechaDesde;
        }

        // Fecha Hasta
        if (filters.fechaHasta && this.isValidDate(filters.fechaHasta)) {
            sanitized.fechaHasta = filters.fechaHasta;
        }

        // Número de Resolución
        if (filters.numeroResolucion && typeof filters.numeroResolucion === 'string' && filters.numeroResolucion.trim()) {
            sanitized.numeroResolucion = filters.numeroResolucion.trim();
        }

        // Placa
        if (filters.placa && typeof filters.placa === 'string' && filters.placa.trim()) {
            sanitized.placa = filters.placa.trim().toUpperCase();
        }

        // Rango predefinido
        if (filters.rango && typeof filters.rango === 'string') {
            const rangos = this.getRangosPredefinidos();
            const rangoSeleccionado = rangos.find(r => r.value === filters.rango);
            if (rangoSeleccionado) {
                if (rangoSeleccionado.fechaDesde) {
                    sanitized.fechaDesde = rangoSeleccionado.fechaDesde;
                }
                if (rangoSeleccionado.fechaHasta) {
                    sanitized.fechaHasta = rangoSeleccionado.fechaHasta;
                }
            }
        }

        console.log('🔍 Filtros sanitizados:', sanitized);
        return sanitized;
    }

    /**
     * Valida formato de fecha
     * @param {string} dateString - Fecha a validar
     * @returns {boolean} True si es válida
     */
    isValidDate(dateString) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Obtiene resumen de filtros para mostrar al usuario
     * @param {Object} filters - Filtros aplicados
     * @returns {Array} Lista de filtros activos
     */
    getFiltersSummary(filters) {
        const summary = [];
        const sanitized = this.sanitizeFilters(filters);

        if (sanitized.anio) {
            summary.push({ key: 'anio', label: 'Año', value: sanitized.anio.toString() });
        }
        if (sanitized.unidadNegocio) {
            summary.push({ key: 'unidadNegocio', label: 'Unidad de Negocio', value: sanitized.unidadNegocio });
        }
        if (sanitized.estado) {
            summary.push({ key: 'estado', label: 'Estado', value: sanitized.estado });
        }
        if (sanitized.fechaDesde) {
            summary.push({ key: 'fechaDesde', label: 'Desde', value: sanitized.fechaDesde });
        }
        if (sanitized.fechaHasta) {
            summary.push({ key: 'fechaHasta', label: 'Hasta', value: sanitized.fechaHasta });
        }

        return summary;
    }
}

module.exports = new FilterManager();
