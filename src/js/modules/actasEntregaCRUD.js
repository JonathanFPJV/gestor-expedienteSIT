// src/js/modules/actasEntregaCRUD.js
/**
 * Coordinador CRUD para Actas de Entrega
 * Delega a módulos especializados en actas/
 */

import { eventBus, APP_EVENTS } from './eventBus.js';
import { actaDataService } from './actas/ActaDataService.js';
import { actaTableRenderer } from './actas/ActaTableRenderer.js';
import { actaSearchService } from './actas/ActaSearchService.js';
import { actaFormManager } from './actas/ActaFormManager.js';
import { actaDeleteOperation } from './actas/ActaDeleteOperation.js';

class ActasEntregaCRUD {
    constructor() {
        this.actas = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentActaId = null;
        this.isEditMode = false;
        this.elements = null;

        console.log('ActasEntregaCRUD: Módulo inicializado');
        this.setupViewActivationListener();
    }

    /**
     * Configurar listener para recarga automática al activar vista
     */
    setupViewActivationListener() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const vistaActas = document.getElementById('vista-actas-crud');
                    if (vistaActas && vistaActas.classList.contains('active')) {
                        console.log('Vista de actas activada - Recargando datos...');
                        this.loadActas();
                    }
                }
            });
        });

        const vistaActas = document.getElementById('vista-actas-crud');
        if (vistaActas) {
            observer.observe(vistaActas, { attributes: true });
            if (vistaActas.classList.contains('active')) {
                this.loadActas();
            }
        }
    }

    /**
     * Inicializar el módulo
     */
    async init() {
        console.log('ActasEntregaCRUD: Inicializando módulo...');
        this.initializeElements();
        this.attachEventListeners();
        this.subscribeToEvents();
        console.log('ActasEntregaCRUD: Módulo listo');
    }

    /**
     * Inicializar referencias a elementos del DOM
     */
    initializeElements() {
        this.elements = {
            container: document.getElementById('vista-actas-crud'),
            nuevaActaBtn: document.getElementById('nueva-acta-btn'),
            searchBtn: document.getElementById('search-actas-btn'),
            searchInput: document.getElementById('search-actas-input'),
            clearFiltersBtn: document.getElementById('limpiar-filtros-actas-btn'),
            searchCrudInput: document.getElementById('search-actas-crud-input'),
            clearSearchBtn: document.querySelector('#search-actas-crud-input + .clear-search-btn'),
            tbody: document.getElementById('actas-tbody'),
            statsActas: document.getElementById('stats-actas'),
            prevPageBtn: document.getElementById('prev-page-actas'),
            nextPageBtn: document.getElementById('next-page-actas'),
            pageInfo: document.getElementById('page-info-actas'),
            paginationInfo: document.getElementById('pagination-info-actas'),
            modal: document.getElementById('modal-acta'),
            modalTitle: document.getElementById('modal-acta-title'),
            modalForm: document.getElementById('modal-acta-form'),
            modalGuardar: document.getElementById('modal-acta-guardar'),
            modalCancelar: document.getElementById('modal-acta-cancelar'),
            modalEliminar: document.getElementById('modal-acta-eliminar'),
            modalClose: document.getElementById('modal-acta-close')
        };
        console.log('Elementos DOM inicializados');
    }

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        this.elements.nuevaActaBtn?.addEventListener('click', () => this.openNewActaModal());

        this.elements.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.elements.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        this.elements.searchCrudInput?.addEventListener('input', (e) => {
            this.filterTableInRealTime(e.target.value);
        });

        this.elements.clearSearchBtn?.addEventListener('click', () => {
            if (this.elements.searchCrudInput) {
                this.elements.searchCrudInput.value = '';
                this.filterTableInRealTime('');
            }
        });

        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
        this.elements.prevPageBtn?.addEventListener('click', () => this.previousPage());
        this.elements.nextPageBtn?.addEventListener('click', () => this.nextPage());

        this.elements.modalClose?.addEventListener('click', () => this.closeModal());
        this.elements.modalCancelar?.addEventListener('click', () => this.closeModal());
        this.elements.modalGuardar?.addEventListener('click', () => this.saveActa());
        this.elements.modalEliminar?.addEventListener('click', () => this.confirmDeleteActa(this.currentActaId));

        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });

        console.log('Event listeners adjuntados');
    }

    /**
     * Suscribirse a eventos del EventBus
     */
    subscribeToEvents() {
        eventBus.on(APP_EVENTS.ACTA_CREATED, (data) => {
            console.log('Evento ACTA_CREATED recibido:', data);
            this.addActaToTable(data.acta);
        });

        eventBus.on(APP_EVENTS.ACTA_UPDATED, (data) => {
            console.log('Evento ACTA_UPDATED recibido:', data);
            this.refreshActaInTable(data.acta);
        });

        eventBus.on(APP_EVENTS.ACTA_DELETED, (data) => {
            console.log('Evento ACTA_DELETED recibido:', data);
            this.removeActaFromTable(data.actaId);
        });

        console.log('Suscrito a eventos del EventBus');
    }

    // =============================================
    // Delegación a módulos especializados
    // =============================================

    async loadActas() {
        const result = await actaDataService.loadAll();
        if (result.success) {
            this.actas = result.actas || [];
            this.renderTable();
            this.updateStats();
        } else {
            this.showNotification('Error al cargar actas', 'error');
        }
    }

    renderTable() {
        actaTableRenderer.renderTable(this.actas, this.elements.tbody, this.currentPage, this.itemsPerPage);
        this.updatePagination();
    }

    updateStats() {
        actaTableRenderer.updateStats(this.elements.statsActas, this.actas.length);
    }

    updatePagination() {
        const totalPages = Math.ceil(this.actas.length / this.itemsPerPage) || 1;

        if (this.elements.pageInfo) {
            this.elements.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        }
        if (this.elements.paginationInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, this.actas.length);
            this.elements.paginationInfo.textContent = `Mostrando ${start} - ${end} de ${this.actas.length} actas`;
        }
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = this.currentPage === 1;
        }
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.actas.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    filterTableInRealTime(searchTerm) {
        // Toggle clear button
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = searchTerm.trim() ? 'block' : 'none';
        }

        actaSearchService.showSearchingIndicator(this.elements.tbody);

        actaSearchService.filterInRealTime(
            searchTerm,
            this.itemsPerPage,
            (actas, page, totalPages) => {
                actaSearchService.hideSearchingIndicator(this.elements.tbody);
                if (actas === null) {
                    this.loadActas(); // Recargar todo
                } else {
                    this.actas = actas;
                    this.currentPage = page || 1;
                    this.renderTable();
                    this.updateStats();
                }
            },
            (error) => {
                actaSearchService.hideSearchingIndicator(this.elements.tbody);
                this.actas = [];
                this.renderTable();
            }
        );
    }

    async handleSearch() {
        const term = this.elements.searchInput?.value.trim();
        if (!term) {
            await this.loadActas();
            return;
        }

        const result = await actaSearchService.handleSearch(term);
        if (result.success) {
            if (result.actas === null) {
                await this.loadActas();
            } else {
                this.actas = result.actas || [];
                this.currentPage = 1;
                this.renderTable();
                this.updateStats();
                this.showNotification(`${this.actas.length} resultados encontrados`, 'success');
            }
        } else {
            this.showNotification('Error en la búsqueda', 'error');
        }
    }

    async clearFilters() {
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        this.currentPage = 1;
        await this.loadActas();
    }

    async openNewActaModal() {
        actaFormManager.setupNewActaModal(this.elements);
        this.isEditMode = false;
        this.currentActaId = null;
        await actaFormManager.loadFormHtml(null, this.elements);
        actaFormManager.openModal(this.elements.modal);
    }

    async viewActa(actaId) {
        console.log('Viendo acta:', actaId);
        const result = await actaDataService.getById(actaId);
        if (result.success) {
            actaFormManager.renderViewMode(result.acta, this.elements);
            actaFormManager.openModal(this.elements.modal);
        } else {
            this.showNotification('Error al cargar acta', 'error');
        }
    }

    async editActa(actaId) {
        console.log('Editando acta:', actaId);
        this.isEditMode = true;
        this.currentActaId = actaId;

        const result = await actaDataService.getById(actaId);
        if (result.success) {
            actaFormManager.setupEditModal(this.elements);
            await actaFormManager.loadFormHtml(result.acta, this.elements);
            actaFormManager.openModal(this.elements.modal);
        } else {
            this.showNotification('Error al cargar acta', 'error');
        }
    }

    async saveActa() {
        const formData = actaFormManager.collectFormData();
        if (!formData) {
            this.showNotification('La fecha de entrega es obligatoria', 'error');
            return;
        }

        let result;
        if (this.isEditMode && this.currentActaId) {
            result = await actaDataService.update(this.currentActaId, formData.actaData, formData.tarjetasIds);
        } else {
            result = await actaDataService.create(formData.actaData, formData.tarjetasIds);
        }

        if (result.success) {
            this.showNotification(result.message, 'success');
            this.closeModal();
        } else {
            this.showNotification(result.message || 'Error al guardar', 'error');
        }
    }

    async deleteActa(actaId) {
        await actaDeleteOperation.requestDelete(
            actaId,
            (message) => this.showNotification(message, 'success'),
            (error) => this.showNotification(error, 'error')
        );
    }

    async confirmDeleteActa(actaId) {
        await actaDeleteOperation.confirmDelete(
            actaId,
            (message) => {
                this.showNotification(message, 'success');
                this.closeModal();
            },
            (error) => this.showNotification(error, 'error')
        );
    }

    async openPdf(pdfPath) {
        try {
            await actaDataService.openPdf(pdfPath);
        } catch (error) {
            this.showNotification('Error al abrir PDF', 'error');
        }
    }

    // =============================================
    // Métodos reactivos (EventBus)
    // =============================================

    addActaToTable(newActa) {
        this.actas.unshift(newActa);
        this.currentPage = 1;
        this.renderTable();
        this.updateStats();
        this.showNotification('Acta creada exitosamente', 'success');
    }

    refreshActaInTable(updatedActa) {
        const index = this.actas.findIndex(a => a._id === updatedActa._id);
        if (index !== -1) {
            this.actas[index] = updatedActa;
            this.renderTable();
            this.updateStats();
            this.showNotification('Acta actualizada exitosamente', 'success');
        }
    }

    removeActaFromTable(actaId) {
        this.actas = this.actas.filter(a => a._id !== actaId);
        const totalPages = Math.ceil(this.actas.length / this.itemsPerPage);
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
        }
        this.renderTable();
        this.updateStats();
        this.showNotification('Acta eliminada exitosamente', 'success');
    }

    closeModal() {
        actaFormManager.closeModal(this.elements);
        this.isEditMode = false;
        this.currentActaId = null;
    }

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Instancia global
export const actasEntregaCRUD = new ActasEntregaCRUD();
