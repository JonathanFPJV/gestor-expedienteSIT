// src/js/modules/tarjetas/TarjetaTableRenderer.js
/**
 * Renderizador de tabla para Tarjetas
 * Responsabilidad: Generar HTML de tabla, filas y badges de estado
 */

class TarjetaTableRenderer {
    /**
     * Renderizar tabla de tarjetas paginadas
     * @param {Array} tarjetas - Lista de tarjetas a mostrar
     * @param {HTMLElement} tbody - Elemento tbody
     * @param {Object} callbacks - { onEdit, onDelete, onOpenPdf }
     * @returns {number} Total de páginas
     */
    renderTable(tarjetas, tbody, callbacks) {
        if (!tbody) return 0;

        tbody.innerHTML = '';

        if (tarjetas.length === 0) {
            this.showEmptyState(tbody);
            return 0;
        }

        tarjetas.forEach(tarjeta => {
            const row = this.crearFilaTarjeta(tarjeta, callbacks);
            tbody.appendChild(row);
        });

        return tarjetas.length;
    }

    /**
     * Crear fila de tabla para una tarjeta
     * @param {Object} tarjeta
     * @param {Object} callbacks - { onEdit, onDelete, onOpenPdf }
     * @returns {HTMLTableRowElement}
     */
    crearFilaTarjeta(tarjeta, callbacks) {
        const tr = document.createElement('tr');

        // Estado de acta de entrega
        let actaEntregaHtml = 'No';
        if (tarjeta.actaEntregaId) {
            actaEntregaHtml = `<span style="color: #28a745; font-weight: bold;" title="Acta ID: ${tarjeta.actaEntregaId}">Sí (#${tarjeta.actaEntregaId})</span>`;
        }

        // Estado de expediente
        let expedienteHtml = 'No';
        if (tarjeta.resolucionId || tarjeta.expedienteId) {
            expedienteHtml = 'Sí';
        }

        // Badge de estado (se carga async)
        const estadoBadge = '<span class="loading-badge">Cargando...</span>';

        tr.innerHTML = `
            <td>${tarjeta.placa || '-'}</td>
            <td>${tarjeta.numeroTarjeta || '-'}</td>
            <td>${expedienteHtml}</td>
            <td>${actaEntregaHtml}</td>
            <td data-estado-cell="${tarjeta._id}">${estadoBadge}</td>
            <td>
                ${tarjeta.pdfPath ? '<button class="btn-action" data-id="' + tarjeta._id + '" data-pdf="' + tarjeta.pdfPath + '" title="Ver PDF Tarjeta">PDF</button>' : ''}
                <button class="btn-action btn-edit" data-id="${tarjeta._id}" title="Editar">
                    Editar
                </button>
                <button class="btn-action btn-delete" data-id="${tarjeta._id}" title="Eliminar">
                    Eliminar
                </button>
            </td>
        `;

        // Event listeners para botones
        const btnPdf = tr.querySelector('[data-pdf]');
        const btnEdit = tr.querySelector('.btn-edit');
        const btnDelete = tr.querySelector('.btn-delete');

        if (btnPdf && callbacks.onOpenPdf) {
            btnPdf.addEventListener('click', () => callbacks.onOpenPdf(tarjeta.pdfPath));
        }
        if (btnEdit && callbacks.onEdit) {
            btnEdit.addEventListener('click', () => callbacks.onEdit(tarjeta._id));
        }
        if (btnDelete && callbacks.onDelete) {
            btnDelete.addEventListener('click', () => callbacks.onDelete(tarjeta._id));
        }

        // Cargar badge de estado async
        this.crearBadgeEstado(tarjeta.estado || 'ACTIVA').then(badge => {
            const estadoCell = tr.querySelector(`[data-estado-cell="${tarjeta._id}"]`);
            if (estadoCell) {
                estadoCell.innerHTML = badge;
            }
        });

        return tr;
    }

    /**
     * Crear badge visual para el estado
     * @param {string} estado
     * @returns {Promise<string>}
     */
    async crearBadgeEstado(estado) {
        const colores = {
            'ACTIVA': { bg: '#d4edda', color: '#155724' },
            'EN_PROCESO': { bg: '#fff3cd', color: '#856404' },
            'ENTREGADA': { bg: '#cce5ff', color: '#004085' },
            'ANULADA': { bg: '#f8d7da', color: '#721c24' },
            'RENOVADA': { bg: '#e2e3e5', color: '#383d41' },
            'VENCIDA': { bg: '#f5c6cb', color: '#721c24' },
            'SUSTITUIDA': { bg: '#d1ecf1', color: '#0c5460' }
        };

        const estilo = colores[estado] || { bg: '#e2e3e5', color: '#383d41' };

        return `<span style="
            background: ${estilo.bg}; 
            color: ${estilo.color}; 
            padding: 0.25rem 0.5rem; 
            border-radius: 0.25rem; 
            font-size: 0.8rem; 
            font-weight: 600;
        ">${estado}</span>`;
    }

    /**
     * Mostrar estado vacío
     * @param {HTMLElement} tbody
     */
    showEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No hay tarjetas registradas
                </td>
            </tr>
        `;
    }

    /**
     * Actualizar información de paginación
     * @param {Object} elements - { paginationInfo, pageInfo, prevPageBtn, nextPageBtn }
     * @param {number} currentPage
     * @param {number} totalPages
     * @param {number} totalItems
     * @param {number} itemsPerPage
     */
    actualizarPaginacion(elements, currentPage, totalPages, totalItems, itemsPerPage) {
        if (elements.paginationInfo) {
            const start = (currentPage - 1) * itemsPerPage + 1;
            const end = Math.min(currentPage * itemsPerPage, totalItems);
            elements.paginationInfo.textContent = `Mostrando ${start}-${end} de ${totalItems} tarjetas`;
        }

        if (elements.pageInfo) {
            elements.pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        }

        if (elements.prevPageBtn) {
            elements.prevPageBtn.disabled = currentPage <= 1;
        }

        if (elements.nextPageBtn) {
            elements.nextPageBtn.disabled = currentPage >= totalPages;
        }
    }
}

export const tarjetaTableRenderer = new TarjetaTableRenderer();
