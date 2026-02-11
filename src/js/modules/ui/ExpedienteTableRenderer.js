// src/js/modules/ui/ExpedienteTableRenderer.js
// Componente de UI para renderizado de tabla de expedientes

/**
 * Renderer de tabla de expedientes
 * Responsabilidad: Renderizado visual de la tabla
 */
export class ExpedienteTableRenderer {
    constructor(tbody) {
        this.tbody = tbody;
    }

    /**
     * Obtener o establecer tbody
     * @param {HTMLElement} tbody - Elemento tbody
     */
    setTbody(tbody) {
        this.tbody = tbody;
    }

    /**
     * Renderizar tabla de expedientes
     * @param {Array} expedientes - Expedientes a mostrar
     * @param {Object} options - Opciones de renderizado
     * @returns {void}
     */
    renderTable(expedientes, options = {}) {
        if (!this.tbody) {
            console.warn('No hay tbody disponible para renderizar');
            return;
        }

        const { onView, onEdit, onDelete } = options;

        this.tbody.innerHTML = '';

        if (expedientes.length === 0) {
            this.showEmptyState();
            return;
        }

        expedientes.forEach(expediente => {
            const row = this.createExpedienteRow(expediente, { onView, onEdit, onDelete });
            this.tbody.appendChild(row);
        });
    }

    /**
     * Crear fila de expediente
     * @param {Object} expediente - Datos del expediente
     * @param {Object} callbacks - Callbacks para acciones
     * @returns {HTMLTableRowElement}
     */
    createExpedienteRow(expediente, callbacks = {}) {
        if (!expediente) {
            console.error('Intento de renderizar fila con expediente nulo');
            return document.createElement('tr');
        }

        const row = document.createElement('tr');
        const expedienteCompleto = `${expediente.numeroExpediente || 'N/A'}-${expediente.anioExpediente || 'N/A'}`;

        // Calcular información de tarjetas
        const tarjetasAsociadas = Array.isArray(expediente.tarjetasAsociadas) ? expediente.tarjetasAsociadas : [];
        const tarjetasCount = tarjetasAsociadas.length;

        // Crear badge de tarjetas
        let tarjetasText = '';
        if (tarjetasCount === 0) {
            tarjetasText = '<span class="text-muted">0</span>';
        } else if (tarjetasCount === 1) {
            tarjetasText = '<span class="badge badge-primary">1</span>';
        } else {
            tarjetasText = `<span class="badge badge-success">${tarjetasCount}</span>`;
        }

        row.innerHTML = `
            <td><strong>${expedienteCompleto}</strong></td>
            <td>${expediente.anioExpediente || 'N/A'}</td>
            <td>${expediente.fecha || 'N/A'}</td>
            <td><strong>${expediente.numeroResolucion || '-'}</strong></td>
            <td>${expediente.nombreEmpresa || '-'}</td>
            <td><span class="badge">${expediente.unidadNegocio || '-'}</span></td>
            <td style="text-align: center;">${tarjetasText}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-action btn-view" onclick="expedientesCRUD.viewExpediente(${expediente._id})" title="Ver detalles">
                        Ver
                    </button>
                    <button class="btn-action btn-edit" onclick="expedientesCRUD.editExpediente(${expediente._id})" title="Editar">
                        Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="expedientesCRUD.confirmDelete(${expediente._id})" title="Eliminar">
                        Eliminar
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Mostrar estado de carga
     */
    showLoadingState() {
        if (!this.tbody) return;

        this.tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <div class="loading-spinner"></div>
                    Cargando expedientes...
                </td>
            </tr>
        `;
    }

    /**
     * Mostrar estado vacío
     */
    showEmptyState() {
        if (!this.tbody) return;

        this.tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    No se encontraron expedientes
                </td>
            </tr>
        `;
    }

    /**
     * Mostrar estado de error
     * @param {string} errorMessage - Mensaje de error
     */
    showErrorState(errorMessage = 'Error al cargar expedientes') {
        if (!this.tbody) return;

        this.tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #d32f2f;">
                    ${errorMessage}
                </td>
            </tr>
        `;
    }

    /**
     * Limpiar tabla
     */
    clear() {
        if (this.tbody) {
            this.tbody.innerHTML = '';
        }
    }
}

// No exportar singleton, ya que puede haber múltiples instancias
export default ExpedienteTableRenderer;
