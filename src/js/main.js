// src/js/main.js
import { setupEventListeners } from './modules/handlers.js';
import * as ui from './modules/ui.js';
import { dataService } from './modules/dataService.js';
import { loadingManager } from './modules/loadingManager.js';
import { eventBus, APP_EVENTS } from './modules/eventBus.js';
import { debounceSearch } from './modules/debounce.js';

let selectedPdfPath = null;
let tarjetas = []; // Array para manejar las tarjetas a guardar

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar servicios
    initializeApp();
    
    // Escuchadores para la ventana principal
    const actaForm = document.getElementById('acta-form');
    const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-btn');
    const agregarTarjetaBtn = document.getElementById('agregar-tarjeta-btn');
    
    // Botones de búsqueda
    const searchTarjetasBtn = document.getElementById('search-tarjetas-btn');
    const searchActasBtn = document.getElementById('search-actas-btn');
    
    // Tabs de búsqueda
    const tabTarjetas = document.getElementById('tab-tarjetas');
    const tabActas = document.getElementById('tab-actas');
    const searchTarjetasSection = document.getElementById('search-tarjetas');
    const searchActasSection = document.getElementById('search-actas');

    // Manejar tabs de búsqueda
    tabTarjetas.addEventListener('click', () => {
        tabTarjetas.classList.add('active');
        tabActas.classList.remove('active');
        searchTarjetasSection.style.display = 'block';
        searchActasSection.style.display = 'none';
    });

    tabActas.addEventListener('click', () => {
        tabActas.classList.add('active');
        tabTarjetas.classList.remove('active');
        searchActasSection.style.display = 'block';
        searchTarjetasSection.style.display = 'none';
    });

    // -- Lógica para agregar tarjetas dinámicamente --
    agregarTarjetaBtn.addEventListener('click', () => {
        ui.addTarjetaInput();
    });

    // -- Lógica para guardar un acta --
    actaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Deshabilitar el botón de envío para evitar múltiples envíos
        const submitBtn = actaForm.querySelector('button[type="submit"]');
        loadingManager.showButtonLoading(submitBtn, 'Guardando...');
        
        try {
            const actaData = ui.getActaData();
            actaData.tarjetas = ui.getTarjetaData();

            if (selectedPdfPath) {
                actaData.pdfSourcePath = selectedPdfPath;
            }

            // Adjuntar PDF por cada tarjeta
            for (let tarjeta of actaData.tarjetas) {
                if (tarjeta.selectedPdfPath) {
                    const fileName = `tarjeta-${tarjeta.placa}-${Date.now()}.pdf`;
                    tarjeta.pdfPath = fileName;
                    tarjeta.pdfSourcePath = tarjeta.selectedPdfPath;
                }
            }

            const result = await dataService.createActa(actaData);
            if (result.success) {
                ui.showNotification('Acta guardada exitosamente.', 'success');
                ui.resetActaForm();
                selectedPdfPath = null;
            } else {
                ui.showNotification('Error: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error al procesar el formulario:', error);
            ui.showNotification('Error inesperado al guardar el acta.', 'error');
        } finally {
            loadingManager.hideButtonLoading(submitBtn);
        }
    });

    // -- Lógica para buscar tarjetas --
    searchTarjetasBtn.addEventListener('click', async () => {
        await performTarjetasSearch();
    });

    // Configurar búsqueda en tiempo real con debouncing
    setupRealtimeSearch();

    // -- Lógica para seleccionar PDF --
    seleccionarPdfBtn.addEventListener('click', async () => {
        loadingManager.showButtonLoading(seleccionarPdfBtn, 'Seleccionando...');
        try {
            selectedPdfPath = await window.api.abrirDialogoPdf();
            if (selectedPdfPath) {
                ui.updatePdfFilePath(selectedPdfPath);
            }
        } catch (error) {
            console.error('Error al seleccionar PDF:', error);
            ui.showNotification('Error al seleccionar el archivo PDF.', 'error');
        } finally {
            loadingManager.hideButtonLoading(seleccionarPdfBtn);
        }
    });
});

// Funciones auxiliares para búsquedas
async function performTarjetasSearch(forceRefresh = false, searchTerm = null) {
    const searchInput = document.getElementById('search-tarjetas-input');
    const searchBtn = document.getElementById('search-tarjetas-btn');
    const term = searchTerm || searchInput.value.trim();
    
    if (!term) {
        if (!searchTerm) { // Solo mostrar warning si es búsqueda manual
            ui.showNotification('Ingrese un término de búsqueda.', 'warning');
        }
        return;
    }

    if (searchBtn) loadingManager.showButtonLoading(searchBtn, 'Buscando...');
    if (searchInput) loadingManager.showSearchLoading(searchInput);
    
    try {
        const result = await dataService.searchTarjetas(term, forceRefresh);
        if (result.success) {
            ui.displayTarjetasResults(result.data);
            if (result.data.length === 0) {
                ui.showNotification('No se encontraron tarjetas con ese término.', 'info');
            }
        } else {
            ui.showNotification('Error en la búsqueda: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error en búsqueda de tarjetas:', error);
        ui.showNotification('Error inesperado en la búsqueda.', 'error');
    } finally {
        if (searchBtn) loadingManager.hideButtonLoading(searchBtn);
        if (searchInput) loadingManager.hideSearchLoading(searchInput);
    }
}

async function performActasSearch(forceRefresh = false, searchTerm = null) {
    const searchInput = document.getElementById('search-actas-input');
    const searchBtn = document.getElementById('search-actas-btn');
    const term = searchTerm || searchInput.value.trim();
    
    if (!term) {
        if (!searchTerm) { // Solo mostrar warning si es búsqueda manual
            ui.showNotification('Ingrese un término de búsqueda.', 'warning');
        }
        return;
    }

    if (searchBtn) loadingManager.showButtonLoading(searchBtn, 'Buscando...');
    if (searchInput) loadingManager.showSearchLoading(searchInput);
    
    try {
        const result = await dataService.searchActas(term, forceRefresh);
        if (result.success) {
            ui.displayActasResults(result.data);
            if (result.data.length === 0) {
                ui.showNotification('No se encontraron actas con ese término.', 'info');
            }
        } else {
            ui.showNotification('Error en la búsqueda: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error en búsqueda de actas:', error);
        ui.showNotification('Error inesperado en la búsqueda.', 'error');
    } finally {
        if (searchBtn) loadingManager.hideButtonLoading(searchBtn);
        if (searchInput) loadingManager.hideSearchLoading(searchInput);
    }
}

// Inicializar la aplicación
function initializeApp() {
    // Configurar event listeners reactivos
    setupReactiveListeners();
    
    // Limpiar cualquier estado de carga residual
    loadingManager.clearAll();
    
    console.log('Aplicación inicializada con sistema reactivo');
}

function setupReactiveListeners() {
    // Escuchar cuando se crea una acta para actualizar automáticamente las búsquedas
    eventBus.on(APP_EVENTS.DATA_REFRESHED, (data) => {
        if (data.type === 'acta') {
            console.log('Acta creada, datos actualizados:', data);
            // Actualizar automáticamente las búsquedas activas si hay términos
            refreshActiveSearches();
        }
    });

    // Escuchar eventos de error para mostrar notificaciones
    eventBus.on(APP_EVENTS.UI_ERROR, (data) => {
        ui.showNotification(data.message, 'error');
    });

    // Escuchar eventos de búsqueda completada
    eventBus.on(APP_EVENTS.SEARCH_COMPLETED, (data) => {
        if (data.fromCache) {
            console.log(`Búsqueda de ${data.type} servida desde cache`);
        }
    });
}

// Configurar búsqueda en tiempo real
function setupRealtimeSearch() {
    const tarjetasInput = document.getElementById('search-tarjetas-input');
    const actasInput = document.getElementById('search-actas-input');
    const searchTarjetasBtn = document.getElementById('search-tarjetas-btn');
    const searchActasBtn = document.getElementById('search-actas-btn');
    
    // Crear funciones con debounce para búsqueda automática
    const debouncedTarjetasSearch = debounceSearch(async (searchTerm) => {
        await performTarjetasSearch(false, searchTerm);
    }, 700);
    
    const debouncedActasSearch = debounceSearch(async (searchTerm) => {
        await performActasSearch(false, searchTerm);
    }, 700);
    
    // Eventos para input de tarjetas
    if (tarjetasInput) {
        tarjetasInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length >= 2) {
                debouncedTarjetasSearch(value);
            } else if (value.length === 0) {
                // Limpiar resultados si el campo está vacío
                ui.clearTarjetasResults();
            }
        });
        
        tarjetasInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = e.target.value.trim();
                if (searchTerm) {
                    await performTarjetasSearch(false, searchTerm);
                }
            }
        });
    }
    
    // Eventos para input de actas
    if (actasInput) {
        actasInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length >= 2) {
                debouncedActasSearch(value);
            } else if (value.length === 0) {
                // Limpiar resultados si el campo está vacío
                ui.clearActasResults();
            }
        });
        
        actasInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = e.target.value.trim();
                if (searchTerm) {
                    await performActasSearch(false, searchTerm);
                }
            }
        });
    }
    
    // Mantener los botones de búsqueda para búsqueda manual
    if (searchTarjetasBtn) {
        searchTarjetasBtn.addEventListener('click', async () => {
            const searchTerm = tarjetasInput.value.trim();
            if (searchTerm) {
                await performTarjetasSearch(true, searchTerm); // Forzar refresh
            }
        });
    }
    
    if (searchActasBtn) {
        searchActasBtn.addEventListener('click', async () => {
            const searchTerm = actasInput.value.trim();
            if (searchTerm) {
                await performActasSearch(true, searchTerm); // Forzar refresh
            }
        });
    }
}

// Actualizar búsquedas activas cuando hay nuevos datos
function refreshActiveSearches() {
    const tarjetasInput = document.getElementById('search-tarjetas-input');
    const actasInput = document.getElementById('search-actas-input');
    
    // Si hay un término de búsqueda de tarjetas, actualizar
    if (tarjetasInput && tarjetasInput.value.trim()) {
        setTimeout(() => {
            performTarjetasSearch(true, tarjetasInput.value.trim()); // Forzar refresh
        }, 500);
    }
    
    // Si hay un término de búsqueda de actas, actualizar
    if (actasInput && actasInput.value.trim()) {
        setTimeout(() => {
            performActasSearch(true, actasInput.value.trim()); // Forzar refresh
        }, 500);
    }
}