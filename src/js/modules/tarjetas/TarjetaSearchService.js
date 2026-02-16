// src/js/modules/tarjetas/TarjetaSearchService.js
/**
 * Servicio de búsqueda para Tarjetas
 * Responsabilidad: Búsqueda con debounce y filtrado en tiempo real
 */

import { tarjetaDataService } from './TarjetaDataService.js';

class TarjetaSearchService {
    constructor() {
        this.debounceTimer = null;
        this.debounceDelay = 500; // ms
    }

    /**
     * Filtrar en tiempo real con debounce
     * @param {string} term
     * @param {number} page
     * @param {number} limit
     * @param {Function} onResults - Callback: (resultado) => void, null = recargar todo
     * @param {Function} onError
     */
    filterInRealTime(term, page, limit, onResults, onError) {
        const trimmed = term.trim();

        this.cancelPending();

        if (!trimmed) {
            onResults(null); // null = recargar todo
            return;
        }

        this.debounceTimer = setTimeout(async () => {
            try {
                const resultado = await tarjetaDataService.search({
                    searchTerm: trimmed,
                    page,
                    limit
                });

                if (resultado.success) {
                    console.log(`Búsqueda completada: ${resultado.total} resultados`);
                    onResults(resultado);
                } else {
                    console.error('Error en búsqueda:', resultado.error);
                    if (onError) onError(resultado.error);
                }
            } catch (error) {
                console.error('Error al buscar tarjetas:', error);
                if (onError) onError(error.message);
            }
        }, this.debounceDelay);
    }

    /**
     * Búsqueda directa (desde botón, sin debounce)
     * @param {string} term
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    async handleSearch(term, page = 1, limit = 10) {
        const trimmed = term?.trim();
        if (!trimmed) return { success: true, data: null };

        return await tarjetaDataService.search({
            searchTerm: trimmed,
            page,
            limit
        });
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
        if (tbody) tbody.style.opacity = '0.5';
    }

    /**
     * Ocultar indicador visual
     * @param {HTMLElement} tbody
     */
    hideSearchingIndicator(tbody) {
        if (tbody) tbody.style.opacity = '1';
    }
}

export const tarjetaSearchService = new TarjetaSearchService();
