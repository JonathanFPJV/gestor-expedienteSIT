// src/js/modules/actas/ActaDataService.js
/**
 * Servicio de datos para Actas de Entrega
 * Responsabilidad: Toda la comunicación IPC con el backend
 */

class ActaDataService {
    /**
     * Cargar todas las actas
     * @returns {Promise<{success: boolean, actas?: Array, error?: string}>}
     */
    async loadAll() {
        try {
            console.log('Cargando actas desde el backend...');
            const result = await window.api.invoke('acta-entrega:obtener-todas');
            if (result.success) {
                console.log(`${(result.actas || []).length} actas cargadas`);
            }
            return result;
        } catch (error) {
            console.error('Error al cargar actas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener acta por ID
     * @param {number} actaId
     * @returns {Promise<{success: boolean, acta?: Object, error?: string}>}
     */
    async getById(actaId) {
        try {
            return await window.api.invoke('acta-entrega:obtener-por-id', actaId);
        } catch (error) {
            console.error('Error al obtener acta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear nueva acta
     * @param {Object} actaData - Datos del acta
     * @param {number[]} tarjetasIds - IDs de tarjetas asociadas
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async create(actaData, tarjetasIds) {
        try {
            console.log('Creando acta:', actaData, 'Tarjetas:', tarjetasIds);
            return await window.api.invoke('acta-entrega:crear', actaData, tarjetasIds);
        } catch (error) {
            console.error('Error al crear acta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar acta existente
     * @param {number} actaId
     * @param {Object} actaData
     * @param {number[]} tarjetasIds
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async update(actaId, actaData, tarjetasIds) {
        try {
            console.log('Actualizando acta:', actaId, actaData, 'Tarjetas:', tarjetasIds);
            return await window.api.invoke('acta-entrega:actualizar', actaId, actaData, tarjetasIds);
        } catch (error) {
            console.error('Error al actualizar acta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar acta
     * @param {number} actaId
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async delete(actaId) {
        try {
            return await window.api.invoke('acta-entrega:eliminar', actaId);
        } catch (error) {
            console.error('Error al eliminar acta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener información previa a eliminación
     * @param {number} actaId
     * @returns {Promise<{success: boolean, info?: Object, error?: string}>}
     */
    async getDeleteInfo(actaId) {
        try {
            return await window.api.invoke('acta-entrega:info-eliminar', actaId);
        } catch (error) {
            console.error('Error al obtener info de eliminación:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Buscar actas con paginación
     * @param {string} term - Término de búsqueda
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    async search(term, page = 1, limit = 10) {
        try {
            console.log(`Buscando actas en backend: "${term}"`);
            return await window.api.invoke('buscar-actas-entrega', {
                searchTerm: term,
                page,
                limit
            });
        } catch (error) {
            console.error('Error al buscar actas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Buscar actas (búsqueda simple por botón)
     * @param {string} term
     * @returns {Promise<Object>}
     */
    async searchSimple(term) {
        try {
            console.log('Buscando actas:', term);
            return await window.api.invoke('acta-entrega:buscar', term);
        } catch (error) {
            console.error('Error en búsqueda:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener tarjetas disponibles para asignar a actas
     * @returns {Promise<{success: boolean, tarjetas?: Array}>}
     */
    async getAvailableTarjetas() {
        try {
            return await window.api.invoke('acta-entrega:tarjetas-disponibles');
        } catch (error) {
            console.error('Error al cargar tarjetas disponibles:', error);
            return { success: false, tarjetas: [] };
        }
    }

    /**
     * Abrir un PDF en aplicación externa
     * @param {string} pdfPath
     */
    async openPdf(pdfPath) {
        try {
            await window.api.invoke('acta-entrega:abrir-pdf', pdfPath);
        } catch (error) {
            console.error('Error al abrir PDF:', error);
            throw error;
        }
    }

    /**
     * Seleccionar un PDF desde el diálogo de archivos
     * @returns {Promise<string|null>}
     */
    async selectPdf() {
        try {
            return await window.api.invoke('acta-entrega:seleccionar-pdf');
        } catch (error) {
            console.error('Error al seleccionar PDF:', error);
            return null;
        }
    }
}

export const actaDataService = new ActaDataService();
