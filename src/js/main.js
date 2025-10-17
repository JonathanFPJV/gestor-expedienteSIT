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
import { SimplePDFViewer } from './modules/simplePdfViewer.js';

// Inicializar visualizador de PDFs
const simplePdfViewer = new SimplePDFViewer();

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
    window.simplePdfViewer = simplePdfViewer; // ✅ Visualizador de PDFs
    
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

    // Toggle para mostrar/ocultar campos de Acta de Entrega
    const incluirActaEntregaCheckbox = document.getElementById('incluir-acta-entrega');
    const actaEntregaFields = document.getElementById('acta-entrega-fields');
    let selectedActaPdfPath = null;
    
    incluirActaEntregaCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            actaEntregaFields.style.display = 'block';
        } else {
            actaEntregaFields.style.display = 'none';
            // Limpiar campos cuando se desmarca
            document.getElementById('fechaEntrega').value = '';
            document.getElementById('n_tarjetas_entregadas').value = '';
            document.getElementById('observacionesActa').value = '';
            document.getElementById('pdf-acta-path').value = '';
            selectedActaPdfPath = null;
        }
    });

    // Botón para seleccionar PDF del Acta de Entrega
    const seleccionarPdfActaBtn = document.getElementById('seleccionar-pdf-acta-btn');
    seleccionarPdfActaBtn.addEventListener('click', async () => {
        loadingManager.showButtonLoading(seleccionarPdfActaBtn, 'Seleccionando...');
        try {
            selectedActaPdfPath = await window.api.abrirDialogoPdf();
            if (selectedActaPdfPath) {
                document.getElementById('pdf-acta-path').value = selectedActaPdfPath.split(/[\/\\]/).pop();
            }
        } catch (error) {
            console.error('Error al seleccionar PDF del Acta:', error);
            ui.showNotification('Error al seleccionar el archivo PDF del Acta.', 'error');
        } finally {
            loadingManager.hideButtonLoading(seleccionarPdfActaBtn);
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
            // Obtener datos del expediente
            const expedienteData = ui.getExpedienteData();
            
            // Obtener tarjetas asociadas
            expedienteData.tarjetas = ui.getTarjetaData();
            
            // Validaciones básicas
            if (!expedienteData.numeroExpediente) {
                ui.showNotification('El número de expediente es requerido.', 'warning');
                return;
            }
            
            if (!expedienteData.fechaExpediente) {
                ui.showNotification('La fecha del expediente es requerida.', 'warning');
                return;
            }
            
            // Si hay PDF del expediente seleccionado
            if (selectedPdfPath) {
                expedienteData.pdfSourcePath = selectedPdfPath;
            }

            // Si se marcó incluir acta de entrega, agregarla
            if (incluirActaEntregaCheckbox.checked) {
                const fechaEntrega = document.getElementById('fechaEntrega').value;
                
                if (!fechaEntrega) {
                    ui.showNotification('La fecha de entrega del acta es requerida.', 'warning');
                    return;
                }

                expedienteData.actaEntrega = {
                    fechaEntrega: fechaEntrega,
                    n_tarjetas_entregadas: parseInt(document.getElementById('n_tarjetas_entregadas').value) || 0,
                    observaciones: document.getElementById('observacionesActa').value || null,
                    pdfSourcePath: selectedActaPdfPath
                };
                console.log('📋 Acta de entrega incluida:', expedienteData.actaEntrega);
            }
            
            console.log('📤 Enviando datos al backend:', expedienteData);

            // Enviar al backend
            const result = await dataService.createExpediente(expedienteData);
            
            console.log('📥 Respuesta del backend:', result);
            
            if (result.success) {
                ui.showNotification('Expediente guardado exitosamente.', 'success');
                ui.resetExpedienteForm();
                selectedPdfPath = null;
                
                // Opcional: cambiar a vista de gestión
                // navigationManager.showView('vista-crud');
            } else {
                ui.showNotification('Error: ' + (result.message || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('❌ Error al procesar el formulario:', error);
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
    
    // Configurar listeners de IPC para comunicación entre ventanas
    setupIPCListeners();
    
    // Inicializar módulo de tarjetas (expedientes se inicializa en su constructor)
    tarjetasCRUD.init();
    console.log('Módulos CRUD disponibles e inicializados');
    
    // Limpiar cualquier estado de carga residual
    loadingManager.clearAll();
    
    console.log('Aplicación inicializada con sistema reactivo');
}

// 🔔 Configurar listeners de IPC para comunicación entre ventanas
function setupIPCListeners() {
    // Escuchar cuando se actualiza un expediente desde el editor (otra ventana)
    if (window.api && window.api.on) {
        window.api.on('expediente-actualizado', (payload) => {
            console.log('📡 IPC: expediente-actualizado recibido:', payload);
            
            // Emitir evento local para que la tabla se actualice
            if (payload && payload.expediente) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_UPDATED, { 
                    expediente: payload.expediente
                });
                console.log('✅ Evento EXPEDIENTE_UPDATED emitido desde IPC');
            }
        });

        // Escuchar cuando se elimina un expediente
        window.api.on('expediente-eliminado', (payload) => {
            console.log('📡 IPC: expediente-eliminado recibido:', payload);
            
            if (payload && payload.expedienteId) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_DELETED, { 
                    expedienteId: payload.expedienteId
                });
                console.log('✅ Evento EXPEDIENTE_DELETED emitido desde IPC');
            }
        });

        // Escuchar cuando se crea un expediente
        window.api.on('expediente-guardado', (payload) => {
            console.log('📡 IPC: expediente-guardado recibido:', payload);
            
            if (payload && payload.expediente) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_CREATED, { 
                    expediente: payload.expediente
                });
                console.log('✅ Evento EXPEDIENTE_CREATED emitido desde IPC');
            }
        });

        console.log('✅ Listeners de IPC configurados');
    } else {
        console.warn('⚠️ window.api no está disponible');
    }
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