// app/handlers/fileHandlers/dialogManager.js
/**
 * Gestor de Diálogos
 * 
 * Responsabilidades:
 * - Abrir diálogos de selección de archivos PDF
 * - Mostrar diálogos de error
 * - Gestionar interacción con el usuario
 * 
 * @module dialogManager
 */

const { dialog } = require('electron');

/**
 * Abre un diálogo para seleccionar un archivo PDF
 * 
 * Configuración:
 * - Solo permite seleccionar 1 archivo
 * - Filtro: solo archivos .pdf
 * - Título personalizado
 * 
 * @returns {Promise<string|null>} Ruta del archivo seleccionado o null si cancela
 * 
 * @example
 * const pdfPath = await openPdfDialog();
 * if (pdfPath) {
 *   console.log('PDF seleccionado:', pdfPath);
 * }
 */
async function openPdfDialog() {
    console.log('📂 Abriendo diálogo de selección de PDF...');
    
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
            title: 'Seleccionar archivo PDF'
        });
        
        console.log('Diálogo cerrado. Cancelado:', canceled, 'Archivos:', filePaths);
        return canceled ? null : filePaths[0];
    } catch (error) {
        console.error('❌ Error al abrir diálogo:', error);
        return null;
    }
}

/**
 * Muestra un diálogo de error al usuario
 * 
 * @param {string} title - Título del diálogo
 * @param {string} message - Mensaje de error
 * 
 * @example
 * showErrorDialog('Archivo no encontrado', 'El PDF no existe en la ubicación especificada.');
 */
function showErrorDialog(title, message) {
    console.error(`❌ ${title}: ${message}`);
    dialog.showErrorBox(title, message);
}

module.exports = {
    openPdfDialog,
    showErrorDialog
};
