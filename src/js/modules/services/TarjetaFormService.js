// src/js/modules/services/TarjetaFormService.js
// Servicio para gestión de tarjetas en formularios de expedientes

import { pdfSelector } from '../pdfSelector.js';
import { ocrExtractor } from '../ocrExtractor.js';

/**
 * Servicio de gestión de tarjetas en formularios
 * Responsabilidad: CRUD de tarjetas en el formulario de expediente
 */
export class TarjetaFormService {
    constructor() {
        this.selectedPdfPaths = new Map(); // index => pdfPath
    }

    /**
     * Actualizar datos de tarjeta en tiempo real
     * @param {number} index - Índice de la tarjeta
     * @param {string} field - Campo a actualizar
     * @param {*} value - Nuevo valor
     * @returns {boolean} Éxito de la operación
     */
    updateTarjetaData(index, field, value) {
        try {
            const form = document.getElementById('expediente-form');
            if (!form || !form.dataset.tarjetas) return false;

            const tarjetas = JSON.parse(form.dataset.tarjetas);
            if (tarjetas[index]) {
                tarjetas[index][field] = value;
                form.dataset.tarjetas = JSON.stringify(tarjetas);
                console.log(`Tarjeta ${index} actualizada: ${field} = ${value}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al actualizar tarjeta:', error);
            return false;
        }
    }

    /**
     * Eliminar tarjeta del formulario durante edición
     * @param {number} index - Índice de la tarjeta
     * @param {Function} onRemove - Callback después de eliminar
     * @returns {boolean} Éxito de la operación
     */
    removeTarjetaFromForm(index, onRemove) {
        try {
            const form = document.getElementById('expediente-form');
            if (!form || !form.dataset.tarjetas) return false;

            const tarjetas = JSON.parse(form.dataset.tarjetas);
            tarjetas.splice(index, 1);
            form.dataset.tarjetas = JSON.stringify(tarjetas);

            // Limpiar PDF seleccionado si existe
            this.selectedPdfPaths.delete(index);

            console.log('Tarjeta eliminada del formulario');

            if (onRemove) {
                onRemove(tarjetas);
            }

            return true;
        } catch (error) {
            console.error('Error al eliminar tarjeta:', error);
            return false;
        }
    }

    /**
     * Re-renderizar lista de tarjetas en el formulario
     * @param {Array} tarjetas - Array de tarjetas
     * @param {Function} loadEstadosCallback - Callback para cargar estados
     * @returns {void}
     */
    renderTarjetasList(tarjetas, loadEstadosCallback) {
        const tarjetasList = document.getElementById('tarjetas-list');
        if (!tarjetasList) return;

        tarjetasList.innerHTML = '';
        tarjetas.forEach((tarjeta, idx) => {
            const tarjetaDiv = document.createElement('div');
            tarjetaDiv.className = 'tarjeta-item';
            tarjetaDiv.dataset.tarjetaIndex = idx;

            // Estructura compatible con ui.js y styles.css (divs contenedores y clases específicas)
            tarjetaDiv.innerHTML = `
                <div class="tarjeta-datos">
                    <input type="text" 
                           class="placa-input"
                           placeholder="Placa del vehículo" 
                           value="${tarjeta.placa || ''}"
                           data-field="placa"
                           onchange="window.expedientesCRUD.updateTarjetaData(${idx}, 'placa', this.value)">
                    <input type="text" 
                           class="tarjeta-input"
                           placeholder="N° Tarjeta" 
                           value="${tarjeta.numero || tarjeta.numeroTarjeta || ''}"
                           data-field="numero"
                           onchange="window.expedientesCRUD.updateTarjetaData(${idx}, 'numero', this.value)">
                    <select class="estado-input"
                            data-field="estado"
                            onchange="window.expedientesCRUD.updateTarjetaData(${idx}, 'estado', this.value)">
                        <option value="ACTIVA">ACTIVA</option>
                    </select>
                </div>
                <div class="tarjeta-pdf-section">
                    <input type="text" 
                           class="pdf-tarjeta-path" 
                           placeholder="PDF de tarjeta" 
                           readonly 
                           value="${tarjeta.pdfPath ? tarjeta.pdfPath.split(/[\\/]/).pop() : ''}"
                           data-pdf-path="${tarjeta.pdfPath || ''}">
                    <button type="button" 
                            class="btn-seleccionar-pdf-tarjeta"
                            onclick="window.expedientesCRUD.seleccionarPdfTarjeta(${idx})">
                        PDF
                    </button>
                    <button type="button" 
                            class="ver-pdf-tarjeta-btn"
                            style="${tarjeta.pdfPath ? '' : 'display:none'}"
                            onclick="window.expedientesCRUD.verPdfTarjeta(${idx})">
                        Ver
                    </button>
                </div>
                <button type="button" 
                        class="eliminar-tarjeta-btn" 
                        onclick="window.expedientesCRUD.removeTarjetaFromForm(${idx})">
                    Eliminar
                </button>
            `;
            tarjetasList.appendChild(tarjetaDiv);

            // Cargar estados disponibles en el selector
            const estadoSelect = tarjetaDiv.querySelector('.estado-input');
            if (loadEstadosCallback) {
                loadEstadosCallback(estadoSelect, tarjeta.estado || 'ACTIVA');
            }
        });
    }

    /**
     * Cargar estados disponibles en un selector
     * @param {HTMLSelectElement} selectElement - Elemento select
     * @param {string} estadoSeleccionado - Estado a seleccionar
     * @returns {Promise<void>}
     */
    async cargarEstadosEnSelector(selectElement, estadoSeleccionado = 'ACTIVA') {
        if (!selectElement) return;

        try {
            const resultado = await window.api.invoke('tarjeta:obtener-estados-disponibles');

            if (resultado && resultado.success && Array.isArray(resultado.estados)) {
                selectElement.innerHTML = '';

                resultado.estados.forEach(estado => {
                    const option = document.createElement('option');
                    option.value = estado.valor;
                    option.textContent = estado.valor;

                    if (estado.valor === estadoSeleccionado) {
                        option.selected = true;
                    }

                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar estados:', error);
            // Mantener valor por defecto si hay error
            selectElement.innerHTML = '<option value="ACTIVA">ACTIVA</option>';
        }
    }

    /**
     * Seleccionar PDF para tarjeta (SOLO SELECCIÓN)
     * @param {number} index - Índice de la tarjeta
     * @returns {Promise<Object>} Resultado de la selección
     */
    async seleccionarPdfTarjeta(index) {
        try {
            console.log(`Seleccionando PDF para tarjeta ${index}...`);

            const result = await pdfSelector.selectPdf();

            if (result.success && result.filePath) {
                this.selectedPdfPaths.set(index, result.filePath);

                const fileName = pdfSelector.getFileName(result.filePath);
                console.log(`PDF seleccionado para tarjeta ${index}: ${fileName}`);

                return {
                    success: true,
                    filePath: result.filePath,
                    fileName
                };
            } else if (result.error && result.error !== 'Selección cancelada') {
                return {
                    success: false,
                    error: result.error
                };
            }

            return { success: false };
        } catch (error) {
            console.error('Error al seleccionar PDF:', error);
            return {
                success: false,
                error: error.message || 'Error al seleccionar archivo PDF'
            };
        }
    }

    /**
     * Extraer OCR de PDF de tarjeta (SOLO EXTRACCIÓN)
     * @param {number} index - Índice de la tarjeta
     * @param {Function} progressCallback - Callback de progreso
     * @returns {Promise<Object>} Resultado de la extracción
     */
    async extraerOcrTarjeta(index, progressCallback) {
        const pdfPath = this.selectedPdfPaths.get(index);

        if (!pdfPath) {
            return {
                success: false,
                error: 'No hay PDF seleccionado para esta tarjeta'
            };
        }

        try {
            console.log(`Extrayendo OCR para tarjeta ${index}...`);

            const result = await ocrExtractor.extractWithProgress(pdfPath, progressCallback);

            if (result.success && result.extractedData) {
                console.log('OCR extraído con éxito:', result.extractedData);
                return {
                    success: true,
                    extractedData: result.extractedData,
                    rawText: result.rawText
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'No se pudieron extraer datos'
                };
            }
        } catch (error) {
            console.error('Error al extraer OCR de tarjeta:', error);
            return {
                success: false,
                error: error.message || 'Error al extraer texto del PDF'
            };
        }
    }

    /**
     * Ver PDF de una tarjeta
     * @param {number} index - Índice de la tarjeta
     * @returns {Promise<void>}
     */
    async verPdfTarjeta(index) {
        const pdfPath = this.selectedPdfPaths.get(index);

        if (!pdfPath) {
            console.warn('No hay PDF seleccionado para esta tarjeta');
            return;
        }

        try {
            await window.api.invoke('abrir-pdf-externo', pdfPath);
            console.log(`PDF abierto: ${pdfPath}`);
        } catch (error) {
            console.error('Error al abrir PDF:', error);
        }
    }

    /**
     * Limpiar PDFs seleccionados
     */
    clearSelectedPdfs() {
        this.selectedPdfPaths.clear();
    }

    /**
     * Obtener PDF seleccionado de una tarjeta
     * @param {number} index - Índice de la tarjeta
     * @returns {string|null} Ruta del PDF
     */
    getSelectedPdf(index) {
        return this.selectedPdfPaths.get(index) || null;
    }
}

// Export singleton instance
export const tarjetaFormService = new TarjetaFormService();
