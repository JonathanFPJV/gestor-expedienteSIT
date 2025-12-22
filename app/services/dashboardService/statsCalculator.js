// app/services/dashboardService/statsCalculator.js
/**
 * Stats Calculator - Cálculos estadísticos para el dashboard
 * Adaptado para better-sqlite3 (síncrono)
 * 
 * @module dashboardService/statsCalculator
 */

const db = require('../../db/database');

class StatsCalculator {
    /**
     * Construye cláusula WHERE basada en filtros
     * @param {Object} filters - Filtros a aplicar
     * @param {string} tableAlias - Alias de tabla (opcional)
     * @returns {Object} { clause, params }
     */
    buildWhereClause(filters, tableAlias = '') {
        const conditions = [];
        const params = [];
        const prefix = tableAlias ? `${tableAlias}.` : '';

        if (filters.anio) {
            conditions.push(`${prefix}anioExpediente = ?`);
            params.push(filters.anio);
        }

        if (filters.unidadNegocio) {
            conditions.push(`${prefix}unidadNegocio = ?`);
            params.push(filters.unidadNegocio);
        }

        if (filters.estado) {
            conditions.push(`${prefix}estado = ?`);
            params.push(filters.estado);
        }

        if (filters.fechaDesde) {
            conditions.push(`${prefix}fechaExpediente >= ?`);
            params.push(filters.fechaDesde);
        }

        if (filters.fechaHasta) {
            conditions.push(`${prefix}fechaExpediente <= ?`);
            params.push(filters.fechaHasta);
        }

        if (filters.numeroResolucion) {
            conditions.push(`${prefix}numeroResolucion LIKE ?`);
            params.push(`%${filters.numeroResolucion}%`);
        }

        return {
            clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
            params
        };
    }

    /**
     * Construye cláusula WHERE para tarjetas basada en filtros de expediente
     * @param {Object} filters - Filtros a aplicar
     * @returns {Object} { clause, params }
     */
    buildTarjetasWhereClause(filters) {
        const conditions = [];
        const params = [];

        // Filtros directos de tarjetas
        if (filters.estado) {
            conditions.push(`t.estado = ?`);
            params.push(filters.estado);
        }

        if (filters.placa) {
            conditions.push(`t.placa LIKE ?`);
            params.push(`%${filters.placa}%`);
        }

        // Filtros que requieren JOIN con expedientes
        if (filters.anio) {
            conditions.push(`e.anioExpediente = ?`);
            params.push(filters.anio);
        }

        if (filters.unidadNegocio) {
            conditions.push(`e.unidadNegocio = ?`);
            params.push(filters.unidadNegocio);
        }

        if (filters.fechaDesde) {
            conditions.push(`e.fechaExpediente >= ?`);
            params.push(filters.fechaDesde);
        }

        if (filters.fechaHasta) {
            conditions.push(`e.fechaExpediente <= ?`);
            params.push(filters.fechaHasta);
        }

        return {
            clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
            params,
            needsJoin: !!(filters.anio || filters.unidadNegocio || filters.fechaDesde || filters.fechaHasta)
        };
    }

    /**
     * Resumen general del sistema
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Estadísticas generales
     */
    async getResumenGeneral(filters = {}) {
        try {
            const { clause: expClause, params: expParams } = this.buildWhereClause(filters);
            const { clause: tarjClause, params: tarjParams, needsJoin } = this.buildTarjetasWhereClause(filters);

            // Total expedientes
            const expedientesQuery = `SELECT COUNT(*) as total FROM ActasResolucion ${expClause}`;
            const totalExpedientes = db.db.prepare(expedientesQuery).get(...expParams)?.total || 0;

            // Total tarjetas (con filtros si aplica)
            let totalTarjetas, tarjetasEntregadas, tarjetasPendientes;

            if (needsJoin) {
                const tarjetasBaseQuery = `
                    SELECT COUNT(*) as total 
                    FROM TarjetasVehiculos t
                    LEFT JOIN ActasResolucion e ON t.resolucionId = e._id
                    ${tarjClause}
                `;
                totalTarjetas = db.db.prepare(tarjetasBaseQuery).get(...tarjParams)?.total || 0;

                const entregadasQuery = `
                    SELECT COUNT(*) as total 
                    FROM TarjetasVehiculos t
                    LEFT JOIN ActasResolucion e ON t.resolucionId = e._id
                    ${tarjClause ? tarjClause + ' AND' : 'WHERE'} t.actaEntregaId IS NOT NULL
                `;
                tarjetasEntregadas = db.db.prepare(entregadasQuery).get(...tarjParams)?.total || 0;

                const pendientesQuery = `
                    SELECT COUNT(*) as total 
                    FROM TarjetasVehiculos t
                    LEFT JOIN ActasResolucion e ON t.resolucionId = e._id
                    ${tarjClause ? tarjClause + ' AND' : 'WHERE'} t.actaEntregaId IS NULL
                `;
                tarjetasPendientes = db.db.prepare(pendientesQuery).get(...tarjParams)?.total || 0;
            } else {
                totalTarjetas = db.db.prepare(`SELECT COUNT(*) as total FROM TarjetasVehiculos ${tarjClause}`).get(...tarjParams)?.total || 0;
                
                const entregadasClause = tarjClause ? `${tarjClause} AND actaEntregaId IS NOT NULL` : 'WHERE actaEntregaId IS NOT NULL';
                tarjetasEntregadas = db.db.prepare(`SELECT COUNT(*) as total FROM TarjetasVehiculos ${entregadasClause}`).get(...tarjParams)?.total || 0;
                
                const pendientesClause = tarjClause ? `${tarjClause} AND actaEntregaId IS NULL` : 'WHERE actaEntregaId IS NULL';
                tarjetasPendientes = db.db.prepare(`SELECT COUNT(*) as total FROM TarjetasVehiculos ${pendientesClause}`).get(...tarjParams)?.total || 0;
            }

            // Total actas de entrega
            const totalActas = db.db.prepare(`SELECT COUNT(*) as total FROM ActasEntrega`).get()?.total || 0;

            // Calcular porcentajes
            const porcentajeEntregadas = totalTarjetas > 0
                ? ((tarjetasEntregadas / totalTarjetas) * 100).toFixed(1)
                : '0.0';

            return {
                totalExpedientes,
                totalTarjetas,
                tarjetasEntregadas,
                tarjetasPendientes,
                entregasPendientes: tarjetasPendientes, // Alias para el frontend
                totalActas,
                porcentajeEntregadas: parseFloat(porcentajeEntregadas)
            };
        } catch (error) {
            console.error('❌ Error en getResumenGeneral:', error);
            throw error;
        }
    }

    /**
     * Estadísticas detalladas de tarjetas
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Estadísticas de tarjetas
     */
    async getEstadisticasTarjetas(filters = {}) {
        try {
            const { needsJoin, params: tarjParams, clause: tarjClause } = this.buildTarjetasWhereClause(filters);

            // Por estado
            let porEstadoQuery;
            if (needsJoin) {
                porEstadoQuery = `
                    SELECT 
                        COALESCE(t.estado, 'Sin Estado') as estado,
                        COUNT(t._id) as cantidad
                    FROM TarjetasVehiculos t
                    LEFT JOIN ActasResolucion e ON t.resolucionId = e._id
                    ${tarjClause}
                    GROUP BY t.estado
                    ORDER BY cantidad DESC
                `;
            } else {
                porEstadoQuery = `
                    SELECT 
                        COALESCE(estado, 'Sin Estado') as estado,
                        COUNT(_id) as cantidad
                    FROM TarjetasVehiculos
                    ${tarjClause}
                    GROUP BY estado
                    ORDER BY cantidad DESC
                `;
            }
            const porEstado = db.db.prepare(porEstadoQuery).all(...tarjParams);

            // Por mes (últimos 12 meses)
            const porMesQuery = `
                SELECT 
                    strftime('%Y-%m', t.fechaCreacion) as mes,
                    COUNT(*) as cantidad
                FROM TarjetasVehiculos t
                ${needsJoin ? 'LEFT JOIN ActasResolucion e ON t.resolucionId = e._id' : ''}
                WHERE t.fechaCreacion >= date('now', '-12 months')
                ${tarjClause ? 'AND ' + tarjClause.replace('WHERE ', '') : ''}
                GROUP BY mes
                ORDER BY mes ASC
            `;
            const porMes = db.db.prepare(porMesQuery).all(...tarjParams);

            // Top 10 placas más frecuentes
            let topPlacasQuery;
            if (needsJoin) {
                topPlacasQuery = `
                    SELECT 
                        t.placa,
                        COUNT(*) as cantidad
                    FROM TarjetasVehiculos t
                    LEFT JOIN ActasResolucion e ON t.resolucionId = e._id
                    ${tarjClause}
                    GROUP BY t.placa
                    ORDER BY cantidad DESC
                    LIMIT 10
                `;
            } else {
                topPlacasQuery = `
                    SELECT 
                        placa,
                        COUNT(*) as cantidad
                    FROM TarjetasVehiculos
                    ${tarjClause}
                    GROUP BY placa
                    ORDER BY cantidad DESC
                    LIMIT 10
                `;
            }
            const topPlacas = db.db.prepare(topPlacasQuery).all(...tarjParams);

            // Extraer conteos específicos de porEstado
            const activas = porEstado.find(e => e.estado === 'ACTIVA')?.cantidad || 0;
            const canceladas = porEstado.find(e => e.estado === 'CANCELADA' || e.estado === 'ANULADA')?.cantidad || 0;
            const entregadas = porEstado.find(e => e.estado === 'ENTREGADA')?.cantidad || 0;
            const pendientes = porEstado.find(e => e.estado === 'PENDIENTE')?.cantidad || 0;

            return {
                porEstado: porEstado || [],
                porMes: porMes || [],
                topPlacas: topPlacas || [],
                activas,
                canceladas,
                entregadas,
                pendientes
            };
        } catch (error) {
            console.error('❌ Error en getEstadisticasTarjetas:', error);
            throw error;
        }
    }

    /**
     * Estadísticas detalladas de expedientes
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Estadísticas de expedientes
     */
    async getEstadisticasExpedientes(filters = {}) {
        try {
            const { clause, params } = this.buildWhereClause(filters);

            // Por año
            const porAnioQuery = `
                SELECT 
                    anioExpediente as anio,
                    COUNT(*) as cantidad
                FROM ActasResolucion
                ${clause}
                GROUP BY anioExpediente
                ORDER BY anio DESC
                LIMIT 5
            `;
            const porAnio = db.db.prepare(porAnioQuery).all(...params);

            // Por mes del año filtrado o actual
            const anioFiltro = filters.anio || new Date().getFullYear();
            const porMesQuery = `
                SELECT 
                    CAST(strftime('%m', fechaExpediente) AS INTEGER) as mes,
                    COUNT(*) as cantidad
                FROM ActasResolucion
                WHERE anioExpediente = ?
                ${clause ? 'AND ' + clause.replace('WHERE ', '') : ''}
                GROUP BY mes
                ORDER BY mes ASC
            `;
            const porMesParams = [anioFiltro, ...params];
            const porMes = db.db.prepare(porMesQuery).all(...porMesParams);

            // Por unidad de negocio
            const porUnidadQuery = `
                SELECT 
                    COALESCE(unidadNegocio, 'Sin Unidad') as unidadNegocio,
                    COUNT(*) as cantidad
                FROM ActasResolucion
                ${clause}
                GROUP BY unidadNegocio
                ORDER BY cantidad DESC
            `;
            const porUnidad = db.db.prepare(porUnidadQuery).all(...params);

            // Expedientes recientes
            const recientesQuery = `
                SELECT 
                    _id,
                    numeroExpediente,
                    anioExpediente,
                    numeroResolucion,
                    fechaExpediente,
                    unidadNegocio
                FROM ActasResolucion
                ${clause}
                ORDER BY fechaCreacion DESC
                LIMIT 5
            `;
            const recientes = db.db.prepare(recientesQuery).all(...params);

            // Expedientes del mes actual
            const mesActualQuery = `
                SELECT COUNT(*) as cantidad
                FROM ActasResolucion
                WHERE strftime('%Y-%m', fechaExpediente) = strftime('%Y-%m', 'now')
            `;
            const porMesActual = db.db.prepare(mesActualQuery).get()?.cantidad || 0;

            return {
                porAnio: porAnio || [],
                porMes: porMes || [],
                porUnidad: porUnidad || [],
                recientes: recientes || [],
                porMesActual
            };
        } catch (error) {
            console.error('❌ Error en getEstadisticasExpedientes:', error);
            throw error;
        }
    }

    /**
     * Tendencias y comparativas
     * @param {Object} filters - Filtros aplicados
     * @returns {Promise<Object>} Tendencias
     */
    async getTendencias(filters = {}) {
        try {
            // Comparativa mes actual vs mes anterior
            const mesActualQuery = `
                SELECT 
                    COUNT(*) as expedientes,
                    (SELECT COUNT(*) FROM TarjetasVehiculos WHERE strftime('%Y-%m', fechaCreacion) = strftime('%Y-%m', 'now')) as tarjetas
                FROM ActasResolucion
                WHERE strftime('%Y-%m', fechaExpediente) = strftime('%Y-%m', 'now')
            `;
            const mesActual = db.db.prepare(mesActualQuery).get();

            const mesAnteriorQuery = `
                SELECT 
                    COUNT(*) as expedientes,
                    (SELECT COUNT(*) FROM TarjetasVehiculos WHERE strftime('%Y-%m', fechaCreacion) = strftime('%Y-%m', 'now', '-1 month')) as tarjetas
                FROM ActasResolucion
                WHERE strftime('%Y-%m', fechaExpediente) = strftime('%Y-%m', 'now', '-1 month')
            `;
            const mesAnterior = db.db.prepare(mesAnteriorQuery).get();

            // Promedio de tarjetas por expediente
            const promedioQuery = `
                SELECT 
                    AVG(tarjetas_count) as promedio
                FROM (
                    SELECT resolucionId, COUNT(*) as tarjetas_count
                    FROM TarjetasVehiculos
                    WHERE resolucionId IS NOT NULL
                    GROUP BY resolucionId
                )
            `;
            const promedio = db.db.prepare(promedioQuery).get();

            // Calcular variaciones
            const variacionExpedientes = mesAnterior.expedientes > 0 
                ? (((mesActual.expedientes - mesAnterior.expedientes) / mesAnterior.expedientes) * 100).toFixed(1)
                : '0.0';

            const variacionTarjetas = mesAnterior.tarjetas > 0
                ? (((mesActual.tarjetas - mesAnterior.tarjetas) / mesAnterior.tarjetas) * 100).toFixed(1)
                : '0.0';

            return {
                mesActual: {
                    expedientes: mesActual?.expedientes || 0,
                    tarjetas: mesActual?.tarjetas || 0
                },
                mesAnterior: {
                    expedientes: mesAnterior?.expedientes || 0,
                    tarjetas: mesAnterior?.tarjetas || 0
                },
                variacion: {
                    expedientes: parseFloat(variacionExpedientes),
                    tarjetas: parseFloat(variacionTarjetas)
                },
                promedioTarjetasPorExpediente: parseFloat(promedio?.promedio?.toFixed(1) || '0.0')
            };
        } catch (error) {
            console.error('❌ Error en getTendencias:', error);
            throw error;
        }
    }
}

module.exports = new StatsCalculator();
