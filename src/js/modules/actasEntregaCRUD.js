// src/js/modules/actasEntregaCRUD.js
/**
 * Módulo CRUD para gestión de Actas de Entrega
 * Conectado con el backend mediante IPC y sistema reactivo con EventBus
 */

import { eventBus, APP_EVENTS } from './eventBus.js';

class ActasEntregaCRUD {
    constructor() {
        this.actas = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.currentActaId = null;
        this.isEditMode = false;

        // Elementos del DOM
        this.elements = null;

        console.log('✅ ActasEntregaCRUD: Módulo inicializado');
        
        // 🔄 Configurar listener para recarga automática cuando se active la vista
        this.setupViewActivationListener();
    }

    /**
     * Configurar listener para cuando se active la vista de actas
     */
    setupViewActivationListener() {
        // Cargar actas cuando se muestre la vista
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const vistaActas = document.getElementById('vista-actas-crud');
                    if (vistaActas && vistaActas.classList.contains('active')) {
                        console.log('🎯 Vista de actas activada - Recargando datos...');
                        // 🔄 SIEMPRE recargar cuando se active la vista para mostrar cambios
                        this.loadActas();
                    }
                }
            });
        });

        // Observar cambios en la vista-actas-crud
        const vistaActas = document.getElementById('vista-actas-crud');
        if (vistaActas) {
            observer.observe(vistaActas, { attributes: true });
            
            // Si ya está activa al cargar, cargar datos inmediatamente
            if (vistaActas.classList.contains('active')) {
                console.log('🎯 Vista de actas ya activa - Cargando datos...');
                this.loadActas();
            }
        }
    }

    /**
     * Inicializar el módulo
     */
    async init() {
        console.log('🚀 ActasEntregaCRUD: Inicializando módulo...');
        
        this.initializeElements();
        this.attachEventListeners();
        this.subscribeToEvents();
        
        // Ya no es necesario cargar aquí, se carga automáticamente cuando se activa la vista
        console.log('✅ ActasEntregaCRUD: Módulo listo');
    }

    /**
     * Inicializar referencias a elementos del DOM
     */
    initializeElements() {
        this.elements = {
            // Contenedor principal
            container: document.getElementById('vista-actas-crud'),
            
            // Botones principales
            nuevaActaBtn: document.getElementById('nueva-acta-btn'),
            searchBtn: document.getElementById('search-actas-btn'),
            searchInput: document.getElementById('search-actas-input'),
            clearFiltersBtn: document.getElementById('limpiar-filtros-actas-btn'),
            
            // Tabla
            tbody: document.getElementById('actas-tbody'),
            
            // Stats
            statsActas: document.getElementById('stats-actas'),
            
            // Paginación
            prevPageBtn: document.getElementById('prev-page-actas'),
            nextPageBtn: document.getElementById('next-page-actas'),
            pageInfo: document.getElementById('page-info-actas'),
            paginationInfo: document.getElementById('pagination-info-actas'),
            
            // Modal
            modal: document.getElementById('modal-acta'),
            modalTitle: document.getElementById('modal-acta-title'),
            modalForm: document.getElementById('modal-acta-form'),
            modalGuardar: document.getElementById('modal-acta-guardar'),
            modalCancelar: document.getElementById('modal-acta-cancelar'),
            modalEliminar: document.getElementById('modal-acta-eliminar'),
            modalClose: document.getElementById('modal-acta-close')
        };

        console.log('✅ Elementos DOM inicializados');
    }

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Botón nueva acta
        this.elements.nuevaActaBtn?.addEventListener('click', () => this.openNewActaModal());
        
        // Búsqueda
        this.elements.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.elements.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        // Limpiar filtros
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
        
        // Paginación
        this.elements.prevPageBtn?.addEventListener('click', () => this.previousPage());
        this.elements.nextPageBtn?.addEventListener('click', () => this.nextPage());
        
        // Modal
        this.elements.modalClose?.addEventListener('click', () => this.closeModal());
        this.elements.modalCancelar?.addEventListener('click', () => this.closeModal());
        this.elements.modalGuardar?.addEventListener('click', () => this.saveActa());
        this.elements.modalEliminar?.addEventListener('click', () => this.confirmDeleteActa(this.currentActaId));
        
        // Cerrar modal al hacer clic fuera
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });

        console.log('✅ Event listeners adjuntados');
    }

    /**
     * Suscribirse a eventos del EventBus
     */
    subscribeToEvents() {
        // Escuchar cuando se crea un acta (desde cualquier ventana)
        eventBus.on(APP_EVENTS.ACTA_CREATED, (data) => {
            console.log('📢 Evento ACTA_CREATED recibido:', data);
            this.addActaToTable(data.acta);
        });

        // Escuchar cuando se actualiza un acta
        eventBus.on(APP_EVENTS.ACTA_UPDATED, (data) => {
            console.log('📢 Evento ACTA_UPDATED recibido:', data);
            this.refreshActaInTable(data.acta);
        });

        // Escuchar cuando se elimina un acta
        eventBus.on(APP_EVENTS.ACTA_DELETED, (data) => {
            console.log('📢 Evento ACTA_DELETED recibido:', data);
            this.removeActaFromTable(data.actaId);
        });

        console.log('✅ Suscrito a eventos del EventBus');
    }

    /**
     * Cargar todas las actas desde el backend
     */
    async loadActas() {
        try {
            console.log('📥 Cargando actas desde el backend...');
            
            const result = await window.api.invoke('acta-entrega:obtener-todas');
            
            if (result.success) {
                this.actas = result.actas || [];
                console.log(`✅ ${this.actas.length} actas cargadas`);
                this.renderTable();
                this.updateStats();
            } else {
                console.error('❌ Error al cargar actas:', result.message);
                this.showNotification('Error al cargar actas', 'error');
            }
        } catch (error) {
            console.error('❌ Error al cargar actas:', error);
            this.showNotification('Error al cargar actas', 'error');
        }
    }

    /**
     * Actualizar estadísticas
     */
    updateStats() {
        if (this.elements.statsActas) {
            this.elements.statsActas.textContent = `Total: ${this.actas.length} actas`;
        }
    }

    /**
     * Renderizar tabla de actas
     */
    renderTable() {
        if (!this.elements.tbody) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedActas = this.actas.slice(start, end);

        // Limpiar tabla
        this.elements.tbody.innerHTML = '';

        if (paginatedActas.length === 0) {
            this.elements.tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        No hay actas de entrega registradas
                    </td>
                </tr>
            `;
            this.updatePagination();
            return;
        }

        // Renderizar cada acta
        paginatedActas.forEach(acta => {
            const row = this.createActaRow(acta);
            this.elements.tbody.appendChild(row);
        });

        this.updatePagination();
    }

    /**
     * Crear fila de tabla para un acta
     */
    createActaRow(acta) {
        const row = document.createElement('tr');
        
        const fecha = acta.fechaEntrega ? new Date(acta.fechaEntrega).toLocaleDateString('es-ES') : 'N/A';
        const tarjetas = acta.cantidadTarjetas || acta.n_tarjetas_entregadas || 0;
        const observaciones = acta.observaciones || 'Sin observaciones';
        const tienePdf = acta.pdfPathEntrega ? '📄' : '-';

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
                        👁️
                    </button>
                    <button class="btn-icon" onclick="window.actasEntregaCRUD.editActa(${acta._id})" title="Editar">
                        ✏️
                    </button>
                    ${acta.pdfPathEntrega ? `
                        <button class="btn-icon" onclick="window.actasEntregaCRUD.openPdf('${acta.pdfPathEntrega.replace(/\\/g, '\\\\')}')" title="Abrir PDF">
                            📄
                        </button>
                    ` : ''}
                    <button class="btn-icon btn-danger" onclick="window.actasEntregaCRUD.deleteActa(${acta._id})" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Actualizar controles de paginación
     */
    updatePagination() {
        const totalPages = Math.ceil(this.actas.length / this.itemsPerPage);
        
        if (this.elements.pageInfo) {
            this.elements.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages || 1}`;
        }
        
        if (this.elements.paginationInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, this.actas.length);
            this.elements.paginationInfo.textContent = 
                `Mostrando ${start} - ${end} de ${this.actas.length} actas`;
        }
        
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = this.currentPage === 1;
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    /**
     * Página anterior
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }

    /**
     * Página siguiente
     */
    nextPage() {
        const totalPages = Math.ceil(this.actas.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    /**
     * Buscar actas
     */
    async handleSearch() {
        const term = this.elements.searchInput?.value.trim();
        
        if (!term) {
            await this.loadActas();
            return;
        }

        try {
            console.log('🔍 Buscando actas:', term);
            
            const result = await window.api.invoke('acta-entrega:buscar', term);
            
            if (result.success) {
                this.actas = result.actas || [];
                this.currentPage = 1;
                this.renderTable();
                this.updateStats();
                this.showNotification(`${this.actas.length} resultados encontrados`, 'success');
            } else {
                this.showNotification('Error en la búsqueda', 'error');
            }
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.showNotification('Error en la búsqueda', 'error');
        }
    }

    /**
     * Limpiar filtros
     */
    async clearFilters() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        this.searchTerm = '';
        this.currentPage = 1;
        await this.loadActas();
        this.updateStats();
    }

    /**
     * Abrir modal para nueva acta
     */
    async openNewActaModal() {
        console.log('➕ Abriendo modal para nueva acta');
        
        this.isEditMode = false;
        this.currentActaId = null;
        
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = 'Nueva Acta de Entrega';
        }
        
        if (this.elements.modalEliminar) {
            this.elements.modalEliminar.style.display = 'none';
        }
        
        await this.loadModalForm();
        this.openModal();
    }

    /**
     * Ver acta (solo lectura)
     */
    async viewActa(actaId) {
        console.log('👁️ Viendo acta:', actaId);
        
        try {
            const result = await window.api.invoke('acta-entrega:obtener-por-id', actaId);
            
            if (result.success) {
                const acta = result.acta;
                
                // Mostrar información del acta
                let info = `
                    <div class="acta-details">
                        <h3>Acta de Entrega #${acta._id}</h3>
                        <p><strong>Fecha de Entrega:</strong> ${new Date(acta.fechaEntrega).toLocaleDateString('es-ES')}</p>
                        <p><strong>N° de Tarjetas:</strong> ${acta.n_tarjetas_entregadas}</p>
                        <p><strong>Observaciones:</strong> ${acta.observaciones || 'Sin observaciones'}</p>
                        
                        <h4>Tarjetas Asociadas (${acta.tarjetas?.length || 0}):</h4>
                        <ul>
                `;
                
                if (acta.tarjetas && acta.tarjetas.length > 0) {
                    acta.tarjetas.forEach(t => {
                        info += `<li>${t.placa} - Tarjeta ${t.numeroTarjeta} (Exp: ${t.numeroExpediente}-${t.anioExpediente})</li>`;
                    });
                } else {
                    info += '<li>No hay tarjetas asociadas</li>';
                }
                
                info += `
                        </ul>
                        ${acta.pdfPathEntrega ? '<p><strong>📄 Tiene PDF adjunto</strong></p>' : ''}
                    </div>
                `;
                
                this.elements.modalForm.innerHTML = info;
                this.elements.modalTitle.textContent = 'Detalles del Acta';
                this.elements.modalGuardar.style.display = 'none';
                this.elements.modalEliminar.style.display = 'none';
                this.openModal();
            }
        } catch (error) {
            console.error('❌ Error al ver acta:', error);
            this.showNotification('Error al cargar acta', 'error');
        }
    }

    /**
     * Editar acta
     */
    async editActa(actaId) {
        console.log('✏️ Editando acta:', actaId);
        
        this.isEditMode = true;
        this.currentActaId = actaId;
        
        try {
            const result = await window.api.invoke('acta-entrega:obtener-por-id', actaId);
            
            if (result.success) {
                if (this.elements.modalTitle) {
                    this.elements.modalTitle.textContent = 'Editar Acta de Entrega';
                }
                
                if (this.elements.modalEliminar) {
                    this.elements.modalEliminar.style.display = 'inline-block';
                }
                
                if (this.elements.modalGuardar) {
                    this.elements.modalGuardar.style.display = 'inline-block';
                }
                
                await this.loadModalForm(result.acta);
                this.openModal();
            }
        } catch (error) {
            console.error('❌ Error al editar acta:', error);
            this.showNotification('Error al cargar acta', 'error');
        }
    }

    /**
     * Cargar formulario en el modal
     */
    async loadModalForm(acta = null) {
        // Obtener tarjetas disponibles
        let tarjetasDisponibles = [];
        try {
            const result = await window.api.invoke('acta-entrega:tarjetas-disponibles');
            if (result.success) {
                tarjetasDisponibles = result.tarjetas || [];
            }
        } catch (error) {
            console.error('Error al cargar tarjetas:', error);
        }

        // Combinar tarjetas disponibles con las ya asignadas a esta acta
        const tarjetasActuales = acta?.tarjetas || [];
        const allTarjetas = [...tarjetasDisponibles];
        
        // Agregar tarjetas actuales si no están en disponibles
        tarjetasActuales.forEach(ta => {
            if (!allTarjetas.find(td => td._id === ta._id)) {
                allTarjetas.push(ta);
            }
        });

        const formHtml = `
            <div class="form-group">
                <label for="modal-fecha-entrega">Fecha de Entrega:</label>
                <input type="date" id="modal-fecha-entrega" value="${acta?.fechaEntrega?.split('T')[0] || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="modal-observaciones">Observaciones:</label>
                <textarea id="modal-observaciones" rows="3" placeholder="Observaciones adicionales...">${acta?.observaciones || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Tarjetas Asociadas:</label>
                <div class="tarjetas-checklist" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                    ${allTarjetas.length > 0 ? allTarjetas.map(t => {
                        const isChecked = tarjetasActuales.find(ta => ta._id === t._id) ? 'checked' : '';
                        return `
                            <div class="tarjeta-checkbox-item">
                                <input type="checkbox" id="tarjeta-${t._id}" value="${t._id}" ${isChecked}>
                                <label for="tarjeta-${t._id}">
                                    ${t.placa} - Tarjeta ${t.numeroTarjeta}
                                    ${t.numeroExpediente ? `(Exp: ${t.numeroExpediente}-${t.anioExpediente})` : ''}
                                    ${t.nombreEmpresa ? `- ${t.nombreEmpresa}` : ''}
                                </label>
                            </div>
                        `;
                    }).join('') : '<p>No hay tarjetas disponibles</p>'}
                </div>
            </div>
            
            <div class="form-group">
                <label for="modal-pdf-path">PDF del Acta:</label>
                <input type="text" id="modal-pdf-path" readonly placeholder="Ningún archivo seleccionado" value="${acta?.pdfPathEntrega || ''}">
                <button type="button" id="modal-seleccionar-pdf" class="btn-outline" style="margin-top: 5px;">
                    Seleccionar PDF
                </button>
            </div>
        `;

        this.elements.modalForm.innerHTML = formHtml;

        // Adjuntar evento al botón de seleccionar PDF
        document.getElementById('modal-seleccionar-pdf')?.addEventListener('click', async () => {
            const result = await window.api.invoke('acta-entrega:seleccionar-pdf');
            if (result) {
                document.getElementById('modal-pdf-path').value = result;
            }
        });
    }

    /**
     * Guardar acta (crear o actualizar)
     */
    async saveActa() {
        try {
            const fechaEntrega = document.getElementById('modal-fecha-entrega')?.value;
            const observaciones = document.getElementById('modal-observaciones')?.value;
            const pdfPath = document.getElementById('modal-pdf-path')?.value;

            if (!fechaEntrega) {
                this.showNotification('La fecha de entrega es obligatoria', 'error');
                return;
            }

            // Obtener tarjetas seleccionadas
            const tarjetasCheckboxes = document.querySelectorAll('.tarjetas-checklist input[type="checkbox"]:checked');
            const tarjetasIds = Array.from(tarjetasCheckboxes).map(cb => parseInt(cb.value));

            const actaData = {
                fechaEntrega,
                observaciones,
                n_tarjetas_entregadas: tarjetasIds.length,
                pdfSourcePath: pdfPath || null
            };

            console.log('💾 Guardando acta:', actaData, 'Tarjetas:', tarjetasIds);

            let result;
            if (this.isEditMode && this.currentActaId) {
                result = await window.api.invoke('acta-entrega:actualizar', this.currentActaId, actaData, tarjetasIds);
            } else {
                result = await window.api.invoke('acta-entrega:crear', actaData, tarjetasIds);
            }

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.closeModal();
                // No necesitamos recargar, el EventBus actualizará la tabla
            } else {
                this.showNotification(result.message || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error('❌ Error al guardar acta:', error);
            this.showNotification('Error al guardar acta', 'error');
        }
    }

    /**
     * Eliminar acta
     */
    async deleteActa(actaId) {
        console.log('🗑️ Solicitando eliminación de acta:', actaId);
        
        try {
            // Obtener información previa
            const infoResult = await window.api.invoke('acta-entrega:info-eliminar', actaId);
            
            if (infoResult.success) {
                const info = infoResult.info;
                const confirm = window.confirm(
                    `¿Está seguro de eliminar esta acta de entrega?\n\n` +
                    `ID: ${info.acta.id}\n` +
                    `Fecha: ${new Date(info.acta.fechaEntrega).toLocaleDateString('es-ES')}\n` +
                    `Tarjetas asociadas: ${info.tarjetas.length}\n\n` +
                    `Las tarjetas serán desasociadas (no eliminadas).`
                );
                
                if (confirm) {
                    await this.confirmDeleteActa(actaId);
                }
            }
        } catch (error) {
            console.error('❌ Error al obtener info de eliminación:', error);
            this.showNotification('Error al eliminar acta', 'error');
        }
    }

    /**
     * Confirmar eliminación de acta
     */
    async confirmDeleteActa(actaId) {
        try {
            const result = await window.api.invoke('acta-entrega:eliminar', actaId);
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.closeModal();
                // El EventBus actualizará la tabla automáticamente
            } else {
                this.showNotification(result.message || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('❌ Error al eliminar acta:', error);
            this.showNotification('Error al eliminar acta', 'error');
        }
    }

    /**
     * Abrir PDF
     */
    async openPdf(pdfPath) {
        try {
            await window.api.invoke('acta-entrega:abrir-pdf', pdfPath);
        } catch (error) {
            console.error('❌ Error al abrir PDF:', error);
            this.showNotification('Error al abrir PDF', 'error');
        }
    }

    /**
     * Agregar acta a la tabla (método reactivo)
     */
    addActaToTable(newActa) {
        console.log('➕ Agregando acta a la tabla:', newActa);
        
        // Agregar al inicio del array
        this.actas.unshift(newActa);
        
        // Volver a la primera página
        this.currentPage = 1;
        
        // Re-renderizar
        this.renderTable();
        this.updateStats();
        
        this.showNotification('Acta creada exitosamente', 'success');
    }

    /**
     * Actualizar acta en la tabla (método reactivo)
     */
    refreshActaInTable(updatedActa) {
        console.log('🔄 Actualizando acta en la tabla:', updatedActa);
        
        const index = this.actas.findIndex(a => a._id === updatedActa._id);
        if (index !== -1) {
            this.actas[index] = updatedActa;
            this.renderTable();
            this.updateStats();
            this.showNotification('Acta actualizada exitosamente', 'success');
        }
    }

    /**
     * Eliminar acta de la tabla (método reactivo)
     */
    removeActaFromTable(actaId) {
        console.log('➖ Eliminando acta de la tabla:', actaId);
        
        this.actas = this.actas.filter(a => a._id !== actaId);
        
        // Ajustar página si es necesario
        const totalPages = Math.ceil(this.actas.length / this.itemsPerPage);
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
        }
        
        this.renderTable();
        this.updateStats();
        this.showNotification('Acta eliminada exitosamente', 'success');
    }

    /**
     * Abrir modal
     */
    openModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
        }
    }

    /**
     * Cerrar modal
     */
    closeModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
        }
        
        this.isEditMode = false;
        this.currentActaId = null;
        
        if (this.elements.modalForm) {
            this.elements.modalForm.innerHTML = '';
        }
        
        if (this.elements.modalGuardar) {
            this.elements.modalGuardar.style.display = 'inline-block';
        }
    }

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Agregar al body
        document.body.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Instancia global
export const actasEntregaCRUD = new ActasEntregaCRUD();
