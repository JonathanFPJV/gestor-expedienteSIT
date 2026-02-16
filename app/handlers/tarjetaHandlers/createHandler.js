// app/handlers/tarjetaHandlers/createHandler.js
/**
 * Handler para crear tarjetas
 * Responsabilidad: Manejar la creación de nuevas tarjetas
 */

const { handleError } = require('./utils');

/**
 * Registra el handler para crear tarjetas
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} tarjetaService - Servicio de tarjetas
 */
function registerCreateHandler(ipcMain, tarjetaService) {
    ipcMain.handle('tarjeta:crear', handleError(
        async (tarjetaData, pdfFilePath = null) => {
            console.log('Solicitud crear tarjeta:', tarjetaData);
            return await tarjetaService.createTarjeta(tarjetaData, pdfFilePath);
        },
        'Error al crear tarjeta'
    ));
}

module.exports = registerCreateHandler;
