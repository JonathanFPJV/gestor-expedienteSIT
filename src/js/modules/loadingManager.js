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
        // Crear overlay de carga
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

        // Agregar estilos
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
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

            /* Estilos para indicadores de carga locales */
            .btn-loading {
                position: relative;
                pointer-events: none;
            }

            .btn-loading::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                top: 50%;
                left: 50%;
                margin-left: -8px;
                margin-top: -8px;
                border: 2px solid transparent;
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .btn-loading .btn-text {
                opacity: 0;
            }

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
        
        // Solo ocultar si no hay otras operaciones de carga activas
        if (this.loadingStates.size === 0 && this.overlayElement) {
            this.overlayElement.classList.remove('visible');
            this.overlayElement.classList.add('hidden');
        }
    }

    // Mostrar loading en un botón específico
    showButtonLoading(button, originalText = null) {
        if (!button) return;
        
        if (originalText) {
            button.dataset.originalText = originalText;
        } else {
            button.dataset.originalText = button.textContent;
        }
        
        button.classList.add('btn-loading');
        button.disabled = true;
        
        if (button.querySelector('.btn-text')) {
            button.querySelector('.btn-text').style.opacity = '0';
        } else {
            const textSpan = document.createElement('span');
            textSpan.className = 'btn-text';
            textSpan.textContent = button.textContent;
            button.innerHTML = '';
            button.appendChild(textSpan);
        }
    }

    hideButtonLoading(button) {
        if (!button) return;
        
        button.classList.remove('btn-loading');
        button.disabled = false;
        
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
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

    // Limpiar todos los estados de carga
    clearAll() {
        this.loadingStates.clear();
        if (this.overlayElement) {
            this.overlayElement.classList.remove('visible');
            this.overlayElement.classList.add('hidden');
        }
        
        // Limpiar botones
        document.querySelectorAll('.btn-loading').forEach(btn => {
            this.hideButtonLoading(btn);
        });
        
        // Limpiar inputs de búsqueda
        document.querySelectorAll('.search-loading').forEach(input => {
            this.hideSearchLoading(input);
        });
    }

    isLoading(operation = null) {
        if (operation) {
            return this.loadingStates.has(operation);
        }
        return this.loadingStates.size > 0;
    }
}

// Instancia singleton del gestor de carga
export const loadingManager = new LoadingManager();