// app/handlers/ipcHandlers.js
const { ipcMain, BrowserWindow } = require('electron');
const db = require('../db/database');
const FileHandlers = require('./fileHandlers');
const DeletionService = require('../services/deletionService');
const fs = require('fs'); // Añadir 'fs' para manejar archivos

exports.registerIpcHandlers = (appInstance) => {
    const fileHandlers = new FileHandlers(appInstance);
    const deletionService = new DeletionService(appInstance);

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

    // -- CRUD para Expedientes --
    
    // Obtener todos los expedientes
    ipcMain.handle('obtener-todos-expedientes', async () => {
        try {
            const expedientes = await db.expedientes.find({});
            console.log('📊 Expedientes obtenidos de la BD:', expedientes.length);
            
            // Para cada expediente, obtener sus tarjetas asociadas
            const expedientesConTarjetas = await Promise.all(
                expedientes.map(async (expediente) => {
                    try {
                        // Buscar tarjetas asociadas a este expediente
                        const tarjetasAsociadas = await db.tarjetas.find({ expedienteId: expediente._id });
                        console.log(`🎫 Expediente ${expediente.numeroExpediente}: ${tarjetasAsociadas.length} tarjetas`);
                        
                        return {
                            ...expediente,
                            tarjetasAsociadas: tarjetasAsociadas || []
                        };
                    } catch (error) {
                        console.error(`❌ Error obteniendo tarjetas para expediente ${expediente._id}:`, error);
                        return {
                            ...expediente,
                            tarjetasAsociadas: []
                        };
                    }
                })
            );
            
            console.log('✅ Expedientes con tarjetas procesados:', expedientesConTarjetas.length);
            return expedientesConTarjetas;
        } catch (error) {
            console.error('Error al obtener expedientes:', error);
            throw error;
        }
    });

    // Crear nuevo expediente
    ipcMain.handle('crear-expediente', async (event, expedienteData) => {
        try {
            if (expedienteData.pdfSourcePath) {
                const fileName = `resolucion-${Date.now()}.pdf`;
                const saveResult = await fileHandlers.savePdf(
                    expedienteData.pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expedienteData.numeroResolucion,
                        expedienteNumero: expedienteData.numeroExpediente
                    }
                );
                expedienteData.pdfPath = saveResult.path;
                delete expedienteData.pdfSourcePath;
            }

            const fechaActual = new Date().toISOString();
            const newExpediente = await db.expedientes.insert({
                ...expedienteData,
                expediente: `${expedienteData.numeroExpediente}-${expedienteData.anioExpediente}`,
                fechaCreacion: fechaActual,
                fechaActualizacion: fechaActual
            });
            return newExpediente;
        } catch (error) {
            console.error('Error al crear expediente:', error);
            throw error;
        }
    });

    // Actualizar expediente
    ipcMain.handle('actualizar-expediente', async (event, expedienteId, expedienteData) => {
        try {
            const expedienteExistente = await db.expedientes.findOne({ _id: expedienteId });
            if (!expedienteExistente) {
                throw new Error('Expediente no encontrado');
            }

            if (expedienteData.pdfSourcePath) {
                const fileName = `resolucion-${Date.now()}.pdf`;
                const saveResult = await fileHandlers.savePdf(
                    expedienteData.pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expedienteData.numeroResolucion || expedienteExistente.numeroResolucion,
                        expedienteNumero: expedienteData.numeroExpediente || expedienteExistente.numeroExpediente
                    }
                );
                expedienteData.pdfPath = saveResult.path;
                delete expedienteData.pdfSourcePath;
            }

            const updatedExpediente = await db.expedientes.update(
                { _id: expedienteId },
                {
                    $set: {
                        ...expedienteData,
                        expediente: `${expedienteData.numeroExpediente}-${expedienteData.anioExpediente}`,
                        fechaActualizacion: new Date().toISOString()
                    }
                },
                { returnUpdatedDocs: true }
            );
            return updatedExpediente;
        } catch (error) {
            console.error('Error al actualizar expediente:', error);
            throw error;
        }
    });

    // Eliminar expediente con eliminación en cascada usando DeletionService
    ipcMain.handle('eliminar-expediente', async (event, expedienteId) => {
        try {
            console.log(`🗑️ Iniciando eliminación del expediente: ${expedienteId}`);
            const result = await deletionService.deleteExpedienteWithCascade(expedienteId);
            console.log(`✅ Eliminación exitosa:`, result.summary);
            return result;
        } catch (error) {
            console.error('❌ Error en eliminación:', error);
            
            // En lugar de throw, retornar un objeto con error
            // Si el error ya tiene la estructura correcta, retornarlo
            if (error && typeof error === 'object' && error.hasOwnProperty('success')) {
                console.log('📦 Retornando error estructurado del servicio');
                return error;
            }
            
            // Si no, crear un objeto de error estructurado
            return {
                success: false,
                error: error.message || 'Error desconocido',
                message: `Error al eliminar expediente: ${error.message || 'Error desconocido'}`,
                operation: error.operation || null
            };
        }
    });

    // Obtener información detallada para confirmación de eliminación
    ipcMain.handle('obtener-info-eliminacion', async (event, expedienteId) => {
        try {
            console.log(`📋 Obteniendo información para eliminación: ${expedienteId}`);
            const info = await deletionService.getExpedienteDeleteInfo(expedienteId);
            return { success: true, data: info };
        } catch (error) {
            console.error('❌ Error obteniendo información para eliminación:', error);
            return { success: false, error: error.message };
        }
    });

    // Guardar expediente (mantener para compatibilidad)
    ipcMain.handle('guardar-expediente', async (event, expedienteData) => {
        try {
            if (expedienteData.pdfSourcePath) {
                const fileName = `resolucion-${Date.now()}.pdf`;
                const saveResult = await fileHandlers.savePdf(
                    expedienteData.pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expedienteData.numeroResolucion,
                        expedienteNumero: expedienteData.numeroExpediente
                    }
                );
                expedienteData.pdfPath = saveResult.path;
                delete expedienteData.pdfSourcePath;
            }
            const newExpediente = await db.expedientes.insert({
                // Campos existentes
                expediente: expedienteData.expediente, // Mantenemos para compatibilidad
                fecha: expedienteData.fecha,
                pdfPath: expedienteData.pdfPath,
                
                // Nuevos campos
                numeroExpediente: expedienteData.numeroExpediente || null,
                anioExpediente: expedienteData.anioExpediente || new Date().getFullYear(),
                numeroResolucion: expedienteData.numeroResolucion || null,
                informeTecnico: expedienteData.informeTecnico || null,
                unidadNegocio: expedienteData.unidadNegocio || null,
                nombreEmpresa: expedienteData.nombreEmpresa || null,
                numeroFichero: expedienteData.numeroFichero || null,
                observaciones: expedienteData.observaciones || null,
                
                // Metadatos
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString()
            });
            const tarjetasGuardadas = [];
            for (const tarjeta of expedienteData.tarjetas) {
                // Guardar PDF de la tarjeta si existe
                if (tarjeta.pdfSourcePath) {
                    const tarjetaFileName = tarjeta.pdfPath || `tarjeta-${Date.now()}.pdf`;
                    const saveResult = await fileHandlers.savePdf(
                        tarjeta.pdfSourcePath,
                        tarjetaFileName,
                        {
                            resolutionNumber: expedienteData.numeroResolucion,
                            expedienteNumero: expedienteData.numeroExpediente
                        }
                    );
                    tarjeta.pdfPath = saveResult.path;
                    delete tarjeta.pdfSourcePath; // Limpiar la ruta temporal
                }
                
                const tarjetaGuardada = await db.tarjetas.insert({
                    placa: tarjeta.placa,
                    tarjeta: tarjeta.tarjeta,
                    pdfPath: tarjeta.pdfPath,
                    expedienteId: newExpediente._id
                });
                
                tarjetasGuardadas.push(tarjetaGuardada);
            }
            
            // Enviar evento a todas las ventanas con los datos completos
            const datosCompletos = {
                expediente: newExpediente,
                tarjetas: tarjetasGuardadas
            };
            
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('expediente-guardado', datosCompletos);
            });
            
            return { 
                success: true, 
                message: 'Expediente y tarjetas guardados exitosamente.',
                data: datosCompletos
            };
        } catch (error) {
            console.error('Error al guardar el expediente:', error);
            return { success: false, message: 'Error al guardar el expediente.' };
        }
    });

    // -- Búsqueda de expedientes --
    ipcMain.handle('buscar-expediente', async (event, searchTerm) => {
        try {
            const query = { expediente: new RegExp(searchTerm, 'i') };
            const expedientes = await db.expedientes.find(query);
            
            if (expedientes.length === 0) {
                return { success: true, data: [] };
            }
            
            const resultados = await Promise.all(expedientes.map(async (expediente) => {
                // Buscar tarjetas asociadas a este expediente
                const tarjetasAsociadas = await db.tarjetas.find({ expedienteId: expediente._id });
                return {
                    _id: expediente._id,
                    expediente: expediente.expediente,
                    fecha: expediente.fecha,
                    pdfPath: expediente.pdfPath,
                    tarjetasAsociadas: tarjetasAsociadas.map(t => ({
                        placa: t.placa,
                        tarjeta: t.tarjeta,
                        pdfPath: t.pdfPath
                    }))
                };
            }));
            
            return { success: true, data: resultados };
        } catch (error) {
            console.error('Error al buscar expediente:', error);
            return { success: false, message: 'Error al buscar expediente.' };
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
                const expediente = await db.expedientes.findOne({ _id: tarjeta.expedienteId });
                return {
                    placa: tarjeta.placa,
                    tarjeta: tarjeta.tarjeta,
                    expediente: expediente ? expediente.expediente : 'N/A',
                    fecha: expediente ? expediente.fecha : 'N/A',
                    pdfPath: tarjeta.pdfPath || null,
                    expedientePdfPath: expediente ? expediente.pdfPath : null
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