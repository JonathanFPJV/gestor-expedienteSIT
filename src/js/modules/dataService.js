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
                
                window.api.on('tarjetas-actualizadas', (tarjetas) => {
                    this.updateTarjetasCache(tarjetas);
                });
            }
        } catch (error) {
            console.error('Error configurando listeners del proceso principal:', error);
        }
    }

    // === MÉTODOS PARA EXPEDIENTES ===
    
    async getAllExpedientes() {
        try {
            return await window.api.enviar('obtener-todos-expedientes');
        } catch (error) {
            console.error('Error al obtener todos los expedientes:', error);
            throw error;
        }
    }

    async createExpediente(expedienteData) {
        try {
            const result = await window.api.enviar('crear-expediente', expedienteData);
            this.emit(APP_EVENTS.EXPEDIENTE_CREATED, result);
            return result;
        } catch (error) {
            console.error('Error al crear expediente:', error);
            throw error;
        }
    }

    async updateExpediente(expedienteId, expedienteData) {
        try {
            const result = await window.api.enviar('actualizar-expediente', expedienteId, expedienteData);
            this.emit(APP_EVENTS.EXPEDIENTE_UPDATED, result);
            return result;
        } catch (error) {
            console.error('Error al actualizar expediente:', error);
            throw error;
        }
    }

    async deleteExpediente(expedienteId) {
        try {
            const result = await window.api.enviar('eliminar-expediente', expedienteId);
            this.emit(APP_EVENTS.EXPEDIENTE_DELETED, { id: expedienteId });
            return result;
        } catch (error) {
            console.error('Error al eliminar expediente:', error);
            throw error;
        }
    }

    // Manejo de expedientes (compatibilidad)
    async createExpediente(expedienteData) {
        // Validar que el API esté disponible
        if (!window.api || !window.api.invoke) {
            const error = 'API del proceso principal no disponible';
            console.error(error);
            eventBus.emit(APP_EVENTS.UI_ERROR, { message: error });
            return { success: false, message: error };
        }

        try {
            eventBus.emit(APP_EVENTS.UI_LOADING, { operation: 'createExpediente' });
            
            const result = await window.api.invoke('guardar-expediente', expedienteData);
            
            if (result.success) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_CREATED, result.data || expedienteData);
                eventBus.emit(APP_EVENTS.DATA_SYNC_REQUIRED);
                return result;
            } else {
                eventBus.emit(APP_EVENTS.UI_ERROR, { message: result.message });
                return result;
            }
        } catch (error) {
            console.error('Error al crear expediente:', error);
            const errorMessage = error.message || 'Error inesperado al guardar el expediente';
            eventBus.emit(APP_EVENTS.UI_ERROR, { message: errorMessage });
            return { success: false, message: errorMessage };
        } finally {
            eventBus.emit(APP_EVENTS.UI_LOADED, { operation: 'createExpediente' });
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
        // Invalidar cache de búsquedas
        this.cache.lastSearchTarjetas = null;
        this.cache.lastSearchExpedientes = null;
        
        // Emitir evento para que la UI se actualice automáticamente
        eventBus.emit(APP_EVENTS.DATA_REFRESHED, { type: 'expediente', data: expedienteData });
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