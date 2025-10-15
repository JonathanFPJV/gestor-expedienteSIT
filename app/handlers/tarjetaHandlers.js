// app/handlers/tarjetaHandlers.js
/**
 * Manejadores IPC para operaciones de Tarjetas
 * Define los canales de comunicación entre el renderer y el main process
 */

const { ipcMain } = require('electron');
const TarjetaService = require('../services/tarjetaService');

class TarjetaHandlers {
    constructor(db, fileHandlers = null) {
        this.tarjetaService = new TarjetaService(db, fileHandlers);
        this.fileHandlers = fileHandlers;
    }

    /**
     * Registrar todos los manejadores IPC para tarjetas
     */
    registerHandlers() {
        console.log('📝 Registrando manejadores IPC para Tarjetas...');

        // Crear nueva tarjeta
        ipcMain.handle('tarjeta:crear', async (event, tarjetaData, pdfFilePath = null) => {
            try {
                console.log('📥 Solicitud crear tarjeta:', tarjetaData);
                return await this.tarjetaService.createTarjeta(tarjetaData, pdfFilePath);
            } catch (error) {
                console.error('❌ Error en tarjeta:crear:', error);
                return {
                    success: false,
                    message: error.message || 'Error al crear tarjeta'
                };
            }
        });

        // Obtener todas las tarjetas
        ipcMain.handle('tarjeta:obtener-todas', async (event, filtros = {}) => {
            try {
                console.log('📥 Solicitud obtener todas las tarjetas');
                return await this.tarjetaService.getTarjetas(filtros);
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
        ipcMain.handle('tarjeta:obtener-por-id', async (event, tarjetaId) => {
            try {
                console.log('📥 Solicitud obtener tarjeta por ID:', tarjetaId);
                return await this.tarjetaService.getTarjetaById(tarjetaId);
            } catch (error) {
                console.error('❌ Error en tarjeta:obtener-por-id:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener tarjeta'
                };
            }
        });

        // Buscar tarjetas
        ipcMain.handle('tarjeta:buscar', async (event, searchTerm) => {
            try {
                console.log('📥 Solicitud buscar tarjetas:', searchTerm);
                return await this.tarjetaService.searchTarjetas(searchTerm);
            } catch (error) {
                console.error('❌ Error en tarjeta:buscar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al buscar tarjetas',
                    tarjetas: []
                };
            }
        });

        // Obtener tarjetas por expediente
        ipcMain.handle('tarjeta:obtener-por-expediente', async (event, expedienteId) => {
            try {
                console.log('📥 Solicitud obtener tarjetas por expediente:', expedienteId);
                return await this.tarjetaService.getTarjetasByExpediente(expedienteId);
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
        ipcMain.handle('tarjeta:actualizar', async (event, tarjetaId, updateData, pdfFilePath = null) => {
            try {
                console.log('📥 Solicitud actualizar tarjeta:', tarjetaId, updateData);
                return await this.tarjetaService.updateTarjeta(tarjetaId, updateData, pdfFilePath);
            } catch (error) {
                console.error('❌ Error en tarjeta:actualizar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al actualizar tarjeta'
                };
            }
        });

        // Eliminar tarjeta
        ipcMain.handle('tarjeta:eliminar', async (event, tarjetaId) => {
            try {
                console.log('📥 Solicitud eliminar tarjeta:', tarjetaId);
                return await this.tarjetaService.deleteTarjeta(tarjetaId);
            } catch (error) {
                console.error('❌ Error en tarjeta:eliminar:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar tarjeta'
                };
            }
        });

        // Eliminar tarjetas por expediente
        ipcMain.handle('tarjeta:eliminar-por-expediente', async (event, expedienteId) => {
            try {
                console.log('📥 Solicitud eliminar tarjetas por expediente:', expedienteId);
                return await this.tarjetaService.deleteTarjetasByExpediente(expedienteId);
            } catch (error) {
                console.error('❌ Error en tarjeta:eliminar-por-expediente:', error);
                return {
                    success: false,
                    message: error.message || 'Error al eliminar tarjetas del expediente'
                };
            }
        });

        // Obtener estadísticas de tarjetas
        ipcMain.handle('tarjeta:estadisticas', async () => {
            try {
                console.log('📥 Solicitud estadísticas de tarjetas');
                return await this.tarjetaService.getEstadisticas();
            } catch (error) {
                console.error('❌ Error en tarjeta:estadisticas:', error);
                return {
                    success: false,
                    message: error.message || 'Error al obtener estadísticas'
                };
            }
        });

        console.log('✅ Manejadores IPC de Tarjetas registrados exitosamente');

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
            ipcMain.handle('tarjeta:abrir-pdf', async (event, pdfPath) => {
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
            'tarjeta:seleccionar-pdf',
            'tarjeta:abrir-pdf'
        ];

        handlers.forEach(handler => {
            ipcMain.removeHandler(handler);
        });

        console.log('🗑️ Manejadores IPC de Tarjetas removidos');
    }
}

module.exports = TarjetaHandlers;
