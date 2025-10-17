// app/handlers/actaEntregaHandlers.js
/**
 * Manejadores IPC para operaciones de Actas de Entrega
 * Trabaja con la estructura existente de la BD
 */

const { ipcMain } = require('electron');
const ActaEntregaService = require('../services/actaEntregaService');

class ActaEntregaHandlers {
    constructor(db, fileHandlers = null) {
        this.db = db;
        this.actaEntregaService = new ActaEntregaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
    }

    /**
     * Registrar todos los manejadores IPC para actas de entrega
     */
    registerHandlers() {
        console.log('📝 Registrando manejadores IPC para Actas de Entrega...');

        // Crear nueva acta de entrega
        ipcMain.handle('acta-entrega:crear', async (event, actaData, pdfFilePath = null, metadata = {}) => {
            try {
                console.log('📥 Solicitud crear acta de entrega:', actaData);
                return await this.actaEntregaService.createActaEntrega(actaData, pdfFilePath, metadata);
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
                return this.actaEntregaService.getActasEntrega(filtros);
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
                return this.actaEntregaService.getActaEntregaById(actaId);
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
        ipcMain.handle('acta-entrega:actualizar', (event, actaId, updateData) => {
            try {
                console.log('📥 Solicitud actualizar acta de entrega:', actaId);
                return this.actaEntregaService.updateActaEntrega(actaId, updateData);
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
                return this.actaEntregaService.deleteActaEntrega(actaId);
            } catch (error) {
                console.error('❌ Error en acta-entrega:eliminar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar acta de entrega'
                };
            }
        });

        // Obtener tarjetas de un acta
        ipcMain.handle('acta-entrega:obtener-tarjetas', (event, actaId) => {
            try {
                console.log('📥 Solicitud obtener tarjetas del acta:', actaId);
                return this.actaEntregaService.getTarjetasByActa(actaId);
            } catch (error) {
                console.error('❌ Error en acta-entrega:obtener-tarjetas:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener tarjetas',
                    tarjetas: []
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
