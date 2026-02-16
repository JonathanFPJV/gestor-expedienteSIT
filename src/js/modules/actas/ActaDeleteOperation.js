// src/js/modules/actas/ActaDeleteOperation.js
/**
 * Operación de eliminación para Actas de Entrega
 * Responsabilidad: Flujo completo de confirmación y eliminación
 */

import { actaDataService } from './ActaDataService.js';

class ActaDeleteOperation {
    /**
     * Solicitar eliminación con confirmación previa
     * @param {number} actaId - ID del acta a eliminar
     * @param {Function} onSuccess - Callback al eliminar exitosamente
     * @param {Function} onError - Callback de error
     */
    async requestDelete(actaId, onSuccess, onError) {
        console.log('Solicitando eliminación de acta:', actaId);

        const infoResult = await actaDataService.getDeleteInfo(actaId);

        if (!infoResult.success) {
            if (onError) onError('Error al obtener información de eliminación');
            return;
        }

        const info = infoResult.info;
        const confirmed = window.confirm(
            `¿Está seguro de eliminar esta acta de entrega?\n\n` +
            `ID: ${info.acta.id}\n` +
            `Fecha: ${new Date(info.acta.fechaEntrega).toLocaleDateString('es-ES')}\n` +
            `Tarjetas asociadas: ${info.tarjetas.length}\n\n` +
            `Las tarjetas serán desasociadas (no eliminadas).`
        );

        if (confirmed) {
            await this.confirmDelete(actaId, onSuccess, onError);
        }
    }

    /**
     * Ejecutar eliminación directa (sin confirmación)
     * @param {number} actaId
     * @param {Function} onSuccess - Callback con result.message
     * @param {Function} onError - Callback con mensaje de error
     */
    async confirmDelete(actaId, onSuccess, onError) {
        const result = await actaDataService.delete(actaId);

        if (result.success) {
            if (onSuccess) onSuccess(result.message);
        } else {
            if (onError) onError(result.message || 'Error al eliminar');
        }
    }
}

export const actaDeleteOperation = new ActaDeleteOperation();
