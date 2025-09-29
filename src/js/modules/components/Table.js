// src/js/modules/components/Table.js
import { BaseComponent } from './BaseComponent.js';

/**
 * Componente para crear tablas de datos con funcionalidades avanzadas
 * Incluye ordenamiento, paginación, filtrado y acciones personalizadas
 */
export class Table extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);
        this.data = [];
        this.filteredData = [];
        this.columns = [];
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.selectedRows = new Set();
    }

    get defaultOptions() {
        return {
            ...super.defaultOptions,
            className: 'data-table-component',
            // Configuración de tabla
            striped: true,
            bordered: true,
            hover: true,
            responsive: true,
            // Configuración de paginación
            pagination: false,
            pageSize: 10,
            showPageInfo: true,
            // Configuración de selección
            selectable: false,
            multiSelect: false,
            // Configuración de ordenamiento
            sortable: true,
            // Configuración de filtrado
            filterable: false,
            // Mensajes
            emptyMessage: 'No hay datos para mostrar',
            loadingMessage: 'Cargando...',
            // Acciones
            showActions: true,
            actions: []
        };
    }

    render() {
        this.element = this.createElement('div', {
            className: `table-component ${this.options.className}`,
            id: this.options.id
        });

        // Crear estructura de la tabla
        this.createTableStructure();
        
        this.container.appendChild(this.element);
        return this;
    }

    createTableStructure() {
        // Contenedor responsive
        if (this.options.responsive) {
            this.tableContainer = this.createElement('div', {
                className: 'table-responsive'
            });
        } else {
            this.tableContainer = this.element;
        }

        // Tabla principal
        this.table = this.createElement('table', {
            className: this.getTableClasses()
        });

        // Header
        this.thead = this.createElement('thead');
        this.table.appendChild(this.thead);

        // Body
        this.tbody = this.createElement('tbody');
        this.table.appendChild(this.tbody);

        this.tableContainer.appendChild(this.table);
        
        if (this.options.responsive) {
            this.element.appendChild(this.tableContainer);
        }

        // Crear paginación si está habilitada
        if (this.options.pagination) {
            this.createPagination();
        }
    }

    getTableClasses() {
        let classes = 'data-table';
        
        if (this.options.striped) classes += ' table-striped';
        if (this.options.bordered) classes += ' table-bordered';
        if (this.options.hover) classes += ' table-hover';
        
        return classes;
    }

    /**
     * Configurar columnas de la tabla
     */
    setColumns(columns) {
        this.columns = columns.map(col => ({
            key: col.key,
            title: col.title || col.key,
            sortable: col.sortable !== false && this.options.sortable,
            width: col.width,
            align: col.align || 'left',
            render: col.render || null,
            className: col.className || ''
        }));
        
        this.renderHeader();
        return this;
    }

    /**
     * Renderizar header de la tabla
     */
    renderHeader() {
        this.thead.innerHTML = '';
        
        const headerRow = this.createElement('tr');

        // Columna de selección
        if (this.options.selectable) {
            const selectCell = this.createElement('th', {
                className: 'select-column'
            });

            if (this.options.multiSelect) {
                const selectAllCheckbox = this.createElement('input', {
                    attributes: { type: 'checkbox' },
                    className: 'select-all-checkbox'
                });

                this.addEventListener(selectAllCheckbox, 'change', (e) => {
                    this.toggleAllRows(e.target.checked);
                });

                selectCell.appendChild(selectAllCheckbox);
            }

            headerRow.appendChild(selectCell);
        }

        // Columnas de datos
        this.columns.forEach(column => {
            const th = this.createElement('th', {
                className: `column-${column.key} ${column.className}`,
                textContent: column.title
            });

            if (column.width) {
                th.style.width = column.width;
            }

            if (column.align) {
                th.style.textAlign = column.align;
            }

            if (column.sortable) {
                th.classList.add('sortable');
                th.style.cursor = 'pointer';
                
                const sortIcon = this.createElement('span', {
                    className: 'sort-icon'
                });
                th.appendChild(sortIcon);

                this.addEventListener(th, 'click', () => {
                    this.sortBy(column.key);
                });
            }

            headerRow.appendChild(th);
        });

        // Columna de acciones
        if (this.options.showActions && this.options.actions.length > 0) {
            const actionsCell = this.createElement('th', {
                className: 'actions-column',
                textContent: 'Acciones'
            });
            headerRow.appendChild(actionsCell);
        }

        this.thead.appendChild(headerRow);
    }

    /**
     * Establecer datos de la tabla
     */
    setData(data) {
        this.data = Array.isArray(data) ? data : [];
        this.filteredData = [...this.data];
        this.selectedRows.clear();
        this.currentPage = 1;
        this.renderBody();
        this.updatePagination();
        return this;
    }

    /**
     * Agregar fila de datos
     */
    addRow(rowData) {
        this.data.push(rowData);
        this.filteredData.push(rowData);
        this.renderBody();
        this.updatePagination();
        return this;
    }

    /**
     * Remover fila de datos
     */
    removeRow(index) {
        if (index >= 0 && index < this.data.length) {
            this.data.splice(index, 1);
            this.filteredData = [...this.data];
            this.renderBody();
            this.updatePagination();
        }
        return this;
    }

    /**
     * Actualizar fila de datos
     */
    updateRow(index, rowData) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = { ...this.data[index], ...rowData };
            this.filteredData = [...this.data];
            this.renderBody();
        }
        return this;
    }

    /**
     * Renderizar body de la tabla
     */
    renderBody() {
        this.tbody.innerHTML = '';

        const dataToShow = this.getPageData();

        if (dataToShow.length === 0) {
            this.renderEmptyState();
            return;
        }

        dataToShow.forEach((row, index) => {
            const tr = this.createRow(row, index);
            this.tbody.appendChild(tr);
        });

        this.updateSortIcons();
    }

    /**
     * Crear fila de datos
     */
    createRow(rowData, index) {
        const tr = this.createElement('tr', {
            attributes: { 'data-index': index }
        });

        // Columna de selección
        if (this.options.selectable) {
            const selectCell = this.createElement('td', {
                className: 'select-column'
            });

            const checkbox = this.createElement('input', {
                attributes: { 
                    type: this.options.multiSelect ? 'checkbox' : 'radio',
                    name: this.options.multiSelect ? '' : 'table-select',
                    value: index
                },
                className: 'row-select'
            });

            this.addEventListener(checkbox, 'change', (e) => {
                this.toggleRow(index, e.target.checked);
            });

            selectCell.appendChild(checkbox);
            tr.appendChild(selectCell);
        }

        // Columnas de datos
        this.columns.forEach(column => {
            const td = this.createElement('td', {
                className: `column-${column.key} ${column.className}`
            });

            if (column.align) {
                td.style.textAlign = column.align;
            }

            // Renderizar contenido de la celda
            const cellValue = this.getCellValue(rowData, column.key);
            const renderedValue = column.render ? column.render(cellValue, rowData, index) : cellValue;
            
            if (typeof renderedValue === 'string') {
                td.innerHTML = renderedValue;
            } else {
                td.appendChild(renderedValue);
            }

            tr.appendChild(td);
        });

        // Columna de acciones
        if (this.options.showActions && this.options.actions.length > 0) {
            const actionsCell = this.createElement('td', {
                className: 'actions-column'
            });

            const actionsContainer = this.createElement('div', {
                className: 'table-actions'
            });

            this.options.actions.forEach(action => {
                const button = this.createElement('button', {
                    className: `btn btn-sm ${action.className || 'btn-secondary'}`,
                    textContent: action.text,
                    attributes: {
                        title: action.title || action.text
                    }
                });

                this.addEventListener(button, 'click', (e) => {
                    e.stopPropagation();
                    if (action.handler) {
                        action.handler(rowData, index, e);
                    }
                });

                actionsContainer.appendChild(button);
            });

            actionsCell.appendChild(actionsContainer);
            tr.appendChild(actionsCell);
        }

        // Evento de click en fila
        this.addEventListener(tr, 'click', (e) => {
            if (this.onRowClick) {
                this.onRowClick(rowData, index, e);
            }
        });

        return tr;
    }

    /**
     * Obtener valor de celda
     */
    getCellValue(rowData, key) {
        return key.split('.').reduce((obj, prop) => obj && obj[prop], rowData) || '';
    }

    /**
     * Renderizar estado vacío
     */
    renderEmptyState() {
        const tr = this.createElement('tr');
        const td = this.createElement('td', {
            className: 'empty-state',
            textContent: this.options.emptyMessage,
            attributes: {
                colspan: this.getColumnCount()
            }
        });
        tr.appendChild(td);
        this.tbody.appendChild(tr);
    }

    /**
     * Obtener número total de columnas
     */
    getColumnCount() {
        let count = this.columns.length;
        if (this.options.selectable) count++;
        if (this.options.showActions && this.options.actions.length > 0) count++;
        return count;
    }

    /**
     * Ordenar por columna
     */
    sortBy(columnKey) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }

        this.filteredData.sort((a, b) => {
            const aVal = this.getCellValue(a, columnKey);
            const bVal = this.getCellValue(b, columnKey);
            
            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;
            
            return this.sortDirection === 'desc' ? -result : result;
        });

        this.currentPage = 1;
        this.renderBody();
        this.updatePagination();
    }

    /**
     * Actualizar iconos de ordenamiento
     */
    updateSortIcons() {
        this.thead.querySelectorAll('.sort-icon').forEach(icon => {
            icon.innerHTML = '';
            icon.classList.remove('asc', 'desc');
        });

        if (this.sortColumn) {
            const header = this.thead.querySelector(`.column-${this.sortColumn} .sort-icon`);
            if (header) {
                header.classList.add(this.sortDirection);
                header.innerHTML = this.sortDirection === 'asc' ? '↑' : '↓';
            }
        }
    }

    /**
     * Filtrar datos
     */
    filter(filterFn) {
        this.filteredData = this.data.filter(filterFn);
        this.currentPage = 1;
        this.renderBody();
        this.updatePagination();
        return this;
    }

    /**
     * Limpiar filtros
     */
    clearFilter() {
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.renderBody();
        this.updatePagination();
        return this;
    }

    /**
     * Obtener datos de la página actual
     */
    getPageData() {
        if (!this.options.pagination) {
            return this.filteredData;
        }

        const start = (this.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        return this.filteredData.slice(start, end);
    }

    /**
     * Crear paginación
     */
    createPagination() {
        this.paginationContainer = this.createElement('div', {
            className: 'table-pagination'
        });

        if (this.options.showPageInfo) {
            this.pageInfo = this.createElement('div', {
                className: 'page-info'
            });
            this.paginationContainer.appendChild(this.pageInfo);
        }

        this.paginationControls = this.createElement('div', {
            className: 'pagination-controls'
        });
        this.paginationContainer.appendChild(this.paginationControls);

        this.element.appendChild(this.paginationContainer);
    }

    /**
     * Actualizar paginación
     */
    updatePagination() {
        if (!this.options.pagination) return;

        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        
        // Actualizar información de página
        if (this.pageInfo) {
            const start = (this.currentPage - 1) * this.options.pageSize + 1;
            const end = Math.min(this.currentPage * this.options.pageSize, this.filteredData.length);
            this.pageInfo.textContent = `Mostrando ${start}-${end} de ${this.filteredData.length} registros`;
        }

        // Actualizar controles de paginación
        this.paginationControls.innerHTML = '';

        if (totalPages <= 1) return;

        // Botón anterior
        const prevBtn = this.createElement('button', {
            className: `btn btn-sm ${this.currentPage === 1 ? 'disabled' : ''}`,
            textContent: 'Anterior',
            attributes: { disabled: this.currentPage === 1 }
        });

        this.addEventListener(prevBtn, 'click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderBody();
                this.updatePagination();
            }
        });

        this.paginationControls.appendChild(prevBtn);

        // Números de página
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = this.createElement('button', {
                className: `btn btn-sm ${i === this.currentPage ? 'active' : ''}`,
                textContent: i.toString()
            });

            this.addEventListener(pageBtn, 'click', () => {
                this.currentPage = i;
                this.renderBody();
                this.updatePagination();
            });

            this.paginationControls.appendChild(pageBtn);
        }

        // Botón siguiente
        const nextBtn = this.createElement('button', {
            className: `btn btn-sm ${this.currentPage === totalPages ? 'disabled' : ''}`,
            textContent: 'Siguiente',
            attributes: { disabled: this.currentPage === totalPages }
        });

        this.addEventListener(nextBtn, 'click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderBody();
                this.updatePagination();
            }
        });

        this.paginationControls.appendChild(nextBtn);
    }

    /**
     * Seleccionar/deseleccionar fila
     */
    toggleRow(index, selected) {
        if (selected) {
            if (!this.options.multiSelect) {
                this.selectedRows.clear();
            }
            this.selectedRows.add(index);
        } else {
            this.selectedRows.delete(index);
        }

        if (this.onSelectionChange) {
            this.onSelectionChange(Array.from(this.selectedRows));
        }
    }

    /**
     * Seleccionar/deseleccionar todas las filas
     */
    toggleAllRows(selected) {
        if (selected) {
            this.getPageData().forEach((_, index) => {
                this.selectedRows.add(index);
            });
        } else {
            this.selectedRows.clear();
        }

        // Actualizar checkboxes
        this.tbody.querySelectorAll('.row-select').forEach(checkbox => {
            checkbox.checked = selected;
        });

        if (this.onSelectionChange) {
            this.onSelectionChange(Array.from(this.selectedRows));
        }
    }

    /**
     * Obtener filas seleccionadas
     */
    getSelectedRows() {
        return Array.from(this.selectedRows).map(index => this.data[index]);
    }

    /**
     * Obtener datos de la tabla
     */
    getData() {
        return [...this.data];
    }

    /**
     * Limpiar selección
     */
    clearSelection() {
        this.selectedRows.clear();
        this.tbody.querySelectorAll('.row-select').forEach(checkbox => {
            checkbox.checked = false;
        });
        return this;
    }

    /**
     * Mostrar estado de carga
     */
    showLoading() {
        this.tbody.innerHTML = '';
        const tr = this.createElement('tr');
        const td = this.createElement('td', {
            className: 'loading-state',
            textContent: this.options.loadingMessage,
            attributes: {
                colspan: this.getColumnCount()
            }
        });
        tr.appendChild(td);
        this.tbody.appendChild(tr);
        return this;
    }

    /**
     * Callbacks - se pueden sobrescribir
     */
    onRowClick(rowData, index, event) {
        // Implementación por defecto vacía
    }

    onSelectionChange(selectedIndexes) {
        // Implementación por defecto vacía
    }
}