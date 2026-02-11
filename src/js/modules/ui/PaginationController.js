// src/js/modules/ui/PaginationController.js
// Controlador genérico de paginación

/**
 * Controlador de paginación reutilizable
 * Responsabilidad: Gestión de estado y lógica de paginación
 */
export class PaginationController {
    constructor(options = {}) {
        this.currentPage = options.startPage || 1;
        this.itemsPerPage = options.itemsPerPage || 10;
        this.totalPages = 1;
        this.totalRecords = 0;
        this.usePagination = options.usePagination !== undefined ? options.usePagination : true;

        // Referencias a elementos DOM
        this.paginationInfo = null;
        this.pageInfo = null;
        this.prevPageBtn = null;
        this.nextPageBtn = null;
    }

    /**
     * Configurar elementos DOM
     * @param {Object} elements - Referencias a elementos DOM
     */
    setElements(elements) {
        this.paginationInfo = elements.paginationInfo;
        this.pageInfo = elements.pageInfo;
        this.prevPageBtn = elements.prevPageBtn;
        this.nextPageBtn = elements.nextPageBtn;
    }

    /**
     * Actualizar estado de paginación
     * @param {Object} state - Nuevo estado
     */
    updateState(state) {
        if (state.currentPage !== undefined) this.currentPage = state.currentPage;
        if (state.totalPages !== undefined) this.totalPages = state.totalPages;
        if (state.totalRecords !== undefined) this.totalRecords = state.totalRecords;
        if (state.itemsPerPage !== undefined) this.itemsPerPage = state.itemsPerPage;
    }

    /**
     * Actualizar UI de paginación
     */
    updatePaginationUI() {
        const totalItems = this.totalRecords;
        const totalPages = this.totalPages;

        // Información de registros
        if (this.paginationInfo) {
            if (totalItems === 0) {
                this.paginationInfo.textContent = 'No hay expedientes';
            } else {
                const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
                const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
                this.paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} expedientes`;
            }
        }

        // Información de página
        if (this.pageInfo) {
            this.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        }

        // Botones de navegación
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage <= 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    /**
     * Ir a página anterior
     * @param {Function} onPageChange - Callback cuando cambia la página
     * @returns {boolean} Si se pudo cambiar de página
     */
    previousPage(onPageChange) {
        if (this.currentPage > 1) {
            this.currentPage--;

            if (onPageChange) {
                onPageChange(this.currentPage);
            }

            return true;
        }
        return false;
    }

    /**
     * Ir a página siguiente
     * @param {Function} onPageChange - Callback cuando cambia la página
     * @returns {boolean} Si se pudo cambiar de página
     */
    nextPage(onPageChange) {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;

            if (onPageChange) {
                onPageChange(this.currentPage);
            }

            return true;
        }
        return false;
    }

    /**
     * Ir a una página específica
     * @param {number} page - Número de página
     * @param {Function} onPageChange - Callback cuando cambia la página
     * @returns {boolean} Si se pudo cambiar de página
     */
    goToPage(page, onPageChange) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;

            if (onPageChange) {
                onPageChange(this.currentPage);
            }

            return true;
        }
        return false;
    }

    /**
     * Resetear paginación
     */
    reset() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalRecords = 0;
    }

    /**
     * Obtener información de paginación
     * @returns {Object}
     */
    getInfo() {
        return {
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            totalPages: this.totalPages,
            totalRecords: this.totalRecords
        };
    }
}

// No exportar singleton, puede haber múltiples instancias
export default PaginationController;
