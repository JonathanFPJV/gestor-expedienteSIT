// src/js/modules/expedientesCRUD.js
// Clase coordinadora principal de expedientes - Refactorizada

import { dataService } from './dataService.js';
import { eventBus, APP_EVENTS } from './eventBus.js';
import { pdfSelector } from './pdfSelector.js';
import { ocrExtractor } from './ocrExtractor.js';

// Servicios
import { expedienteService } from './services/ExpedienteService.js';
import { expedienteSearchService } from './services/ExpedienteSearchService.js';
import { tarjetaFormService } from './services/TarjetaFormService.js';
import { actaEntregaService } from './services/ActaEntregaService.js';

// UI Components
import ExpedienteTableRenderer from './ui/ExpedienteTableRenderer.js';
import PaginationController from './ui/PaginationController.js';
import { expedienteFormManager } from './ui/ExpedienteFormManager.js';
import { expedienteViewer } from './ui/ExpedienteViewer.js';
import * as ui from './ui.js';

// Operations
import { expedienteDeleteOperation } from './operations/ExpedienteDeleteOperation.js';
import { expedienteExportOperation } from './operations/ExpedienteExportOperation.js';

/**
 * Clase coordinadora principal de Expedientes CRUD
 * Responsabilidad: Coordinar servicios, gestionar evento y estado global
 */
export class ExpedientesCRUD {
    constructor() {
        // Estado
        this.expedientes = [];
        this.filteredExpedientes = [];
        this.currentExpediente = null;
        this.isInitialized = false;

        // Servicios
        this.expedienteService = expedienteService;
        this.searchService = expedienteSearchService;
        this.tarjetaService = tarjetaFormService;
        this.actaService = actaEntregaService;
        this.actaService = actaEntregaService;
        this.formManager = expedienteFormManager;
        this.viewer = expedienteViewer;
        this.deleteOperation = expedienteDeleteOperation;
        this.exportOperation = expedienteExportOperation;

        // UI Components
        this.tableRenderer = null; // Se inicializa después de inicializar elementos
        this.paginationController = new PaginationController({
            startPage: 1,
            itemsPerPage: 10,
            usePagination: true
        });

        // Inicialización
        this.initializeElements();
        this.initializeServices();
        this.initializeEventListeners();
        this.subscribeToEvents();
        this.setupViewActivationListener();
    }

    /**
     * Inicializar servicios con referencias DOM
     */
    initializeServices() {
        // Inicializar table renderer
        this.tableRenderer = new ExpedienteTableRenderer(this.tbody);

        // Configurar pagination controller
        this.paginationController.setElements({
            paginationInfo: this.paginationInfo,
            pageInfo: this.pageInfo,
            prevPageBtn: this.prevPageBtn,
            nextPageBtn: this.nextPageBtn
        });
    }

    /**
     * Configurar listener para cuando se active la vista de expedientes
     */
    setupViewActivationListener() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const vistaCrud = document.getElementById('vista-crud');
                    if (vistaCrud && vistaCrud.classList.contains('active')) {
                        this.cancelPendingSearch();
                        this.restoreSearchFieldsState();
                        this.loadExpedientes();
                    }
                }
            });
        });

        const vistaCrud = document.getElementById('vista-crud');
        if (vistaCrud) {
            observer.observe(vistaCrud, { attributes: true });
        }
    }

    /**
     * Cancelar búsqueda pendiente
     */
    cancelPendingSearch() {
        this.searchService.cancelPendingSearch();
    }

    /**
     * Restaurar estado de campos de búsqueda y filtros
     */
    restoreSearchFieldsState() {
        // Restaurar campo de búsqueda
        if (this.searchInput) {
            this.searchInput.disabled = false;
            this.searchInput.readOnly = false;
            this.searchInput.style.opacity = '1';
            this.searchInput.style.pointerEvents = 'auto';
            this.searchInput.style.cursor = 'text';
        }

        // Restaurar filtros
        if (this.filterAnio) {
            this.filterAnio.disabled = false;
            this.filterAnio.style.opacity = '1';
            this.filterAnio.style.pointerEvents = 'auto';
        }

        if (this.filterUnidad) {
            this.filterUnidad.disabled = false;
            this.filterUnidad.style.opacity = '1';
            this.filterUnidad.style.pointerEvents = 'auto';
        }

        // Restaurar botón de exportar
        if (this.exportarExcelBtn) {
            this.exportarExcelBtn.disabled = false;
            this.exportarExcelBtn.innerHTML = '📊 Exportar Excel';
            this.exportarExcelBtn.style.opacity = '1';
        }

    }

    /**
     * Inicializar referencias a elementos DOM
     */
    initializeElements() {
        // Elementos de la tabla
        this.tbody = document.getElementById('expedientes-tbody');
        this.paginationInfo = document.getElementById('pagination-info');
        this.pageInfo = document.getElementById('page-info');
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');

        // Elementos de búsqueda y filtros
        this.searchInput = document.getElementById('search-crud-input');
        this.clearSearchBtn = document.getElementById('clear-search-crud');
        this.filterAnio = document.getElementById('filter-anio');
        this.filterUnidad = document.getElementById('filter-unidad');
        this.limpiarFiltrosBtn = document.getElementById('limpiar-filtros-btn');

        // Botones
        this.nuevoExpedienteBtn = document.getElementById('nuevo-expediente-btn');
        this.exportarExcelBtn = document.getElementById('exportar-excel-btn');
    }

    /**
     * Inicializar event listeners
     */
    initializeEventListeners() {
        // Búsqueda rápida
        this.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.clearSearchBtn?.addEventListener('click', () => this.clearQuickSearch());

        // Reactivar búsqueda al enfocar
        this.searchInput?.addEventListener('focus', () => {
            this.searchService.searchInProgress = false;
            const currentTerm = this.searchInput.value.trim();
            if (currentTerm && currentTerm !== this.searchService.lastSearchTerm) {
                this.handleSearch(currentTerm);
            }
        });

        // Filtros
        this.filterAnio?.addEventListener('change', () => this.applyFilters());
        this.filterUnidad?.addEventListener('change', () => this.applyFilters());
        this.limpiarFiltrosBtn?.addEventListener('click', () => this.clearFilters());

        // Paginación
        this.prevPageBtn?.addEventListener('click', () => this.previousPage());
        this.nextPageBtn?.addEventListener('click', () => this.nextPage());

        // Nuevo expediente
        this.nuevoExpedienteBtn?.addEventListener('click', () => this.openNewExpedienteModal());

        // Exportar a Excel
        this.exportarExcelBtn?.addEventListener('click', () => this.exportToExcel());

        // Escuchar eventos de eliminación del backend
        if (window.api && window.api.on) {
            window.api.on('expediente-eliminado', (data) => {
                this.loadExpedientes().catch(error => {
                    console.error('Error al recargar expedientes después de eliminación:', error);
                });
            });
        }
    }

    /**
     * Suscribirse a eventos del sistema
     */
    subscribeToEvents() {

        eventBus.on(APP_EVENTS.EXPEDIENTE_UPDATED, (data) => {
            this.refreshExpedienteInTable(data.expediente);
        });

        eventBus.on(APP_EVENTS.EXPEDIENTE_DELETED, (data) => {
            this.removeExpedienteFromTable(data.id);
        });

        eventBus.on(APP_EVENTS.EXPEDIENTE_CREATED, (data) => {
            this.addExpedienteToTable(data.expediente);
        });

    }

    /**
     * Actualizar un expediente específico en la tabla
     */
    refreshExpedienteInTable(updatedExpediente) {
        const index = this.expedientes.findIndex(exp => exp._id === updatedExpediente._id);
        if (index !== -1) {
            this.expedientes[index] = updatedExpediente;
            this.filteredExpedientes = [...this.expedientes];
            this.renderTable();
        }
    }

    /**
     * Eliminar un expediente de la tabla
     */
    removeExpedienteFromTable(expedienteId) {
        this.expedientes = this.expedientes.filter(exp => exp._id !== expedienteId);
        this.filteredExpedientes = [...this.expedientes];
        this.renderTable();
        this.updatePagination();
    }

    /**
     * Agregar un nuevo expediente a la tabla
     */
    addExpedienteToTable(newExpediente) {
        if (!newExpediente || typeof newExpediente !== 'object') {
            console.error('Intento de agregar expediente inválido a la tabla:', newExpediente);
            return;
        }

        // Asegurar que tenga las propiedades mínimas
        if (!newExpediente.numeroExpediente) {
            console.warn('Expediente sin número, intentando recargar tabla completa...');
            this.loadExpedientes();
            return;
        }

        this.expedientes.unshift(newExpediente);
        this.filteredExpedientes = [...this.expedientes];
        this.paginationController.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    /**
     * Cargar expedientes
     */
    async loadExpedientes() {
        try {
            this.tableRenderer.showLoadingState();

            const result = await this.expedienteService.loadExpedientes({
                page: this.paginationController.currentPage,
                limit: this.paginationController.itemsPerPage,
                usePagination: true
            });

            if (result.success) {
                this.expedientes = result.data;
                this.filteredExpedientes = [...this.expedientes];

                // Actualizar paginación
                this.paginationController.updateState({
                    totalPages: result.pagination.totalPages,
                    totalRecords: result.pagination.totalRecords
                });

                this.renderTable();
                this.updatePagination();
                this.populateYearFilter();

            } else {
                this.tableRenderer.showErrorState(result.error);
                console.error('Error al cargar expedientes:', result.error);
            }
        } catch (error) {
            console.error('Error al cargar expedientes:', error);
            this.tableRenderer.showErrorState('Error al cargar expedientes');
        }
    }

    /**
     * Renderizar tabla
     */
    renderTable() {
        this.tableRenderer.renderTable(this.filteredExpedientes, {
            onView: (id) => this.viewExpediente(id),
            onEdit: (id) => this.editExpediente(id),
            onDelete: (id) => this.confirmDelete(id)
        });
    }

    /**
     * Actualizar paginación
     */
    updatePagination() {
        this.paginationController.updatePaginationUI();
    }

    /**
     * Manejar búsqueda
     */
    handleSearch(searchTerm) {
        this.searchService.filterTableInRealTime(
            searchTerm,
            () => {
                // onSearchStart
                this.showSearchingIndicator();
                if (this.clearSearchBtn) {
                    this.clearSearchBtn.style.display = searchTerm.trim() ? 'block' : 'none';
                }
            },
            (result) => {
                // onSearchComplete
                this.hideSearchingIndicator();

                if (result.cleared) {
                    // Búsqueda limpiada
                    this.loadExpedientes();
                } else if (result.success) {
                    this.expedientes = result.expedientes;
                    this.filteredExpedientes = [...result.expedientes];

                    const totalPages = Math.ceil(result.total / this.paginationController.itemsPerPage);
                    this.paginationController.updateState({
                        currentPage: 1,
                        totalRecords: result.total,
                        totalPages: totalPages
                    });

                    this.renderTable();
                    this.updatePagination();
                } else {
                    this.showError(result.error || 'Error al buscar');
                }
            },
            { itemsPerPage: this.paginationController.itemsPerPage }
        );
    }

    /**
     * Aplicar filtros (año y unidad)
     */
    applyFilters() {
        const filters = {
            year: this.filterAnio?.value,
            unidad: this.filterUnidad?.value
        };

        const filtered = this.searchService.applyFilters(this.expedientes, filters);
        this.filteredExpedientes = filtered;

        this.paginationController.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    /**
     * Limpiar filtros
     */
    clearFilters() {
        if (this.filterAnio) this.filterAnio.value = '';
        if (this.filterUnidad) this.filterUnidad.value = '';
        this.filteredExpedientes = [...this.expedientes];
        this.paginationController.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    /**
     * Limpiar búsqueda rápida
     */
    clearQuickSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = 'none';
        }
        this.searchService.clearSearch();
        this.loadExpedientes();
    }

    /**
     * Mostrar indicador de búsqueda
     */
    showSearchingIndicator() {
        if (this.searchInput) {
            this.searchInput.style.borderColor = '#2196F3';
            this.searchInput.style.boxShadow = '0 0 4px rgba(33, 150, 243, 0.4)';
        }
    }

    /**
     * Ocultar indicador de búsqueda
     */
    hideSearchingIndicator() {
        if (this.searchInput) {
            this.searchInput.style.borderColor = '';
            this.searchInput.style.boxShadow = '';
        }
    }

    /**
     * Página anterior
     */
    previousPage() {
        this.paginationController.previousPage(() => {
            this.loadExpedientes();
        });
    }

    /**
     * Página siguiente
     */
    nextPage() {
        this.paginationController.nextPage(() => {
            this.loadExpedientes();
        });
    }

    /**
     * Poblar filtro de año
     */
    populateYearFilter() {
        if (!this.filterAnio) return;

        const years = [...new Set(this.expedientes.map(exp =>
            exp.anioExpediente || new Date(exp.fecha).getFullYear()
        ))].filter(year => year).sort((a, b) => b - a);

        const currentValue = this.filterAnio.value;
        this.filterAnio.innerHTML = '<option value="">Todos los años</option>';

        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.filterAnio.appendChild(option);
        });

        if (currentValue) {
            this.filterAnio.value = currentValue;
        }
    }

    /**
     * Ver expediente (solo lectura)
     */
    /**
     * Ver expediente (solo lectura)
     */
    viewExpediente(expedienteId) {
        const expediente = this.expedientes.find(exp => exp._id === expedienteId);
        if (expediente) {
            this.viewer.showExpedienteDetails(expediente);
        }
    }

    /**
     * Editar expediente
     */
    async editExpediente(expedienteId) {

        const expediente = this.expedientes.find(exp => exp._id === expedienteId);
        if (!expediente) {
            this.showError('Expediente no encontrado');
            return;
        }

        // Cargar en formulario usando FormManager
        await this.formManager.loadExpedienteIntoForm(expediente, (tarjetas) => {
            // Callback de actualización de tarjetas
            const form = document.getElementById('expediente-form');
            if (form) {
                form.dataset.tarjetas = JSON.stringify(tarjetas);
            }
        });

        // Guardar ID del expediente en edición con el nombre correcto que espera main.js
        const form = document.getElementById('expediente-form');
        if (form) {
            form.dataset.editingId = expedienteId;
            form.dataset.isEditing = 'true'; // Bandera explícita adicional
        }

        // Cambiar a vista de registro
        const event = new CustomEvent('cambiar-vista', { detail: 'vista-registro' });
        document.dispatchEvent(event);
    }

    /**
     * Abrir modal para nuevo expediente
     */
    openNewExpedienteModal() {
        this.formManager.prepareFormForNew();

        // Cambiar a vista de registro
        const event = new CustomEvent('cambiar-vista', { detail: 'vista-registro' });
        document.dispatchEvent(event);
    }

    /**
     * Confirmar eliminación
     */
    async confirmDelete(expedienteId) {
        await this.deleteOperation.confirmDelete(
            expedienteId,
            async (id, info) => {
                // onConfirm
                await this.deleteOperation.executeDelete(
                    id,
                    (result) => {
                        // onSuccess
                        this.showSuccess('Expediente eliminado correctamente');
                        this.loadExpedientes();
                    },
                    (error) => {
                        // onError
                        this.showError(error);
                    }
                );
            },
            () => {
                // onCancel
            }
        );
    }

    /**
     * Exportar a Excel
     */
    async exportToExcel() {
        await this.exportOperation.exportToExcel(
            {
                searchTerm: this.searchInput?.value || '',
                year: this.filterAnio?.value || '',
                unidad: this.filterUnidad?.value || ''
            },
            (result) => {
                // onSuccess
                this.showSuccess(`Archivo exportado: ${result.filePath}`);
            },
            (error) => {
                // onError
                this.showError(error);
            }
        );
    }

    // === MÉTODOS DE TARJETAS (Delegados) ===

    /**
     * Actualizar datos de tarjeta
     */
    updateTarjetaData(index, field, value) {
        return this.tarjetaService.updateTarjetaData(index, field, value);
    }

    /**
     * Eliminar tarjeta del formulario
     */
    removeTarjetaFromForm(index) {
        return this.tarjetaService.removeTarjetaFromForm(index, (tarjetas) => {
            this.tarjetaService.renderTarjetasList(tarjetas, (select, estado) => {
                this.tarjetaService.cargarEstadosEnSelector(select, estado);
            });
        });
    }

    /**
     * Seleccionar PDF de tarjeta
     */
    async seleccionarPdfTarjeta(index) {
        const result = await this.tarjetaService.seleccionarPdfTarjeta(index);

        if (result.success) {
            // Actualizar UI
            const pdfPathInput = document.querySelector(`[data-tarjeta-index="${index}"] .pdf-path-input`);
            if (pdfPathInput) {
                pdfPathInput.value = `Seleccionado: ${result.fileName}`;
            }

            // Mostrar botón de extraer OCR
            const extraerOcrBtn = document.querySelector(`[data-tarjeta-index="${index}"] .extraer-ocr-btn`);
            if (extraerOcrBtn) {
                extraerOcrBtn.style.display = 'inline-block';
            }

            this.showSuccess('PDF seleccionado correctamente');
        } else if (result.error) {
            this.showError(result.error);
        }
    }

    /**
     * Extraer OCR de tarjeta
     */
    async extraerOcrTarjeta(index) {
        const result = await this.tarjetaService.extraerOcrTarjeta(index, (progress, message) => {
            // console.debug(`OCR: ${progress}% - ${message}`);
        });

        if (result.success && result.extractedData) {
            // Auto-completar campos de tarjeta
            if (result.extractedData.placa) {
                this.tarjetaService.updateTarjetaData(index, 'placa', result.extractedData.placa);
            }
            if (result.extractedData.numeroTarjeta) {
                this.tarjetaService.updateTarjetaData(index, 'numero', result.extractedData.numeroTarjeta);
            }

            this.showSuccess('Texto extraído y campos auto-completados');
        } else {
            this.showError(result.error || 'No se pudieron extraer datos');
        }
    }

    /**
     * Ver PDF de tarjeta
     */
    async verPdfTarjeta(index) {
        await this.tarjetaService.verPdfTarjeta(index);
    }

    /**
     * Cargar estados en selector
     */
    async cargarEstadosEnSelector(selectElement, estadoSeleccionado = 'ACTIVA') {
        await this.tarjetaService.cargarEstadosEnSelector(selectElement, estadoSeleccionado);
    }

    /**
     * Cargar información de acta de entrega
     */
    async loadActaEntregaInfo(actaEntregaId) {
        await this.actaService.loadActaEntregaInfo(actaEntregaId, (acta) => {
            this.actaService.renderActaReadOnly(acta);
        });
    }

    // === MÉTODOS AUXILIARES ===

    showSuccess(message) {
        ui.showNotification(message, 'success');
    }

    showError(message) {
        console.error('Error:', message);
        ui.showNotification(message, 'error');
    }
}

// Instancia global
export const expedientesCRUD = new ExpedientesCRUD();