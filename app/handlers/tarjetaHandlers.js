// app/handlers/tarjetaHandlers.js
/**
 * Manejadores IPC para operaciones de Tarjetas
 * Define los canales de comunicación entre el renderer y el main process
 */

const { ipcMain } = require('electron');
const TarjetaService = require('../services/tarjetaService');

class TarjetaHandlers {
    constructor(db, fileHandlers = null) {
        this.db = db; // ✅ Guardar referencia a la base de datos
        this.tarjetaService = new TarjetaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
    }

    /**
     * Registrar todos los manejadores IPC para tarjetas
     */
    registerHandlers() {
        console.log('📝 Registrando manejadores IPC para Tarjetas...');

        // Crear nueva tarjeta
        ipcMain.handle('tarjeta:crear', (event, tarjetaData, pdfFilePath = null) => {
            try {
                console.log('📥 Solicitud crear tarjeta:', tarjetaData);
                return this.tarjetaService.createTarjeta(tarjetaData, pdfFilePath);
            } catch (error) {
                console.error('❌ Error en tarjeta:crear:', error);
                return {
                    success: false,
                    message: error.message || 'Error al crear tarjeta'
                };
            }
        });

        // Obtener todas las tarjetas
        ipcMain.handle('tarjeta:obtener-todas', (event, filtros = {}) => {
            try {
                console.log('📥 Solicitud obtener todas las tarjetas');
                return this.tarjetaService.getTarjetas(filtros);
            } catch (error) {
                console.error('❌ Error en tarjeta:obtener-todas:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener tarjetas',
                    tarjetas: []
                };
            }
        });

        // Obtener tarjeta por ID
        ipcMain.handle('tarjeta:obtener-por-id', (event, tarjetaId) => {
            try {
                console.log('📥 Solicitud obtener tarjeta por ID:', tarjetaId);
                return this.tarjetaService.getTarjetaById(tarjetaId);
            } catch (error) {
                console.error('❌ Error en tarjeta:obtener-por-id:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener tarjeta'
                };
            }
        });

        // Buscar tarjetas
        ipcMain.handle('tarjeta:buscar', (event, searchTerm) => {
            try {
                console.log('📥 Solicitud buscar tarjetas:', searchTerm);
                return this.tarjetaService.searchTarjetas(searchTerm);
            } catch (error) {
                console.error('❌ Error en tarjeta:buscar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al buscar tarjetas',
                    tarjetas: []
                };
            }
        });

        // Obtener tarjetas por expediente (resolución)
        ipcMain.handle('tarjeta:obtener-por-expediente', (event, expedienteId) => {
            try {
                console.log('📥 Solicitud obtener tarjetas por expediente:', expedienteId);
                return this.tarjetaService.getTarjetasByExpediente(expedienteId);
            } catch (error) {
                console.error('❌ Error en tarjeta:obtener-por-expediente:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener tarjetas del expediente',
                    tarjetas: []
                };
            }
        });

        // Actualizar tarjeta
        ipcMain.handle('tarjeta:actualizar', (event, tarjetaId, updateData, pdfFilePath = null) => {
            try {
                console.log('📥 Solicitud actualizar tarjeta:', tarjetaId, updateData);
                return this.tarjetaService.updateTarjeta(tarjetaId, updateData, pdfFilePath);
            } catch (error) {
                console.error('❌ Error en tarjeta:actualizar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al actualizar tarjeta'
                };
            }
        });

        // Eliminar tarjeta
        ipcMain.handle('tarjeta:eliminar', (event, tarjetaId) => {
            try {
                console.log('📥 Solicitud eliminar tarjeta:', tarjetaId);
                return this.tarjetaService.deleteTarjeta(tarjetaId);
            } catch (error) {
                console.error('❌ Error en tarjeta:eliminar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar tarjeta'
                };
            }
        });

        // Eliminar tarjetas por expediente
        ipcMain.handle('tarjeta:eliminar-por-expediente', (event, expedienteId) => {
            try {
                console.log('📥 Solicitud eliminar tarjetas por expediente:', expedienteId);
                return this.tarjetaService.deleteTarjetasByExpediente(expedienteId);
            } catch (error) {
                console.error('❌ Error en tarjeta:eliminar-por-expediente:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar tarjetas del expediente'
                };
            }
        });

        // Obtener estadísticas de tarjetas
        ipcMain.handle('tarjeta:estadisticas', () => {
            try {
                console.log('📥 Solicitud estadísticas de tarjetas');
                return this.tarjetaService.getEstadisticas();
            } catch (error) {
                console.error('❌ Error en tarjeta:estadisticas:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener estadísticas'
                };
            }
        });

        // Buscar tarjeta por placa específica
        ipcMain.handle('tarjeta:buscar-por-placa', (event, placa) => {
            try {
                console.log('📥 Solicitud buscar tarjeta por placa:', placa);
                return this.tarjetaService.getTarjetaByPlaca(placa);
            } catch (error) {
                console.error('❌ Error en tarjeta:buscar-por-placa:', error);
                return {
                    success: false,
                    message: error.message || 'Error al buscar tarjeta por placa',
                    tarjeta: null
                };
            }
        });

        // Obtener tarjetas por acta de entrega
        ipcMain.handle('tarjeta:obtener-por-acta-entrega', (event, actaEntregaId) => {
            try {
                console.log('📥 Solicitud obtener tarjetas por acta de entrega:', actaEntregaId);
                return this.tarjetaService.getTarjetasByActaEntrega(actaEntregaId);
            } catch (error) {
                console.error('❌ Error en tarjeta:obtener-por-acta-entrega:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener tarjetas por acta de entrega',
                    tarjetas: []
                };
            }
        });

        // Buscar tarjeta (compatibilidad - búsqueda general)
        ipcMain.handle('buscar-tarjeta', (event, searchTerm) => {
            try {
                console.log('📥 Solicitud buscar tarjeta (general):', searchTerm);
                
                // Buscar tarjetas por placa o número
                const tarjetas = this.tarjetaService.searchTarjetas(searchTerm);
                
                if (!tarjetas.success || tarjetas.tarjetas.length === 0) {
                    return { success: true, data: [] };
                }
                
                // Formatear resultados con datos del expediente y acta de entrega
                const resultados = tarjetas.tarjetas.map((tarjeta) => {
                    const expediente = this.db.expedientes.findOne({ _id: tarjeta.resolucionId });
                    const actaEntrega = tarjeta.actaEntregaId ? this.db.actasEntrega.findOne({ _id: tarjeta.actaEntregaId }) : null;
                    
                    return {
                        _id: tarjeta._id,
                        placa: tarjeta.placa,
                        tarjeta: tarjeta.numeroTarjeta,
                        numeroTarjeta: tarjeta.numeroTarjeta,
                        expediente: expediente ? expediente.numeroExpediente : 'N/A',
                        fecha: expediente ? expediente.fechaExpediente : 'N/A',
                        pdfPath: tarjeta.pdfPath || null,
                        expedientePdfPath: expediente ? expediente.pdfPathActa : null,
                        resolucionId: tarjeta.resolucionId,
                        actaEntregaId: tarjeta.actaEntregaId,
                        actaEntrega: actaEntrega ? {
                            _id: actaEntrega._id,
                            fechaEntrega: actaEntrega.fechaEntrega,
                            n_tarjetas_entregadas: actaEntrega.n_tarjetas_entregadas
                        } : null
                    };
                });
                
                return { success: true, data: resultados };
            } catch (error) {
                console.error('❌ Error en buscar-tarjeta:', error);
                return { 
                    success: false, 
                    message: error.message || 'Error al buscar tarjeta.',
                    data: []
                };
            }
        });

        console.log('✅ Manejadores IPC de Tarjetas registrados exitosamente (14 canales)');

        // Handlers adicionales para archivos PDF
        if (this.fileHandlers) {
            // Seleccionar PDF para tarjeta
            ipcMain.handle('tarjeta:seleccionar-pdf', async () => {
                try {
                    return await this.fileHandlers.openPdfDialog();
                } catch (error) {
                    console.error('❌ Error al seleccionar PDF:', error);
                    return null;
                }
            });

            // Abrir PDF de tarjeta
            ipcMain.handle('tarjeta:abrir-pdf', (event, pdfPath) => {
                try {
                    this.fileHandlers.openPdf(pdfPath);
                    return { success: true };
                } catch (error) {
                    console.error('❌ Error al abrir PDF:', error);
                    return { success: false, message: error.message };
                }
            });
        }
    }

    /**
     * Remover todos los manejadores IPC (útil para cleanup)
     */
    removeHandlers() {
        const handlers = [
            'tarjeta:crear',
            'tarjeta:obtener-todas',
            'tarjeta:obtener-por-id',
            'tarjeta:buscar',
            'tarjeta:obtener-por-expediente',
            'tarjeta:actualizar',
            'tarjeta:eliminar',
            'tarjeta:eliminar-por-expediente',
            'tarjeta:estadisticas',
            'tarjeta:buscar-por-placa',
            'tarjeta:obtener-por-acta-entrega',
            'tarjeta:seleccionar-pdf',
            'tarjeta:abrir-pdf',
            'buscar-tarjeta'
        ];

        handlers.forEach(handler => {
            ipcMain.removeHandler(handler);
        });

        console.log('🗑️ Manejadores IPC de Tarjetas removidos');
    }
}

module.exports = TarjetaHandlers;
