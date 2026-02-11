// src/js/modules/operations/ExpedienteExportOperation.js
// Operación de exportación de expedientes a Excel

/**
 * Operación de export ación a Excel
 * Responsabilidad: Exportar expedientes con filtros aplicados
 */
export class ExpedienteExportOperation {
    /**
     * Exportar expedientes a Excel
     * @param {Object} filters - Filtros aplicados
     * @param {string} filters.searchTerm - Término de búsqueda
     * @param {string} filters.year - Año seleccionado
     * @param {string} filters.unidad - Unidad de negocio
     * @param {Function} onSuccess - Callback exitoso
     * @param {Function} onError - Callback de error
     * @returns {Promise<void>}
     */
    async exportToExcel(filters = {}, onSuccess, onError) {
        try {
            // Construir objeto de filtros (mapear a los campos de BD como en la versión anterior)
            const exportFilters = {
                // El search-crud-input se usa para buscar en varios campos
                numeroExpediente: filters.searchTerm || '', // Backend buscará con LIKE
                numeroResolucion: filters.searchTerm || '', // También buscar en resolución
                interesado: filters.searchTerm || '', // También buscar en interesado
                asunto: '', // No tenemos filtro específico de asunto
                tipoTramite: filters.unidad || 'todos', // Filtro de unidad
                estadoExpediente: 'todos', // No tenemos filtro de estado
                fechaInicio: '', // No tenemos filtros de fecha aún
                fechaFin: '',
                placa: '', // No hay filtro de placa en vista expedientes
                numeroTarjeta: '' // No hay filtro de tarjeta en vista expedientes
            };

            const resultado = await window.api.invoke('expediente:exportar-excel', exportFilters);

            if (resultado && resultado.success) {
                if (onSuccess) {
                    onSuccess(resultado);
                }
            } else {
                console.error('Error al exportar:', resultado?.message);

                if (onError) {
                    onError(resultado?.message || 'Error al exportar expedientes');
                }
            }
        } catch (error) {
            console.error('Error al exportar a Excel:', error);

            if (onError) {
                onError(error.message || 'Error al exportar expedientes');
            }
        }
    }
}

// Export singleton instance
export const expedienteExportOperation = new ExpedienteExportOperation();
