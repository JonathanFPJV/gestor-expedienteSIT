// src/js/modules/pdfViewerExample.js
// Ejemplos de uso del visor de PDF avanzado

import { advancedPdfViewer } from './advancedPdfViewer.js';
import { getViewerConfig, getLocalizedString } from './pdfViewerConfig.js';

/**
 * Ejemplo básico de uso del visor de PDF
 */
export function createBasicPdfViewer(containerId, pdfPath, title) {
    return advancedPdfViewer.createViewer(containerId, pdfPath, title);
}

/**
 * Ejemplo de visor de PDF compacto (para espacios pequeños)
 */
export function createCompactPdfViewer(containerId, pdfPath, title) {
    // Configuración personalizada para modo compacto
    const compactConfig = {
        ui: {
            compactMode: true,
            showToolbar: true
        },
        thumbnails: {
            enabled: false
        },
        view: {
            defaultMode: 'single'
        }
    };
    
    // Crear instancia con configuración personalizada
    const viewer = new (class extends advancedPdfViewer.constructor {
        constructor() {
            super();
            this.config = getViewerConfig(compactConfig);
        }
    })();
    
    return viewer.createViewer(containerId, pdfPath, title);
}

/**
 * Ejemplo de visor de PDF para móviles
 */
export function createMobilePdfViewer(containerId, pdfPath, title) {
    const mobileConfig = {
        ui: {
            compactMode: true,
            hideLabels: true
        },
        thumbnails: {
            enabled: false
        },
        view: {
            defaultMode: 'single'
        },
        performance: {
            preloadPages: 1,
            cacheSize: 5
        }
    };
    
    const viewer = new (class extends advancedPdfViewer.constructor {
        constructor() {
            super();
            this.config = getViewerConfig(mobileConfig);
        }
    })();
    
    return viewer.createViewer(containerId, pdfPath, title);
}

/**
 * Ejemplo de visor de PDF con funcionalidades limitadas (solo lectura)
 */
export function createReadOnlyPdfViewer(containerId, pdfPath, title) {
    const readOnlyConfig = {
        features: {
            download: false,
            print: false,
            rotation: false
        },
        ui: {
            compactMode: true
        }
    };
    
    const viewer = new (class extends advancedPdfViewer.constructor {
        constructor() {
            super();
            this.config = getViewerConfig(readOnlyConfig);
        }
    })();
    
    return viewer.createViewer(containerId, pdfPath, title);
}

/**
 * Ejemplo de visor de PDF con tema oscuro
 */
export function createDarkThemePdfViewer(containerId, pdfPath, title) {
    const darkConfig = {
        ui: {
            theme: 'dark'
        }
    };
    
    const viewer = new (class extends advancedPdfViewer.constructor {
        constructor() {
            super();
            this.config = getViewerConfig(darkConfig);
            this.addDarkThemeStyles();
        }
        
        addDarkThemeStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .advanced-pdf-viewer.dark-theme {
                    background: #2d3748;
                    color: #e2e8f0;
                }
                
                .advanced-pdf-viewer.dark-theme .pdf-header {
                    background: #4a5568;
                    border-bottom-color: #2d3748;
                }
                
                .advanced-pdf-viewer.dark-theme .pdf-btn {
                    background: #4a5568;
                    border-color: #2d3748;
                    color: #e2e8f0;
                }
                
                .advanced-pdf-viewer.dark-theme .pdf-btn:hover {
                    background: #2d3748;
                }
                
                .advanced-pdf-viewer.dark-theme .pdf-sidebar {
                    background: #4a5568;
                    border-right-color: #2d3748;
                }
                
                .advanced-pdf-viewer.dark-theme .pdf-viewport {
                    background: #1a202c;
                }
            `;
            document.head.appendChild(style);
        }
    })();
    
    const viewerElement = viewer.createViewer(containerId, pdfPath, title);
    viewerElement.classList.add('dark-theme');
    
    return viewerElement;
}

/**
 * Función utilitaria para crear visor automático según el contexto
 */
export function createAutoPdfViewer(containerId, pdfPath, title, options = {}) {
    const {
        compact = false,
        readOnly = false,
        darkTheme = false,
        mobile = null // null = auto-detect
    } = options;
    
    // Auto-detectar móvil si no se especifica
    const isMobile = mobile !== null ? mobile : window.innerWidth <= 768;
    
    if (isMobile) {
        return createMobilePdfViewer(containerId, pdfPath, title);
    } else if (readOnly) {
        return createReadOnlyPdfViewer(containerId, pdfPath, title);
    } else if (darkTheme) {
        return createDarkThemePdfViewer(containerId, pdfPath, title);
    } else if (compact) {
        return createCompactPdfViewer(containerId, pdfPath, title);
    } else {
        return createBasicPdfViewer(containerId, pdfPath, title);
    }
}

/**
 * Función para crear múltiples visores de PDF en una página
 */
export function createMultiplePdfViewers(pdfConfigs) {
    const viewers = [];
    
    pdfConfigs.forEach((config, index) => {
        const {
            containerId,
            pdfPath,
            title,
            options = {}
        } = config;
        
        // Agregar delay para evitar sobrecarga
        setTimeout(() => {
            const viewer = createAutoPdfViewer(containerId, pdfPath, title, options);
            viewers.push(viewer);
        }, index * 200);
    });
    
    return viewers;
}

/**
 * Función para gestionar el estado de múltiples visores
 */
export class PdfViewerManager {
    constructor() {
        this.viewers = new Map();
        this.activeViewer = null;
    }
    
    addViewer(id, containerId, pdfPath, title, options = {}) {
        const viewer = createAutoPdfViewer(containerId, pdfPath, title, options);
        this.viewers.set(id, {
            viewer,
            containerId,
            pdfPath,
            title,
            options
        });
        return viewer;
    }
    
    removeViewer(id) {
        if (this.viewers.has(id)) {
            const viewerData = this.viewers.get(id);
            const container = document.getElementById(viewerData.containerId);
            if (container) {
                container.innerHTML = '';
            }
            this.viewers.delete(id);
        }
    }
    
    showViewer(id) {
        if (this.viewers.has(id)) {
            this.hideAllViewers();
            const viewerData = this.viewers.get(id);
            const container = document.getElementById(viewerData.containerId);
            if (container) {
                container.style.display = 'block';
                this.activeViewer = id;
            }
        }
    }
    
    hideViewer(id) {
        if (this.viewers.has(id)) {
            const viewerData = this.viewers.get(id);
            const container = document.getElementById(viewerData.containerId);
            if (container) {
                container.style.display = 'none';
            }
            if (this.activeViewer === id) {
                this.activeViewer = null;
            }
        }
    }
    
    hideAllViewers() {
        this.viewers.forEach((viewerData, id) => {
            const container = document.getElementById(viewerData.containerId);
            if (container) {
                container.style.display = 'none';
            }
        });
        this.activeViewer = null;
    }
    
    getActiveViewer() {
        return this.activeViewer ? this.viewers.get(this.activeViewer) : null;
    }
    
    getAllViewers() {
        return Array.from(this.viewers.values());
    }
}

// Instancia global del gestor de visores
export const pdfViewerManager = new PdfViewerManager();