// src/js/modules/services/ActaEntregaService.js
// Servicio para gestión de actas de entrega

/**
 * Servicio de actas de entrega
 * Responsabilidad: Cargar y mostrar información de actas (solo lectura)
 */
export class ActaEntregaService {
    /**
     * Cargar información del acta de entrega (SOLO LECTURA)
     * @param {string|number} actaEntregaId - ID del acta
     * @param {Function} onLoad - Callback cuando se carga el acta
     * @returns {Promise<Object>} Resultado de la carga
     */
    async loadActaEntregaInfo(actaEntregaId, onLoad) {
        try {
            console.log('[ActaEntregaService] Cargando acta de entrega:', actaEntregaId);

            const actaResponse = await window.api.invoke('acta-entrega:obtener-por-id', actaEntregaId);

            if (actaResponse && actaResponse.success && actaResponse.acta) {
                const acta = actaResponse.acta;
                console.log('Acta de entrega obtenida:', acta);

                if (onLoad) {
                    onLoad(acta);
                }

                return {
                    success: true,
                    acta
                };
            } else {
                console.warn('No se pudo obtener el acta de entrega');
                return {
                    success: false,
                    error: 'No se pudo obtener el acta'
                };
            }
        } catch (error) {
            console.error('Error al cargar acta de entrega:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Renderizar acta en modo solo lectura
     * @param {Object} acta - Datos del acta
     * @returns {void}
     */
    renderActaReadOnly(acta) {
        // Mostrar la sección del acta
        const incluirActaCheckbox = document.getElementById('incluir-acta-entrega');
        const actaFields = document.getElementById('acta-entrega-fields');

        if (incluirActaCheckbox) {
            incluirActaCheckbox.checked = true;
            incluirActaCheckbox.disabled = true;
        }

        if (actaFields) {
            actaFields.style.display = 'block';
        }

        // Cargar datos del acta (SOLO LECTURA)
        setTimeout(() => {
            const fechaEntregaInput = document.getElementById('fechaEntrega');
            const nTarjetasInput = document.getElementById('n_tarjetas_entregadas');
            const observacionesActaInput = document.getElementById('observacionesActa');
            const pdfActaPathInput = document.getElementById('pdf-acta-path');

            if (fechaEntregaInput) {
                fechaEntregaInput.value = acta.fechaEntrega || '';
                this.makeReadOnly(fechaEntregaInput);
            }

            if (nTarjetasInput) {
                nTarjetasInput.value = acta.n_tarjetas_entregadas || 0;
                this.makeReadOnly(nTarjetasInput);
            }

            if (observacionesActaInput) {
                observacionesActaInput.value = acta.observaciones || '';
                this.makeReadOnly(observacionesActaInput);
            }

            if (pdfActaPathInput) {
                pdfActaPathInput.value = acta.pdfPathEntrega || 'Sin PDF asociado';
            }

            // Deshabilitar botón de seleccionar PDF
            const seleccionarPdfActaBtn = document.getElementById('seleccionar-pdf-acta-btn');
            if (seleccionarPdfActaBtn) {
                seleccionarPdfActaBtn.disabled = true;
                seleccionarPdfActaBtn.style.opacity = '0.5';
                seleccionarPdfActaBtn.style.cursor = 'not-allowed';
            }

            console.log('Acta de entrega mostrada como solo lectura');
        }, 100);
    }

    /**
     * Hacer un elemento de solo lectura
     * @param {HTMLElement} element - Elemento a hacer solo lectura
     * @returns {void}
     */
    makeReadOnly(element) {
        if (!element) return;
        element.readOnly = true;
        element.style.backgroundColor = '#f5f5f5';
        element.style.cursor = 'not-allowed';
    }
}

// Export singleton instance
export const actaEntregaService = new ActaEntregaService();
