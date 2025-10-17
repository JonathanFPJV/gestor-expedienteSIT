// src/js/modules/tarjetasCRUD.js
/**
 * Módulo para la gestión CRUD de Tarjetas
 * Maneja la interfaz de usuario y las operaciones sobre tarjetas
 */

import { dataService } from './dataService.js';
import { eventBus, APP_EVENTS } from './eventBus.js';
import { loadingManager } from './loadingManager.js';

class TarjetasCRUD {
    constructor() {
        this.tarjetas = [];
        this.filteredTarjetas = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.searchTerm = '';
        this.currentTarjetaId = null;
        this.selectedPdfPath = null; // Para almacenar la ruta del PDF seleccionado
        
        // Referencias al DOM
        this.elements = {};
    }

    /**
     * Inicializar el módulo de gestión de tarjetas
     */
    init() {
        console.log('🎫 Inicializando módulo de gestión de tarjetas...');
        
        // Cachear referencias al DOM
        this.cacheElements();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Suscribirse a eventos del eventBus
        this.subscribeToEvents();
        
        console.log('✅ Módulo de tarjetas inicializado');
    }

    /**
     * Cachear referencias al DOM
     */
    cacheElements() {
        // Botones principales
        this.elements.nuevaTarjetaBtn = document.getElementById('nueva-tarjeta-btn');
        this.elements.searchCrudInput = document.getElementById('search-crud-tarjetas-input');
        this.elements.searchCrudBtn = document.getElementById('search-crud-tarjetas-btn');
        this.elements.limpiarFiltrosBtn = document.getElementById('limpiar-filtros-tarjetas-btn');
        
        // Tabla
        this.elements.tarjetasTable = document.getElementById('tarjetas-table');
        this.elements.tarjetasTbody = document.getElementById('tarjetas-tbody');
        
        // Paginación
        this.elements.paginationInfo = document.getElementById('pagination-info-tarjetas');
        this.elements.pageInfo = document.getElementById('page-info-tarjetas');
        this.elements.prevPageBtn = document.getElementById('prev-page-tarjetas');
        this.elements.nextPageBtn = document.getElementById('next-page-tarjetas');
        
        // Modal
        this.elements.modal = document.getElementById('modal-tarjeta');
        this.elements.modalTitle = document.getElementById('modal-tarjeta-title');
        this.elements.modalClose = document.getElementById('modal-tarjeta-close');
        this.elements.modalForm = document.getElementById('modal-tarjeta-form');
        this.elements.modalCancelar = document.getElementById('modal-tarjeta-cancelar');
        this.elements.modalGuardar = document.getElementById('modal-tarjeta-guardar');
        this.elements.modalEliminar = document.getElementById('modal-tarjeta-eliminar');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botón nueva tarjeta
        if (this.elements.nuevaTarjetaBtn) {
            this.elements.nuevaTarjetaBtn.addEventListener('click', () => this.abrirModalNuevaTarjeta());
        }

        // Búsqueda
        if (this.elements.searchCrudBtn) {
            this.elements.searchCrudBtn.addEventListener('click', () => this.buscarTarjetas());
        }

        if (this.elements.searchCrudInput) {
            this.elements.searchCrudInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.buscarTarjetas();
                }
            });
        }

        // Limpiar filtros
        if (this.elements.limpiarFiltrosBtn) {
            this.elements.limpiarFiltrosBtn.addEventListener('click', () => this.limpiarFiltros());
        }

        // Paginación
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.addEventListener('click', () => this.cambiarPagina(this.currentPage - 1));
        }

        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.addEventListener('click', () => this.cambiarPagina(this.currentPage + 1));
        }

        // Modal
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => this.cerrarModal());
        }

        if (this.elements.modalCancelar) {
            this.elements.modalCancelar.addEventListener('click', () => this.cerrarModal());
        }

        if (this.elements.modalGuardar) {
            this.elements.modalGuardar.addEventListener('click', () => this.guardarTarjeta());
        }

        if (this.elements.modalEliminar) {
            this.elements.modalEliminar.addEventListener('click', () => this.eliminarTarjeta());
        }

        // Cerrar modal al hacer click fuera
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.cerrarModal();
                }
            });
        }
    }

    /**
     * Suscribirse a eventos del sistema
     */
    subscribeToEvents() {
        // Evento cuando se cambia a la vista de tarjetas
        eventBus.on(APP_EVENTS.VIEW_CHANGED, (data) => {
            if (data.view === 'tarjetas-crud') {
                this.cargarTarjetas();
            }
        });
    }

    /**
     * Cargar todas las tarjetas
     */
    async cargarTarjetas() {
        try {
            loadingManager.show('cargar-tarjetas', 'Cargando tarjetas...');
            
            const resultado = await window.api.invoke('tarjeta:obtener-todas');
            
            if (resultado.success) {
                this.tarjetas = resultado.tarjetas;
                this.filteredTarjetas = [...this.tarjetas];
                this.currentPage = 1;
                this.renderTarjetas();
                
                console.log(`✅ ${resultado.count} tarjetas cargadas`);
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('❌ Error al cargar tarjetas:', error);
            this.mostrarError('Error al cargar tarjetas');
        } finally {
            loadingManager.hide('cargar-tarjetas');
        }
    }

    /**
     * Buscar tarjetas
     */
    async buscarTarjetas() {
        const searchTerm = this.elements.searchCrudInput?.value?.trim() || '';
        
        if (!searchTerm) {
            this.filteredTarjetas = [...this.tarjetas];
            this.currentPage = 1;
            this.renderTarjetas();
            return;
        }

        try {
            loadingManager.show('buscar-tarjetas', 'Buscando tarjetas...');
            
            const resultado = await window.api.invoke('tarjeta:buscar', searchTerm);
            
            if (resultado.success) {
                this.filteredTarjetas = resultado.tarjetas;
                this.currentPage = 1;
                this.renderTarjetas();
                
                console.log(`🔍 Búsqueda "${searchTerm}": ${resultado.count} resultados`);
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.mostrarError('Error al buscar tarjetas');
        } finally {
            loadingManager.hide('buscar-tarjetas');
        }
    }

    /**
     * Limpiar filtros y búsqueda
     */
    limpiarFiltros() {
        if (this.elements.searchCrudInput) {
            this.elements.searchCrudInput.value = '';
        }
        
        this.filteredTarjetas = [...this.tarjetas];
        this.currentPage = 1;
        this.renderTarjetas();
    }

    /**
     * Renderizar tabla de tarjetas
     */
    renderTarjetas() {
        if (!this.elements.tarjetasTbody) return;

        // Calcular paginación
        this.totalPages = Math.ceil(this.filteredTarjetas.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const tarjetasPagina = this.filteredTarjetas.slice(startIndex, endIndex);

        // Limpiar tabla
        this.elements.tarjetasTbody.innerHTML = '';

        // Renderizar tarjetas
        if (tarjetasPagina.length === 0) {
            this.elements.tarjetasTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        No se encontraron tarjetas
                    </td>
                </tr>
            `;
        } else {
            tarjetasPagina.forEach(tarjeta => {
                const row = this.crearFilaTarjeta(tarjeta);
                this.elements.tarjetasTbody.appendChild(row);
            });
        }

        // Actualizar información de paginación
        this.actualizarPaginacion();
    }

    /**
     * Crear fila de tabla para una tarjeta
     */
    crearFilaTarjeta(tarjeta) {
        const tr = document.createElement('tr');
        
        // Determinar el estado del acta de entrega
        let actaEntregaHtml = '❌ No';
        if (tarjeta.actaEntregaId) {
            actaEntregaHtml = `<span style="color: #28a745; font-weight: bold;" title="Acta ID: ${tarjeta.actaEntregaId}">✅ Sí (#${tarjeta.actaEntregaId})</span>`;
        }
        
        // Determinar el estado del expediente
        let expedienteHtml = '❌ No';
        if (tarjeta.resolucionId || tarjeta.expedienteId) {
            expedienteHtml = '✅ Sí';
        }
        
        tr.innerHTML = `
            <td>${tarjeta.placa || '-'}</td>
            <td>${tarjeta.numeroTarjeta || '-'}</td>
            <td>${expedienteHtml}</td>
            <td>${actaEntregaHtml}</td>
            <td>${this.formatearFecha(tarjeta.fechaCreacion)}</td>
            <td>
                ${tarjeta.pdfPath ? '<button class="btn-action" data-id="' + tarjeta._id + '" data-pdf="' + tarjeta.pdfPath + '" title="Ver PDF Tarjeta">📄</button>' : ''}
                <button class="btn-action btn-edit" data-id="${tarjeta._id}" title="Editar">
                    ✏️
                </button>
                <button class="btn-action btn-delete" data-id="${tarjeta._id}" title="Eliminar">
                    🗑️
                </button>
            </td>
        `;

        // Event listeners para botones de acción
        const btnPdf = tr.querySelector('[data-pdf]');
        const btnEdit = tr.querySelector('.btn-edit');
        const btnDelete = tr.querySelector('.btn-delete');

        if (btnPdf) {
            btnPdf.addEventListener('click', () => this.abrirPdfTarjeta(tarjeta.pdfPath));
        }

        if (btnEdit) {
            btnEdit.addEventListener('click', () => this.editarTarjeta(tarjeta._id));
        }

        if (btnDelete) {
            btnDelete.addEventListener('click', () => this.confirmarEliminarTarjeta(tarjeta._id));
        }

        return tr;
    }

    /**
     * Actualizar información de paginación
     */
    actualizarPaginacion() {
        // Info de registros
        if (this.elements.paginationInfo) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredTarjetas.length);
            this.elements.paginationInfo.textContent = 
                `Mostrando ${startIndex}-${endIndex} de ${this.filteredTarjetas.length} tarjetas`;
        }

        // Info de página
        if (this.elements.pageInfo) {
            this.elements.pageInfo.textContent = `Página ${this.currentPage} de ${this.totalPages || 1}`;
        }

        // Botones de navegación
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = this.currentPage <= 1;
        }

        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }
    }

    /**
     * Cambiar de página
     */
    cambiarPagina(nuevaPagina) {
        if (nuevaPagina < 1 || nuevaPagina > this.totalPages) return;
        
        this.currentPage = nuevaPagina;
        this.renderTarjetas();
    }

    /**
     * Abrir modal para nueva tarjeta
     */
    abrirModalNuevaTarjeta() {
        this.currentTarjetaId = null;
        this.selectedPdfPath = null; // Resetear PDF seleccionado
        this.elements.modalTitle.textContent = 'Nueva Tarjeta';
        this.elements.modalEliminar.style.display = 'none';
        
        // Limpiar formulario
        this.elements.modalForm.innerHTML = `
            <div class="form-group">
                <label for="modal-placa">Placa del Vehículo: <span style="color: red;">*</span></label>
                <input type="text" id="modal-placa" placeholder="Ej: ABC-123" style="text-transform: uppercase;" required>
            </div>
            <div class="form-group">
                <label for="modal-numero-tarjeta">Número de Tarjeta:</label>
                <input type="text" id="modal-numero-tarjeta" placeholder="Ej: T-12345">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="modal-asociar-expediente">
                    Asociar a un expediente existente
                </label>
            </div>
            <div class="form-group" id="expediente-select-container" style="display: none;">
                <label for="modal-expediente-id">Seleccionar Expediente (Resolución): <span style="color: red;">*</span></label>
                <select id="modal-expediente-id">
                    <option value="">Seleccionar...</option>
                </select>
            </div>
            <div class="form-group" id="acta-entrega-select-container" style="display: none;">
                <label for="modal-acta-entrega-id">Acta de Entrega (Opcional):</label>
                <select id="modal-acta-entrega-id">
                    <option value="">Ninguna</option>
                </select>
                <small style="color: #666; margin-top: 0.25rem; display: block;">
                    Seleccione un acta de entrega si la tarjeta ya fue entregada
                </small>
            </div>
            <div class="form-group" id="pdf-select-container" style="display: none;">
                <label for="modal-pdf-path">Documento PDF de la Tarjeta:</label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="text" id="modal-pdf-path" placeholder="Ningún archivo seleccionado" readonly>
                    <button type="button" id="seleccionar-pdf-tarjeta-btn" class="btn-secondary">Seleccionar PDF</button>
                </div>
                <small style="color: #666; margin-top: 0.25rem; display: block;">
                    El PDF se guardará en la carpeta del expediente seleccionado
                </small>
            </div>
        `;

        // Event listener para checkbox de asociar expediente
        const checkboxAsociar = document.getElementById('modal-asociar-expediente');
        const expedienteContainer = document.getElementById('expediente-select-container');
        const actaEntregaContainer = document.getElementById('acta-entrega-select-container');
        const pdfContainer = document.getElementById('pdf-select-container');
        
        if (checkboxAsociar) {
            checkboxAsociar.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    expedienteContainer.style.display = 'block';
                    actaEntregaContainer.style.display = 'block';
                    pdfContainer.style.display = 'block';
                    await this.cargarExpedientesEnSelect();
                    await this.cargarActasEntregaEnSelect();
                } else {
                    expedienteContainer.style.display = 'none';
                    actaEntregaContainer.style.display = 'none';
                    pdfContainer.style.display = 'none';
                    this.selectedPdfPath = null;
                    const pdfPathInput = document.getElementById('modal-pdf-path');
                    if (pdfPathInput) pdfPathInput.value = '';
                }
            });
        }

        // Event listener para botón de seleccionar PDF
        const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-tarjeta-btn');
        if (seleccionarPdfBtn) {
            seleccionarPdfBtn.addEventListener('click', async () => {
                await this.seleccionarPdfTarjeta();
            });
        }

        this.abrirModal();
    }

    /**
     * Editar tarjeta existente
     */
    async editarTarjeta(tarjetaId) {
        try {
            loadingManager.show('editar-tarjeta', 'Cargando tarjeta...');
            
            const resultado = await window.api.invoke('tarjeta:obtener-por-id', tarjetaId);
            
            if (resultado.success) {
                this.currentTarjetaId = tarjetaId;
                this.selectedPdfPath = null; // Resetear PDF seleccionado
                const tarjeta = resultado.tarjeta;
                
                this.elements.modalTitle.textContent = 'Editar Tarjeta';
                this.elements.modalEliminar.style.display = 'inline-block';
                
                // Llenar formulario
                this.elements.modalForm.innerHTML = `
                    <div class="form-group">
                        <label for="modal-placa">Placa del Vehículo: <span style="color: red;">*</span></label>
                        <input type="text" id="modal-placa" value="${tarjeta.placa || ''}" placeholder="Ej: ABC-123" style="text-transform: uppercase;" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-numero-tarjeta">Número de Tarjeta:</label>
                        <input type="text" id="modal-numero-tarjeta" value="${tarjeta.numeroTarjeta || ''}" placeholder="Ej: T-12345">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="modal-asociar-expediente" ${tarjeta.resolucionId ? 'checked' : ''}>
                            Asociar a un expediente existente
                        </label>
                    </div>
                    <div class="form-group" id="expediente-select-container" style="display: ${tarjeta.resolucionId ? 'block' : 'none'};">
                        <label for="modal-expediente-id">Seleccionar Expediente (Resolución): <span style="color: red;">*</span></label>
                        <select id="modal-expediente-id">
                            <option value="">Seleccionar...</option>
                        </select>
                    </div>
                    <div class="form-group" id="acta-entrega-select-container" style="display: ${tarjeta.resolucionId ? 'block' : 'none'};">
                        <label for="modal-acta-entrega-id">Acta de Entrega (Opcional):</label>
                        <select id="modal-acta-entrega-id">
                            <option value="">Ninguna</option>
                        </select>
                        <small style="color: #666; margin-top: 0.25rem; display: block;">
                            Seleccione un acta de entrega si la tarjeta ya fue entregada
                        </small>
                    </div>
                    <div class="form-group" id="pdf-select-container" style="display: ${tarjeta.resolucionId ? 'block' : 'none'};">
                        <label for="modal-pdf-path">Documento PDF de la Tarjeta:</label>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="text" id="modal-pdf-path" value="${tarjeta.pdfPath ? 'PDF guardado: ' + tarjeta.pdfPath.split(/[\\/]/).pop() : ''}" placeholder="Ningún archivo seleccionado" readonly>
                            <button type="button" id="seleccionar-pdf-tarjeta-btn" class="btn-secondary">
                                ${tarjeta.pdfPath ? 'Reemplazar PDF' : 'Seleccionar PDF'}
                            </button>
                            ${tarjeta.pdfPath ? '<button type="button" id="abrir-pdf-tarjeta-btn" class="btn-secondary">📄 Abrir</button>' : ''}
                        </div>
                        <small style="color: #666; margin-top: 0.25rem; display: block;">
                            ${tarjeta.pdfPath ? 'Puedes reemplazar el PDF existente. El anterior será eliminado.' : 'El PDF se guardará en la carpeta del expediente seleccionado'}
                        </small>
                    </div>
                `;

                // Event listener para checkbox
                const checkboxAsociar = document.getElementById('modal-asociar-expediente');
                const expedienteContainer = document.getElementById('expediente-select-container');
                const actaEntregaContainer = document.getElementById('acta-entrega-select-container');
                const pdfContainer = document.getElementById('pdf-select-container');
                
                if (checkboxAsociar) {
                    checkboxAsociar.addEventListener('change', async (e) => {
                        if (e.target.checked) {
                            expedienteContainer.style.display = 'block';
                            actaEntregaContainer.style.display = 'block';
                            pdfContainer.style.display = 'block';
                            await this.cargarExpedientesEnSelect(tarjeta.resolucionId);
                            await this.cargarActasEntregaEnSelect(tarjeta.actaEntregaId);
                        } else {
                            expedienteContainer.style.display = 'none';
                            actaEntregaContainer.style.display = 'none';
                            pdfContainer.style.display = 'none';
                            this.selectedPdfPath = null;
                        }
                    });
                }

                // Event listener para botón de seleccionar PDF
                const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-tarjeta-btn');
                if (seleccionarPdfBtn) {
                    seleccionarPdfBtn.addEventListener('click', async () => {
                        await this.seleccionarPdfTarjeta();
                    });
                }

                // Event listener para botón de abrir PDF
                if (tarjeta.pdfPath) {
                    const abrirPdfBtn = document.getElementById('abrir-pdf-tarjeta-btn');
                    if (abrirPdfBtn) {
                        abrirPdfBtn.addEventListener('click', async () => {
                            await this.abrirPdfTarjeta(tarjeta.pdfPath);
                        });
                    }
                }

                // Si tiene expediente, cargar selects
                if (tarjeta.resolucionId) {
                    await this.cargarExpedientesEnSelect(tarjeta.resolucionId);
                    await this.cargarActasEntregaEnSelect(tarjeta.actaEntregaId);
                }

                this.abrirModal();
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('❌ Error al cargar tarjeta:', error);
            this.mostrarError('Error al cargar tarjeta');
        } finally {
            loadingManager.hide('editar-tarjeta');
        }
    }

    /**
     * Cargar expedientes en el select
     */
    async cargarExpedientesEnSelect(expedienteIdSeleccionado = null) {
        try {
            const resultado = await window.api.invoke('obtener-todos-expedientes');
            
            if (resultado && Array.isArray(resultado)) {
                const select = document.getElementById('modal-expediente-id');
                if (select) {
                    select.innerHTML = '<option value="">Seleccionar...</option>';
                    
                    resultado.forEach(exp => {
                        const option = document.createElement('option');
                        option.value = exp._id;
                        option.textContent = `${exp.numeroExpediente}-${exp.anioExpediente} - ${exp.nombreEmpresa || 'Sin nombre'}`;
                        
                        if (exp._id === expedienteIdSeleccionado) {
                            option.selected = true;
                        }
                        
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error al cargar expedientes:', error);
        }
    }

    /**
     * Cargar actas de entrega en el select
     */
    async cargarActasEntregaEnSelect(actaEntregaIdSeleccionado = null) {
        try {
            const resultado = await window.api.invoke('acta-entrega:obtener-todas');
            
            if (resultado && resultado.success && Array.isArray(resultado.actas)) {
                const select = document.getElementById('modal-acta-entrega-id');
                if (select) {
                    select.innerHTML = '<option value="">Ninguna</option>';
                    
                    resultado.actas.forEach(acta => {
                        const option = document.createElement('option');
                        option.value = acta._id;
                        const fecha = acta.fechaEntrega ? new Date(acta.fechaEntrega).toLocaleDateString('es-ES') : 'Sin fecha';
                        option.textContent = `Acta #${acta._id} - ${fecha} (${acta.n_tarjetas_entregadas || 0} tarjetas)`;
                        
                        if (acta._id === actaEntregaIdSeleccionado) {
                            option.selected = true;
                        }
                        
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error al cargar actas de entrega:', error);
        }
    }

    /**
     * Guardar tarjeta (crear o actualizar)
     */
    async guardarTarjeta() {
        const operacion = this.currentTarjetaId ? 'actualizar-tarjeta' : 'crear-tarjeta';
        
        try {
            // Obtener valores del formulario
            const placa = document.getElementById('modal-placa')?.value?.trim();
            const numeroTarjeta = document.getElementById('modal-numero-tarjeta')?.value?.trim();
            const asociarExpediente = document.getElementById('modal-asociar-expediente')?.checked;
            const expedienteId = asociarExpediente ? document.getElementById('modal-expediente-id')?.value : null;
            const actaEntregaId = asociarExpediente ? document.getElementById('modal-acta-entrega-id')?.value : null;

            // Validación básica
            if (!placa && !numeroTarjeta) {
                this.mostrarError('Debe proporcionar al menos la placa o el número de tarjeta');
                return;
            }

            // Validar que debe haber placa
            if (!placa) {
                this.mostrarError('La placa del vehículo es obligatoria');
                return;
            }

            // Validar que si hay PDF seleccionado, debe haber expediente
            if (this.selectedPdfPath && !expedienteId) {
                this.mostrarError('Debe seleccionar un expediente para guardar el archivo PDF');
                return;
            }

            const textoLoading = this.currentTarjetaId ? 'Actualizando tarjeta...' : 'Creando tarjeta...';
            loadingManager.show(operacion, textoLoading);

            const tarjetaData = {
                placa: placa || null,
                numeroTarjeta: numeroTarjeta || null,
                expedienteId: expedienteId || null,
                actaEntregaId: actaEntregaId || null
            };

            let resultado;
            const tarjetaIdAnterior = this.currentTarjetaId;

            if (tarjetaIdAnterior) {
                // Actualizar (con PDF opcional)
                resultado = await window.api.invoke('tarjeta:actualizar', tarjetaIdAnterior, tarjetaData, this.selectedPdfPath);
            } else {
                // Crear (con PDF opcional)
                resultado = await window.api.invoke('tarjeta:crear', tarjetaData, this.selectedPdfPath);
            }

            // Ocultar loading inmediatamente después de recibir respuesta
            loadingManager.hide(operacion);

            if (resultado.success) {
                // Cerrar modal primero
                this.cerrarModal();
                
                // Actualizar solo la tarjeta modificada sin recargar toda la página
                if (tarjetaIdAnterior) {
                    await this.actualizarTarjetaEnTabla(resultado.tarjeta);
                } else {
                    await this.agregarTarjetaATabla(resultado.tarjeta);
                }
                
                this.mostrarExito(resultado.message);
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('❌ Error al guardar tarjeta:', error);
            this.mostrarError('Error al guardar tarjeta');
            loadingManager.hide(operacion);
        }
    }

    /**
     * Actualizar una tarjeta específica en la tabla (sin recargar todo)
     */
    async actualizarTarjetaEnTabla(tarjetaActualizada) {
        try {
            // Actualizar en el array principal
            const indexTarjetas = this.tarjetas.findIndex(t => t._id === tarjetaActualizada._id);
            if (indexTarjetas !== -1) {
                this.tarjetas[indexTarjetas] = tarjetaActualizada;
            }

            // Actualizar en el array filtrado
            const indexFiltered = this.filteredTarjetas.findIndex(t => t._id === tarjetaActualizada._id);
            if (indexFiltered !== -1) {
                this.filteredTarjetas[indexFiltered] = tarjetaActualizada;
            }

            // Re-renderizar solo la página actual
            this.renderTarjetas();
            
            console.log('✅ Tarjeta actualizada en la tabla');
        } catch (error) {
            console.error('❌ Error al actualizar tarjeta en tabla:', error);
        }
    }

    /**
     * Agregar una nueva tarjeta a la tabla (sin recargar todo)
     */
    async agregarTarjetaATabla(nuevaTarjeta) {
        try {
            // Agregar al principio de los arrays
            this.tarjetas.unshift(nuevaTarjeta);
            this.filteredTarjetas.unshift(nuevaTarjeta);

            // Volver a la primera página
            this.currentPage = 1;

            // Re-renderizar
            this.renderTarjetas();
            
            console.log('✅ Tarjeta agregada a la tabla');
        } catch (error) {
            console.error('❌ Error al agregar tarjeta a tabla:', error);
        }
    }

    /**
     * Confirmar eliminación de tarjeta
     */
    confirmarEliminarTarjeta(tarjetaId) {
        this.currentTarjetaId = tarjetaId;
        
        if (confirm('¿Está seguro de eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
            this.eliminarTarjeta();
        }
    }

    /**
     * Eliminar tarjeta
     */
    async eliminarTarjeta() {
        if (!this.currentTarjetaId) return;

        const tarjetaIdAEliminar = this.currentTarjetaId;

        try {
            loadingManager.show('eliminar-tarjeta', 'Eliminando tarjeta...');

            const resultado = await window.api.invoke('tarjeta:eliminar', tarjetaIdAEliminar);

            // Ocultar loading inmediatamente después de recibir respuesta
            loadingManager.hide('eliminar-tarjeta');

            if (resultado.success) {
                this.cerrarModal();
                
                // Eliminar de los arrays sin recargar
                this.tarjetas = this.tarjetas.filter(t => t._id !== tarjetaIdAEliminar);
                this.filteredTarjetas = this.filteredTarjetas.filter(t => t._id !== tarjetaIdAEliminar);
                
                // Re-renderizar tabla
                this.renderTarjetas();
                
                this.mostrarExito(resultado.message);
            } else {
                this.mostrarError(resultado.message);
            }
        } catch (error) {
            console.error('❌ Error al eliminar tarjeta:', error);
            this.mostrarError('Error al eliminar tarjeta');
            loadingManager.hide('eliminar-tarjeta');
        }
    }

    /**
     * Abrir modal
     */
    abrirModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Cerrar modal
     */
    cerrarModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        // Limpiar estado
        this.currentTarjetaId = null;
        this.selectedPdfPath = null;
        
        // Limpiar formulario
        if (this.elements.modalForm) {
            this.elements.modalForm.innerHTML = '';
        }
        
        // Asegurar que todos los loadings estén ocultos
        loadingManager.clearAll();
    }

    /**
     * Formatear fecha
     */
    formatearFecha(fecha) {
        if (!fecha) return '-';
        
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return '-';
        }
    }

    /**
     * Mostrar mensaje de error
     */
    mostrarError(mensaje) {
        console.error('❌', mensaje);
        alert('Error: ' + mensaje);
    }

    /**
     * Mostrar mensaje de éxito
     */
    mostrarExito(mensaje) {
        console.log('✅', mensaje);
        // Aquí podrías implementar un toast o notificación más elegante
    }

    /**
     * Seleccionar archivo PDF para la tarjeta
     */
    async seleccionarPdfTarjeta() {
        try {
            const filePath = await window.api.invoke('tarjeta:seleccionar-pdf');
            
            if (filePath) {
                this.selectedPdfPath = filePath;
                const pdfPathInput = document.getElementById('modal-pdf-path');
                if (pdfPathInput) {
                    const fileName = filePath.split(/[\\/]/).pop();
                    pdfPathInput.value = `Seleccionado: ${fileName}`;
                }
                console.log('📄 PDF seleccionado:', filePath);
            }
        } catch (error) {
            console.error('❌ Error al seleccionar PDF:', error);
            this.mostrarError('Error al seleccionar archivo PDF');
        }
    }

    /**
     * Abrir PDF de la tarjeta
     */
    async abrirPdfTarjeta(pdfPath) {
        try {
            if (!pdfPath) {
                this.mostrarError('No hay PDF asociado a esta tarjeta');
                return;
            }

            const resultado = await window.api.invoke('tarjeta:abrir-pdf', pdfPath);
            
            if (!resultado.success) {
                this.mostrarError(resultado.message || 'No se pudo abrir el PDF');
            }
        } catch (error) {
            console.error('❌ Error al abrir PDF:', error);
            this.mostrarError('Error al abrir archivo PDF');
        }
    }
}

// Crear instancia singleton
export const tarjetasCRUD = new TarjetasCRUD();
