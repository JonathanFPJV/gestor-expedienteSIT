// app/handlers/ipcHandlers.js
/**
 * Orquestador de Handlers IPC
 * 
 * Este archivo actúa como punto de entrada único para registrar todos los handlers IPC.
 * No debe contener lógica de negocio, solo orquestación.
 * 
 * Arquitectura:
 * - Handlers modulares: ExpedienteHandlers, TarjetaHandlers
 * - Servicios especializados: DeletionService, FileHandlers
 * - Gestión de ventanas: Editor de expedientes
 * 
 * @module ipcHandlers
 */

const { ipcMain, BrowserWindow } = require('electron');
const database = require('../db/database');
const FileHandlers = require('./fileHandlers');
const DeletionService = require('../services/deletionService');
const { createExpedienteEditorWindow } = require('../windows/expedienteEditorWindow');
const ExpedienteHandlers = require('./expedienteHandlers');
const TarjetaHandlers = require('./tarjetaHandlers');
const ActaEntregaHandlers = require('./actaEntregaHandlers');
const fs = require('fs');

// Extraer la instancia real de la base de datos Y las APIs
const db = database.db;  // Para servicios que usan SQLite3 directamente
const dbAPI = database;  // Para handlers que usan las APIs (expedientes, tarjetas)

/**
 * Registra todos los handlers IPC de la aplicación
 * 
 * @param {Electron.App} appInstance - Instancia de la aplicación Electron
 */
exports.registerIpcHandlers = (appInstance) => {
    // ============================================
    // 1. INICIALIZACIÓN DE SERVICIOS
    // ============================================
    const fileHandlers = new FileHandlers(appInstance);
    const deletionService = new DeletionService(appInstance);
    const editorWindows = new Map();
    
    // ============================================
    // 2. REGISTRAR HANDLERS MODULARES
    // ============================================
    // Handlers de Expedientes (CRUD completo) - Usa APIs de alto nivel
    const expedienteHandlers = new ExpedienteHandlers(dbAPI, fileHandlers);
    expedienteHandlers.registerHandlers();
    
    // Handlers de Tarjetas (CRUD completo + búsquedas) - Usa APIs de alto nivel
    const tarjetaHandlers = new TarjetaHandlers(dbAPI, fileHandlers);
    tarjetaHandlers.registerHandlers();
    
    // Handlers de Actas de Entrega (CRUD completo) - Usa SQLite3 directamente
    const actaEntregaHandlers = new ActaEntregaHandlers(db, fileHandlers);
    actaEntregaHandlers.registerHandlers();
    
    console.log('✅ Handlers modulares registrados:');
    console.log('   - ExpedienteHandlers (7 canales IPC)');
    console.log('   - TarjetaHandlers (13+ canales IPC)');
    console.log('   - ActaEntregaHandlers (10+ canales IPC)');
    
    // ============================================
    // 3. HANDLERS DE VENTANAS
    // ============================================
    
    /**
     * Abre una ventana de edición para un expediente específico
     * Gestiona ventanas únicas por expediente (no duplicados)
     */
    ipcMain.on('abrir-editor-expediente', (event, expedienteId) => {
        if (!expedienteId) {
            console.warn('⚠️ abrir-editor-expediente llamado sin expedienteId');
            return;
        }

        // Verificar si ya existe una ventana para este expediente
        const existingWindow = editorWindows.get(expedienteId);
        if (existingWindow && !existingWindow.isDestroyed()) {
            existingWindow.focus();
            console.log(`📌 Ventana existente enfocada para expediente: ${expedienteId}`);
            return;
        }

        // Crear nueva ventana de edición
        const window = createExpedienteEditorWindow(appInstance, expedienteId);
        editorWindows.set(expedienteId, window);
        console.log(`🪟 Nueva ventana de edición creada para expediente: ${expedienteId}`);

        // Limpiar del mapa cuando se cierra
        window.on('closed', () => {
            editorWindows.delete(expedienteId);
            console.log(`🗑️ Ventana cerrada para expediente: ${expedienteId}`);
        });
    });

    // ============================================
    // 4. HANDLERS DE ARCHIVOS PDF
    // ============================================
    
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
     * Descarga un PDF con diálogo de guardar
     * Copia el archivo a la ubicación seleccionada por el usuario
     */
    ipcMain.on('descargar-pdf', async (event, fileName) => {
        try {
            const { dialog, shell } = require('electron');
            
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
            const { dialog } = require('electron');
            dialog.showErrorBox('Error', 'No se pudo descargar el archivo PDF.');
        }
    });

    // ============================================
    // 5. HANDLERS DE ELIMINACIÓN (DELETION SERVICE)
    // ============================================
    
    /**
     * ⚠️ COMENTADO: Este handler ya está registrado en ExpedienteHandlers
     * 
     * Elimina un expediente con cascada (tarjetas y archivos asociados)
     * Usa DeletionService para garantizar eliminación completa
     * 
     * TODO: Migrar DeletionService a SQLite3
     */
    /* COMENTADO - Ya registrado en ExpedienteHandlers.js
    ipcMain.handle('eliminar-expediente', async (event, expedienteId) => {
        try {
            console.log(`🗑️ Iniciando eliminación del expediente: ${expedienteId}`);
            const result = await deletionService.deleteExpedienteWithCascade(expedienteId);
            console.log(`✅ Eliminación exitosa:`, result.summary);
            return result;
        } catch (error) {
            console.error('❌ Error en eliminación:', error);
            
            // Retornar error estructurado
            if (error && typeof error === 'object' && error.hasOwnProperty('success')) {
                console.log('📦 Retornando error estructurado del servicio');
                return error;
            }
            
            return {
                success: false,
                error: error.message || 'Error desconocido',
                message: `Error al eliminar expediente: ${error.message || 'Error desconocido'}`,
                operation: error.operation || null
            };
        }
    });
    */

    /**
     * Obtiene información detallada antes de eliminar (confirmación)
     * Muestra cuántas tarjetas y archivos se eliminarán
     * 
     * TODO: Migrar DeletionService a SQLite3
     */
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

    console.log('✅ ipcHandlers.js - Todos los handlers registrados correctamente');
};