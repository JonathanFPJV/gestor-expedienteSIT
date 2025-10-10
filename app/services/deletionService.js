// app/services/deletionService.js
const db = require('../db/database');
const FileHandlers = require('../handlers/fileHandlers');
const { BrowserWindow } = require('electron');

class DeletionService {
    constructor(appInstance) {
        this.fileHandlers = new FileHandlers(appInstance);
    }

    /**
     * Elimina un expediente y todas sus dependencias en cascada
     * @param {string} expedienteId - ID del expediente a eliminar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async deleteExpedienteWithCascade(expedienteId) {
        const operation = {
            id: `delete_${expedienteId}_${Date.now()}`,
            startTime: new Date(),
            expediente: null,
            steps: [],
            success: false,
            errors: [],
            warnings: []
        };

        try {
            // Paso 1: Verificar expediente
            operation.steps.push({ step: 'verify_expediente', status: 'started', timestamp: new Date() });
            
            const expediente = await db.expedientes.findOne({ _id: expedienteId });
            if (!expediente) {
                throw new Error(`Expediente con ID ${expedienteId} no encontrado`);
            }

            operation.expediente = {
                id: expediente._id,
                numero: expediente.numeroExpediente,
                anio: expediente.anioExpediente,
                completo: `${expediente.numeroExpediente}-${expediente.anioExpediente}`,
                empresa: expediente.nombreEmpresa,
                pdfPath: expediente.pdfPath
            };

            operation.steps[operation.steps.length - 1].status = 'completed';
            operation.steps[operation.steps.length - 1].result = operation.expediente;

            // Paso 2: Obtener tarjetas relacionadas
            operation.steps.push({ step: 'get_related_tarjetas', status: 'started', timestamp: new Date() });
            
            const tarjetas = await db.tarjetas.find({ expedienteId: expedienteId });
            const tarjetasInfo = tarjetas.map(t => ({
                id: t._id,
                placa: t.placa,
                tarjeta: t.tarjeta,
                pdfPath: t.pdfPath
            }));

            operation.steps[operation.steps.length - 1].status = 'completed';
            operation.steps[operation.steps.length - 1].result = { count: tarjetas.length, tarjetas: tarjetasInfo };

            // Paso 3: Eliminar archivos PDF de tarjetas
            operation.steps.push({ step: 'delete_tarjetas_files', status: 'started', timestamp: new Date() });
            
            const deletedTarjetaFiles = [];
            for (const tarjeta of tarjetas) {
                if (tarjeta.pdfPath) {
                    try {
                        const deleteResult = await this.fileHandlers.deletePdf(tarjeta.pdfPath);
                        deletedTarjetaFiles.push({
                            placa: tarjeta.placa,
                            file: tarjeta.pdfPath,
                            success: deleteResult.success
                        });
                    } catch (error) {
                        operation.warnings.push(`No se pudo eliminar archivo PDF de tarjeta ${tarjeta.placa}: ${error.message}`);
                        deletedTarjetaFiles.push({
                            placa: tarjeta.placa,
                            file: tarjeta.pdfPath,
                            success: false,
                            error: error.message
                        });
                    }
                }
            }

            operation.steps[operation.steps.length - 1].status = 'completed';
            operation.steps[operation.steps.length - 1].result = { deletedFiles: deletedTarjetaFiles };

            // Paso 4: Eliminar tarjetas de la base de datos
            operation.steps.push({ step: 'delete_tarjetas_db', status: 'started', timestamp: new Date() });
            
            const deletedTarjetasCount = await db.tarjetas.remove({ expedienteId: expedienteId }, { multi: true });
            
            operation.steps[operation.steps.length - 1].status = 'completed';
            operation.steps[operation.steps.length - 1].result = { deletedCount: deletedTarjetasCount };

            // Paso 5: Eliminar archivo PDF del expediente
            operation.steps.push({ step: 'delete_expediente_file', status: 'started', timestamp: new Date() });
            
            let expedienteFileDeleted = false;
            if (expediente.pdfPath) {
                try {
                    const deleteResult = await this.fileHandlers.deletePdf(expediente.pdfPath);
                    expedienteFileDeleted = deleteResult.success;
                } catch (error) {
                    operation.warnings.push(`No se pudo eliminar archivo PDF del expediente: ${error.message}`);
                    expedienteFileDeleted = false;
                }
            }

            operation.steps[operation.steps.length - 1].status = 'completed';
            operation.steps[operation.steps.length - 1].result = { 
                fileDeleted: expedienteFileDeleted,
                fileName: expediente.pdfPath || 'N/A'
            };

            // Paso 6: Eliminar expediente de la base de datos
            operation.steps.push({ step: 'delete_expediente_db', status: 'started', timestamp: new Date() });
            
            const deletedExpedienteCount = await db.expedientes.remove({ _id: expedienteId });
            if (deletedExpedienteCount === 0) {
                throw new Error('No se pudo eliminar el expediente de la base de datos');
            }

            operation.steps[operation.steps.length - 1].status = 'completed';
            operation.steps[operation.steps.length - 1].result = { deletedCount: deletedExpedienteCount };

            // Operación exitosa
            operation.success = true;
            operation.endTime = new Date();
            operation.duration = operation.endTime - operation.startTime;

            // Notificar a las ventanas
            this.notifyDeletion(operation);

            return {
                success: true,
                operation: operation,
                summary: {
                    expediente: operation.expediente.completo,
                    empresa: operation.expediente.empresa,
                    tarjetasEliminadas: deletedTarjetasCount,
                    archivosEliminados: deletedTarjetaFiles.filter(f => f.success).length + (expedienteFileDeleted ? 1 : 0),
                    warnings: operation.warnings.length,
                    duration: operation.duration
                },
                message: `Expediente ${operation.expediente.completo} eliminado correctamente con ${deletedTarjetasCount} tarjetas asociadas`
            };

        } catch (error) {
            operation.success = false;
            operation.endTime = new Date();
            operation.duration = operation.endTime - operation.startTime;
            operation.errors.push(error.message);

            // Marcar el último paso como fallido
            if (operation.steps.length > 0) {
                operation.steps[operation.steps.length - 1].status = 'failed';
                operation.steps[operation.steps.length - 1].error = error.message;
            }

            console.error('❌ Error en eliminación en cascada:', error);
            console.error('📊 Estado de la operación:', operation);

            throw {
                success: false,
                operation: operation,
                error: error.message,
                message: `Error al eliminar expediente: ${error.message}`
            };
        }
    }

    /**
     * Notifica a todas las ventanas sobre la eliminación
     * @param {Object} operation - Información de la operación
     */
    notifyDeletion(operation) {
        const notification = {
            type: 'expediente-eliminado',
            expedienteId: operation.expediente.id,
            expedienteCompleto: operation.expediente.completo,
            empresa: operation.expediente.empresa,
            tarjetasEliminadas: operation.steps.find(s => s.step === 'delete_tarjetas_db')?.result?.deletedCount || 0,
            timestamp: operation.endTime
        };

        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('expediente-eliminado', notification);
        });
    }

    /**
     * Obtiene información detallada de un expediente antes de eliminarlo
     * @param {string} expedienteId - ID del expediente
     * @returns {Promise<Object>} Información del expediente y dependencias
     */
    async getExpedienteDeleteInfo(expedienteId) {
        try {
            const expediente = await db.expedientes.findOne({ _id: expedienteId });
            if (!expediente) {
                throw new Error('Expediente no encontrado');
            }

            const tarjetas = await db.tarjetas.find({ expedienteId: expedienteId });

            return {
                expediente: {
                    id: expediente._id,
                    numero: `${expediente.numeroExpediente}-${expediente.anioExpediente}`,
                    empresa: expediente.nombreEmpresa || 'N/A',
                    resolucion: expediente.numeroResolucion || 'Sin resolución',
                    fecha: expediente.fecha,
                    pdfPath: expediente.pdfPath
                },
                tarjetas: tarjetas.map(t => ({
                    id: t._id,
                    placa: t.placa,
                    tarjeta: t.tarjeta,
                    pdfPath: t.pdfPath
                })),
                summary: {
                    totalTarjetas: tarjetas.length,
                    tarjetasConPDF: tarjetas.filter(t => t.pdfPath).length,
                    expedienteConPDF: !!expediente.pdfPath,
                    totalArchivos: tarjetas.filter(t => t.pdfPath).length + (expediente.pdfPath ? 1 : 0)
                }
            };
        } catch (error) {
            console.error('Error obteniendo información para eliminación:', error);
            throw error;
        }
    }
}

module.exports = DeletionService;