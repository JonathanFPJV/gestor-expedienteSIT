// src/js/modules/loadingManager.js
// Gestor de estados de carga para evitar bloqueos de UI

import { eventBus, APP_EVENTS } from './eventBus.js';

class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.overlayElement = null;
        this.loadingElement = null;

        this.setupEventListeners();
        this.createLoadingElements();
    }

    setupEventListeners() {
        eventBus.on(APP_EVENTS.UI_LOADING, (data) => {
            this.show(data.operation);
        });

        eventBus.on(APP_EVENTS.UI_LOADED, (data) => {
            this.hide(data.operation);
        });
    }

    createLoadingElements() {
        // Crear overlay de carga global (spinner central)
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'loading-overlay';
        this.overlayElement.className = 'loading-overlay hidden';

        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'loading-spinner';
        this.loadingElement.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">Cargando...</div>
        `;

        this.overlayElement.appendChild(this.loadingElement);
        document.body.appendChild(this.overlayElement);

        this.addStyles();
    }

    addStyles() {
        // Evitar duplicar estilos si ya existen
        if (document.getElementById('loading-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'loading-manager-styles';
        style.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                transition: opacity 0.3s ease;
            }

            .loading-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }

            .loading-overlay.visible {
                opacity: 1;
                pointer-events: all;
            }

            .loading-spinner {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #4A90E2;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                color: #333;
                font-size: 0.9rem;
                font-weight: 500;
            }

            /* Spinner pequeño para inputs de búsqueda */
            .search-loading {
                position: relative;
            }
            
            .search-loading::after {
                content: '';
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                border: 2px solid #ddd;
                border-top: 2px solid #4A90E2;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            /* Clase para botón deshabilitado visualmente durante carga */
            .btn-loading-state {
                cursor: not-allowed !important;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    show(operation = 'default', text = 'Cargando...') {
        this.loadingStates.set(operation, true);

        if (this.loadingElement) {
            this.loadingElement.querySelector('.loading-text').textContent = text;
        }

        if (this.overlayElement) {
            this.overlayElement.classList.remove('hidden');
            this.overlayElement.classList.add('visible');
        }
    }

    hide(operation = 'default') {
        this.loadingStates.delete(operation);

        if (this.loadingStates.size === 0 && this.overlayElement) {
            this.overlayElement.classList.remove('visible');
            this.overlayElement.classList.add('hidden');
        }
    }

    /**
     * Muestra estado de carga en un botón reemplazando su texto temporalmente.
     * Guarda el innerHTML original para restaurarlo después.
     * @param {HTMLElement} button - El botón a modificar
     * @param {string} loadingText - Texto a mostrar durante la carga
     */
    showButtonLoading(button, loadingText = 'Guardando...') {
        if (!button) return;

        // 1. Si ya estamos cargando este botón, no hacer nada para no perder el original
        if (button.dataset.isLoading === 'true') return;

        // 2. Guardar estado original
        // Usamos innerHTML para preservar iconos u otros elementos dentro del botón
        button.dataset.originalContent = button.innerHTML;
        button.dataset.isLoading = 'true';

        // 3. Cambiar estado visual
        button.disabled = true;
        button.classList.add('btn-loading-state');
        // Cambiar texto
        button.innerHTML = loadingText;
    }

    /**
     * Restaura el estado original del botón.
     * @param {HTMLElement} button - El botón a restaurar
     */
    hideButtonLoading(button) {
        if (!button) return;

        // Solo restaurar si realmente estaba en estado de carga iniciado por este manager
        if (button.dataset.isLoading === 'true') {
            // Restaurar contenido original
            if (button.dataset.originalContent !== undefined) {
                button.innerHTML = button.dataset.originalContent;
                delete button.dataset.originalContent;
            }

            // Restaurar estado
            button.disabled = false;
            button.classList.remove('btn-loading-state');
            delete button.dataset.isLoading;
        } else {
            // Fallback de seguridad: si por alguna razón no tiene flag pero queremos "limpiarlo"
            // Aseguramos que esté habilitado al menos.
            button.disabled = false;
            button.classList.remove('btn-loading-state');
        }
    }

    // Mostrar loading en un input de búsqueda
    showSearchLoading(input) {
        if (!input) return;
        input.classList.add('search-loading');
    }

    hideSearchLoading(input) {
        if (!input) return;
        input.classList.remove('search-loading');
    }

    clearAll() {
        this.loadingStates.clear();
        if (this.overlayElement) {
            this.overlayElement.classList.remove('visible');
            this.overlayElement.classList.add('hidden');
        }

        // Limpiar botones manualmente si es necesario (mejor reiniciar UI completa)
        document.querySelectorAll('[data-is-loading="true"]').forEach(btn => {
            this.hideButtonLoading(btn);
        });

        document.querySelectorAll('.search-loading').forEach(input => {
            this.hideSearchLoading(input);
        });
    }

    isLoading(operation = null) {
        if (operation) return this.loadingStates.has(operation);
        return this.loadingStates.size > 0;
    }
}

export const loadingManager = new LoadingManager();