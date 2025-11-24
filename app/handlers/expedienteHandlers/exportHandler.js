// app/handlers/expedienteHandlers/exportHandler.js
/**
 * Handler de Exportación de Expedientes
 * Responsabilidad: Exportar datos a formato Excel
 */

const { ipcMain, dialog } = require('electron');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Registrar handler de exportación
 * @param {Object} expedienteService - Servicio de expedientes
 * @param {Object} tarjetaService - Servicio de tarjetas
 */
function registerExportHandler(expedienteService, tarjetaService) {
    console.log('📊 Registrando handler de exportación...');

    /**
     * Exportar expedientes a Excel
     */
    ipcMain.handle('exportar-expedientes-excel', async (event, expedientes) => {
        try {
            console.log('📊 Iniciando exportación a Excel:', expedientes.length, 'expedientes');

            // Preparar datos para el Excel
            const excelData = expedientes.map(exp => {
                const tarjetasInfo = exp.tarjetasAsociadas || [];
                const placas = tarjetasInfo.map(t => t.placa).filter(Boolean).join(', ');
                const numerosTarjetas = tarjetasInfo.map(t => t.numero || t.numeroTarjeta).filter(Boolean).join(', ');
                const estadosTarjetas = tarjetasInfo.map(t => t.estado).filter(Boolean).join(', ');
                
                return {
                    'N° Expediente': exp.numeroExpediente || '',
                    'Año': exp.anioExpediente || '',
                    'N° Resolución': exp.numeroResolucion || '',
                    'Fecha': exp.fechaExpediente || '',
                    'Unidad de Negocio': exp.unidadNegocio || '',
                    'Nombre Empresa': exp.nombreEmpresa || '',
                    'N° Fichero': exp.numeroFichero || '',
                    'Cantidad Tarjetas': tarjetasInfo.length,
                    'Placas': placas,
                    'N° Tarjetas': numerosTarjetas,
                    'Estados Tarjetas': estadosTarjetas,
                    'Observaciones': exp.observaciones || '',
                    'Tiene Acta Entrega': exp.actaEntrega ? 'Sí' : 'No',
                    'Fecha Registro': exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : ''
                };
            });
            
            // Crear workbook y worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Ajustar ancho de columnas
            const colWidths = [
                { wch: 15 }, // N° Expediente
                { wch: 8 },  // Año
                { wch: 15 }, // N° Resolución
                { wch: 12 }, // Fecha
                { wch: 18 }, // Unidad de Negocio
                { wch: 30 }, // Nombre Empresa
                { wch: 12 }, // N° Fichero
                { wch: 12 }, // Cantidad Tarjetas
                { wch: 25 }, // Placas
                { wch: 25 }, // N° Tarjetas
                { wch: 20 }, // Estados Tarjetas
                { wch: 35 }, // Observaciones
                { wch: 15 }, // Tiene Acta Entrega
                { wch: 15 }  // Fecha Registro
            ];
            ws['!cols'] = colWidths;
            
            // Agregar worksheet al workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Expedientes');
            
            // Generar nombre de archivo con fecha actual
            const fecha = new Date().toISOString().split('T')[0];
            const defaultFileName = `Expedientes_SIT_${fecha}.xlsx`;
            
            // Mostrar diálogo para guardar archivo
            const { filePath, canceled } = await dialog.showSaveDialog({
                title: 'Guardar archivo Excel',
                defaultPath: defaultFileName,
                filters: [
                    { name: 'Excel Files', extensions: ['xlsx'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (canceled || !filePath) {
                console.log('⚠️ Exportación cancelada por el usuario');
                return {
                    success: false,
                    message: 'Exportación cancelada',
                    canceled: true
                };
            }
            
            // Escribir archivo
            XLSX.writeFile(wb, filePath);
            
            console.log('✅ Archivo Excel generado:', filePath);
            
            return {
                success: true,
                message: `✅ Archivo exportado: ${path.basename(filePath)} (${expedientes.length} registros)`,
                filePath,
                recordCount: expedientes.length
            };
            
        } catch (error) {
            console.error('❌ Error al exportar a Excel:', error);
            return {
                success: false,
                message: 'Error al exportar datos a Excel: ' + error.message,
                error: error.message
            };
        }
    });
}

module.exports = registerExportHandler;
