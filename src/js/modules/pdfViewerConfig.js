// src/js/modules/pdfViewerConfig.js
// Configuración personalizable para el visor de PDF

export const PDF_VIEWER_CONFIG = {
    // Configuración de zoom
    zoom: {
        min: 0.25,
        max: 5.0,
        step: 0.25,
        default: 1.0,
        fitModes: ['fit-width', 'fit-page', 'fit-auto']
    },
    
    // Configuración de vista
    view: {
        modes: [
            { value: 'single', label: 'Vista simple', icon: '📄' },
            { value: 'continuous', label: 'Vista continua', icon: '📜' },
            { value: 'grid', label: 'Vista grilla', icon: '⚏' }
        ],
        defaultMode: 'single',
        gridColumns: 2
    },
    
    // Configuración de miniaturas
    thumbnails: {
        enabled: true,
        scale: 0.2,
        maxWidth: 120,
        maxHeight: 160,
        showPageNumbers: true
    },
    
    // Configuración de la interfaz
    ui: {
        showToolbar: true,
        compactMode: false,
        theme: 'light', // 'light', 'dark', 'auto'
        animations: true,
        keyboardShortcuts: true
    },
    
    // Configuración de funcionalidades
    features: {
        download: true,
        print: true,
        rotation: true,
        search: false, // Para futuras implementaciones
        annotations: false, // Para futuras implementaciones
        fullscreen: true
    },
    
    // Configuración de rendimiento
    performance: {
        preloadPages: 2, // Páginas a precargar
        cacheSize: 10, // Máximo de páginas en cache
        lazyLoading: true,
        virtualScrolling: false // Para documentos muy largos
    },
    
    // Configuración de responsive
    responsive: {
        breakpoints: {
            mobile: 768,
            tablet: 1024
        },
        mobileUI: {
            hideLabels: true,
            compactToolbar: true,
            hideThumbnails: true
        }
    },
    
    // Configuración de localización
    i18n: {
        language: 'es',
        strings: {
            es: {
                loading: 'Cargando PDF...',
                error: 'Error al cargar el PDF',
                retry: 'Reintentar',
                page: 'Página',
                of: 'de',
                zoom: 'Zoom',
                rotation: 'Rotación',
                download: 'Descargar',
                print: 'Imprimir',
                openExternal: 'Abrir externo',
                hide: 'Ocultar',
                show: 'Mostrar',
                thumbnails: 'Miniaturas',
                firstPage: 'Primera página',
                lastPage: 'Última página',
                previousPage: 'Página anterior',
                nextPage: 'Página siguiente',
                rotateLeft: 'Rotar izquierda',
                rotateRight: 'Rotar derecha',
                fitWidth: 'Ajustar ancho',
                fitPage: 'Ajustar página',
                singleView: 'Vista simple',
                continuousView: 'Vista continua',
                gridView: 'Vista grilla'
            },
            en: {
                loading: 'Loading PDF...',
                error: 'Error loading PDF',
                retry: 'Retry',
                page: 'Page',
                of: 'of',
                zoom: 'Zoom',
                rotation: 'Rotation',
                download: 'Download',
                print: 'Print',
                openExternal: 'Open External',
                hide: 'Hide',
                show: 'Show',
                thumbnails: 'Thumbnails',
                firstPage: 'First page',
                lastPage: 'Last page',
                previousPage: 'Previous page',
                nextPage: 'Next page',
                rotateLeft: 'Rotate left',
                rotateRight: 'Rotate right',
                fitWidth: 'Fit width',
                fitPage: 'Fit page',
                singleView: 'Single view',
                continuousView: 'Continuous view',
                gridView: 'Grid view'
            }
        }
    }
};

// Función para obtener configuración personalizada
export function getViewerConfig(customConfig = {}) {
    return mergeDeep(PDF_VIEWER_CONFIG, customConfig);
}

// Función para hacer merge profundo de objetos
function mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = mergeDeep(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

// Función para obtener strings localizados
export function getLocalizedString(key, language = 'es') {
    const strings = PDF_VIEWER_CONFIG.i18n.strings[language] || PDF_VIEWER_CONFIG.i18n.strings.es;
    return strings[key] || key;
}

// Función para detectar si es dispositivo móvil
export function isMobileDevice() {
    return window.innerWidth <= PDF_VIEWER_CONFIG.responsive.breakpoints.mobile;
}

// Función para obtener configuración responsive
export function getResponsiveConfig() {
    if (isMobileDevice()) {
        return {
            ...PDF_VIEWER_CONFIG,
            ui: {
                ...PDF_VIEWER_CONFIG.ui,
                ...PDF_VIEWER_CONFIG.responsive.mobileUI
            }
        };
    }
    return PDF_VIEWER_CONFIG;
}