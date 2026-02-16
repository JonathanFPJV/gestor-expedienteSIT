// src/js/modules/tarjetasCRUD.js
/**
 * Coordinador CRUD para Tarjetas
 * Delega a módulos especializados en tarjetas/
 */

import { eventBus, APP_EVENTS } from './eventBus.js';
import { loadingManager } from './loadingManager.js';
import { tarjetaDataService } from './tarjetas/TarjetaDataService.js';
import { tarjetaTableRenderer } from './tarjetas/TarjetaTableRenderer.js';
import { tarjetaSearchService } from './tarjetas/TarjetaSearchService.js';
import { tarjetaFormManager } from './tarjetas/TarjetaFormManager.js';
import { tarjetaSaveOperation } from './tarjetas/TarjetaSaveOperation.js';
import { tarjetaPdfOcrService } from './tarjetas/TarjetaPdfOcrService.js';

class TarjetasCRUD {
    constructor() {
        this.tarjetas = [];
        this.filteredTarjetas = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.searchTerm = '';
        this.currentTarjetaId = null;
        this.selectedPdfPath = null;
        this.isInitialized = false;
        this.elements = {};
    }

    // =============================================
    // Inicialización
    // =============================================

    init() {
        console.log('TarjetasCRUD: Inicializando módulo...');
        this.cacheElements();
        this.setupEventListeners();
        this.subscribeToEvents();
        this.setupViewActivationListener();
        console.log('TarjetasCRUD: Módulo listo');
    }

    cacheElements() {
        this.elements = {
            container: document.getElementById('vista-tarjetas-crud'),
            tbody: document.getElementById('tarjetas-tbody'),
            searchInput: document.getElementById('search-tarjetas-crud-input'),
            clearSearchBtn: document.querySelector('#search-tarjetas-crud-input + .clear-search-btn'),
            prevPageBtn: document.getElementById('prev-page-tarjetas'),
            nextPageBtn: document.getElementById('next-page-tarjetas'),
            pageInfo: document.getElementById('page-info-tarjetas'),
            paginationInfo: document.getElementById('pagination-info-tarjetas'),
            nuevaTarjetaBtn: document.getElementById('nueva-tarjeta-btn'),
            searchBtn: document.getElementById('search-tarjetas-btn'),
            searchMainInput: document.getElementById('search-tarjetas-input'),
            clearFiltersBtn: document.getElementById('limpiar-filtros-tarjetas-btn'),
            modal: document.getElementById('modal-tarjeta'),
            modalTitle: document.getElementById('modal-tarjeta-title'),
            modalForm: document.getElementById('modal-tarjeta-form'),
            modalGuardar: document.getElementById('modal-tarjeta-guardar'),
            modalCancelar: document.getElementById('modal-tarjeta-cancelar'),
            modalEliminar: document.getElementById('modal-tarjeta-eliminar'),
            modalClose: document.getElementById('modal-tarjeta-close')
        };
    }

    setupEventListeners() {
        // Nueva tarjeta
        this.elements.nuevaTarjetaBtn?.addEventListener('click', () => this.abrirModalNuevaTarjeta());

        // Búsqueda con botón
        this.elements.searchBtn?.addEventListener('click', () => this.buscarTarjetas());
        this.elements.searchMainInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.buscarTarjetas();
        });

        // Búsqueda en tiempo real
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.filterTableInRealTime(e.target.value);
        });

        // Limpiar búsqueda rápida
        this.elements.clearSearchBtn?.addEventListener('click', () => this.clearQuickSearch());

        // Limpiar filtros
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.limpiarFiltros());

        // Paginación
        this.elements.prevPageBtn?.addEventListener('click', () => this.cambiarPagina(this.currentPage - 1));
        this.elements.nextPageBtn?.addEventListener('click', () => this.cambiarPagina(this.currentPage + 1));

        // Modal
        this.elements.modalClose?.addEventListener('click', () => this.cerrarModal());
        this.elements.modalCancelar?.addEventListener('click', () => this.cerrarModal());
        this.elements.modalGuardar?.addEventListener('click', () => this.guardarTarjeta());
        this.elements.modalEliminar?.addEventListener('click', () => this.confirmarEliminarTarjeta(this.currentTarjetaId));
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.cerrarModal();
        });
    }

    subscribeToEvents() {
        eventBus.on(APP_EVENTS.TARJETA_UPDATED, () => this.cargarTarjetas());
        eventBus.on(APP_EVENTS.TARJETA_DELETED, () => this.cargarTarjetas());
    }

    setupViewActivationListener() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('active')) {
                        console.log('Vista de tarjetas activada');
                        if (!this.isInitialized) {
                            this.cargarTarjetas();
                            this.isInitialized = true;
                        }
                    }
                }
            });
        });

        if (this.elements.container) {
            observer.observe(this.elements.container, { attributes: true });
            if (this.elements.container.classList.contains('active')) {
                this.cargarTarjetas();
                this.isInitialized = true;
            }
        }
    }

    // =============================================
    // Carga y renderizado (delegado)
    // =============================================

    async cargarTarjetas() {
        try {
            console.log('Cargando tarjetas...');
            const resultado = await tarjetaDataService.search({
                page: this.currentPage,
                limit: this.itemsPerPage
            });

            if (resultado.success) {
                this.tarjetas = resultado.tarjetas || [];
                this.filteredTarjetas = [...this.tarjetas];
                this.totalPages = resultado.totalPages || 1;
                this.currentPage = resultado.page || 1;
                this.renderTarjetas();
                console.log(`${this.tarjetas.length} tarjetas cargadas (página ${this.currentPage}/${this.totalPages})`);
            } else {
                console.error('Error al cargar tarjetas:', resultado.error);
                this.mostrarError('Error al cargar tarjetas');
            }
        } catch (error) {
            console.error('Error al cargar tarjetas:', error);
            this.mostrarError('Error al cargar tarjetas');
        }
    }

    renderTarjetas() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginadas = this.filteredTarjetas.slice(start, end);

        tarjetaTableRenderer.renderTable(paginadas, this.elements.tbody, {
            onEdit: (id) => this.editarTarjeta(id),
            onDelete: (id) => this.confirmarEliminarTarjeta(id),
            onOpenPdf: (path) => this.abrirPdfTarjeta(path)
        });

        this.actualizarPaginacion();
    }

    actualizarPaginacion() {
        tarjetaTableRenderer.actualizarPaginacion(
            this.elements,
            this.currentPage,
            this.totalPages,
            this.filteredTarjetas.length,
            this.itemsPerPage
        );
    }

    cambiarPagina(nuevaPagina) {
        if (nuevaPagina < 1 || nuevaPagina > this.totalPages) return;
        this.currentPage = nuevaPagina;
        this.renderTarjetas();
    }

    // =============================================
    // Búsqueda (delegada)
    // =============================================

    filterTableInRealTime(searchTerm) {
        this.searchTerm = searchTerm;

        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = searchTerm.trim() ? 'block' : 'none';
        }

        tarjetaSearchService.showSearchingIndicator(this.elements.tbody);

        tarjetaSearchService.filterInRealTime(
            searchTerm,
            1,
            this.itemsPerPage,
            (resultado) => {
                tarjetaSearchService.hideSearchingIndicator(this.elements.tbody);
                if (resultado === null) {
                    this.cargarTarjetas();
                } else {
                    this.tarjetas = resultado.tarjetas || [];
                    this.filteredTarjetas = [...this.tarjetas];
                    this.currentPage = resultado.page || 1;
                    this.totalPages = resultado.totalPages || 1;
                    this.renderTarjetas();
                }
            },
            () => {
                tarjetaSearchService.hideSearchingIndicator(this.elements.tbody);
                this.filteredTarjetas = [];
                this.renderTarjetas();
            }
        );
    }

    async buscarTarjetas() {
        const term = this.elements.searchMainInput?.value?.trim();
        if (!term) {
            await this.cargarTarjetas();
            return;
        }

        try {
            const resultado = await tarjetaSearchService.handleSearch(term, 1, this.itemsPerPage);
            if (resultado.success) {
                this.tarjetas = resultado.tarjetas || [];
                this.filteredTarjetas = [...this.tarjetas];
                this.currentPage = resultado.page || 1;
                this.totalPages = resultado.totalPages || 1;
                this.renderTarjetas();
            } else {
                this.mostrarError('Error en la búsqueda');
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.mostrarError('Error al buscar tarjetas');
        }
    }

    clearQuickSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = 'none';
        }
        this.searchTerm = '';
        tarjetaSearchService.cancelPending();
        this.cargarTarjetas();
    }

    async limpiarFiltros() {
        if (this.elements.searchMainInput) this.elements.searchMainInput.value = '';
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        this.searchTerm = '';
        this.currentPage = 1;
        await this.cargarTarjetas();
    }

    // =============================================
    // Modal: crear/editar (delegado a FormManager)
    // =============================================

    async abrirModalNuevaTarjeta() {
        this.currentTarjetaId = null;
        this.selectedPdfPath = null;

        await tarjetaFormManager.buildNewForm(this.elements, this._getFormContext());
        this.abrirModal();
    }

    async editarTarjeta(tarjetaId) {
        try {
            loadingManager.show('editar-tarjeta', 'Cargando tarjeta...');

            const resultado = await tarjetaDataService.getById(tarjetaId);

            if (resultado.success) {
                this.currentTarjetaId = tarjetaId;
                this.selectedPdfPath = null;
                const tarjeta = resultado.tarjeta;

                await tarjetaFormManager.buildEditForm(tarjeta, this.elements, this._getFormContext());
                this.abrirModal();
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('Error al cargar tarjeta:', error);
            this.mostrarError('Error al cargar tarjeta');
        } finally {
            loadingManager.hide('editar-tarjeta');
        }
    }

    /**
     * Crear contexto de callbacks para el formulario
     * @returns {Object}
     * @private
     */
    _getFormContext() {
        return {
            onSelectPdf: () => this.seleccionarPdfTarjeta(),
            onExtractOcr: () => this.extraerOcrTarjeta(),
            onOpenPdf: (path) => this.abrirPdfTarjeta(path),
            onClearPdf: () => {
                this.selectedPdfPath = null;
                const input = document.getElementById('modal-pdf-path');
                if (input) input.value = '';
            }
        };
    }

    // =============================================
    // Guardar y Eliminar (delegado a SaveOperation)
    // =============================================

    async guardarTarjeta() {
        const { valid, data, error } = tarjetaSaveOperation.collectFormData(this.selectedPdfPath);

        if (!valid) {
            this.mostrarError(error);
            return;
        }

        const resultado = await tarjetaSaveOperation.save(this.currentTarjetaId, data);

        if (resultado.success) {
            this.cerrarModal();

            if (this.currentTarjetaId) {
                this.actualizarTarjetaEnTabla(resultado.tarjeta);
            } else {
                this.agregarTarjetaATabla(resultado.tarjeta);
            }

            this.mostrarExito(resultado.message);
        } else {
            this.mostrarError(resultado.message);
        }
    }

    confirmarEliminarTarjeta(tarjetaId) {
        this.currentTarjetaId = tarjetaId;
        if (confirm('¿Está seguro de eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
            this.eliminarTarjeta();
        }
    }

    async eliminarTarjeta() {
        if (!this.currentTarjetaId) return;
        const tarjetaIdAEliminar = this.currentTarjetaId;

        try {
            loadingManager.show('eliminar-tarjeta', 'Eliminando tarjeta...');
            const resultado = await tarjetaDataService.delete(tarjetaIdAEliminar);
            loadingManager.hide('eliminar-tarjeta');

            if (resultado.success) {
                this.cerrarModal();
                this.tarjetas = this.tarjetas.filter(t => t._id !== tarjetaIdAEliminar);
                this.filteredTarjetas = this.filteredTarjetas.filter(t => t._id !== tarjetaIdAEliminar);
                this.renderTarjetas();
                this.mostrarExito(resultado.message);
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('Error al eliminar tarjeta:', error);
            this.mostrarError('Error al eliminar tarjeta');
            loadingManager.hide('eliminar-tarjeta');
        }
    }

    // =============================================
    // Reactivos (actualización en tabla)
    // =============================================

    actualizarTarjetaEnTabla(tarjetaActualizada) {
        const idx1 = this.tarjetas.findIndex(t => t._id === tarjetaActualizada._id);
        if (idx1 !== -1) this.tarjetas[idx1] = tarjetaActualizada;

        const idx2 = this.filteredTarjetas.findIndex(t => t._id === tarjetaActualizada._id);
        if (idx2 !== -1) this.filteredTarjetas[idx2] = tarjetaActualizada;

        this.renderTarjetas();
    }

    agregarTarjetaATabla(nuevaTarjeta) {
        this.tarjetas.unshift(nuevaTarjeta);
        this.filteredTarjetas.unshift(nuevaTarjeta);
        this.currentPage = 1;
        this.renderTarjetas();
    }

    // =============================================
    // PDF/OCR (delegado a PdfOcrService)
    // =============================================

    async seleccionarPdfTarjeta() {
        const result = await tarjetaPdfOcrService.seleccionarPdf();
        if (result.success) {
            this.selectedPdfPath = result.filePath;
            const input = document.getElementById('modal-pdf-path');
            if (input) input.value = `Seleccionado: ${result.fileName}`;
            this.mostrarExito('PDF seleccionado. Ahora puedes extraer el texto OCR si lo necesitas.');
        } else if (result.error) {
            this.mostrarError(result.error);
        }
    }

    async extraerOcrTarjeta() {
        const result = await tarjetaPdfOcrService.extraerOcr(this.selectedPdfPath);
        if (result.success) {
            this.mostrarExito('Texto OCR extraído y campos auto-completados exitosamente');
        } else {
            this.mostrarError(result.error);
        }
    }

    async abrirPdfTarjeta(pdfPath) {
        const result = await tarjetaPdfOcrService.abrirPdf(pdfPath);
        if (!result.success) {
            this.mostrarError(result.error);
        }
    }

    // =============================================
    // Modal y Utilidades
    // =============================================

    abrirModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    cerrarModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        this.currentTarjetaId = null;
        this.selectedPdfPath = null;
        if (this.elements.modalForm) this.elements.modalForm.innerHTML = '';
        loadingManager.clearAll();
    }

    formatearFecha(fecha) {
        if (!fecha) return '-';
        try {
            return new Date(fecha).toLocaleDateString('es-ES', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            });
        } catch { return '-'; }
    }

    mostrarError(mensaje) {
        console.error('Error:', mensaje);
        alert('Error: ' + mensaje);
    }

    mostrarExito(mensaje) {
        console.log('Éxito:', mensaje);
    }
}

// Crear instancia singleton
export const tarjetasCRUD = new TarjetasCRUD();
