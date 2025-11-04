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
const { handleError, mapExpedienteForFrontend, mapTarjetaForFrontend } = require('./utils');

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
     * Obtener todos los expedientes con sus tarjetas asociadas
     */
    ipcMain.handle('obtener-todos-expedientes', () => {
        try {
            console.log('📥 Solicitud obtener todos los expedientes');
            const expedientes = db.expedientes.find({});
            console.log('📊 Expedientes obtenidos de la BD:', expedientes.length);
            
            // Para cada expediente, obtener sus tarjetas asociadas
            const expedientesConTarjetas = expedientes.map((expediente) => {
                try {
                    // Buscar tarjetas por resolucionId
                    const tarjetasAsociadas = db.tarjetas.find({ resolucionId: expediente._id });
                    console.log(`🎫 Expediente ${expediente.numeroExpediente}: ${tarjetasAsociadas.length} tarjetas`);
                    
                    // Mapear el expediente con todos los campos necesarios para el frontend
                    const expedienteMapeado = {
                        _id: expediente._id,
                        numeroExpediente: expediente.numeroExpediente,
                        anioExpediente: expediente.anioExpediente,
                        numeroResolucion: expediente.numeroResolucion,
                        fechaExpediente: expediente.fechaExpediente,
                        unidadNegocio: expediente.unidadNegocio,
                        nombreEmpresa: expediente.nombreEmpresa,
                        numeroFichero: expediente.numeroFichero,
                        observaciones: expediente.observaciones,
                        pdfPathActa: expediente.pdfPathActa,
                        informeTecnico: expediente.informeTecnico,
                        // Campos legacy para retrocompatibilidad con frontend
                        expediente: expediente.numeroExpediente,
                        fecha: expediente.fechaExpediente,
                        pdfPath: expediente.pdfPathActa,
                        // Tarjetas asociadas
                        tarjetasAsociadas: tarjetasAsociadas || []
                    };
                    
                    console.log('✅ Expediente mapeado:', expedienteMapeado.numeroExpediente, '- Campos:', Object.keys(expedienteMapeado));
                    return expedienteMapeado;
                } catch (error) {
                    console.error(`❌ Error obteniendo tarjetas para expediente ${expediente._id}:`, error);
                    return {
                        ...mapExpedienteForFrontend(expediente),
                        tarjetasAsociadas: []
                    };
                }
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
            
            // Formatear resultados con tarjetas asociadas
            const resultados = expedientes.map((expediente) => {
                // Buscar tarjetas asociadas
                const tarjetasAsociadas = db.tarjetas.find({ resolucionId: expediente._id });

                return {
                    _id: expediente._id,
                    // Mapeo de campos para compatibilidad
                    expediente: expediente.numeroExpediente,
                    fecha: expediente.fechaExpediente,
                    pdfPath: expediente.pdfPathActa,
                    // Campos completos
                    numeroExpediente: expediente.numeroExpediente,
                    anioExpediente: expediente.anioExpediente,
                    numeroResolucion: expediente.numeroResolucion,
                    fechaExpediente: expediente.fechaExpediente,
                    informeTecnico: expediente.informeTecnico,
                    unidadNegocio: expediente.unidadNegocio,
                    nombreEmpresa: expediente.nombreEmpresa,
                    numeroFichero: expediente.numeroFichero,
                    observaciones: expediente.observaciones,
                    pdfPathActa: expediente.pdfPathActa,
                    tarjetasAsociadas: tarjetasAsociadas.map(mapTarjetaForFrontend)
                };
            });
            
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
