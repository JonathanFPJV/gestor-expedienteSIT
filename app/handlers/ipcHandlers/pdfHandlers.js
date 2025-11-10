// app/handlers/ipcHandlers/pdfHandlers.js
/**
 * Handlers para operaciones con archivos PDF
 * Responsabilidad: Manejar apertura, lectura, descarga y diálogos de PDFs
 */

const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');

/**
 * Registra handlers de operaciones con PDFs
 * @param {Object} fileHandlers - Instancia de FileHandlers
 */
function registerPdfHandlers(fileHandlers) {
    /**
     * Abre un diálogo para seleccionar un archivo PDF
     * Usado por los formularios de expedientes y tarjetas
     */
    ipcMain.handle('abrir-dialogo-pdf', async () => {
        try {
            const result = await fileHandlers.openPdfDialog();
            console.log('📂 Diálogo PDF abierto:', result ? 'Archivo seleccionado' : 'Cancelado');
            return result;
        } catch (error) {
            console.error('❌ Error en el diálogo de PDF:', error);
            return null;
        }
    });

    /**
     * Obtiene los datos binarios de un archivo PDF
     * Usado para visualizar PDFs en el renderer
     */
    ipcMain.handle('obtener-pdf-data', async (event, fileName) => {
        try {
            const filePath = fileHandlers.getFullPath(fileName);
            if (fs.existsSync(filePath)) {
                console.log('📄 PDF leído:', fileName);
                return fs.promises.readFile(filePath);
            }
            console.warn('⚠️ PDF no encontrado:', fileName);
            return null;
        } catch (error) {
            console.error('❌ Error al obtener datos del PDF:', error);
            return null;
        }
    });

    /**
     * Abre un archivo PDF con la aplicación predeterminada del sistema
     */
    ipcMain.on('abrir-pdf', (event, fileName) => {
        console.log('🔗 Abriendo PDF con shell:', fileName);
        fileHandlers.openPdf(fileName);
    });

    /**
     * Lee un archivo PDF completo y devuelve su contenido como ArrayBuffer
     * Usado para OCR y procesamiento de PDFs
     */
    ipcMain.handle('leer-archivo-pdf', async (event, pdfPath) => {
        try {
            console.log('📖 Leyendo archivo PDF para OCR:', pdfPath);
            
            if (!fs.existsSync(pdfPath)) {
                console.error('❌ Archivo PDF no existe:', pdfPath);
                throw new Error(`Archivo no encontrado: ${pdfPath}`);
            }
            
            // Leer el archivo como buffer
            const buffer = await fs.promises.readFile(pdfPath);
            console.log(`✅ PDF leído exitosamente: ${buffer.length} bytes`);
            
            // Convertir a ArrayBuffer para enviar al renderer
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            
        } catch (error) {
            console.error('❌ Error al leer archivo PDF:', error);
            throw error;
        }
    });

    /**
     * Descarga un PDF con diálogo de guardar
     * Copia el archivo a la ubicación seleccionada por el usuario
     */
    ipcMain.on('descargar-pdf', async (event, fileName) => {
        try {
            // Mostrar diálogo para guardar archivo
            const result = await dialog.showSaveDialog({
                title: 'Guardar PDF',
                defaultPath: fileName.replace(/^.*[\\\/]/, ''), // Solo el nombre del archivo
                filters: [
                    { name: 'Archivos PDF', extensions: ['pdf'] }
                ]
            });
            
            if (!result.canceled && result.filePath) {
                const sourcePath = fileHandlers.getFullPath(fileName);
                
                // Copiar archivo al destino seleccionado
                await fs.promises.copyFile(sourcePath, result.filePath);
                console.log('💾 PDF descargado:', result.filePath);
                
                // Notificar éxito
                const response = await dialog.showMessageBox({
                    type: 'info',
                    title: 'Descarga Completa',
                    message: 'El PDF se ha guardado exitosamente.',
                    buttons: ['OK', 'Abrir carpeta'],
                    defaultId: 0
                });
                
                // Abrir carpeta si el usuario lo solicita
                if (response.response === 1) {
                    shell.showItemInFolder(result.filePath);
                }
            }
        } catch (error) {
            console.error('❌ Error al descargar PDF:', error);
            dialog.showErrorBox('Error', 'No se pudo descargar el archivo PDF.');
        }
    });

    console.log('✅ PDF Handlers registrados (5 canales IPC)');
}

module.exports = registerPdfHandlers;
