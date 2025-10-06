// src/js/modules/searchManager.js
import { debounceSearch } from './debounce.js';

export class SearchManager {
    constructor() {
        this.isSearching = false;
        this.searchTimeouts = new Map();
        this.lastSearchTerms = new Map(); // Para evitar búsquedas duplicadas
        this.hasResults = new Map(); // Para rastrear si ya hay resultados
        // Esperar a que el DOM esté listo y las funciones disponibles
        setTimeout(() => {
            this.initializeSearch();
        }, 100);
    }

    initializeSearch() {
        // Verificar que las funciones estén disponibles
        if (!window.performTarjetasSearch || !window.performExpedientesSearch) {
            console.warn('Funciones de búsqueda no disponibles, reintentando...');
            setTimeout(() => {
                this.initializeSearch();
            }, 200);
            return;
        }
        
        // Configurar búsqueda de tarjetas
        this.setupTarjetasSearch();
        
        // Configurar búsqueda de expedientes  
        this.setupExpedientesSearch();
        
        // Configurar tabs de búsqueda
        this.setupSearchTabs();
        
        console.log('SearchManager inicializado correctamente');
    }

    setupTarjetasSearch() {
        const input = document.getElementById('search-tarjetas-input');
        const button = document.getElementById('search-tarjetas-btn');
        const section = document.querySelector('#search-tarjetas .search-section') || document.getElementById('search-tarjetas');
        
        if (!input || !button) return;

        // Limpiar eventos previos
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Configurar nuevos eventos
        this.setupInputEvents(newInput, newButton, section, 'tarjetas');
    }

    setupExpedientesSearch() {
        const input = document.getElementById('search-expedientes-input');
        const button = document.getElementById('search-expedientes-btn');
        const section = document.querySelector('#search-expedientes .search-section') || document.getElementById('search-expedientes');
        
        if (!input || !button) return;

        // Limpiar eventos previos
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Configurar nuevos eventos
        this.setupInputEvents(newInput, newButton, section, 'expedientes');
    }

    setupInputEvents(input, button, section, type) {
        // Asegurar que el input esté habilitado y tenga el cursor correcto
        input.disabled = false;
        input.style.cursor = 'text';
        input.style.pointerEvents = 'auto';
        
        // Agregar indicador de búsqueda si no existe
        if (section && !section.querySelector('.search-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'search-indicator';
            section.appendChild(indicator);
        }

        // Búsqueda en tiempo real con debounce
        const debouncedSearch = debounceSearch(async (searchTerm) => {
            console.log(`Búsqueda debounced ${type}:`, searchTerm);
            
            // Verificar si ya tenemos resultados para este término exacto
            if (this.shouldSkipSearch(type, searchTerm)) {
                console.log(`Saltando búsqueda de ${type} - ya hay resultados para: "${searchTerm}"`);
                return;
            }
            
            if (searchTerm.length >= 2) {
                await this.performSearch(type, searchTerm, section);
            } else if (searchTerm.length === 0) {
                this.clearResults(type);
                this.hasResults.delete(type);
                this.lastSearchTerms.delete(type);
            }
        }, 500); // 500ms de delay

        // Event listeners
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            console.log(`Input ${type} cambió:`, value);
            
            // Si el usuario está borrando, permitir nueva búsqueda
            if (value.length < (this.lastSearchTerms.get(type) || '').length) {
                this.hasResults.delete(type);
            }
            
            debouncedSearch(value);
        });

        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = e.target.value.trim();
                console.log(`Enter presionado en ${type}:`, searchTerm);
                if (searchTerm) {
                    // Enter siempre fuerza búsqueda nueva
                    await this.performSearch(type, searchTerm, section, true);
                }
            }
        });

        // Mantener funcionalidad del botón
        button.addEventListener('click', async () => {
            const searchTerm = input.value.trim();
            console.log(`Botón ${type} clickeado:`, searchTerm);
            if (searchTerm) {
                // Botón siempre fuerza búsqueda nueva
                await this.performSearch(type, searchTerm, section, true);
            }
        });

        // Asegurar foco correcto
        input.addEventListener('focus', () => {
            input.style.cursor = 'text';
        });

        input.addEventListener('blur', () => {
            // Permitir que el input mantenga su funcionalidad después del blur
            setTimeout(() => {
                input.disabled = false;
                input.style.cursor = 'text';
                input.style.pointerEvents = 'auto';
            }, 100);
        });
    }

    shouldSkipSearch(type, searchTerm) {
        // No saltar si es búsqueda forzada o si no hay término anterior
        const lastTerm = this.lastSearchTerms.get(type);
        const hasResults = this.hasResults.get(type);
        
        // Saltar solo si:
        // 1. Es exactamente el mismo término
        // 2. Ya tenemos resultados para este tipo
        // 3. No es una búsqueda forzada
        return lastTerm === searchTerm && hasResults;
    }

    async performSearch(type, searchTerm, section, forceRefresh = false) {
        if (this.isSearching && !forceRefresh) return;
        
        // Si es búsqueda forzada, resetear estado
        if (forceRefresh) {
            this.hasResults.delete(type);
            this.lastSearchTerms.delete(type);
        }
        
        this.isSearching = true;
        
        try {
            // Mostrar indicador de carga
            if (section) {
                section.classList.add('searching');
            }

            console.log(`Ejecutando búsqueda de ${type} para: "${searchTerm}"`);

            // Usar las funciones de búsqueda existentes desde main.js
            if (type === 'tarjetas' && window.performTarjetasSearch) {
                await window.performTarjetasSearch(forceRefresh, searchTerm);
                // Marcar que tenemos resultados y mostrar indicador
                this.hasResults.set(type, true);
                this.lastSearchTerms.set(type, searchTerm);
                this.showSearchCompleted(type);
            } else if (type === 'expedientes' && window.performExpedientesSearch) {
                await window.performExpedientesSearch(forceRefresh, searchTerm);
                // Marcar que tenemos resultados y mostrar indicador
                this.hasResults.set(type, true);
                this.lastSearchTerms.set(type, searchTerm);
                this.showSearchCompleted(type);
            } else {
                console.error(`Función de búsqueda para ${type} no disponible`);
                this.showSearchError(type, 'Función de búsqueda no disponible');
            }

        } catch (error) {
            console.error(`Error en búsqueda de ${type}:`, error);
            this.showSearchError(type, 'Error al realizar la búsqueda');
            // En caso de error, no marcar como que tenemos resultados
            this.hasResults.delete(type);
        } finally {
            this.isSearching = false;
            
            // Ocultar indicador de carga
            if (section) {
                section.classList.remove('searching');
            }
        }
    }

    clearResults(type) {
        if (type === 'tarjetas' && window.ui && window.ui.clearTarjetasResults) {
            window.ui.clearTarjetasResults();
        } else if (type === 'expedientes' && window.ui && window.ui.clearExpedientesResults) {
            window.ui.clearExpedientesResults();
        } else {
            // Fallback manual
            const resultsContainer = type === 'tarjetas' 
                ? document.getElementById('search-tarjetas-results')
                : document.getElementById('search-expedientes-results');
                
            if (resultsContainer) {
                resultsContainer.innerHTML = '';
            }
        }
        
        // Limpiar estado de resultados
        this.hasResults.delete(type);
        this.lastSearchTerms.delete(type);
        
        // Remover indicador de completado
        const section = type === 'tarjetas' 
            ? document.getElementById('search-tarjetas')
            : document.getElementById('search-expedientes');
            
        if (section) {
            section.classList.remove('completed');
        }
    }

    showSearchCompleted(type) {
        const section = type === 'tarjetas' 
            ? document.getElementById('search-tarjetas')
            : document.getElementById('search-expedientes');
            
        if (section) {
            section.classList.add('completed');
            setTimeout(() => {
                section.classList.remove('completed');
            }, 3000); // Mostrar por 3 segundos
        }
    }

    showSearchError(type, message) {
        const resultsContainer = type === 'tarjetas' 
            ? document.getElementById('search-tarjetas-results')
            : document.getElementById('search-expedientes-results');
            
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <p>❌ ${message}</p>
                    <small>Intente nuevamente o verifique su conexión</small>
                </div>
            `;
        }
    }

    setupSearchTabs() {
        const tabTarjetas = document.getElementById('tab-tarjetas');
        const tabExpedientes = document.getElementById('tab-expedientes');
        const searchTarjetasSection = document.getElementById('search-tarjetas');
        const searchExpedientesSection = document.getElementById('search-expedientes');

        if (!tabTarjetas || !tabExpedientes) return;

        // Limpiar eventos previos
        const newTabTarjetas = tabTarjetas.cloneNode(true);
        tabTarjetas.parentNode.replaceChild(newTabTarjetas, tabTarjetas);
        
        const newTabExpedientes = tabExpedientes.cloneNode(true);
        tabExpedientes.parentNode.replaceChild(newTabExpedientes, tabExpedientes);

        // Configurar nuevos eventos
        newTabTarjetas.addEventListener('click', () => {
            newTabTarjetas.classList.add('active');
            newTabExpedientes.classList.remove('active');
            if (searchTarjetasSection) searchTarjetasSection.style.display = 'block';
            if (searchExpedientesSection) searchExpedientesSection.style.display = 'none';
            
            // Enfocar input de tarjetas
            const input = document.getElementById('search-tarjetas-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        });

        newTabExpedientes.addEventListener('click', () => {
            newTabExpedientes.classList.add('active');
            newTabTarjetas.classList.remove('active');
            if (searchExpedientesSection) searchExpedientesSection.style.display = 'block';
            if (searchTarjetasSection) searchTarjetasSection.style.display = 'none';
            
            // Enfocar input de expedientes
            const input = document.getElementById('search-expedientes-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        });
    }

    // Método para resetear la búsqueda cuando se cambia de vista
    resetSearch() {
        this.isSearching = false;
        
        // Limpiar timeouts
        this.searchTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.searchTimeouts.clear();
        
        // Limpiar estado de resultados
        this.hasResults.clear();
        this.lastSearchTerms.clear();
        
        // Limpiar indicadores de carga
        const sections = document.querySelectorAll('.search-section');
        sections.forEach(section => {
            section.classList.remove('searching');
        });
        
        // Habilitar inputs
        const inputs = document.querySelectorAll('#search-tarjetas-input, #search-expedientes-input');
        inputs.forEach(input => {
            input.disabled = false;
            input.style.cursor = 'text';
            input.style.pointerEvents = 'auto';
        });
    }

    // Método para reinicializar cuando se cambia de vista
    reinitialize() {
        this.resetSearch();
        this.initializeSearch();
    }
}

// Crear instancia global
export const searchManager = new SearchManager();