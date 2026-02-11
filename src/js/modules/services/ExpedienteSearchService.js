// src/js/modules/services/ExpedienteSearchService.js
// Servicio especializado para búsqueda y filtrado de expedientes

/**
 * Servicio de búsqueda y filtrado
 * Responsabilidad: Gestión de búsquedas, filtros y paginación
 */
export class ExpedienteSearchService {
    constructor() {
        this.searchDebounceTimer = null;
        this.searchDebounceDelay = 500; // ms
        this.searchInProgress = false;
        this.lastSearchTerm = '';
    }

    /**
     * Filtrar tabla con búsqueda en backend (con debounce)
     * @param {string} searchTerm - Término de búsqueda
     * @param {Function} onSearchStart - Callback cuando inicia búsqueda
     * @param {Function} onSearchComplete - Callback cuando completa búsqueda
     * @param {Object} options - Opciones adicionales
     * @returns {void}
     */
    filterTableInRealTime(searchTerm, onSearchStart, onSearchComplete, options = {}) {
        const term = searchTerm.trim();
        const { itemsPerPage = 10 } = options;

        // Cancelar búsqueda anterior pendiente
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // Si no hay término, limpiar búsqueda
        if (!term) {
            this.searchInProgress = false;
            this.lastSearchTerm = '';
            if (onSearchComplete) {
                onSearchComplete({ cleared: true });
            }
            return;
        }

        // Si ya hay una búsqueda completada con el mismo término, no buscar de nuevo
        if (this.searchInProgress && term === this.lastSearchTerm) {
            console.log('⏸️ Búsqueda ya completada para este término');
            return;
        }

        // Notificar inicio de búsqueda
        if (onSearchStart) {
            onSearchStart();
        }

        // Esperar a que el usuario termine de escribir (debounce)
        this.searchDebounceTimer = setTimeout(async () => {
            try {
                console.log(`🔍 [SearchService] Buscando en backend: "${term}"`);

                // Llamar al backend con el término de búsqueda
                const resultado = await window.api.invoke('buscar-expedientes', {
                    searchTerm: term,
                    page: 1,
                    limit: itemsPerPage
                });

                if (resultado.success) {
                    const expedientes = resultado.expedientes || [];
                    const total = resultado.total || expedientes.length;

                    // Marcar búsqueda como completada
                    this.searchInProgress = true;
                    this.lastSearchTerm = term;

                    console.log(`✅ Búsqueda completada: ${expedientes.length} resultados`);

                    if (onSearchComplete) {
                        onSearchComplete({
                            success: true,
                            expedientes,
                            total,
                            cleared: false
                        });
                    }
                } else {
                    console.error('❌ Error en búsqueda:', resultado.message);
                    if (onSearchComplete) {
                        onSearchComplete({
                            success: false,
                            error: resultado.message
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Error al buscar:', error);
                if (onSearchComplete) {
                    onSearchComplete({
                        success: false,
                        error: error.message || 'Error de conexión'
                    });
                }
            }
        }, this.searchDebounceDelay);
    }

    /**
     * Búsqueda local (filtrado en memoria)
     * @param {Array} expedientes - Array de expedientes
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Array} Expedientes filtrados
     */
    handleLocalSearch(expedientes, searchTerm) {
        if (!expedientes || !Array.isArray(expedientes)) {
            return [];
        }

        const term = searchTerm.toLowerCase().trim();

        if (term === '') {
            return [...expedientes];
        }

        return expedientes.filter(expediente => {
            const expedienteCompleto = `${expediente.numeroExpediente || ''}-${expediente.anioExpediente || ''}`;
            return (
                expedienteCompleto.toLowerCase().includes(term) ||
                (expediente.numeroResolucion && expediente.numeroResolucion.toLowerCase().includes(term)) ||
                (expediente.nombreEmpresa && expediente.nombreEmpresa.toLowerCase().includes(term)) ||
                (expediente.unidadNegocio && expediente.unidadNegocio.toLowerCase().includes(term)) ||
                (expediente.informeTecnico && expediente.informeTecnico.toLowerCase().includes(term))
            );
        });
    }

    /**
     * Aplicar filtros (año y unidad de negocio)
     * @param {Array} expedientes - Array de expedientes
     * @param {Object} filters - Filtros a aplicar
     * @param {string} filters.year - Año seleccionado
     * @param {string} filters.unidad - Unidad de negocio seleccionada
     * @returns {Array} Expedientes filtrados
     */
    applyFilters(expedientes, filters = {}) {
        let filtered = [...expedientes];

        // Filtro por año
        if (filters.year) {
            filtered = filtered.filter(exp =>
                exp.anioExpediente == filters.year ||
                new Date(exp.fecha).getFullYear() == filters.year
            );
        }

        // Filtro por unidad
        if (filters.unidad) {
            filtered = filtered.filter(exp => exp.unidadNegocio === filters.unidad);
        }

        return filtered;
    }

    /**
     * Cancelar búsqueda pendiente
     */
    cancelPendingSearch() {
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
            console.log('🛑 Búsqueda pendiente cancelada');
        }
    }

    /**
     * Limpiar búsqueda
     */
    clearSearch() {
        this.searchInProgress = false;
        this.lastSearchTerm = '';
        this.cancelPendingSearch();
    }
}

// Export singleton instance
export const expedienteSearchService = new ExpedienteSearchService();
