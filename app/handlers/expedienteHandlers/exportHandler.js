// app/handlers/expedienteHandlers/exportHandler.js
/**
 * Handler de Exportación de Expedientes y Tarjetas a Excel
 * Responsabilidad: Generar reportes completos sin límite de paginación
 */

const { ipcMain, dialog } = require('electron');
const XLSX = require('xlsx');
const path = require('path');

/**
 * Registrar handler de exportación
 * @param {Object} expedienteService - Servicio de expedientes
 * @param {Object} db - Instancia de base de datos para consultas directas
 */
function registerExportHandler(expedienteService, db) {
    console.log('Registrando handler de exportación a Excel...');

    /**
     * Exportar expedientes y tarjetas a Excel con filtros
     * Consulta TODOS los datos (sin paginación) que coincidan con los filtros
     */
    ipcMain.handle('expediente:exportar-excel', async (event, filters = {}) => {
        try {
            console.log('Iniciando exportación a Excel con filtros:', filters);

            // Obtener referencia a la BD (desde expedienteService)
            const database = expedienteService.db || db;

            if (!database || !database.db) {
                throw new Error('No se pudo acceder a la base de datos');
            }

            // 1. Construir query con JOIN para obtener expedientes y sus tarjetas
            let sql = `
                SELECT 
                    e._id as expedienteId,
                    e.numeroExpediente,
                    e.numeroResolucion,
                    e.fechaExpediente,
                    e.anioExpediente,
                    e.unidadNegocio,
                    e.nombreEmpresa,
                    e.numeroFichero,
                    e.observaciones,
                    e.pdfPathActa as pdfExpediente,
                    t._id as tarjetaId,
                    t.placa,
                    t.numeroTarjeta,
                    t.estado as estadoTarjeta,
                    t.pdfPath as pdfTarjeta
                FROM ActasResolucion e
                LEFT JOIN TarjetasVehiculos t ON e._id = t.resolucionId
            `;

            const params = [];
            const whereConditions = [];

            // 2. Aplicar filtros (los mismos que usa la búsqueda)
            if (filters.numeroExpediente && filters.numeroExpediente.trim() !== '') {
                whereConditions.push("e.numeroExpediente LIKE ?");
                params.push(`%${filters.numeroExpediente.trim()}%`);
            }

            if (filters.numeroResolucion && filters.numeroResolucion.trim() !== '') {
                whereConditions.push("e.numeroResolucion LIKE ?");
                params.push(`%${filters.numeroResolucion.trim()}%`);
            }

            if (filters.nombreEmpresa && filters.nombreEmpresa.trim() !== '') {
                whereConditions.push("e.nombreEmpresa LIKE ?");
                params.push(`%${filters.nombreEmpresa.trim()}%`);
            }

            if (filters.unidadNegocio && filters.unidadNegocio !== 'todos' && filters.unidadNegocio !== '') {
                whereConditions.push("e.unidadNegocio = ?");
                params.push(filters.unidadNegocio);
            }

            if (filters.anioExpediente && filters.anioExpediente !== '' && filters.anioExpediente !== 'todos') {
                whereConditions.push("e.anioExpediente = ?");
                params.push(parseInt(filters.anioExpediente));
            }

            if (filters.fechaInicio && filters.fechaFin) {
                whereConditions.push("e.fechaExpediente BETWEEN ? AND ?");
                params.push(filters.fechaInicio, filters.fechaFin);
            }

            if (filters.placa && filters.placa.trim() !== '') {
                whereConditions.push("t.placa LIKE ?");
                params.push(`%${filters.placa.trim()}%`);
            }

            if (filters.numeroTarjeta && filters.numeroTarjeta.trim() !== '') {
                whereConditions.push("t.numeroTarjeta LIKE ?");
                params.push(`%${filters.numeroTarjeta.trim()}%`);
            }

            if (whereConditions.length > 0) {
                sql += " WHERE " + whereConditions.join(" AND ");
            }

            // Ordenar por fecha de expediente descendente
            sql += " ORDER BY e.fechaExpediente DESC, e.numeroExpediente ASC, t.numeroTarjeta ASC";

            console.log('📋 SQL Query:', sql.substring(0, 200) + '...');
            console.log('📋 Parámetros:', params);

            // 3. Ejecutar consulta (SIN LIMIT/OFFSET para obtener TODO)
            const stmt = database.db.prepare(sql);
            const rows = stmt.all(...params);

            console.log(`Registros encontrados: ${rows.length}`);

            if (rows.length === 0) {
                return {
                    success: false,
                    message: "No hay datos para exportar con los filtros actuales."
                };
            }

            // 4. Mostrar diálogo para elegir ubicación de guardado
            const { filePath, canceled } = await dialog.showSaveDialog({
                title: 'Guardar Reporte Excel',
                defaultPath: `Reporte_Expedientes_${new Date().toISOString().split('T')[0]}.xlsx`,
                filters: [
                    { name: 'Archivos Excel', extensions: ['xlsx'] },
                    { name: 'Todos los archivos', extensions: ['*'] }
                ]
            });

            if (canceled || !filePath) {
                console.log('Exportación cancelada por el usuario');
                return { success: false, message: "Exportación cancelada", canceled: true };
            }

            // 5. Preparar datos para Excel
            const excelData = rows.map(row => ({
                'Expediente N°': row.numeroExpediente || '',
                'Año': row.anioExpediente || '',
                'Resolución N°': row.numeroResolucion || '',
                'Fecha Expediente': row.fechaExpediente || '',
                'Unidad de Negocio': row.unidadNegocio || '',
                'Nombre Empresa': row.nombreEmpresa || '',
                'N° Fichero': row.numeroFichero || '',
                'Placa Vehículo': row.placa || '',
                'N° Tarjeta': row.numeroTarjeta || '',
                'Estado Tarjeta': row.estadoTarjeta || '',
                'Observaciones': row.observaciones || '',
                'Tiene PDF Expediente': row.pdfExpediente ? 'Sí' : 'No',
                'Tiene PDF Tarjeta': row.pdfTarjeta ? 'Sí' : 'No'
            }));

            // 6. Crear workbook y worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // 7. Ajustar ancho de columnas para mejor legibilidad
            const columnWidths = [
                { wch: 15 },  // Expediente N°
                { wch: 8 },   // Año
                { wch: 15 },  // Resolución N°
                { wch: 15 },  // Fecha Expediente
                { wch: 18 },  // Unidad de Negocio
                { wch: 30 },  // Nombre Empresa
                { wch: 12 },  // N° Fichero
                { wch: 12 },  // Placa
                { wch: 12 },  // N° Tarjeta
                { wch: 15 },  // Estado Tarjeta
                { wch: 35 },  // Observaciones
                { wch: 20 },  // Tiene PDF Expediente
                { wch: 18 }   // Tiene PDF Tarjeta
            ];
            worksheet['!cols'] = columnWidths;

            // 8. Crear workbook y agregar hoja
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte General");

            // 9. Guardar archivo
            XLSX.writeFile(workbook, filePath);

            console.log(`Archivo Excel guardado en: ${filePath}`);
            console.log(`Total de registros exportados: ${excelData.length}`);

            return {
                success: true,
                message: `Exportación completada: ${excelData.length} registros`,
                filePath: filePath,
                count: excelData.length
            };

        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            return {
                success: false,
                error: error.message,
                message: `Error al exportar: ${error.message}`
            };
        }
    });

    console.log('Handler de exportación a Excel registrado');
}

module.exports = registerExportHandler;
