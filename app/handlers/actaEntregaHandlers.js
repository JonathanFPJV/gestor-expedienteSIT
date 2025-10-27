// app/handlers/actaEntregaHandlers.js
/**
 * Manejadores IPC para operaciones de Actas de Entrega
 * Compatible con SQLite3 y patrón reactivo
 */

const { ipcMain, BrowserWindow } = require('electron');
const ActaEntregaService = require('../services/actaEntregaService');

class ActaEntregaHandlers {
    constructor(db, fileHandlers = null) {
        console.log('🔍 ActaEntregaHandlers constructor:');
        console.log('   - db recibido:', !!db);
        console.log('   - Tipo de db:', typeof db);
        console.log('   - Tiene prepare?:', typeof db?.prepare);
        console.log('   - Constructor:', db?.constructor?.name);
        
        this.db = db;
        this.actaEntregaService = new ActaEntregaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
    }

    /**
     * Notificar a todas las ventanas sobre cambios en actas
     */
    _broadcastToAllWindows(channel, payload) {
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed()) {
                win.webContents.send(channel, payload);
            }
        });
    }

    /**
     * Registrar todos los manejadores IPC para actas de entrega
     */
    registerHandlers() {
        console.log('📝 Registrando manejadores IPC para Actas de Entrega...');

        // Crear nueva acta de entrega
        ipcMain.handle('acta-entrega:crear', (event, actaData, tarjetasIds = []) => {
            try {
                console.log('📥 Solicitud crear acta de entrega:', actaData);
                const result = this.actaEntregaService.createActaEntrega(actaData, tarjetasIds);
                
                if (result.success) {
                    // Notificar a todas las ventanas
                    this._broadcastToAllWindows('acta-entrega-creada', {
                        acta: result.acta
                    });
                }
                
                return result;
            } catch (error) {
                console.error('❌ Error en acta-entrega:crear:', error);
                return {
                    success: false,
                    message: error.message || 'Error al crear acta de entrega'
                };
            }
        });

        // Obtener todas las actas de entrega
        ipcMain.handle('acta-entrega:obtener-todas', (event, filtros = {}) => {
            try {
                console.log('📥 Solicitud obtener todas las actas de entrega');
                const actas = this.actaEntregaService.getAllActasEntrega(filtros);
                
                return {
                    success: true,
                    actas: actas,
                    count: actas.length
                };
            } catch (error) {
                console.error('❌ Error en acta-entrega:obtener-todas:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener actas de entrega',
                    actas: []
                };
            }
        });

        // Obtener acta de entrega por ID
        ipcMain.handle('acta-entrega:obtener-por-id', (event, actaId) => {
            try {
                console.log('📥 Solicitud obtener acta de entrega por ID:', actaId);
                const acta = this.actaEntregaService.getActaEntregaById(actaId);
                
                return {
                    success: true,
                    acta: acta
                };
            } catch (error) {
                console.error('❌ Error en acta-entrega:obtener-por-id:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener acta de entrega',
                    acta: null
                };
            }
        });

        // Actualizar acta de entrega
        ipcMain.handle('acta-entrega:actualizar', (event, actaId, actaData, tarjetasIds = null) => {
            try {
                console.log('📥 Solicitud actualizar acta de entrega:', actaId);
                const result = this.actaEntregaService.updateActaEntrega(actaId, actaData, tarjetasIds);
                
                if (result.success) {
                    // Notificar a todas las ventanas
                    this._broadcastToAllWindows('acta-entrega-actualizada', {
                        acta: result.acta
                    });
                }
                
                return result;
            } catch (error) {
                console.error('❌ Error en acta-entrega:actualizar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al actualizar acta de entrega'
                };
            }
        });

        // Eliminar acta de entrega
        ipcMain.handle('acta-entrega:eliminar', (event, actaId) => {
            try {
                console.log('📥 Solicitud eliminar acta de entrega:', actaId);
                const result = this.actaEntregaService.deleteActaEntrega(actaId);
                
                if (result.success) {
                    // Notificar a todas las ventanas
                    this._broadcastToAllWindows('acta-entrega-eliminada', {
                        actaId: actaId,
                        summary: result.summary
                    });
                }
                
                return result;
            } catch (error) {
                console.error('❌ Error en acta-entrega:eliminar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar acta de entrega'
                };
            }
        });

        // Obtener información para eliminar
        ipcMain.handle('acta-entrega:info-eliminar', (event, actaId) => {
            try {
                console.log('📥 Solicitud info para eliminar acta:', actaId);
                const info = this.actaEntregaService.getDeleteInfo(actaId);
                
                return {
                    success: true,
                    info: info
                };
            } catch (error) {
                console.error('❌ Error en acta-entrega:info-eliminar:', error);
                return {
                    success: false,
                    message: error.message
                };
            }
        });

        // Buscar actas de entrega
        ipcMain.handle('acta-entrega:buscar', (event, searchTerm) => {
            try {
                console.log('📥 Solicitud buscar actas:', searchTerm);
                const actas = this.actaEntregaService.searchActasEntrega(searchTerm);
                
                return {
                    success: true,
                    actas: actas,
                    count: actas.length
                };
            } catch (error) {
                console.error('❌ Error en acta-entrega:buscar:', error);
                return {
                    success: false,
                    message: error.message,
                    actas: []
                };
            }
        });

        // Obtener tarjetas disponibles
        ipcMain.handle('acta-entrega:tarjetas-disponibles', (event) => {
            try {
                console.log('📥 Solicitud tarjetas disponibles');
                const tarjetas = this.actaEntregaService.getTarjetasDisponibles();
                
                return {
                    success: true,
                    tarjetas: tarjetas,
                    count: tarjetas.length
                };
            } catch (error) {
                console.error('❌ Error en acta-entrega:tarjetas-disponibles:', error);
                return {
                    success: false,
                    message: error.message,
                    tarjetas: []
                };
            }
        });

        // Obtener estadísticas
        ipcMain.handle('acta-entrega:estadisticas', (event) => {
            try {
                console.log('📥 Solicitud estadísticas de actas');
                const stats = this.actaEntregaService.getEstadisticas();
                
                return {
                    success: true,
                    estadisticas: stats
                };
            } catch (error) {
                console.error('❌ Error en acta-entrega:estadisticas:', error);
                return {
                    success: false,
                    message: error.message
                };
            }
        });

        console.log('✅ Manejadores IPC de Actas de Entrega registrados exitosamente');

        // Handlers adicionales para archivos PDF
        if (this.fileHandlers) {
            // Seleccionar PDF para acta de entrega
            ipcMain.handle('acta-entrega:seleccionar-pdf', async () => {
                try {
                    return await this.fileHandlers.openPdfDialog();
                } catch (error) {
                    console.error('❌ Error al seleccionar PDF:', error);
                    return null;
                }
            });

            // Abrir PDF de acta de entrega
            ipcMain.handle('acta-entrega:abrir-pdf', (event, pdfPath) => {
                try {
                    return this.fileHandlers.openPdfExternal(pdfPath);
                } catch (error) {
                    console.error('❌ Error al abrir PDF:', error);
                    return { success: false, message: 'Error al abrir el PDF' };
                }
            });
        }
    }
}

module.exports = ActaEntregaHandlers;
