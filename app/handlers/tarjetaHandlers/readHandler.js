// app/handlers/tarjetaHandlers/readHandler.js
/**
 * Handlers para lectura de tarjetas
 * Responsabilidad: Manejar todas las operaciones de lectura/consulta de tarjetas
 */

const { handleError } = require('./utils');

/**
 * Registra todos los handlers de lectura de tarjetas
 * @param {Object} ipcMain - Instancia de ipcMain de Electron
 * @param {Object} tarjetaService - Servicio de tarjetas
 * @param {Object} db - Instancia de base de datos
 */
function registerReadHandlers(ipcMain, tarjetaService, db) {
    // Obtener todas las tarjetas
    ipcMain.handle('tarjeta:obtener-todas', handleError(
        async (filtros = {}) => {
            console.log('📥 Solicitud obtener todas las tarjetas');
            return await tarjetaService.getTarjetas(filtros);
        },
        'Error al obtener tarjetas'
    ));

    // Obtener tarjeta por ID
    ipcMain.handle('tarjeta:obtener-por-id', handleError(
        async (tarjetaId) => {
            console.log('📥 Solicitud obtener tarjeta por ID:', tarjetaId);
            return await tarjetaService.getTarjetaById(tarjetaId);
        },
        'Error al obtener tarjeta'
    ));

    // Buscar tarjetas
    ipcMain.handle('tarjeta:buscar', handleError(
        async (searchTerm) => {
            console.log('📥 Solicitud buscar tarjetas:', searchTerm);
            return await tarjetaService.searchTarjetas(searchTerm);
        },
        'Error al buscar tarjetas'
    ));

    // Obtener tarjetas por expediente (resolución)
    ipcMain.handle('tarjeta:obtener-por-expediente', handleError(
        async (expedienteId) => {
            console.log('📥 Solicitud obtener tarjetas por expediente:', expedienteId);
            return await tarjetaService.getTarjetasByExpediente(expedienteId);
        },
        'Error al obtener tarjetas del expediente'
    ));

    // Buscar tarjeta por placa específica
    ipcMain.handle('tarjeta:buscar-por-placa', handleError(
        async (placa) => {
            console.log('📥 Solicitud buscar tarjeta por placa:', placa);
            return await tarjetaService.getTarjetaByPlaca(placa);
        },
        'Error al buscar tarjeta por placa'
    ));

    // Obtener tarjetas por acta de entrega
    ipcMain.handle('tarjeta:obtener-por-acta-entrega', handleError(
        async (actaEntregaId) => {
            console.log('📥 Solicitud obtener tarjetas por acta de entrega:', actaEntregaId);
            return await tarjetaService.getTarjetasByActaEntrega(actaEntregaId);
        },
        'Error al obtener tarjetas por acta de entrega'
    ));

    // Buscar tarjeta (compatibilidad - búsqueda general con datos enriquecidos)
    ipcMain.handle('buscar-tarjeta', handleError(
        async (searchTerm) => {
            console.log('📥 Solicitud buscar tarjeta (general):', searchTerm);
            
            // Buscar tarjetas por placa o número
            const tarjetas = await tarjetaService.searchTarjetas(searchTerm);
            
            if (!tarjetas.success || tarjetas.tarjetas.length === 0) {
                return { success: true, data: [] };
            }
            
            // Formatear resultados con datos del expediente y acta de entrega
            const resultados = tarjetas.tarjetas.map((tarjeta) => {
                const expediente = db.expedientes.findOne({ _id: tarjeta.resolucionId });
                const actaEntrega = tarjeta.actaEntregaId 
                    ? db.actasEntrega.findOne({ _id: tarjeta.actaEntregaId }) 
                    : null;
                
                return {
                    _id: tarjeta._id,
                    placa: tarjeta.placa,
                    tarjeta: tarjeta.numeroTarjeta,
                    numeroTarjeta: tarjeta.numeroTarjeta,
                    expediente: expediente ? expediente.numeroExpediente : 'N/A',
                    fecha: expediente ? expediente.fechaExpediente : 'N/A',
                    pdfPath: tarjeta.pdfPath || null,
                    expedientePdfPath: expediente ? expediente.pdfPathActa : null,
                    resolucionId: tarjeta.resolucionId,
                    actaEntregaId: tarjeta.actaEntregaId,
                    actaEntrega: actaEntrega ? {
                        _id: actaEntrega._id,
                        fechaEntrega: actaEntrega.fechaEntrega,
                        n_tarjetas_entregadas: actaEntrega.n_tarjetas_entregadas
                    } : null
                };
            });
            
            return { success: true, data: resultados };
        },
        'Error al buscar tarjeta'
    ));
}

module.exports = registerReadHandlers;
