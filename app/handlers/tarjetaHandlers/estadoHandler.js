// app/handlers/tarjetaHandlers/estadoHandler.js
/**
 * Handler para gestionar el estado de tarjetas
 * Responsabilidad: Manejar operaciones de cambio de estado (extensible)
 */

const { handleError } = require('./utils');
const { getAllEstados, getInfoEstado } = require('../../config/tarjetaEstados');

/**
 * Registra los handlers para gestión de estado de tarjetas
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} tarjetaService - Servicio de tarjetas
 */
function registerEstadoHandlers(ipcMain, tarjetaService) {
    // Obtener lista de estados disponibles
    ipcMain.handle('tarjeta:obtener-estados-disponibles', handleError(
        async () => {
            console.log('Solicitud obtener estados disponibles');
            return {
                success: true,
                estados: getAllEstados()
            };
        },
        'Error al obtener estados disponibles'
    ));

    // Obtener información de un estado específico
    ipcMain.handle('tarjeta:obtener-info-estado', handleError(
        async (estado) => {
            console.log('Solicitud obtener info de estado:', estado);
            const info = getInfoEstado(estado);
            return {
                success: !!info,
                info: info,
                message: info ? 'Estado encontrado' : 'Estado no encontrado'
            };
        },
        'Error al obtener información del estado'
    ));

    // Obtener tarjetas por estado
    ipcMain.handle('tarjeta:obtener-por-estado', handleError(
        async (estado) => {
            console.log('Solicitud obtener tarjetas por estado:', estado);
            return await tarjetaService.getTarjetasByEstado(estado);
        },
        'Error al obtener tarjetas por estado'
    ));

    // Cambiar estado de tarjeta
    ipcMain.handle('tarjeta:cambiar-estado', handleError(
        async (tarjetaId, nuevoEstado) => {
            console.log('Solicitud cambiar estado de tarjeta:', tarjetaId, '→', nuevoEstado);
            return await tarjetaService.cambiarEstadoTarjeta(tarjetaId, nuevoEstado);
        },
        'Error al cambiar estado de tarjeta'
    ));

    // Cancelar tarjeta
    ipcMain.handle('tarjeta:cancelar', handleError(
        async (tarjetaId) => {
            console.log('Solicitud cancelar tarjeta:', tarjetaId);
            return await tarjetaService.cancelarTarjeta(tarjetaId);
        },
        'Error al cancelar tarjeta'
    ));

    // Activar tarjeta
    ipcMain.handle('tarjeta:activar', handleError(
        async (tarjetaId) => {
            console.log('Solicitud activar tarjeta:', tarjetaId);
            return await tarjetaService.activarTarjeta(tarjetaId);
        },
        'Error al activar tarjeta'
    ));
}

module.exports = registerEstadoHandlers;
