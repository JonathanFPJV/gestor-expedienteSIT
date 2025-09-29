// src/js/modules/dataService.js
// Servicio centralizado para manejo de datos con cache y reactivity

import { eventBus, APP_EVENTS } from './eventBus.js';

class DataService {
    constructor() {
        this.cache = {
            tarjetas: new Map(),
            actas: new Map(),
            lastSearchTarjetas: null,
            lastSearchActas: null
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
            // Escuchar cuando se guarda una acta desde el proceso principal
            if (window.api.on) {
                window.api.on('acta-guardada', (actaData) => {
                    this.handleActaCreated(actaData);
                });
                
                window.api.on('tarjetas-actualizadas', (tarjetas) => {
                    this.updateTarjetasCache(tarjetas);
                });
            }
        } catch (error) {
            console.error('Error configurando listeners del proceso principal:', error);
        }
    }

    // Manejo de actas
    async createActa(actaData) {
        // Validar que el API esté disponible
        if (!window.api || !window.api.invoke) {
            const error = 'API del proceso principal no disponible';
            console.error(error);
            eventBus.emit(APP_EVENTS.UI_ERROR, { message: error });
            return { success: false, message: error };
        }

        try {
            eventBus.emit(APP_EVENTS.UI_LOADING, { operation: 'createActa' });
            
            const result = await window.api.invoke('guardar-acta', actaData);
            
            if (result.success) {
                eventBus.emit(APP_EVENTS.ACTA_CREATED, result.data || actaData);
                eventBus.emit(APP_EVENTS.DATA_SYNC_REQUIRED);
                return result;
            } else {
                eventBus.emit(APP_EVENTS.UI_ERROR, { message: result.message });
                return result;
            }
        } catch (error) {
            console.error('Error al crear acta:', error);
            const errorMessage = error.message || 'Error inesperado al guardar el acta';
            eventBus.emit(APP_EVENTS.UI_ERROR, { message: errorMessage });
            return { success: false, message: errorMessage };
        } finally {
            eventBus.emit(APP_EVENTS.UI_LOADED, { operation: 'createActa' });
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

    async searchActas(searchTerm, forceRefresh = false) {
        // Validar que el API esté disponible
        if (!window.api || !window.api.invoke) {
            const error = 'API del proceso principal no disponible';
            console.error(error);
            eventBus.emit(APP_EVENTS.SEARCH_FAILED, { type: 'actas', error });
            return { success: false, message: error };
        }

        try {
            eventBus.emit(APP_EVENTS.SEARCH_REQUESTED, { type: 'actas', term: searchTerm });
            eventBus.emit(APP_EVENTS.UI_LOADING, { operation: 'searchActas' });

            // Si es la misma búsqueda y no se fuerza refresh, usar cache
            if (!forceRefresh && this.cache.lastSearchActas?.term === searchTerm) {
                eventBus.emit(APP_EVENTS.SEARCH_COMPLETED, { 
                    type: 'actas', 
                    data: this.cache.lastSearchActas.results,
                    fromCache: true 
                });
                return { success: true, data: this.cache.lastSearchActas.results };
            }

            const result = await window.api.invoke('buscar-acta', searchTerm);
            
            if (result.success) {
                // Actualizar cache
                this.cache.lastSearchActas = {
                    term: searchTerm,
                    results: result.data,
                    timestamp: Date.now()
                };
                
                eventBus.emit(APP_EVENTS.SEARCH_COMPLETED, { 
                    type: 'actas', 
                    data: result.data,
                    fromCache: false 
                });
            } else {
                eventBus.emit(APP_EVENTS.SEARCH_FAILED, { 
                    type: 'actas', 
                    error: result.message 
                });
            }

            return result;
        } catch (error) {
            console.error('Error en búsqueda de actas:', error);
            const errorMessage = error.message || 'Error inesperado en la búsqueda';
            eventBus.emit(APP_EVENTS.SEARCH_FAILED, { 
                type: 'actas', 
                error: errorMessage 
            });
            return { success: false, message: errorMessage };
        } finally {
            eventBus.emit(APP_EVENTS.UI_LOADED, { operation: 'searchActas' });
        }
    }

    // Invalidar cache cuando se crean nuevos registros
    handleActaCreated(actaData) {
        // Invalidar cache de búsquedas
        this.cache.lastSearchTarjetas = null;
        this.cache.lastSearchActas = null;
        
        // Emitir evento para que la UI se actualice automáticamente
        eventBus.emit(APP_EVENTS.DATA_REFRESHED, { type: 'acta', data: actaData });
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
        this.cache.actas.clear();
        this.cache.lastSearchTarjetas = null;
        this.cache.lastSearchActas = null;
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
            lastSearchActas: this.cache.lastSearchActas ? {
                term: this.cache.lastSearchActas.term,
                resultsCount: this.cache.lastSearchActas.results.length,
                timestamp: this.cache.lastSearchActas.timestamp
            } : null
        };
    }
}

// Instancia singleton del servicio de datos
export const dataService = new DataService();