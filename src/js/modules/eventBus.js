// src/js/modules/eventBus.js
// Sistema de eventos centralizado para hacer la aplicación reactiva

class EventBus {
    constructor() {
        this.events = {};
    }

    // Suscribirse a un evento
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Retornar función para desuscribirse
        return () => {
            this.off(event, callback);
        };
    }

    // Desuscribirse de un evento
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    // Emitir un evento
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en el evento ${event}:`, error);
                }
            });
        }
    }

    // Emitir un evento de forma asíncrona
    async emitAsync(event, data) {
        if (this.events[event]) {
            const promises = this.events[event].map(callback => {
                try {
                    return Promise.resolve(callback(data));
                } catch (error) {
                    console.error(`Error en el evento ${event}:`, error);
                    return Promise.resolve();
                }
            });
            await Promise.all(promises);
        }
    }

    // Limpiar todos los eventos
    clear() {
        this.events = {};
    }
}

// Instancia global del bus de eventos
export const eventBus = new EventBus();

// Eventos predefinidos de la aplicación
export const APP_EVENTS = {
    // Eventos de actas
    ACTA_CREATED: 'acta:created',
    ACTA_UPDATED: 'acta:updated',
    ACTA_DELETED: 'acta:deleted',
    
    // Eventos de tarjetas
    TARJETA_CREATED: 'tarjeta:created',
    TARJETA_UPDATED: 'tarjeta:updated',
    TARJETA_DELETED: 'tarjeta:deleted',
    
    // Eventos de búsqueda
    SEARCH_REQUESTED: 'search:requested',
    SEARCH_COMPLETED: 'search:completed',
    SEARCH_FAILED: 'search:failed',
    
    // Eventos de UI
    UI_LOADING: 'ui:loading',
    UI_LOADED: 'ui:loaded',
    UI_ERROR: 'ui:error',
    
    // Eventos de datos
    DATA_REFRESHED: 'data:refreshed',
    DATA_SYNC_REQUIRED: 'data:sync-required'
};