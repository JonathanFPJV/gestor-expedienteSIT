// src/js/modules/actas/ActaTableRenderer.js
/**
 * Renderizador de tabla para Actas de Entrega
 * Responsabilidad: Generar el HTML de la tabla y sus filas
 */

class ActaTableRenderer {
    /**
     * Renderizar tabla con actas paginadas
     * @param {Array} actas - Lista completa de actas
     * @param {HTMLElement} tbody - Elemento tbody de la tabla
     * @param {number} page - Página actual
     * @param {number} perPage - Items por página
     */
    renderTable(actas, tbody, page, perPage) {
        if (!tbody) return;

        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginatedActas = actas.slice(start, end);

        // Limpiar tabla
        tbody.innerHTML = '';

        if (paginatedActas.length === 0) {
            this.showEmptyState(tbody);
            return;
        }

        // Renderizar cada acta
        paginatedActas.forEach(acta => {
            const row = this.createActaRow(acta);
            tbody.appendChild(row);
        });
    }

    /**
     * Crear fila de tabla para un acta
     * @param {Object} acta - Datos del acta
     * @returns {HTMLTableRowElement}
     */
    createActaRow(acta) {
        const row = document.createElement('tr');

        const fecha = acta.fechaEntrega
            ? new Date(acta.fechaEntrega).toLocaleDateString('es-ES')
            : 'N/A';
        const tarjetas = acta.cantidadTarjetas || acta.n_tarjetas_entregadas || 0;
        const observaciones = acta.observaciones || 'Sin observaciones';
        const tienePdf = acta.pdfPathEntrega ? 'Documento' : 'No';

        row.innerHTML = `
            <td>${acta._id}</td>
            <td>${fecha}</td>
            <td><span class="badge-primary">${tarjetas}</span></td>
            <td style="text-align: center;">${tienePdf}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${observaciones}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="window.actasEntregaCRUD.viewActa(${acta._id})" title="Ver">
                        Ver
                    </button>
                    <button class="btn-icon" onclick="window.actasEntregaCRUD.editActa(${acta._id})" title="Editar">
                        Editar
                    </button>
                    ${acta.pdfPathEntrega ? `
                        <button class="btn-icon" onclick="window.actasEntregaCRUD.openPdf('${acta.pdfPathEntrega.replace(/\\/g, '\\\\')}')" title="Abrir PDF">
                            Abrir
                        </button>
                    ` : ''}
                    <button class="btn-icon btn-danger" onclick="window.actasEntregaCRUD.deleteActa(${acta._id})" title="Eliminar">
                        Eliminar
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Mostrar estado vacío
     * @param {HTMLElement} tbody
     */
    showEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No hay actas de entrega registradas
                </td>
            </tr>
        `;
    }

    /**
     * Actualizar estadísticas
     * @param {HTMLElement} element - Elemento de stats
     * @param {number} count - Cantidad de actas
     */
    updateStats(element, count) {
        if (element) {
            element.textContent = `Total: ${count} actas`;
        }
    }
}

export const actaTableRenderer = new ActaTableRenderer();
