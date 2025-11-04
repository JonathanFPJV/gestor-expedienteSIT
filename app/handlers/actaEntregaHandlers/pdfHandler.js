// app/handlers/actaEntregaHandlers/pdfHandler.js
/**
 * Handlers de PDF para Actas de Entrega
 * 
 * Responsabilidades:
 * - Seleccionar archivo PDF
 * - Abrir PDF con aplicación externa
 * 
 * Canales IPC: 2
 * - acta-entrega:seleccionar-pdf
 * - acta-entrega:abrir-pdf
 * 
 * @module actaEntregaHandlers/pdfHandler
 */

const { ipcMain } = require('electron');

/**
 * Registra los handlers de PDF de actas de entrega
 * Solo se registran si fileHandlers está disponible
 * 
 * @param {FileHandlers} fileHandlers - Gestor de archivos (opcional)
 */
function registerPdfHandlers(fileHandlers) {
    if (!fileHandlers) {
        console.log('⚠️ PDF Handlers no registrados (fileHandlers no disponible)');
        return;
    }

    console.log('📄 Registrando handlers de PDF de actas de entrega...');

    /**
     * Abrir diálogo para seleccionar archivo PDF
     * Usa el fileHandlers para mostrar el diálogo del sistema
     */
    ipcMain.handle('acta-entrega:seleccionar-pdf', async () => {
        try {
            console.log('📂 Abriendo diálogo de selección de PDF para acta...');
            const pdfPath = await fileHandlers.openPdfDialog();
            
            if (pdfPath) {
                console.log('✅ PDF seleccionado:', pdfPath);
            } else {
                console.log('❌ Selección de PDF cancelada');
            }
            
            return pdfPath;
        } catch (error) {
            console.error('❌ Error al seleccionar PDF:', error);
            return null;
        }
    });

    /**
     * Abrir archivo PDF con aplicación externa
     * Usa el fileHandlers para abrir con el sistema
     */
    ipcMain.handle('acta-entrega:abrir-pdf', (event, pdfPath) => {
        try {
            if (!pdfPath) {
                console.warn('⚠️ No se proporcionó ruta de PDF');
                return { success: false, message: 'Ruta de PDF no proporcionada' };
            }

            console.log('🔗 Abriendo PDF de acta:', pdfPath);
            
            // Verificar si existe el método correcto
            if (typeof fileHandlers.openPdfExternal === 'function') {
                return fileHandlers.openPdfExternal(pdfPath);
            } else if (typeof fileHandlers.openPdf === 'function') {
                fileHandlers.openPdf(pdfPath);
                return { success: true };
            } else {
                console.error('❌ FileHandlers no tiene método para abrir PDF');
                return { success: false, message: 'Método de apertura de PDF no disponible' };
            }
        } catch (error) {
            console.error('❌ Error al abrir PDF:', error);
            return { 
                success: false, 
                message: error.message || 'Error al abrir el PDF' 
            };
        }
    });

    console.log('✅ PDF Handlers registrados (2 canales)');
}

module.exports = registerPdfHandlers;
