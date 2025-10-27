// js/modules/tableResponsive.js - Utilidad para Tablas Responsive

/**
 * Agrega atributos data-label a las celdas de las tablas
 * para que funcionen correctamente en vista mobile
 */

class TableResponsiveManager {
    constructor() {
        this.tables = [];
    }

    /**
     * Inicializar todas las tablas
     */
    init() {
        this.setupTables();
        
        // Observar cambios en el DOM para nuevas tablas
        this.observeDOM();
        
        console.log('✅ TableResponsiveManager inicializado');
    }

    /**
     * Configurar todas las tablas existentes
     */
    setupTables() {
        const tables = document.querySelectorAll('.crud-table');
        tables.forEach(table => this.makeTableResponsive(table));
    }

    /**
     * Hacer una tabla responsive
     */
    makeTableResponsive(table) {
        const headers = Array.from(table.querySelectorAll('thead th'));
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    const headerText = headers[index].textContent.trim();
                    cell.setAttribute('data-label', headerText);
                }
            });
        });
    }

    /**
     * Observar cambios en el DOM para actualizar tablas dinámicamente
     */
    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Si el nodo agregado es una tabla
                            if (node.classList && node.classList.contains('crud-table')) {
                                this.makeTableResponsive(node);
                            }
                            
                            // Si contiene tablas
                            const tables = node.querySelectorAll && node.querySelectorAll('.crud-table');
                            if (tables && tables.length > 0) {
                                tables.forEach(table => this.makeTableResponsive(table));
                            }

                            // Si se agregaron filas a una tabla existente
                            if (node.tagName === 'TR' && node.closest('.crud-table')) {
                                const table = node.closest('.crud-table');
                                this.makeTableResponsive(table);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Actualizar una tabla específica
     */
    updateTable(tableId) {
        const table = document.getElementById(tableId);
        if (table) {
            this.makeTableResponsive(table);
        }
    }

    /**
     * Actualizar todas las tablas
     */
    updateAll() {
        this.setupTables();
    }
}

// Exportar instancia singleton
export const tableResponsive = new TableResponsiveManager();

// También exportar la clase
export default TableResponsiveManager;
