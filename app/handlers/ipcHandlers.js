// app/handlers/ipcHandlers.js
const { ipcMain, BrowserWindow } = require('electron');
const db = require('../db/database');
const FileHandlers = require('./fileHandlers');
const fs = require('fs'); // Añadir 'fs' para manejar archivos

exports.registerIpcHandlers = (appInstance) => {
    const fileHandlers = new FileHandlers(appInstance);

    // Manejador para el diálogo de selección de PDF
    ipcMain.handle('abrir-dialogo-pdf', async () => {
        try {
            const result = await fileHandlers.openPdfDialog();
            return result;
        } catch (error) {
            console.error('Error en el manejador abrir-dialogo-pdf:', error);
            return null;
        }
    });

    // -- CRUD para Actas --
    ipcMain.handle('guardar-acta', async (event, actaData) => {
        try {
            if (actaData.pdfSourcePath) {
                const fileName = `acta-${Date.now()}.pdf`;
                await fileHandlers.savePdf(actaData.pdfSourcePath, fileName);
                actaData.pdfPath = fileName;
                delete actaData.pdfSourcePath;
            }
            const newActa = await db.actas.insert({
                expediente: actaData.expediente,
                fecha: actaData.fecha,
                pdfPath: actaData.pdfPath
            });
            const tarjetasGuardadas = [];
            for (const tarjeta of actaData.tarjetas) {
                // Guardar PDF de la tarjeta si existe
                if (tarjeta.pdfSourcePath) {
                    await fileHandlers.savePdf(tarjeta.pdfSourcePath, tarjeta.pdfPath);
                    delete tarjeta.pdfSourcePath; // Limpiar la ruta temporal
                }
                
                const tarjetaGuardada = await db.tarjetas.insert({
                    placa: tarjeta.placa,
                    tarjeta: tarjeta.tarjeta,
                    pdfPath: tarjeta.pdfPath,
                    actaId: newActa._id
                });
                
                tarjetasGuardadas.push(tarjetaGuardada);
            }
            
            // Enviar evento a todas las ventanas con los datos completos
            const datosCompletos = {
                acta: newActa,
                tarjetas: tarjetasGuardadas
            };
            
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('acta-guardada', datosCompletos);
            });
            
            return { 
                success: true, 
                message: 'Acta y tarjetas guardadas exitosamente.',
                data: datosCompletos
            };
        } catch (error) {
            console.error('Error al guardar el acta:', error);
            return { success: false, message: 'Error al guardar el acta.' };
        }
    });

    // -- Búsqueda de actas --
    ipcMain.handle('buscar-acta', async (event, searchTerm) => {
        try {
            const query = { expediente: new RegExp(searchTerm, 'i') };
            const actas = await db.actas.find(query);
            
            if (actas.length === 0) {
                return { success: true, data: [] };
            }
            
            const resultados = await Promise.all(actas.map(async (acta) => {
                // Buscar tarjetas asociadas a esta acta
                const tarjetasAsociadas = await db.tarjetas.find({ actaId: acta._id });
                return {
                    _id: acta._id,
                    expediente: acta.expediente,
                    fecha: acta.fecha,
                    pdfPath: acta.pdfPath,
                    tarjetasAsociadas: tarjetasAsociadas.map(t => ({
                        placa: t.placa,
                        tarjeta: t.tarjeta,
                        pdfPath: t.pdfPath
                    }))
                };
            }));
            
            return { success: true, data: resultados };
        } catch (error) {
            console.error('Error al buscar acta:', error);
            return { success: false, message: 'Error al buscar acta.' };
        }
    });

    // -- Búsqueda de tarjeta --
    ipcMain.handle('buscar-tarjeta', async (event, searchTerm) => {
        try {
            const query = {
                $or: [
                    { placa: new RegExp(searchTerm, 'i') },
                    { tarjeta: new RegExp(searchTerm, 'i') }
                ]
            };
            const tarjetas = await db.tarjetas.find(query);
            if (tarjetas.length === 0) {
                return { success: true, data: [] };
            }
            const resultados = await Promise.all(tarjetas.map(async (tarjeta) => {
                const acta = await db.actas.findOne({ _id: tarjeta.actaId });
                return {
                    placa: tarjeta.placa,
                    tarjeta: tarjeta.tarjeta,
                    expediente: acta ? acta.expediente : 'N/A',
                    fecha: acta ? acta.fecha : 'N/A',
                    pdfPath: tarjeta.pdfPath || null,
                    actaPdfPath: acta ? acta.pdfPath : null
                };
            }));
            return { success: true, data: resultados };
        } catch (error) {
            console.error('Error al buscar tarjeta:', error);
            return { success: false, message: 'Error al buscar tarjeta.' };
        }
    });

    // -- Manejador para obtener el PDF --
    ipcMain.handle('obtener-pdf-data', async (event, fileName) => {
        try {
            const filePath = fileHandlers.getFullPath(fileName);
            if (fs.existsSync(filePath)) {
                return fs.promises.readFile(filePath);
            }
            return null;
        } catch (error) {
            console.error('Error al obtener datos del PDF:', error);
            return null;
        }
    });

    // Manejador para abrir el PDF (usando shell)
    ipcMain.on('abrir-pdf', (event, fileName) => {
        fileHandlers.openPdf(fileName);
    });

    // Manejador para cargar todas las tarjetas
    ipcMain.on('cargar-tarjetas', async (event) => {
        try {
            const tarjetas = await db.tarjetas.find({});
            event.sender.send('tarjetas-actualizadas', tarjetas);
        } catch (error) {
            console.error('Error al cargar tarjetas:', error);
        }
    });

    // Manejador para descargar PDF
    ipcMain.on('descargar-pdf', async (event, fileName) => {
        try {
            const { dialog } = require('electron');
            const path = require('path');
            
            // Mostrar diálogo para guardar archivo
            const result = await dialog.showSaveDialog({
                title: 'Guardar PDF',
                defaultPath: fileName.replace(/^.*[\\\/]/, ''), // Solo el nombre del archivo
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] }
                ]
            });
            
            if (!result.canceled && result.filePath) {
                const sourcePath = fileHandlers.getFullPath(fileName);
                const fs = require('fs').promises;
                
                // Copiar archivo al destino seleccionado
                await fs.copyFile(sourcePath, result.filePath);
                
                // Notificar éxito
                const { shell } = require('electron');
                const response = await dialog.showMessageBox({
                    type: 'info',
                    title: 'Descarga Completa',
                    message: 'El PDF se ha guardado exitosamente.',
                    buttons: ['OK', 'Abrir carpeta'],
                    defaultId: 0
                });
                
                if (response.response === 1) {
                    shell.showItemInFolder(result.filePath);
                }
            }
        } catch (error) {
            console.error('Error al descargar PDF:', error);
            const { dialog } = require('electron');
            dialog.showErrorBox('Error', 'No se pudo descargar el archivo PDF.');
        }
    });
};