// app/handlers/tarjetaHandlers/pdfHandler.js
/**
 * Handlers para manejo de PDFs de tarjetas
 * Responsabilidad: Manejar operaciones con archivos PDF (seleccionar, abrir)
 */

/**
 * Registra los handlers para manejo de PDFs
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} fileHandlers - Manejador de archivos
 */
function registerPdfHandlers(ipcMain, fileHandlers) {
    if (!fileHandlers) {
        console.warn('FileHandlers no disponible, PDFs handlers no registrados');
        return;
    }

    // Seleccionar PDF para tarjeta
    ipcMain.handle('tarjeta:seleccionar-pdf', async () => {
        try {
            console.log('Solicitud seleccionar PDF');
            return await fileHandlers.openPdfDialog();
        } catch (error) {
            console.error('Error al seleccionar PDF:', error);
            return null;
        }
    });

    // Abrir PDF de tarjeta
    ipcMain.handle('tarjeta:abrir-pdf', (event, pdfPath) => {
        try {
            console.log('Solicitud abrir PDF:', pdfPath);
            fileHandlers.openPdf(pdfPath);
            return { success: true };
        } catch (error) {
            console.error('Error al abrir PDF:', error);
            return {
                success: false,
                message: error.message || 'Error al abrir PDF'
            };
        }
    });
}

module.exports = registerPdfHandlers;
