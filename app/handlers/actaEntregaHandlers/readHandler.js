// app/handlers/actaEntregaHandlers/readHandler.js
/**
 * Handlers de Lectura para Actas de Entrega
 * 
 * Responsabilidades:
 * - Obtener todas las actas de entrega
 * - Obtener acta por ID
 * - Buscar actas
 * - Obtener tarjetas disponibles
 * - Obtener información para eliminación
 * 
 * Canales IPC: 5
 * - acta-entrega:obtener-todas
 * - acta-entrega:obtener-por-id
 * - acta-entrega:buscar
 * - acta-entrega:tarjetas-disponibles
 * - acta-entrega:info-eliminar
 * 
 * @module actaEntregaHandlers/readHandler
 */

const { ipcMain } = require('electron');
const { handleError, handleSuccess } = require('./utils');

/**
 * Registra los handlers de lectura de actas de entrega
 * 
 * @param {ActaEntregaService} actaEntregaService - Servicio de actas de entrega
 */
function registerReadHandlers(actaEntregaService) {
    console.log('Registrando handlers de lectura de actas de entrega...');

    /**
     * Obtener todas las actas de entrega
     * Soporta filtros opcionales
     */
    ipcMain.handle('acta-entrega:obtener-todas', (event, filtros = {}) => {
        try {
            console.log('Solicitud obtener todas las actas de entrega');
            const actas = actaEntregaService.getAllActasEntrega(filtros);

            return handleSuccess({
                actas: actas,
                count: actas.length
            });
        } catch (error) {
            return handleError(error, 'obtener actas de entrega', { actas: [] });
        }
    });

    /**
     * Obtener acta de entrega por ID
     * Incluye tarjetas asociadas
     */
    ipcMain.handle('acta-entrega:obtener-por-id', (event, actaId) => {
        try {
            console.log('Solicitud obtener acta de entrega por ID:', actaId);
            const acta = actaEntregaService.getActaEntregaById(actaId);

            return handleSuccess({ acta });
        } catch (error) {
            return handleError(error, 'obtener acta de entrega', { acta: null });
        }
    });

    /**
     * Buscar actas de entrega por término de búsqueda
     * Busca en múltiples campos (fecha, observaciones, etc.)
     */
    ipcMain.handle('acta-entrega:buscar', (event, searchTerm) => {
        try {
            console.log('Solicitud buscar actas:', searchTerm);
            const actas = actaEntregaService.searchActasEntrega(searchTerm);

            return handleSuccess({
                actas: actas,
                count: actas.length
            });
        } catch (error) {
            return handleError(error, 'buscar actas', { actas: [] });
        }
    });

    /**
     * Buscar actas de entrega con paginación (optimizado para tabla CRUD)
     * Busca en múltiples campos con soporte de paginación
     */
    ipcMain.handle('buscar-actas-entrega', (event, options) => {
        try {
            const { searchTerm = '', page = 1, limit = 10 } = options;
            console.log('Buscar actas (paginado):', { searchTerm, page, limit });

            // Obtener todas las actas y filtrar si hay búsqueda
            let actasFiltradas = [];

            if (!searchTerm || searchTerm.trim() === '') {
                actasFiltradas = actaEntregaService.getAllActasEntrega();
            } else {
                actasFiltradas = actaEntregaService.searchActasEntrega(searchTerm);
            }

            const total = actasFiltradas.length;
            const totalPages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;

            // Aplicar paginación
            const actasPaginadas = actasFiltradas.slice(offset, offset + limit);

            console.log(`Actas encontradas: ${total} | Página ${page}/${totalPages}`);

            return handleSuccess({
                actas: actasPaginadas,
                total,
                page,
                limit,
                totalPages
            });
        } catch (error) {
            return handleError(error, 'buscar actas con paginación', {
                actas: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0
            });
        }
    });

    /**
     * Obtener tarjetas disponibles para asignar a actas
     * Retorna tarjetas que no tienen actaEntregaId
     */
    ipcMain.handle('acta-entrega:tarjetas-disponibles', (event) => {
        try {
            console.log('Solicitud tarjetas disponibles');
            const tarjetas = actaEntregaService.getTarjetasDisponibles();

            return handleSuccess({
                tarjetas: tarjetas,
                count: tarjetas.length
            });
        } catch (error) {
            return handleError(error, 'obtener tarjetas disponibles', { tarjetas: [] });
        }
    });

    /**
     * Obtener información detallada para confirmación de eliminación
     * Incluye: acta, tarjetas asociadas, resumen de archivos
     */
    ipcMain.handle('acta-entrega:info-eliminar', (event, actaId) => {
        try {
            console.log('Solicitud info para eliminar acta:', actaId);
            const info = actaEntregaService.getDeleteInfo(actaId);

            return handleSuccess({ info });
        } catch (error) {
            return handleError(error, 'obtener información de eliminación');
        }
    });

    console.log('Read Handlers registrados (5 canales)');
}

module.exports = registerReadHandlers;
