// src/js/modules/tarjetas/TarjetaDataService.js
/**
 * Servicio de datos para Tarjetas
 * Responsabilidad: Toda la comunicación IPC con el backend
 */

class TarjetaDataService {
    /**
     * Buscar tarjetas con paginación
     * @param {Object} options - Opciones de búsqueda
     * @returns {Promise<Object>}
     */
    async search(options = {}) {
        try {
            console.log('Buscando tarjetas:', options);
            return await window.api.invoke('buscar-tarjetas', options);
        } catch (error) {
            console.error('Error al buscar tarjetas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener tarjeta por ID
     * @param {number} tarjetaId
     * @returns {Promise<Object>}
     */
    async getById(tarjetaId) {
        try {
            return await window.api.invoke('tarjeta:obtener-por-id', tarjetaId);
        } catch (error) {
            console.error('Error al obtener tarjeta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crear nueva tarjeta
     * @param {Object} tarjetaData
     * @param {string|null} pdfPath
     * @returns {Promise<Object>}
     */
    async create(tarjetaData, pdfPath = null) {
        try {
            console.log('Creando tarjeta:', { tarjetaData, pdfPath });
            return await window.api.invoke('tarjeta:crear', tarjetaData, pdfPath);
        } catch (error) {
            console.error('Error al crear tarjeta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualizar tarjeta existente
     * @param {number} tarjetaId
     * @param {Object} tarjetaData
     * @param {string|null} pdfPath
     * @returns {Promise<Object>}
     */
    async update(tarjetaId, tarjetaData, pdfPath = null) {
        try {
            console.log('Actualizando tarjeta:', { tarjetaId, tarjetaData, pdfPath });
            return await window.api.invoke('tarjeta:actualizar', tarjetaId, tarjetaData, pdfPath);
        } catch (error) {
            console.error('Error al actualizar tarjeta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Eliminar tarjeta
     * @param {number} tarjetaId
     * @returns {Promise<Object>}
     */
    async delete(tarjetaId) {
        try {
            return await window.api.invoke('tarjeta:eliminar', tarjetaId);
        } catch (error) {
            console.error('Error al eliminar tarjeta:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener todos los expedientes para los selects
     * @returns {Promise<Array>}
     */
    async getExpedientes() {
        try {
            const resultado = await window.api.invoke('obtener-todos-expedientes');
            return Array.isArray(resultado) ? resultado : [];
        } catch (error) {
            console.error('Error al cargar expedientes:', error);
            return [];
        }
    }

    /**
     * Obtener estados disponibles
     * @returns {Promise<{success: boolean, estados?: Array}>}
     */
    async getEstados() {
        try {
            return await window.api.invoke('tarjeta:obtener-estados-disponibles');
        } catch (error) {
            console.error('Error al cargar estados:', error);
            return { success: false, estados: [] };
        }
    }

    /**
     * Obtener actas de entrega para los selects
     * @returns {Promise<{success: boolean, actas?: Array}>}
     */
    async getActasEntrega() {
        try {
            return await window.api.invoke('acta-entrega:obtener-todas');
        } catch (error) {
            console.error('Error al cargar actas de entrega:', error);
            return { success: false, actas: [] };
        }
    }

    /**
     * Abrir PDF de tarjeta en aplicación externa
     * @param {string} pdfPath
     * @returns {Promise<Object>}
     */
    async openPdf(pdfPath) {
        try {
            return await window.api.invoke('tarjeta:abrir-pdf', pdfPath);
        } catch (error) {
            console.error('Error al abrir PDF:', error);
            return { success: false, error: error.message };
        }
    }
}

export const tarjetaDataService = new TarjetaDataService();
