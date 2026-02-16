// app/handlers/tarjetaHandlers/updateHandler.js
/**
 * Handler para actualizar tarjetas
 * Responsabilidad: Manejar la actualización de tarjetas existentes
 */

const { handleError } = require('./utils');

/**
 * Registra el handler para actualizar tarjetas
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} tarjetaService - Servicio de tarjetas
 */
function registerUpdateHandler(ipcMain, tarjetaService) {
    ipcMain.handle('tarjeta:actualizar', handleError(
        async (tarjetaId, updateData, pdfFilePath = null) => {
            console.log('Solicitud actualizar tarjeta:', tarjetaId, updateData);
            return await tarjetaService.updateTarjeta(tarjetaId, updateData, pdfFilePath);
        },
        'Error al actualizar tarjeta'
    ));
}

module.exports = registerUpdateHandler;
