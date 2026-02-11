// src/js/modules/searchManager.js
import { debounceSearch } from './debounce.js';

export class SearchManager {
    constructor() {
        this.searchPromises = new Map(); // Promesas de búsqueda en progreso
        this.searchTimeouts = new Map();
        this.lastSearchTerms = new Map(); // Para evitar búsquedas duplicadas
        this.hasResults = new Map(); // Para rastrear si ya hay resultados
        this.eventListenersAdded = new Set(); // Track de listeners agregados
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

        // Asegurar que el input esté habilitado
        input.disabled = false;
        input.style.cursor = 'text';
        input.style.pointerEvents = 'auto';

        // Configurar eventos (sin clonar)
        this.setupInputEvents(input, button, section, 'tarjetas');
    }

    setupExpedientesSearch() {
        const input = document.getElementById('search-expedientes-input');
        const button = document.getElementById('search-expedientes-btn');
        const section = document.querySelector('#search-expedientes .search-section') || document.getElementById('search-expedientes');

        if (!input || !button) return;

        // Asegurar que el input esté habilitado
        input.disabled = false;
        input.style.cursor = 'text';
        input.style.pointerEvents = 'auto';

        // Configurar eventos (sin clonar)
        this.setupInputEvents(input, button, section, 'expedientes');
    }

    setupInputEvents(input, button, section, type) {
        const eventKey = `${type}-events`;

        // Verificar si ya se configuraron los eventos para evitar duplicados
        if (this.eventListenersAdded.has(eventKey)) {
            console.log(`Eventos ya configurados para ${type}, saltando...`);
            // Asegurar que el input esté habilitado
            input.disabled = false;
            input.style.cursor = 'text';
            input.style.pointerEvents = 'auto';
            input.readOnly = false;
            return;
        }

        // Asegurar que el input esté habilitado y tenga el cursor correcto
        input.disabled = false;
        input.style.cursor = 'text';
        input.style.pointerEvents = 'auto';
        input.readOnly = false;

        // Agregar indicador de búsqueda si no existe
        if (section && !section.querySelector('.search-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'search-indicator';
            section.appendChild(indicator);
        }

        // Búsqueda en tiempo real con debounce
        const debouncedSearch = debounceSearch(async (searchTerm) => {
            console.log(`Búsqueda debounced ${type}:`, searchTerm);

            // Si no hay término de búsqueda, limpiar resultados
            if (!searchTerm || searchTerm.length === 0) {
                this.clearResults(type);
                this.hasResults.delete(type);
                this.lastSearchTerms.delete(type);
                return;
            }

            // Verificar si ya tenemos resultados para este término exacto
            if (this.shouldSkipSearch(type, searchTerm)) {
                console.log(`Saltando búsqueda de ${type} - ya hay resultados para: "${searchTerm}"`);
                return;
            }

            // Solo buscar si hay al menos 2 caracteres
            if (searchTerm.length >= 2) {
                await this.performSearch(type, searchTerm, section);
            }
        }, 3000); // 800ms de delay para evitar sobrecarga

        // Event listeners
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            console.log(`Input ${type} cambió:`, value);

            // Si el campo está vacío, limpiar inmediatamente
            if (value.length === 0) {
                this.clearResults(type);
                this.hasResults.delete(type);
                this.lastSearchTerms.delete(type);
                return;
            }

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
            input.disabled = false;
            input.style.cursor = 'text';
            input.style.pointerEvents = 'auto';
            input.readOnly = false;
        });

        // Prevenir que se bloquee al hacer click
        input.addEventListener('click', () => {
            input.disabled = false;
            input.readOnly = false;
        });

        // Marcar como configurado
        this.eventListenersAdded.add(eventKey);
        input.dataset.eventsConfigured = 'true';
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
        // Si ya hay búsqueda en progreso para este tipo y no es forzada, esperar
        if (this.searchPromises.has(type) && !forceRefresh) {
            console.log(`Búsqueda de ${type} ya en progreso, saltando...`);
            return;
        }

        // Si es búsqueda forzada, resetear estado
        if (forceRefresh) {
            this.hasResults.delete(type);
            this.lastSearchTerms.delete(type);
        }

        // Crear promesa de búsqueda
        const searchPromise = (async () => {
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
                // Ocultar indicador de carga
                if (section) {
                    section.classList.remove('searching');
                }

                // Limpiar promesa de búsqueda
                this.searchPromises.delete(type);

                // Asegurar que el input esté disponible
                const input = type === 'tarjetas'
                    ? document.getElementById('search-tarjetas-input')
                    : document.getElementById('search-expedientes-input');
                if (input) {
                    input.disabled = false;
                    input.readOnly = false;
                    input.style.cursor = 'text';
                    input.style.pointerEvents = 'auto';
                }
            }
        })();

        // Guardar promesa
        this.searchPromises.set(type, searchPromise);
        await searchPromise;
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
                    <p>Error: ${message}</p>
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

        // Verificar si ya se configuraron los eventos
        if (tabTarjetas.dataset.eventsConfigured === 'true') {
            console.log('Tabs ya configurados, saltando...');
            return;
        }

        // Configurar eventos
        tabTarjetas.addEventListener('click', () => {
            tabTarjetas.classList.add('active');
            tabExpedientes.classList.remove('active');
            if (searchTarjetasSection) searchTarjetasSection.style.display = 'block';
            if (searchExpedientesSection) searchExpedientesSection.style.display = 'none';

            // Asegurar que el input esté habilitado y enfocarlo
            const input = document.getElementById('search-tarjetas-input');
            if (input) {
                input.disabled = false;
                input.style.cursor = 'text';
                input.style.pointerEvents = 'auto';
                setTimeout(() => input.focus(), 100);
            }
        });

        tabExpedientes.addEventListener('click', () => {
            tabExpedientes.classList.add('active');
            tabTarjetas.classList.remove('active');
            if (searchExpedientesSection) searchExpedientesSection.style.display = 'block';
            if (searchTarjetasSection) searchTarjetasSection.style.display = 'none';

            // Asegurar que el input esté habilitado y enfocarlo
            const input = document.getElementById('search-expedientes-input');
            if (input) {
                input.disabled = false;
                input.style.cursor = 'text';
                input.style.pointerEvents = 'auto';
                setTimeout(() => input.focus(), 100);
            }
        });

        // Marcar como configurado
        tabTarjetas.dataset.eventsConfigured = 'true';
        tabExpedientes.dataset.eventsConfigured = 'true';
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
            section.classList.remove('searching', 'completed');
        });

        // Asegurar que los inputs estén habilitados
        const inputs = document.querySelectorAll('#search-tarjetas-input, #search-expedientes-input');
        inputs.forEach(input => {
            input.disabled = false;
            input.style.cursor = 'text';
            input.style.pointerEvents = 'auto';
        });

        console.log('Búsqueda reseteada');
    }

    // Método para reinicializar cuando se cambia de vista
    reinitialize() {
        console.log('Reinicializando SearchManager...');

        // Limpiar todas las promesas de búsqueda
        this.searchPromises.clear();

        // Limpiar timeouts
        this.searchTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.searchTimeouts.clear();

        // Asegurar que los inputs estén habilitados
        const inputs = document.querySelectorAll('#search-tarjetas-input, #search-expedientes-input');
        inputs.forEach(input => {
            input.disabled = false;
            input.readOnly = false;
            input.style.cursor = 'text';
            input.style.pointerEvents = 'auto';
        });

        console.log('SearchManager reinicializado');
    }
}

// Crear instancia global
export const searchManager = new SearchManager();