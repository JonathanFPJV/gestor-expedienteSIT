// src/js/main.js
import { setupEventListeners } from './modules/handlers.js';
import * as ui from './modules/ui.js';
import { dataService } from './modules/dataService.js';
import { loadingManager } from './modules/loadingManager.js';
import { eventBus, APP_EVENTS } from './modules/eventBus.js';
import { debounceSearch } from './modules/debounce.js';
import { navigationManager } from './modules/navigation.js';
import { expedientesCRUD } from './modules/expedientesCRUD.js';
import { tarjetasCRUD } from './modules/tarjetasCRUD.js';
import { searchManager } from './modules/searchManager.js';

let selectedPdfPath = null;
let tarjetas = []; // Array para manejar las tarjetas a guardar

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar servicios
    initializeApp();
    
    // Hacer disponibles globalmente
    window.navigationManager = navigationManager;
    window.expedientesCRUD = expedientesCRUD;
    window.tarjetasCRUD = tarjetasCRUD;
    window.searchManager = searchManager;
    window.dataService = dataService;
    window.ui = ui;
    
    // Hacer disponibles las funciones de búsqueda para searchManager
    window.performTarjetasSearch = performTarjetasSearch;
    window.performExpedientesSearch = performExpedientesSearch;
    
    // Escuchadores para la ventana principal
    const expedienteForm = document.getElementById('expediente-form');
    const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-btn');
    const agregarTarjetaBtn = document.getElementById('agregar-tarjeta-btn');
    
    // Botones de búsqueda
    const searchTarjetasBtn = document.getElementById('search-tarjetas-btn');
    const searchExpedientesBtn = document.getElementById('search-expedientes-btn');
    
    // Tabs de búsqueda
    const tabTarjetas = document.getElementById('tab-tarjetas');
    const tabExpedientes = document.getElementById('tab-expedientes');
    const searchTarjetasSection = document.getElementById('search-tarjetas');
    const searchExpedientesSection = document.getElementById('search-expedientes');

    // Manejar tabs de búsqueda
    tabTarjetas.addEventListener('click', () => {
        tabTarjetas.classList.add('active');
        tabExpedientes.classList.remove('active');
        searchTarjetasSection.style.display = 'block';
        searchExpedientesSection.style.display = 'none';
    });

    tabExpedientes.addEventListener('click', () => {
        tabExpedientes.classList.add('active');
        tabTarjetas.classList.remove('active');
        searchExpedientesSection.style.display = 'block';
        searchTarjetasSection.style.display = 'none';
    });

    // Botón toggle para observaciones
    const toggleObservacionesBtn = document.getElementById('toggle-observaciones');
    const observacionesContainer = document.getElementById('observaciones-container');
    
    // Toggle para mostrar/ocultar observaciones
    toggleObservacionesBtn.addEventListener('click', () => {
        const isHidden = observacionesContainer.classList.contains('hidden');
        
        if (isHidden) {
            observacionesContainer.classList.remove('hidden');
            toggleObservacionesBtn.innerHTML = '➖ Ocultar Observaciones';
            toggleObservacionesBtn.classList.add('active');
        } else {
            observacionesContainer.classList.add('hidden');
            toggleObservacionesBtn.innerHTML = '➕ Agregar Observaciones';
            toggleObservacionesBtn.classList.remove('active');
            // Limpiar el campo cuando se oculta
            document.getElementById('observaciones').value = '';
        }
    });

    // -- Lógica para agregar tarjetas dinámicamente --
    agregarTarjetaBtn.addEventListener('click', () => {
        ui.addTarjetaInput();
    });

    // -- Lógica para guardar un expediente --
    expedienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Deshabilitar el botón de envío para evitar múltiples envíos
        const submitBtn = expedienteForm.querySelector('button[type="submit"]');
        loadingManager.showButtonLoading(submitBtn, 'Guardando...');
        
        try {
            const expedienteData = ui.getExpedienteData();
            expedienteData.tarjetas = ui.getTarjetaData();

            if (selectedPdfPath) {
                expedienteData.pdfSourcePath = selectedPdfPath;
            }

            // Adjuntar PDF por cada tarjeta
            for (let tarjeta of expedienteData.tarjetas) {
                if (tarjeta.selectedPdfPath) {
                    const fileName = `tarjeta-${tarjeta.placa}-${Date.now()}.pdf`;
                    tarjeta.pdfPath = fileName;
                    tarjeta.pdfSourcePath = tarjeta.selectedPdfPath;
                }
            }

            const result = await dataService.createExpediente(expedienteData);
            if (result.success) {
                ui.showNotification('Expediente guardado exitosamente.', 'success');
                ui.resetExpedienteForm();
                selectedPdfPath = null;
            } else {
                ui.showNotification('Error: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error al procesar el formulario:', error);
            ui.showNotification('Error inesperado al guardar el expediente.', 'error');
        } finally {
            loadingManager.hideButtonLoading(submitBtn);
        }
    });

    // -- Lógica para buscar tarjetas --
    // La búsqueda ahora se maneja por searchManager automáticamente
    
    // Configurar búsqueda mejorada con searchManager
    // searchManager.initializeSearch(); // Ya se inicializa automáticamente

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
    const term = searchTerm || searchInput?.value.trim();
    
    console.log('performTarjetasSearch llamada con:', { forceRefresh, searchTerm, term });
    
    if (!term) {
        if (!searchTerm) { // Solo mostrar warning si es búsqueda manual
            ui.showNotification('Ingrese un término de búsqueda.', 'warning');
        }
        return;
    }

    if (searchBtn) loadingManager.showButtonLoading(searchBtn, 'Buscando...');
    if (searchInput) loadingManager.showSearchLoading(searchInput);
    
    try {
        console.log('Iniciando búsqueda de tarjetas con término:', term);
        const result = await dataService.searchTarjetas(term, forceRefresh);
        console.log('Resultado de búsqueda de tarjetas:', result);
        
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

async function performExpedientesSearch(forceRefresh = false, searchTerm = null) {
    const searchInput = document.getElementById('search-expedientes-input');
    const searchBtn = document.getElementById('search-expedientes-btn');
    const term = searchTerm || searchInput?.value.trim();
    
    console.log('performExpedientesSearch llamada con:', { forceRefresh, searchTerm, term });
    
    if (!term) {
        if (!searchTerm) { // Solo mostrar warning si es búsqueda manual
            ui.showNotification('Ingrese un término de búsqueda.', 'warning');
        }
        return;
    }

    if (searchBtn) loadingManager.showButtonLoading(searchBtn, 'Buscando...');
    if (searchInput) loadingManager.showSearchLoading(searchInput);
    
    try {
        console.log('Iniciando búsqueda de expedientes con término:', term);
        const result = await dataService.searchExpedientes(term, forceRefresh);
        console.log('Resultado de búsqueda de expedientes:', result);
        
        if (result.success) {
            ui.displayExpedientesResults(result.data);
            if (result.data.length === 0) {
                ui.showNotification('No se encontraron expedientes con ese término.', 'info');
            }
        } else {
            ui.showNotification('Error en la búsqueda: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error en búsqueda de expedientes:', error);
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
    
    // Inicializar módulo de tarjetas (expedientes se inicializa en su constructor)
    tarjetasCRUD.init();
    console.log('Módulos CRUD disponibles e inicializados');
    
    // Limpiar cualquier estado de carga residual
    loadingManager.clearAll();
    
    console.log('Aplicación inicializada con sistema reactivo');
}

function setupReactiveListeners() {
    // Escuchar cuando se crea un expediente para actualizar automáticamente las búsquedas
    eventBus.on(APP_EVENTS.DATA_REFRESHED, (data) => {
        if (data.type === 'expediente') {
            console.log('Expediente creado, datos actualizados:', data);
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

// Las funciones de búsqueda ahora están manejadas por searchManager.js

// Actualizar búsquedas activas cuando hay nuevos datos
function refreshActiveSearches() {
    const tarjetasInput = document.getElementById('search-tarjetas-input');
    const expedientesInput = document.getElementById('search-expedientes-input');
    
    // Si hay un término de búsqueda de tarjetas, actualizar
    if (tarjetasInput && tarjetasInput.value.trim()) {
        setTimeout(() => {
            performTarjetasSearch(true, tarjetasInput.value.trim()); // Forzar refresh
        }, 500);
    }
    
    // Si hay un término de búsqueda de expedientes, actualizar
    if (expedientesInput && expedientesInput.value.trim()) {
        setTimeout(() => {
            performExpedientesSearch(true, expedientesInput.value.trim()); // Forzar refresh
        }, 500);
    }
}