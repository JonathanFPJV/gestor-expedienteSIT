// app/handlers/expedienteHandlers.js
/**
 * Manejadores IPC para operaciones de Expedientes (Actas de Resolución)
 * Define los canales de comunicación entre el renderer y el main process
 * MIGRADO A SQLITE3 - Operaciones síncronas
 */

const { ipcMain, BrowserWindow } = require('electron');
const ExpedienteService = require('../services/expedienteService');

class ExpedienteHandlers {
    constructor(db, fileHandlers) {
        this.expedienteService = new ExpedienteService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
        this.db = db;
    }

    /**
     * Registrar todos los manejadores IPC para expedientes
     */
    registerHandlers() {
        console.log('📝 Registrando manejadores IPC para Expedientes...');

        // Obtener detalle de expediente con sus tarjetas
        ipcMain.handle('obtener-expediente-detalle', (event, expedienteId) => {
            try {
                console.log('📥 Solicitud obtener detalle expediente:', expedienteId, `(tipo: ${typeof expedienteId})`);
                const result = this.expedienteService.getExpedienteDetalle(expedienteId);
                console.log('✅ Detalle obtenido exitosamente:', result.success ? 'SÍ' : 'NO');
                return result;
            } catch (error) {
                console.error('❌ Error en obtener-expediente-detalle:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener detalle de expediente'
                };
            }
        });

        // Obtener todos los expedientes con sus tarjetas
        ipcMain.handle('obtener-todos-expedientes', () => {
            try {
                console.log('📥 Solicitud obtener todos los expedientes');
                const expedientes = this.db.expedientes.find({});
                console.log('📊 Expedientes obtenidos de la BD:', expedientes.length);
                
                // Para cada expediente, obtener sus tarjetas asociadas
                const expedientesConTarjetas = expedientes.map((expediente) => {
                    try {
                        // Buscar tarjetas por resolucionId
                        const tarjetasAsociadas = this.db.tarjetas.find({ resolucionId: expediente._id });
                        console.log(`🎫 Expediente ${expediente.numeroExpediente}: ${tarjetasAsociadas.length} tarjetas`);
                        
                        return {
                            ...expediente,
                            // Mantener compatibilidad con frontend antiguo
                            expediente: expediente.numeroExpediente,
                            fecha: expediente.fechaExpediente,
                            pdfPath: expediente.pdfPathActa,
                            tarjetasAsociadas: tarjetasAsociadas || []
                        };
                    } catch (error) {
                        console.error(`❌ Error obteniendo tarjetas para expediente ${expediente._id}:`, error);
                        return {
                            ...expediente,
                            expediente: expediente.numeroExpediente,
                            fecha: expediente.fechaExpediente,
                            pdfPath: expediente.pdfPathActa,
                            tarjetasAsociadas: []
                        };
                    }
                });
                
                console.log('✅ Expedientes con tarjetas procesados:', expedientesConTarjetas.length);
                return expedientesConTarjetas;
            } catch (error) {
                console.error('❌ Error en obtener-todos-expedientes:', error);
                throw error;
            }
        });

        // Crear nuevo expediente (Acta de Resolución completa)
        ipcMain.handle('crear-expediente', async (event, expedienteData) => {
            try {
                console.log('📥 Solicitud crear expediente:', expedienteData);
                const result = await this.expedienteService.createExpediente(expedienteData);

                // Notificar a todas las ventanas
                const payload = {
                    expediente: {
                        ...result.expediente,
                        // Mapeo para compatibilidad
                        expediente: result.expediente.numeroExpediente,
                        fecha: result.expediente.fechaExpediente,
                        pdfPath: result.expediente.pdfPathActa
                    },
                    tarjetas: result.tarjetas
                };

                BrowserWindow.getAllWindows().forEach(win => {
                    win.webContents.send('expediente-guardado', payload);
                });

                return result;
            } catch (error) {
                console.error('❌ Error en crear-expediente:', error);
                return {
                    success: false,
                    message: error.message || 'Error al crear expediente',
                    error
                };
            }
        });

        // Actualizar expediente existente
        ipcMain.handle('actualizar-expediente', async (event, expedienteId, expedienteData) => {
            try {
                console.log('📥 Solicitud actualizar expediente ID:', expedienteId, `(tipo: ${typeof expedienteId})`);
                console.log('📝 Datos a actualizar:', expedienteData);
                const result = await this.expedienteService.updateExpediente(expedienteId, expedienteData);
                console.log('✅ Expediente actualizado exitosamente');

                // Notificar a todas las ventanas
                const payload = {
                    expediente: {
                        ...result.expediente,
                        // Mapeo para compatibilidad
                        expediente: result.expediente.numeroExpediente,
                        fecha: result.expediente.fechaExpediente,
                        pdfPath: result.expediente.pdfPathActa
                    },
                    tarjetas: result.tarjetas
                };

                BrowserWindow.getAllWindows().forEach(win => {
                    win.webContents.send('expediente-actualizado', payload);
                });

                return result;
            } catch (error) {
                console.error('❌ Error en actualizar-expediente:', error);
                return {
                    success: false,
                    message: error.message || 'Error al actualizar expediente',
                    error
                };
            }
        });

        // Obtener información para confirmación de eliminación
        ipcMain.handle('obtener-info-eliminacion', (event, expedienteId) => {
            try {
                console.log('📥 Solicitud obtener info para eliminación:', expedienteId);
                
                // Obtener expediente
                const expediente = this.db.expedientes.findOne({ _id: expedienteId });
                if (!expediente) {
                    return {
                        success: false,
                        error: 'Expediente no encontrado'
                    };
                }

                // Obtener tarjetas asociadas
                const tarjetas = this.db.tarjetas.find({ resolucionId: expedienteId });
                
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
                        tarjetas: tarjetas.map(t => ({
                            _id: t._id,
                            placa: t.placa,
                            tarjeta: t.numeroTarjeta,
                            pdfPath: t.pdfPath
                        })),
                        summary
                    }
                };
            } catch (error) {
                console.error('❌ Error en obtener-info-eliminacion:', error);
                return {
                    success: false,
                    error: error.message || 'Error al obtener información'
                };
            }
        });

        // Eliminar expediente con cascada (tarjetas y archivos)
        ipcMain.handle('eliminar-expediente', async (event, expedienteId) => {
            try {
                console.log('📥 Solicitud eliminar expediente:', expedienteId);
                const result = await this.expedienteService.deleteExpediente(expedienteId);

                // Notificar a todas las ventanas
                BrowserWindow.getAllWindows().forEach(win => {
                    win.webContents.send('expediente-eliminado', {
                        expedienteId,
                        summary: result.summary
                    });
                });

                return result;
            } catch (error) {
                console.error('❌ Error en eliminar-expediente:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar expediente',
                    error
                };
            }
        });

        // Guardar expediente (alias de crear para compatibilidad)
        ipcMain.handle('guardar-expediente', async (event, expedienteData) => {
            try {
                console.log('📥 Solicitud guardar expediente (compatibilidad):', expedienteData);
                const result = await this.expedienteService.createExpediente(expedienteData);

                const datosCompletos = {
                    expediente: {
                        ...result.expediente,
                        expediente: result.expediente.numeroExpediente,
                        fecha: result.expediente.fechaExpediente,
                        pdfPath: result.expediente.pdfPathActa
                    },
                    tarjetas: result.tarjetas
                };

                BrowserWindow.getAllWindows().forEach(win => {
                    win.webContents.send('expediente-guardado', datosCompletos);
                });

                return result;
            } catch (error) {
                console.error('❌ Error en guardar-expediente:', error);
                return { 
                    success: false, 
                    message: error.message || 'Error al guardar el expediente.' 
                };
            }
        });

        // Buscar expedientes por término de búsqueda
        ipcMain.handle('buscar-expediente', (event, searchTerm) => {
            try {
                console.log('📥 Solicitud buscar expediente:', searchTerm);
                
                // Usar el servicio para búsqueda
                const expedientes = this.expedienteService.searchExpedientes(searchTerm);
                
                if (expedientes.length === 0) {
                    return { success: true, data: [] };
                }
                
                // Formatear resultados con tarjetas asociadas
                const resultados = expedientes.map((expediente) => {
                    // Buscar tarjetas asociadas
                    const tarjetasAsociadas = this.db.tarjetas.find({ resolucionId: expediente._id });

                    return {
                        _id: expediente._id,
                        // Mapeo de campos para compatibilidad
                        expediente: expediente.numeroExpediente,
                        fecha: expediente.fechaExpediente,
                        pdfPath: expediente.pdfPathActa,
                        // Campos nuevos
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
                        tarjetasAsociadas: tarjetasAsociadas.map(t => ({
                            _id: t._id,
                            placa: t.placa,
                            tarjeta: t.numeroTarjeta,
                            numeroTarjeta: t.numeroTarjeta,
                            pdfPath: t.pdfPath
                        }))
                    };
                });
                
                console.log(`✅ Búsqueda de expedientes: ${resultados.length} resultados`);
                return { success: true, data: resultados };
            } catch (error) {
                console.error('❌ Error en buscar-expediente:', error);
                return { 
                    success: false, 
                    message: error.message || 'Error al buscar expediente.' 
                };
            }
        });

        // Obtener estadísticas de expedientes
        ipcMain.handle('expediente:estadisticas', () => {
            try {
                console.log('📥 Solicitud estadísticas de expedientes');
                
                const todosExpedientes = this.db.expedientes.find({});
                const expedientesConTarjetas = todosExpedientes.filter(exp => {
                    const tarjetas = this.db.tarjetas.find({ resolucionId: exp._id });
                    return tarjetas.length > 0;
                });

                const totalTarjetas = this.db.tarjetas.find({}).length;

                return {
                    success: true,
                    estadisticas: {
                        totalExpedientes: todosExpedientes.length,
                        expedientesConTarjetas: expedientesConTarjetas.length,
                        expedientesSinTarjetas: todosExpedientes.length - expedientesConTarjetas.length,
                        totalTarjetas: totalTarjetas,
                        promedioTarjetasPorExpediente: todosExpedientes.length > 0 
                            ? (totalTarjetas / todosExpedientes.length).toFixed(2) 
                            : 0
                    }
                };
            } catch (error) {
                console.error('❌ Error en expediente:estadisticas:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener estadísticas'
                };
            }
        });

        console.log('✅ Manejadores IPC de Expedientes registrados exitosamente');
    }

    /**
     * Remover todos los manejadores IPC (útil para cleanup)
     */
    removeHandlers() {
        const handlers = [
            'obtener-expediente-detalle',
            'obtener-todos-expedientes',
            'crear-expediente',
            'actualizar-expediente',
            'obtener-info-eliminacion',
            'eliminar-expediente',
            'guardar-expediente',
            'buscar-expediente',
            'expediente:estadisticas'
        ];

        handlers.forEach(handler => {
            ipcMain.removeHandler(handler);
        });

        console.log('🗑️ Manejadores IPC de Expedientes removidos');
    }
}

module.exports = ExpedienteHandlers;
