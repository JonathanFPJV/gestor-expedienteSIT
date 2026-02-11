// src/js/modules/operations/ExpedienteDeleteOperation.js
// Operación de eliminación de expedientes

import { expedienteService } from '../services/ExpedienteService.js';

/**
 * Operación de eliminación de expedientes
 * Responsabilidad: Flujo completo de confirmación y eliminación
 */
export class ExpedienteDeleteOperation {
    /**
     * Confirmar eliminación con el usuario
     * @param {string|number} expedienteId - ID del expediente
     * @param {Function} onConfirm - Callback si se confirma
     * @param {Function} onCancel - Callback si se cancela
     * @returns {Promise<void>}
     */
    async confirmDelete(expedienteId, onConfirm, onCancel) {
        try {
            console.log('[DeleteOperation] Solicitando confirmación para expediente:', expedienteId);

            // Obtener información del expediente
            const infoResult = await expedienteService.getDeleteInfo(expedienteId);

            if (infoResult && infoResult.success) {
                const data = infoResult.data || {};
                const expedienteInfo = data.expediente || data;
                const summary = data.summary || {};

                if (!expedienteInfo) {
                    throw new Error('No se recibieron datos del expediente');
                }

                // Crear mensaje de confirmación detallado
                const tarjetasCount = summary.totalTarjetas || (expedienteInfo.tarjetasAsociadas ? expedienteInfo.tarjetasAsociadas.length : 0);
                const pdfExists = expedienteInfo.pdfPath && expedienteInfo.pdfPath !== '';

                let mensaje = `¿Estás seguro de que deseas eliminar este expediente?\n\n`;
                mensaje += `Expediente: ${expedienteInfo.numeroExpediente}-${expedienteInfo.anioExpediente || ''}\n`;
                mensaje += `Empresa: ${expedienteInfo.nombreEmpresa || 'Sin nombre'}\n`;
                mensaje += `Resolución: ${expedienteInfo.numeroResolucion || 'Sin resolución'}\n\n`;

                if (tarjetasCount > 0) {
                    mensaje += `Se eliminarán ${tarjetasCount} tarjeta(s) asociada(s)\n`;
                }

                if (pdfExists) {
                    mensaje += `También se eliminará el PDF asociado\n`;
                }

                mensaje += `\nEsta acción NO se puede deshacer`;

                const confirmado = confirm(mensaje);

                if (confirmado && onConfirm) {
                    await onConfirm(expedienteId, expedienteInfo);
                } else if (!confirmado && onCancel) {
                    onCancel();
                }
            } else {
                console.error('No se pudo obtener información del expediente');
                if (onCancel) {
                    onCancel();
                }
            }
        } catch (error) {
            console.error('Error al confirmar eliminación:', error);
            if (onCancel) {
                onCancel();
            }
        }
    }

    /**
     * Ejecutar eliminación
     * @param {string|number} expedienteId - ID del expediente
     * @param {Function} onSuccess - Callback exitoso
     * @param {Function} onError - Callback de error
     * @returns {Promise<void>}
     */
    async executeDelete(expedienteId, onSuccess, onError) {
        try {
            const result = await expedienteService.deleteExpediente(expedienteId);

            if (result && result.success) {
                if (onSuccess) {
                    onSuccess(result);
                }
            } else {
                console.error('Error al eliminar:', result?.message || result?.error);
                if (onError) {
                    onError(result?.error || result?.message || 'Error desconocido');
                }
            }
        } catch (error) {
            console.error('Error al ejecutar eliminación:', error);
            if (onError) {
                onError(error.message || 'Error al eliminar expediente');
            }
        }
    }
}

// Export singleton instance
export const expedienteDeleteOperation = new ExpedienteDeleteOperation();
