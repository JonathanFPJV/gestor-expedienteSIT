// src/js/modules/dataService.js
// Servicio centralizado para manejo de datos con cache y reactivity

import { eventBus, APP_EVENTS } from './eventBus.js';

class DataService {
    constructor() {
        this.cache = {
            tarjetas: new Map(),
            expedientes: new Map(),
            lastSearchTarjetas: null,
            lastSearchExpedientes: null
        };

        // Escuchar eventos del proceso principal
        this.setupMainProcessListeners();
    }

    setupMainProcessListeners() {
        // Verificar que el API existe antes de configurar listeners
        if (typeof window === 'undefined' || !window.api) {
            console.warn('window.api no está disponible, algunos eventos no funcionarán');
            return;
        }

        try {
            // Escuchar cuando se guarda un expediente desde el proceso principal
            if (window.api.on) {
                window.api.on('expediente-guardado', (expedienteData) => {
                    this.handleExpedienteCreated(expedienteData);
                });
                window.api.on('expediente-actualizado', (expedienteData) => {
                    this.handleExpedienteUpdated(expedienteData);
                });

                window.api.on('tarjetas-actualizadas', (tarjetas) => {
                    this.updateTarjetasCache(tarjetas);
                });
            }
        } catch (error) {
            console.error('Error configurando listeners del proceso principal:', error);
        }
    }

    // === MÉTODOS PARA EXPEDIENTES ===

    /**
     * Obtener expedientes con paginación (RECOMENDADO)
     * @param {Object} options - Opciones de paginación
     * @param {number} options.page - Página actual (default: 1)
     * @param {number} options.limit - Registros por página (default: 10)
     * @param {string} options.sortBy - Campo para ordenar (default: 'fechaExpediente')
     * @param {string} options.sortOrder - Orden: 'asc' o 'desc' (default: 'desc')
     * @returns {Promise<Object>} { success, data, pagination }
     */
    async getExpedientesPaginados(options = {}) {
        try {
            console.log('Solicitando expedientes paginados:', options);
            const resultado = await window.api.invoke('expediente:obtener-paginado', options);

            if (resultado.success) {
                console.log('Expedientes paginados recibidos:', {
                    registros: resultado.data.length,
                    pagina: resultado.pagination.currentPage,
                    total: resultado.pagination.totalRecords
                });
            }

            return resultado;
        } catch (error) {
            console.error('Error al obtener expedientes paginados:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los expedientes (SIN PAGINACIÓN)
     *  DEPRECADO: Usar getExpedientesPaginados() para mejor rendimiento
     */
    async getAllExpedientes() {
        try {
            console.log('getAllExpedientes - Considera usar getExpedientesPaginados()');
            console.log('Solicitando expedientes al backend...');
            const expedientes = await window.api.invoke('obtener-todos-expedientes');
            console.log('Expedientes recibidos del backend:', expedientes);
            return expedientes;
        } catch (error) {
            console.error('Error al obtener todos los expedientes:', error);
            throw error;
        }
    }

    async createExpediente(expedienteData) {
        try {
            const result = await window.api.invoke('crear-expediente', expedienteData);
            eventBus.emit(APP_EVENTS.EXPEDIENTE_CREATED, result);
            return result;
        } catch (error) {
            console.error('Error al crear expediente:', error);
            throw error;
        }
    }

    async updateExpediente(expedienteId, expedienteData) {
        try {
            const result = await window.api.invoke('actualizar-expediente', expedienteId, expedienteData);
            eventBus.emit(APP_EVENTS.EXPEDIENTE_UPDATED, result);
            return result;
        } catch (error) {
            console.error('Error al actualizar expediente:', error);
            throw error;
        }
    }

    async deleteExpediente(expedienteId) {
        try {
            console.log('Enviando solicitud de eliminación al backend:', expedienteId);
            const result = await window.api.invoke('eliminar-expediente', expedienteId);
            console.log('Resultado RAW de eliminación:', JSON.stringify(result, null, 2));

            // Verificar que result existe
            if (!result) {
                console.error('Resultado es null o undefined');
                return {
                    success: false,
                    error: 'No se recibió respuesta del servidor',
                    message: 'No se recibió respuesta del servidor'
                };
            }

            // Si la eliminación fue exitosa, emitir evento usando eventBus
            if (result.success) {
                console.log('Eliminación exitosa, emitiendo evento');
                eventBus.emit(APP_EVENTS.EXPEDIENTE_DELETED, {
                    id: expedienteId,
                    summary: result.summary
                });
            } else {
                console.warn('Eliminación no exitosa:', result.message || result.error);
            }

            return result;
        } catch (error) {
            console.error('Error CATCH al eliminar expediente:', error);
            console.error('Error tipo:', typeof error);
            console.error('Error contenido:', JSON.stringify(error, null, 2));

            // Si el error es un objeto con success: false, retornarlo en lugar de lanzar
            if (error && typeof error === 'object' && error.success === false) {
                console.warn('Retornando error estructurado del backend');
                return error;
            }

            // Para otros errores, crear un objeto de respuesta
            return {
                success: false,
                error: error.message || 'Error desconocido',
                message: error.message || 'Error al eliminar expediente'
            };
        }
    }

    async getDeleteInfo(expedienteId) {
        try {
            console.log('Obteniendo información para eliminación:', expedienteId);
            const result = await window.api.invoke('obtener-info-eliminacion', expedienteId);
            console.log('Información de eliminación obtenida:', result);
            return result;
        } catch (error) {
            console.error('Error al obtener información de eliminación:', error);
            throw error;
        }
    }

    async searchTarjetas(searchTerm, forceRefresh = false) {
        // Validar que el API esté disponible
        if (!window.api || !window.api.invoke) {
            const error = 'API del proceso principal no disponible';
            console.error(error);
            eventBus.emit(APP_EVENTS.SEARCH_FAILED, { type: 'tarjetas', error });
            return { success: false, message: error };
        }

        try {
            eventBus.emit(APP_EVENTS.SEARCH_REQUESTED, { type: 'tarjetas', term: searchTerm });
            eventBus.emit(APP_EVENTS.UI_LOADING, { operation: 'searchTarjetas' });

            // Si es la misma búsqueda y no se fuerza refresh, usar cache
            if (!forceRefresh && this.cache.lastSearchTarjetas?.term === searchTerm) {
                eventBus.emit(APP_EVENTS.SEARCH_COMPLETED, {
                    type: 'tarjetas',
                    data: this.cache.lastSearchTarjetas.results,
                    fromCache: true
                });
                return { success: true, data: this.cache.lastSearchTarjetas.results };
            }

            const result = await window.api.invoke('buscar-tarjeta', searchTerm);

            if (result.success) {
                // Actualizar cache
                this.cache.lastSearchTarjetas = {
                    term: searchTerm,
                    results: result.data,
                    timestamp: Date.now()
                };

                eventBus.emit(APP_EVENTS.SEARCH_COMPLETED, {
                    type: 'tarjetas',
                    data: result.data,
                    fromCache: false
                });
            } else {
                eventBus.emit(APP_EVENTS.SEARCH_FAILED, {
                    type: 'tarjetas',
                    error: result.message
                });
            }

            return result;
        } catch (error) {
            console.error('Error en búsqueda de tarjetas:', error);
            const errorMessage = error.message || 'Error inesperado en la búsqueda';
            eventBus.emit(APP_EVENTS.SEARCH_FAILED, {
                type: 'tarjetas',
                error: errorMessage
            });
            return { success: false, message: errorMessage };
        } finally {
            eventBus.emit(APP_EVENTS.UI_LOADED, { operation: 'searchTarjetas' });
        }
    }

    async searchExpedientes(searchTerm, forceRefresh = false) {
        // Validar que el API esté disponible
        if (!window.api || !window.api.invoke) {
            const error = 'API del proceso principal no disponible';
            console.error(error);
            eventBus.emit(APP_EVENTS.SEARCH_FAILED, { type: 'expedientes', error });
            return { success: false, message: error };
        }

        try {
            eventBus.emit(APP_EVENTS.SEARCH_REQUESTED, { type: 'expedientes', term: searchTerm });
            eventBus.emit(APP_EVENTS.UI_LOADING, { operation: 'searchExpedientes' });

            // Si es la misma búsqueda y no se fuerza refresh, usar cache
            if (!forceRefresh && this.cache.lastSearchExpedientes?.term === searchTerm) {
                eventBus.emit(APP_EVENTS.SEARCH_COMPLETED, {
                    type: 'expedientes',
                    data: this.cache.lastSearchExpedientes.results,
                    fromCache: true
                });
                return { success: true, data: this.cache.lastSearchExpedientes.results };
            }

            const result = await window.api.invoke('buscar-expediente', searchTerm);

            if (result.success) {
                // Actualizar cache
                this.cache.lastSearchExpedientes = {
                    term: searchTerm,
                    results: result.data,
                    timestamp: Date.now()
                };

                eventBus.emit(APP_EVENTS.SEARCH_COMPLETED, {
                    type: 'expedientes',
                    data: result.data,
                    fromCache: false
                });
            } else {
                eventBus.emit(APP_EVENTS.SEARCH_FAILED, {
                    type: 'expedientes',
                    error: result.message
                });
            }

            return result;
        } catch (error) {
            console.error('Error en búsqueda de expedientes:', error);
            const errorMessage = error.message || 'Error inesperado en la búsqueda';
            eventBus.emit(APP_EVENTS.SEARCH_FAILED, {
                type: 'expedientes',
                error: errorMessage
            });
            return { success: false, message: errorMessage };
        } finally {
            eventBus.emit(APP_EVENTS.UI_LOADED, { operation: 'searchExpedientes' });
        }
    }

    // Invalidar cache cuando se crean nuevos registros
    handleExpedienteCreated(expedienteData) {
        console.log('handleExpedienteCreated llamado con:', expedienteData);

        // Invalidar cache de búsquedas
        this.cache.lastSearchTarjetas = null;
        this.cache.lastSearchExpedientes = null;

        // Emitir evento EXPEDIENTE_CREATED para que la tabla se actualice
        eventBus.emit(APP_EVENTS.EXPEDIENTE_CREATED, { expediente: expedienteData });

        // También emitir DATA_REFRESHED para compatibilidad
        eventBus.emit(APP_EVENTS.DATA_REFRESHED, { type: 'expediente', data: expedienteData });

        console.log('Eventos emitidos para expediente creado');
    }

    handleExpedienteUpdated(expedienteData) {
        console.log('handleExpedienteUpdated llamado con:', expedienteData);

        this.cache.lastSearchTarjetas = null;
        this.cache.lastSearchExpedientes = null;

        // Emitir evento EXPEDIENTE_UPDATED
        eventBus.emit(APP_EVENTS.EXPEDIENTE_UPDATED, { expediente: expedienteData });

        // También emitir DATA_REFRESHED para compatibilidad
        eventBus.emit(APP_EVENTS.DATA_REFRESHED, { type: 'expediente', data: expedienteData });

        console.log('Eventos emitidos para expediente actualizado');
    }

    updateTarjetasCache(tarjetas) {
        tarjetas.forEach(tarjeta => {
            this.cache.tarjetas.set(tarjeta._id, tarjeta);
        });

        eventBus.emit(APP_EVENTS.DATA_REFRESHED, { type: 'tarjetas', data: tarjetas });
    }

    // Limpiar cache
    clearCache() {
        this.cache.tarjetas.clear();
        this.cache.expedientes.clear();
        this.cache.lastSearchTarjetas = null;
        this.cache.lastSearchExpedientes = null;
    }

    // Obtener estadísticas del cache
    getCacheStats() {
        return {
            tarjetas: this.cache.tarjetas.size,
            actas: this.cache.actas.size,
            lastSearchTarjetas: this.cache.lastSearchTarjetas ? {
                term: this.cache.lastSearchTarjetas.term,
                resultsCount: this.cache.lastSearchTarjetas.results.length,
                timestamp: this.cache.lastSearchTarjetas.timestamp
            } : null,
            lastSearchExpedientes: this.cache.lastSearchExpedientes ? {
                term: this.cache.lastSearchExpedientes.term,
                resultsCount: this.cache.lastSearchExpedientes.results.length,
                timestamp: this.cache.lastSearchExpedientes.timestamp
            } : null
        };
    }
}

// Instancia singleton del servicio de datos
export const dataService = new DataService();