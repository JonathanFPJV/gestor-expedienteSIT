// app/handlers/expedienteHandlers/readHandler.js
/**
 * Handlers de Lectura para Expedientes
 * 
 * Responsabilidades:
 * - Obtener detalle de un expediente
 * - Obtener todos los expedientes
 * - Buscar expedientes por término
 * - Obtener información para eliminación
 * 
 * Canales IPC: 4
 * - obtener-expediente-detalle
 * - obtener-todos-expedientes
 * - buscar-expediente
 * - obtener-info-eliminacion
 * 
 * @module expedienteHandlers/readHandler
 */

const { ipcMain } = require('electron');
const { handleError, mapExpedienteCompleto, mapTarjetaForFrontend } = require('./utils');

/**
 * Registra los handlers de lectura de expedientes
 * 
 * @param {ExpedienteService} expedienteService - Servicio de expedientes
 * @param {Object} db - Base de datos con APIs
 */
function registerReadHandlers(expedienteService, db) {
    console.log('📖 Registrando handlers de lectura de expedientes...');

    /**
     * Obtener detalle completo de un expediente con sus tarjetas
     */
    ipcMain.handle('obtener-expediente-detalle', (event, expedienteId) => {
        try {
            console.log('📥 Solicitud obtener detalle expediente:', expedienteId, `(tipo: ${typeof expedienteId})`);
            const result = expedienteService.getExpedienteDetalle(expedienteId);
            console.log('✅ Detalle obtenido exitosamente:', result.success ? 'SÍ' : 'NO');
            return result;
        } catch (error) {
            return handleError(error, 'obtener detalle de expediente');
        }
    });

    /**
     * Obtener expedientes con paginación
     * @param {Object} options - Opciones de paginación
     * @param {number} options.page - Página actual (default: 1)
     * @param {number} options.limit - Registros por página (default: 10)
     * @param {string} options.sortBy - Campo para ordenar (default: 'fechaExpediente')
     * @param {string} options.sortOrder - Orden: 'asc' o 'desc' (default: 'desc')
     */
    ipcMain.handle('expediente:obtener-paginado', (event, options = {}) => {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'fechaExpediente',
                sortOrder = 'desc'
            } = options;

            console.log('📥 Solicitud obtener expedientes paginados:', { page, limit, sortBy, sortOrder });

            // Obtener todos los expedientes (después optimizaremos con índices)
            const allExpedientes = db.expedientes.find({});
            const totalExpedientes = allExpedientes.length;
            
            // Ordenar
            allExpedientes.sort((a, b) => {
                const valorA = a[sortBy];
                const valorB = b[sortBy];
                
                if (sortOrder === 'asc') {
                    return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
                } else {
                    return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
                }
            });
            
            // Calcular paginación
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const expedientesPagina = allExpedientes.slice(startIndex, endIndex);
            
            console.log(`📄 Página ${page}: mostrando ${expedientesPagina.length} de ${totalExpedientes} expedientes`);
            
            // Mapear expedientes con sus tarjetas usando función utilitaria
            const expedientesConTarjetas = expedientesPagina.map(expediente => 
                mapExpedienteCompleto(expediente, db)
            );
            
            const resultado = {
                success: true,
                data: expedientesConTarjetas,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalExpedientes / limit),
                    totalRecords: totalExpedientes,
                    recordsPerPage: limit,
                    hasNextPage: endIndex < totalExpedientes,
                    hasPrevPage: page > 1
                }
            };
            
            console.log('✅ Expedientes paginados procesados:', resultado.pagination);
            return resultado;
        } catch (error) {
            console.error('❌ Error en obtener expedientes paginados:', error);
            return {
                success: false,
                message: error.message,
                data: [],
                pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 }
            };
        }
    });

    /**
     * Obtener todos los expedientes con sus tarjetas asociadas
     * ⚠️ DEPRECADO: Usar 'expediente:obtener-paginado' para mejor rendimiento
     */
    ipcMain.handle('obtener-todos-expedientes', () => {
        try {
            console.log('⚠️ ADVERTENCIA: Usando obtener-todos-expedientes (deprecado)');
            console.log('💡 Considera usar expediente:obtener-paginado para mejor rendimiento');
            console.log('📥 Solicitud obtener todos los expedientes');
            const expedientes = db.expedientes.find({});
            console.log('📊 Expedientes obtenidos de la BD:', expedientes.length);
            
            // Mapear expedientes con sus tarjetas usando función utilitaria
            const expedientesConTarjetas = expedientes.map(expediente => {
                const resultado = mapExpedienteCompleto(expediente, db);
                console.log(`🎫 Expediente ${expediente.numeroExpediente}: ${resultado.tarjetasAsociadas.length} tarjetas`);
                return resultado;
            });
            
            console.log('✅ Expedientes con tarjetas procesados:', expedientesConTarjetas.length);
            console.log('📦 Primer expediente de ejemplo:', expedientesConTarjetas[0]);
            return expedientesConTarjetas;
        } catch (error) {
            console.error('❌ Error en obtener-todos-expedientes:', error);
            throw error;
        }
    });

    /**
     * Buscar expedientes por término de búsqueda
     * Soporta búsqueda por: número de expediente, resolución, empresa
     */
    ipcMain.handle('buscar-expediente', (event, searchTerm) => {
        try {
            console.log('📥 Solicitud buscar expediente:', searchTerm);
            
            // Usar el servicio para búsqueda
            const expedientes = expedienteService.searchExpedientes(searchTerm);
            
            if (expedientes.length === 0) {
                return { success: true, data: [] };
            }
            
            // Formatear resultados con tarjetas asociadas usando función utilitaria
            const resultados = expedientes.map(expediente => 
                mapExpedienteCompleto(expediente, db)
            );
            
            console.log(`✅ Búsqueda de expedientes: ${resultados.length} resultados`);
            return { success: true, data: resultados };
        } catch (error) {
            return handleError(error, 'buscar expediente');
        }
    });

    /**
     * Obtener información detallada para confirmación de eliminación
     * Incluye: expediente, tarjetas asociadas, resumen de archivos
     */
    ipcMain.handle('obtener-info-eliminacion', (event, expedienteId) => {
        try {
            console.log('📥 Solicitud obtener info para eliminación:', expedienteId);
            
            // Obtener expediente
            const expediente = db.expedientes.findOne({ _id: expedienteId });
            if (!expediente) {
                return {
                    success: false,
                    error: 'Expediente no encontrado'
                };
            }

            // Obtener tarjetas asociadas
            const tarjetas = db.tarjetas.find({ resolucionId: expedienteId });
            
            // Contar archivos PDF
            let archivosTotal = expediente.pdfPathActa ? 1 : 0;
            const tarjetasConPDF = tarjetas.filter(t => t.pdfPath).length;
            archivosTotal += tarjetasConPDF;

            // Preparar resumen
            const summary = {
                totalTarjetas: tarjetas.length,
                tarjetasConPDF: tarjetasConPDF,
                totalArchivos: archivosTotal
            };

            // Formatear expediente para mostrar
            const expedienteInfo = {
                numero: expediente.numeroExpediente,
                resolucion: expediente.numeroResolucion,
                empresa: expediente.nombreEmpresa || 'Sin empresa',
                pdfPath: expediente.pdfPathActa
            };

            console.log('✅ Info de eliminación obtenida:', {
                expediente: expedienteInfo.numero,
                tarjetas: summary.totalTarjetas,
                archivos: summary.totalArchivos
            });

            return {
                success: true,
                data: {
                    expediente: expedienteInfo,
                    tarjetas: tarjetas.map(mapTarjetaForFrontend),
                    summary
                }
            };
        } catch (error) {
            return handleError(error, 'obtener información de eliminación');
        }
    });

    console.log('✅ Read Handlers registrados (4 canales)');
}

module.exports = registerReadHandlers;
