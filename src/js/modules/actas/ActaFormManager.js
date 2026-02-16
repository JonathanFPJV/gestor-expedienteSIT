// src/js/modules/actas/ActaFormManager.js
/**
 * Gestor de formularios/modal para Actas de Entrega
 * Responsabilidad: Crear, editar y visualizar actas mediante modal
 */

import { actaDataService } from './ActaDataService.js';

class ActaFormManager {
    /**
     * Configurar modal para nueva acta
     * @param {Object} elements - Referencias DOM del modal
     */
    setupNewActaModal(elements) {
        console.log('Abriendo modal para nueva acta');

        if (elements.modalTitle) {
            elements.modalTitle.textContent = 'Nueva Acta de Entrega';
        }
        if (elements.modalEliminar) {
            elements.modalEliminar.style.display = 'none';
        }
        if (elements.modalGuardar) {
            elements.modalGuardar.style.display = 'inline-block';
        }
    }

    /**
     * Configurar modal para edición
     * @param {Object} elements - Referencias DOM del modal
     */
    setupEditModal(elements) {
        if (elements.modalTitle) {
            elements.modalTitle.textContent = 'Editar Acta de Entrega';
        }
        if (elements.modalEliminar) {
            elements.modalEliminar.style.display = 'inline-block';
        }
        if (elements.modalGuardar) {
            elements.modalGuardar.style.display = 'inline-block';
        }
    }

    /**
     * Renderizar vista de solo lectura del acta
     * @param {Object} acta - Datos del acta
     * @param {Object} elements - Referencias DOM del modal
     */
    renderViewMode(acta, elements) {
        let info = `
            <div class="acta-details">
                <h3>Acta de Entrega #${acta._id}</h3>
                <p><strong>Fecha de Entrega:</strong> ${new Date(acta.fechaEntrega).toLocaleDateString('es-ES')}</p>
                <p><strong>N° de Tarjetas:</strong> ${acta.n_tarjetas_entregadas}</p>
                <p><strong>Observaciones:</strong> ${acta.observaciones || 'Sin observaciones'}</p>
                
                <h4>Tarjetas Asociadas (${acta.tarjetas?.length || 0}):</h4>
                <ul>
        `;

        if (acta.tarjetas && acta.tarjetas.length > 0) {
            acta.tarjetas.forEach(t => {
                info += `<li>${t.placa} - Tarjeta ${t.numeroTarjeta} (Exp: ${t.numeroExpediente}-${t.anioExpediente})</li>`;
            });
        } else {
            info += '<li>No hay tarjetas asociadas</li>';
        }

        info += `
                </ul>
                ${acta.pdfPathEntrega ? '<p><strong>Tiene PDF adjunto</strong></p>' : ''}
            </div>
        `;

        elements.modalForm.innerHTML = info;
        elements.modalTitle.textContent = 'Detalles del Acta';
        elements.modalGuardar.style.display = 'none';
        elements.modalEliminar.style.display = 'none';
    }

    /**
     * Cargar formulario HTML en el modal
     * @param {Object|null} acta - Datos del acta (null para nueva)
     * @param {Object} elements - Referencias DOM del modal
     */
    async loadFormHtml(acta, elements) {
        // Obtener tarjetas disponibles
        let tarjetasDisponibles = [];
        const result = await actaDataService.getAvailableTarjetas();
        if (result.success) {
            tarjetasDisponibles = result.tarjetas || [];
        }

        // Combinar tarjetas disponibles con las ya asignadas
        const tarjetasActuales = acta?.tarjetas || [];
        const allTarjetas = [...tarjetasDisponibles];

        tarjetasActuales.forEach(ta => {
            if (!allTarjetas.find(td => td._id === ta._id)) {
                allTarjetas.push(ta);
            }
        });

        const formHtml = `
            <div class="form-group">
                <label for="modal-fecha-entrega">Fecha de Entrega:</label>
                <input type="date" id="modal-fecha-entrega" value="${acta?.fechaEntrega?.split('T')[0] || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="modal-observaciones">Observaciones:</label>
                <textarea id="modal-observaciones" rows="3" placeholder="Observaciones adicionales...">${acta?.observaciones || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Tarjetas Asociadas:</label>
                <div class="tarjetas-checklist" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                    ${allTarjetas.length > 0 ? allTarjetas.map(t => {
            const isChecked = tarjetasActuales.find(ta => ta._id === t._id) ? 'checked' : '';
            return `
                            <div class="tarjeta-checkbox-item">
                                <input type="checkbox" id="tarjeta-${t._id}" value="${t._id}" ${isChecked}>
                                <label for="tarjeta-${t._id}">
                                    ${t.placa} - Tarjeta ${t.numeroTarjeta}
                                    ${t.numeroExpediente ? `(Exp: ${t.numeroExpediente}-${t.anioExpediente})` : ''}
                                    ${t.nombreEmpresa ? `- ${t.nombreEmpresa}` : ''}
                                </label>
                            </div>
                        `;
        }).join('') : '<p>No hay tarjetas disponibles</p>'}
                </div>
            </div>
            
            <div class="form-group">
                <label for="modal-pdf-path">PDF del Acta:</label>
                <input type="text" id="modal-pdf-path" readonly placeholder="Ningún archivo seleccionado" value="${acta?.pdfPathEntrega || ''}">
                <button type="button" id="modal-seleccionar-pdf" class="btn-outline" style="margin-top: 5px;">
                    Seleccionar PDF
                </button>
            </div>
        `;

        elements.modalForm.innerHTML = formHtml;

        // Adjuntar evento al botón de seleccionar PDF
        document.getElementById('modal-seleccionar-pdf')?.addEventListener('click', async () => {
            const pdfPath = await actaDataService.selectPdf();
            if (pdfPath) {
                document.getElementById('modal-pdf-path').value = pdfPath;
            }
        });
    }

    /**
     * Recolectar datos del formulario
     * @returns {{actaData: Object, tarjetasIds: number[]}|null} - Datos o null si validación falla
     */
    collectFormData() {
        const fechaEntrega = document.getElementById('modal-fecha-entrega')?.value;
        const observaciones = document.getElementById('modal-observaciones')?.value;
        const pdfPath = document.getElementById('modal-pdf-path')?.value;

        if (!fechaEntrega) {
            return null; // Validación fallida
        }

        const tarjetasCheckboxes = document.querySelectorAll('.tarjetas-checklist input[type="checkbox"]:checked');
        const tarjetasIds = Array.from(tarjetasCheckboxes).map(cb => parseInt(cb.value));

        return {
            actaData: {
                fechaEntrega,
                observaciones,
                n_tarjetas_entregadas: tarjetasIds.length,
                pdfSourcePath: pdfPath || null
            },
            tarjetasIds
        };
    }

    /**
     * Abrir modal
     * @param {HTMLElement} modal
     */
    openModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Cerrar modal y limpiar estado
     * @param {Object} elements - Referencias DOM del modal
     */
    closeModal(elements) {
        if (elements.modal) {
            elements.modal.style.display = 'none';
        }
        if (elements.modalForm) {
            elements.modalForm.innerHTML = '';
        }
        if (elements.modalGuardar) {
            elements.modalGuardar.style.display = 'inline-block';
        }
    }
}

export const actaFormManager = new ActaFormManager();
