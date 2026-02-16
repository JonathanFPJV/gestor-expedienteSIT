// src/js/modules/tarjetas/TarjetaSaveOperation.js
/**
 * Operación de guardado para Tarjetas
 * Responsabilidad: Validar formulario, recolectar datos y ejecutar crear/actualizar
 */

import { tarjetaDataService } from './TarjetaDataService.js';
import { loadingManager } from '../loadingManager.js';

class TarjetaSaveOperation {
    /**
     * Recolectar y validar datos del formulario
     * @param {string|null} selectedPdfPath - Ruta del PDF seleccionado
     * @returns {{ valid: boolean, data?: Object, error?: string }}
     */
    collectFormData(selectedPdfPath) {
        const placa = document.getElementById('modal-placa')?.value?.trim();
        const numeroTarjeta = document.getElementById('modal-numero-tarjeta')?.value?.trim();
        const asociarExpediente = document.getElementById('modal-asociar-expediente')?.checked;
        const expedienteId = asociarExpediente ? document.getElementById('modal-expediente-id')?.value : null;
        const actaEntregaId = asociarExpediente ? document.getElementById('modal-acta-entrega-id')?.value : null;
        const estado = document.getElementById('modal-estado')?.value || 'ACTIVA';

        // Validación
        if (!placa && !numeroTarjeta) {
            return { valid: false, error: 'Debe proporcionar al menos la placa o el número de tarjeta' };
        }
        if (!placa) {
            return { valid: false, error: 'La placa del vehículo es obligatoria' };
        }
        if (selectedPdfPath && !expedienteId) {
            return { valid: false, error: 'Debe seleccionar un expediente para guardar el archivo PDF' };
        }

        // Limpiar valores vacíos para SQLite
        const cleanValue = (value) => {
            if (value === undefined || value === null || value === '') return null;
            return value;
        };

        return {
            valid: true,
            data: {
                tarjetaData: {
                    placa: cleanValue(placa),
                    numeroTarjeta: cleanValue(numeroTarjeta),
                    estado,
                    expedienteId: cleanValue(expedienteId),
                    actaEntregaId: cleanValue(actaEntregaId)
                },
                pdfPath: selectedPdfPath || null
            }
        };
    }

    /**
     * Ejecutar guardado (crear o actualizar)
     * @param {number|null} tarjetaId - null = crear, number = actualizar
     * @param {Object} formData - { tarjetaData, pdfPath }
     * @returns {Promise<Object>}
     */
    async save(tarjetaId, formData) {
        const operacion = tarjetaId ? 'actualizar-tarjeta' : 'crear-tarjeta';
        const textoLoading = tarjetaId ? 'Actualizando tarjeta...' : 'Creando tarjeta...';

        try {
            loadingManager.show(operacion, textoLoading);

            console.log('Guardando tarjeta:', {
                tarjetaId,
                tarjetaData: formData.tarjetaData,
                pdfPath: formData.pdfPath
            });

            let resultado;
            if (tarjetaId) {
                resultado = await tarjetaDataService.update(tarjetaId, formData.tarjetaData, formData.pdfPath);
            } else {
                resultado = await tarjetaDataService.create(formData.tarjetaData, formData.pdfPath);
            }

            loadingManager.hide(operacion);
            return resultado;

        } catch (error) {
            console.error('Error al guardar tarjeta:', error);
            loadingManager.hide(operacion);
            return { success: false, message: 'Error al guardar tarjeta' };
        }
    }
}

export const tarjetaSaveOperation = new TarjetaSaveOperation();
