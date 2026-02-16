// src/js/modules/tarjetas/TarjetaFormManager.js
/**
 * Gestor de formularios/modal para Tarjetas
 * Responsabilidad: Generar HTML del formulario, cargar selects, adjuntar listeners
 */

import { tarjetaDataService } from './TarjetaDataService.js';

class TarjetaFormManager {
    /**
     * Construir formulario para nueva tarjeta
     * @param {Object} elements - { modalTitle, modalEliminar, modalForm }
     * @param {Object} context - { onSelectPdf, onExtractOcr }
     */
    async buildNewForm(elements, context) {
        elements.modalTitle.textContent = 'Nueva Tarjeta';
        elements.modalEliminar.style.display = 'none';

        elements.modalForm.innerHTML = this._getFormHtml(null);
        this._attachFormListeners(null, context);
        await this.cargarEstadosEnSelect();
    }

    /**
     * Construir formulario para editar tarjeta
     * @param {Object} tarjeta - Datos de la tarjeta
     * @param {Object} elements - { modalTitle, modalEliminar, modalForm }
     * @param {Object} context - { onSelectPdf, onExtractOcr, onOpenPdf }
     */
    async buildEditForm(tarjeta, elements, context) {
        elements.modalTitle.textContent = 'Editar Tarjeta';
        elements.modalEliminar.style.display = 'inline-block';

        elements.modalForm.innerHTML = this._getFormHtml(tarjeta);
        this._attachFormListeners(tarjeta, context);

        // Si tiene expediente, cargar selects
        if (tarjeta.resolucionId) {
            await this.cargarExpedientesEnSelect(tarjeta.resolucionId);
            await this.cargarActasEntregaEnSelect(tarjeta.actaEntregaId);
        }

        await this.cargarEstadosEnSelect(tarjeta.estado || 'ACTIVA');
    }

    /**
     * Generar HTML del formulario
     * @param {Object|null} tarjeta - null para nuevo
     * @returns {string}
     * @private
     */
    _getFormHtml(tarjeta) {
        const isEdit = !!tarjeta;
        const showAssociated = isEdit ? (tarjeta.resolucionId ? 'block' : 'none') : 'none';
        const isChecked = isEdit ? (tarjeta.resolucionId ? 'checked' : '') : '';

        return `
            <div class="form-group">
                <label for="modal-placa">Placa del Vehículo: <span style="color: red;">*</span></label>
                <input type="text" id="modal-placa" value="${tarjeta?.placa || ''}" placeholder="Ej: ABC-123" style="text-transform: uppercase;" required>
            </div>
            <div class="form-group">
                <label for="modal-numero-tarjeta">Número de Tarjeta:</label>
                <input type="text" id="modal-numero-tarjeta" value="${tarjeta?.numeroTarjeta || ''}" placeholder="Ej: T-12345">
            </div>
            <div class="form-group">
                <label for="modal-estado">Estado de la Tarjeta:</label>
                <select id="modal-estado">
                    <option value="${tarjeta?.estado || 'ACTIVA'}">Cargando estados...</option>
                </select>
                <small style="color: #666; margin-top: 0.25rem; display: block;">
                    ${isEdit ? 'Cambie el estado de la tarjeta según corresponda' : 'Indica el estado actual de la tarjeta'}
                </small>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="modal-asociar-expediente" ${isChecked}>
                    Asociar a un expediente existente
                </label>
            </div>
            <div class="form-group" id="expediente-select-container" style="display: ${showAssociated};">
                <label for="modal-expediente-id">Seleccionar Expediente (Resolución): <span style="color: red;">*</span></label>
                <select id="modal-expediente-id">
                    <option value="">Seleccionar...</option>
                </select>
            </div>
            <div class="form-group" id="acta-entrega-select-container" style="display: ${showAssociated};">
                <label for="modal-acta-entrega-id">Acta de Entrega (Opcional):</label>
                <select id="modal-acta-entrega-id">
                    <option value="">Ninguna</option>
                </select>
                <small style="color: #666; margin-top: 0.25rem; display: block;">
                    Seleccione un acta de entrega si la tarjeta ya fue entregada
                </small>
            </div>
            <div class="form-group" id="pdf-select-container" style="display: ${showAssociated};">
                <label for="modal-pdf-path">Documento PDF de la Tarjeta:</label>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="modal-pdf-path" value="${isEdit && tarjeta.pdfPath ? 'PDF guardado: ' + tarjeta.pdfPath.split(/[\\/]/).pop() : ''}" placeholder="Ningún archivo seleccionado" readonly style="flex: 1; min-width: 200px;">
                    <button type="button" id="seleccionar-pdf-tarjeta-btn" class="btn-secondary">
                        ${isEdit && tarjeta.pdfPath ? 'Reemplazar PDF' : 'Seleccionar PDF'}
                    </button>
                    <button type="button" id="extraer-ocr-tarjeta-btn" class="btn-secondary" style="display: ${isEdit && tarjeta.pdfPath ? 'block' : 'none'};">Extraer OCR</button>
                    ${isEdit && tarjeta.pdfPath ? '<button type="button" id="abrir-pdf-tarjeta-btn" class="btn-secondary">Abrir</button>' : ''}
                </div>
                <small style="color: #666; margin-top: 0.25rem; display: block;">
                    ${isEdit && tarjeta.pdfPath ? 'Puedes reemplazar el PDF existente. El anterior será eliminado.' : 'El PDF se guardará en la carpeta del expediente seleccionado'}
                </small>
            </div>
        `;
    }

    /**
     * Adjuntar event listeners al formulario
     * @param {Object|null} tarjeta
     * @param {Object} context - { onSelectPdf, onExtractOcr, onOpenPdf }
     * @private
     */
    _attachFormListeners(tarjeta, context) {
        const checkboxAsociar = document.getElementById('modal-asociar-expediente');
        const expedienteContainer = document.getElementById('expediente-select-container');
        const actaEntregaContainer = document.getElementById('acta-entrega-select-container');
        const pdfContainer = document.getElementById('pdf-select-container');

        if (checkboxAsociar) {
            checkboxAsociar.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    expedienteContainer.style.display = 'block';
                    actaEntregaContainer.style.display = 'block';
                    pdfContainer.style.display = 'block';
                    await this.cargarExpedientesEnSelect(tarjeta?.resolucionId);
                    await this.cargarActasEntregaEnSelect(tarjeta?.actaEntregaId);
                } else {
                    expedienteContainer.style.display = 'none';
                    actaEntregaContainer.style.display = 'none';
                    pdfContainer.style.display = 'none';
                    if (context.onClearPdf) context.onClearPdf();
                }
            });
        }

        // Botón seleccionar PDF
        const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-tarjeta-btn');
        if (seleccionarPdfBtn && context.onSelectPdf) {
            seleccionarPdfBtn.addEventListener('click', async () => {
                await context.onSelectPdf();
                const extraerBtn = document.getElementById('extraer-ocr-tarjeta-btn');
                if (extraerBtn) extraerBtn.style.display = 'block';
            });
        }

        // Botón extraer OCR
        const extraerOcrBtn = document.getElementById('extraer-ocr-tarjeta-btn');
        if (extraerOcrBtn && context.onExtractOcr) {
            extraerOcrBtn.addEventListener('click', async () => {
                await context.onExtractOcr();
            });
        }

        // Botón abrir PDF (solo en edición)
        if (tarjeta?.pdfPath && context.onOpenPdf) {
            const abrirPdfBtn = document.getElementById('abrir-pdf-tarjeta-btn');
            if (abrirPdfBtn) {
                abrirPdfBtn.addEventListener('click', async () => {
                    await context.onOpenPdf(tarjeta.pdfPath);
                });
            }
        }
    }

    /**
     * Cargar expedientes en el select
     * @param {number|null} selectedId
     */
    async cargarExpedientesEnSelect(selectedId = null) {
        const expedientes = await tarjetaDataService.getExpedientes();
        const select = document.getElementById('modal-expediente-id');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar...</option>';
        expedientes.forEach(exp => {
            const option = document.createElement('option');
            option.value = exp._id;
            option.textContent = `${exp.numeroExpediente}-${exp.anioExpediente} - ${exp.nombreEmpresa || 'Sin nombre'}`;
            if (exp._id === selectedId) option.selected = true;
            select.appendChild(option);
        });
    }

    /**
     * Cargar estados disponibles en el select
     * @param {string} selectedEstado
     */
    async cargarEstadosEnSelect(selectedEstado = 'ACTIVA') {
        const resultado = await tarjetaDataService.getEstados();
        if (!resultado?.success || !Array.isArray(resultado.estados)) return;

        const select = document.getElementById('modal-estado');
        if (!select) return;

        select.innerHTML = '';
        resultado.estados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado.valor;
            option.textContent = `${estado.icono} ${estado.valor} - ${estado.descripcion}`;
            if (estado.valor === selectedEstado) option.selected = true;
            select.appendChild(option);
        });
    }

    /**
     * Cargar actas de entrega en el select
     * @param {number|null} selectedId
     */
    async cargarActasEntregaEnSelect(selectedId = null) {
        const resultado = await tarjetaDataService.getActasEntrega();
        if (!resultado?.success || !Array.isArray(resultado.actas)) return;

        const select = document.getElementById('modal-acta-entrega-id');
        if (!select) return;

        select.innerHTML = '<option value="">Ninguna</option>';
        resultado.actas.forEach(acta => {
            const option = document.createElement('option');
            option.value = acta._id;
            const fecha = acta.fechaEntrega ? new Date(acta.fechaEntrega).toLocaleDateString('es-ES') : 'Sin fecha';
            option.textContent = `Acta #${acta._id} - ${fecha} (${acta.n_tarjetas_entregadas || 0} tarjetas)`;
            if (acta._id === selectedId) option.selected = true;
            select.appendChild(option);
        });
    }
}

export const tarjetaFormManager = new TarjetaFormManager();
