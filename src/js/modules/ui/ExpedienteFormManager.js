// src/js/modules/ui/ExpedienteFormManager.js
// Gestor de formularios de expedientes

import { tarjetaFormService } from '../services/TarjetaFormService.js';
import { actaEntregaService } from '../services/ActaEntregaService.js';

/**
 * Gestor de formularios de expedientes  
 * Responsabilidad: Cargar y gestionar formularios de expedientes
 */
export class ExpedienteFormManager {
    /**
     * Cargar expediente en formulario
     * @param {Object} expediente - Datos del expediente
     * @param {Function} onTarjetaUpdate - Callback para actualización de tarjetas
     * @returns {Promise<void>}
     */
    async loadExpedienteIntoForm(expediente, onTarjetaUpdate) {
        try {
            console.log('[FormManager] Cargando expediente en formulario:', expediente);

            // Cargar datos básicos
            this.loadBasicFields(expediente);

            // Cargar tarjetas asociadas
            if (expediente.tarjetasAsociadas && expediente.tarjetasAsociadas.length > 0) {
                await this.loadTarjetas(expediente.tarjetasAsociadas, onTarjetaUpdate);
            }

            // Cargar PDF del expediente
            if (expediente.pdfPath) {
                this.loadPdfPath(expediente.pdfPath);
            }

            console.log('Expediente cargado correctamente en formulario');
        } catch (error) {
            console.error('Error al cargar expediente en formulario:', error);
        }
    }

    /**
     * Cargar campos básicos del expediente
     * @param {Object} expediente - Datos del expediente
     * @returns {void}
     */
    loadBasicFields(expediente) {
        const fields = {
            'numeroExpediente': expediente.numeroExpediente || '',
            'anioExpediente': expediente.anioExpediente || new Date().getFullYear(),
            'numeroResolucion': expediente.numeroResolucion || '',
            'fecha': expediente.fechaExpediente || expediente.fecha || '',
            'informeTecnico': expediente.informeTecnico || '',
            'numeroFichero': expediente.numeroFichero || '',
            'nombreEmpresa': expediente.nombreEmpresa || '',
            'unidadNegocio': expediente.unidadNegocio || '',
            'observaciones': expediente.observaciones || ''
        };

        Object.keys(fields).forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = fields[fieldId];
            }
        });

        // Mostrar observaciones si existen
        if (expediente.observaciones) {
            const observacionesContainer = document.getElementById('observaciones-container');
            if (observacionesContainer) {
                observacionesContainer.classList.remove('hidden');
            }
        }
    }

    /**
     * Cargar tarjetas asociadas
     * @param {Array} tarjetas - Array de tarjetas
     * @param {Function} onUpdate - Callback de actualización
     * @returns {Promise<void>}
     */
    async loadTarjetas(tarjetas, onUpdate) {
        console.log(`[FormManager] Cargando ${tarjetas.length} tarjetas`);

        // Guardar en el formulario
        const form = document.getElementById('expediente-form');
        if (form) {
            form.dataset.tarjetas = JSON.stringify(tarjetas);
        }

        // Buscar acta de entrega
        let actaEntregaId = null;
        for (const tarjeta of tarjetas) {
            if (tarjeta.actaEntregaId) {
                actaEntregaId = tarjeta.actaEntregaId;
                console.log(`Encontrado acta de entrega: ${actaEntregaId}`);
                break;
            }
        }

        // Cargar acta si existe
        if (actaEntregaId) {
            await actaEntregaService.loadActaEntregaInfo(actaEntregaId, (acta) => {
                actaEntregaService.renderActaReadOnly(acta);
            });
        }

        // Renderizar tarjetas
        tarjetaFormService.renderTarjetasList(tarjetas, (select, estado) => {
            tarjetaFormService.cargarEstadosEnSelector(select, estado);
        });
    }

    /**
     * Cargar ruta de PDF
     * @param {string} pdfPath - Ruta del PDF
     * @returns {void}
     */
    loadPdfPath(expediente) {
        const pdfPath = typeof expediente === 'object' ? expediente.pdfPath : expediente;
        if (!pdfPath) return;

        const pdfPathInput = document.getElementById('pdf-file-path');
        const container = pdfPathInput?.parentElement;

        if (pdfPathInput) {
            const fileName = pdfPath.split(/[\\\/]/).pop();
            // Mostrar solo el nombre del archivo
            pdfPathInput.value = fileName;
            pdfPathInput.title = "Clic para ver documento: " + pdfPath;

            // Estilos para parecer un enlace/archivo clickable
            pdfPathInput.style.fontWeight = 'bold';
            pdfPathInput.style.color = '#1a73e8'; // Azul estándar de enlace
            pdfPathInput.style.cursor = 'pointer';
            pdfPathInput.style.textDecoration = 'underline';

            // Evento click directo en el input
            pdfPathInput.onclick = async () => {
                if (window.api && window.api.invoke) {
                    try {
                        await window.api.invoke('abrir-pdf-externo', pdfPath);
                    } catch (err) {
                        console.error('Error opening PDF:', err);
                    }
                }
            };
        }

        // Asegurar que NO exista ningún botón insertado anteriormente
        if (container) {
            const existingBtn = container.querySelector('.btn-ver-pdf-expediente');
            if (existingBtn) existingBtn.remove();
        }
    }

    /**
     * Preparar formulario para nuevo expediente
     * @returns {void}
     */
    prepareFormForNew() {
        const form = document.getElementById('expediente-form');
        if (form) {
            form.reset();
            // Limpiar TODOS los flags de edición posibles
            delete form.dataset.editingId;
            delete form.dataset.expedienteId;
            delete form.dataset.isEditing;
            form.dataset.tarjetas = '[]';
        }

        // Limpiar lista de tarjetas
        const tarjetasList = document.getElementById('tarjetas-list');
        if (tarjetasList) {
            tarjetasList.innerHTML = '';
        }

        // Limpiar botones de vista previa de PDF si existieran
        const pdfContainer = document.querySelector('#pdf-file-path')?.parentElement;
        if (pdfContainer) {
            const existingBtn = pdfContainer.querySelector('.btn-ver-pdf-expediente');
            if (existingBtn) existingBtn.remove();
        }

        // Limpiar PDF
        const pdfPathInput = document.getElementById('pdf-file-path');
        if (pdfPathInput) {
            pdfPathInput.value = 'Ningún archivo seleccionado';
            // Restaurar estilo
            pdfPathInput.style.fontWeight = 'normal';
            pdfPathInput.style.color = '';
            pdfPathInput.style.cursor = 'default';
            pdfPathInput.style.textDecoration = 'none';
            pdfPathInput.onclick = null;
        }

        // Ocultar observaciones
        const observacionesContainer = document.getElementById('observaciones-container');
        if (observacionesContainer) {
            observacionesContainer.classList.add('hidden');
        }

        console.log('[FormManager] Formulario preparado para nuevo expediente');
    }
}

// Export singleton instance
export const expedienteFormManager = new ExpedienteFormManager();
