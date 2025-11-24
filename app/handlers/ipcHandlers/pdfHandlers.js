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

    /**
     * Crea un directorio para guardar PDFs divididos
     * Usado por el procesamiento por lotes
     */
    ipcMain.handle('crear-directorio', async (event, dirPath) => {
        try {
            if (!fs.existsSync(dirPath)) {
                await fs.promises.mkdir(dirPath, { recursive: true });
                console.log('📁 Directorio creado:', dirPath);
            }
            return dirPath;
        } catch (error) {
            console.error('❌ Error al crear directorio:', error);
            throw error;
        }
    });

    /**
     * Guarda una página de PDF individual
     * Usado por el divisor de PDFs
     */
    ipcMain.handle('guardar-pagina-pdf', async (event, outputDir, fileName, pdfBytes) => {
        try {
            const filePath = `${outputDir}\\${fileName}`;
            
            // Convertir Uint8Array a Buffer
            const buffer = Buffer.from(pdfBytes);
            
            await fs.promises.writeFile(filePath, buffer);
            console.log('💾 Página PDF guardada:', filePath);
            
            return filePath;
        } catch (error) {
            console.error('❌ Error al guardar página PDF:', error);
            throw error;
        }
    });

    /**
     * Abre diálogo para seleccionar carpeta de salida
     * Usado para guardar PDFs divididos
     */
    ipcMain.handle('abrir-dialogo-carpeta', async () => {
        try {
            const result = await dialog.showOpenDialog({
                title: 'Seleccionar carpeta de destino',
                properties: ['openDirectory', 'createDirectory']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                console.log('📂 Carpeta seleccionada:', result.filePaths[0]);
                return result.filePaths[0];
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error en diálogo de carpeta:', error);
            return null;
        }
    });

    /**
     * Imprime un PDF usando el sistema de impresión de Electron
     * Abre diálogo de impresión con opciones de configuración
     */
    ipcMain.handle('imprimir-pdf', async (event, fileName) => {
        try {
            const { BrowserWindow } = require('electron');
            const path = require('path');
            
            console.log('🖨️ Iniciando impresión de PDF:', fileName);
            
            const filePath = fileHandlers.getFullPath(fileName);
            
            if (!fs.existsSync(filePath)) {
                console.error('❌ PDF no encontrado para imprimir:', filePath);
                throw new Error('Archivo PDF no encontrado');
            }

            // Crear ventana oculta para cargar el PDF
            const printWindow = new BrowserWindow({
                show: false,
                title: 'Gestor de Expedientes SIT',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    plugins: true
                }
            });

            // Cargar el PDF en la ventana
            await printWindow.loadFile(filePath);

            // Esperar a que el contenido esté completamente listo
            await new Promise(resolve => setTimeout(resolve, 500));

            // Obtener lista de impresoras disponibles
            const printers = await printWindow.webContents.getPrintersAsync();
            console.log('🖨️ Impresoras disponibles:', printers.length);

            // Abrir diálogo de impresión con todas las configuraciones
            printWindow.webContents.print({
                silent: false, // Mostrar diálogo de impresión
                printBackground: true,
                deviceName: '', // Dejarlo vacío para que el usuario elija
                color: true,
                margins: {
                    marginType: 'printableArea'
                },
                landscape: false,
                pagesPerSheet: 1,
                collate: false,
                copies: 1,
                pageRanges: [],
                duplexMode: 'simplex',
                dpi: {
                    horizontal: 300,
                    vertical: 300
                },
                scaleFactor: 100
            }, (success, failureReason) => {
                if (success) {
                    console.log('✅ PDF enviado a impresora exitosamente');
                } else {
                    console.error('❌ Error al imprimir:', failureReason);
                }
                // Cerrar la ventana después de imprimir o cancelar
                printWindow.close();
            });

            return { success: true, printers: printers.length };

        } catch (error) {
            console.error('❌ Error al imprimir PDF:', error);
            throw error;
        }
    });

    /**
     * Obtiene la lista de impresoras disponibles en el sistema
     */
    ipcMain.handle('obtener-impresoras', async () => {
        try {
            const { BrowserWindow } = require('electron');
            
            // Crear ventana temporal para obtener las impresoras
            const tempWindow = new BrowserWindow({
                show: false,
                title: 'Gestor de Expedientes SIT',
                webPreferences: {
                    nodeIntegration: false
                }
            });

            const printers = await tempWindow.webContents.getPrintersAsync();
            tempWindow.close();

            console.log('🖨️ Impresoras detectadas:', printers.length);
            return printers.map(printer => ({
                name: printer.name,
                displayName: printer.displayName,
                description: printer.description,
                status: printer.status,
                isDefault: printer.isDefault,
                options: printer.options
            }));

        } catch (error) {
            console.error('❌ Error al obtener impresoras:', error);
            return [];
        }
    });

    console.log('✅ PDF Handlers registrados (10 canales IPC)');
}

module.exports = registerPdfHandlers;
