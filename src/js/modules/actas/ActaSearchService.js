// src/js/modules/actas/ActaSearchService.js
/**
 * Servicio de búsqueda para Actas de Entrega
 * Responsabilidad: Búsqueda con debounce y filtrado en tiempo real
 */

import { actaDataService } from './ActaDataService.js';

class ActaSearchService {
    constructor() {
        this.debounceTimer = null;
        this.debounceDelay = 500; // ms
    }

    /**
     * Filtrar tabla en tiempo real con debounce
     * @param {string} term - Término de búsqueda
     * @param {number} limit - Items por página
     * @param {Function} onResults - Callback con resultados: (actas, page, totalPages)
     * @param {Function} onError - Callback de error
     */
    filterInRealTime(term, limit, onResults, onError) {
        const trimmed = term.trim();

        // Cancelar búsqueda anterior
        this.cancelPending();

        // Si no hay término, notificar para recargar todo
        if (!trimmed) {
            onResults(null); // null indica "recargar todo"
            return;
        }

        // Configurar nuevo timer con debounce
        this.debounceTimer = setTimeout(async () => {
            try {
                const resultado = await actaDataService.search(trimmed, 1, limit);

                if (resultado.success) {
                    console.log(`Búsqueda completada: ${resultado.total} resultados encontrados`);
                    onResults(resultado.actas, resultado.page, resultado.totalPages);
                } else {
                    console.error('Error en búsqueda:', resultado.error);
                    if (onError) onError(resultado.error);
                }
            } catch (error) {
                console.error('Error al buscar actas:', error);
                if (onError) onError(error.message);
            }
        }, this.debounceDelay);
    }

    /**
     * Búsqueda directa (desde botón, sin debounce)
     * @param {string} term
     * @returns {Promise<{success: boolean, actas?: Array}>}
     */
    async handleSearch(term) {
        const trimmed = term?.trim();
        if (!trimmed) return { success: true, actas: null }; // null = recargar

        return await actaDataService.searchSimple(trimmed);
    }

    /**
     * Cancelar búsqueda pendiente
     */
    cancelPending() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    /**
     * Mostrar indicador visual de búsqueda
     * @param {HTMLElement} tbody
     */
    showSearchingIndicator(tbody) {
        if (tbody) {
            tbody.style.opacity = '0.5';
        }
    }

    /**
     * Ocultar indicador visual de búsqueda
     * @param {HTMLElement} tbody
     */
    hideSearchingIndicator(tbody) {
        if (tbody) {
            tbody.style.opacity = '1';
        }
    }
}

export const actaSearchService = new ActaSearchService();
