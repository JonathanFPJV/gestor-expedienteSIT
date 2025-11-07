// src/js/modules/expedientesCRUD.js
import { dataService } from './dataService.js';
import { eventBus, APP_EVENTS } from './eventBus.js';

export class ExpedientesCRUD {
    constructor() {
        this.expedientes = [];
        this.filteredExpedientes = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.totalRecords = 0;
        this.currentExpediente = null;
        this.isInitialized = false;
        this.usePagination = true; // 🆕 Flag para usar paginación del backend
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeFilters();
        this.subscribeToEvents(); // 🔄 Suscribirse a eventos para reactividad
        this.setupViewActivationListener(); // 🔄 Escuchar cuando se activa la vista
    }

    /**
     * Configurar listener para cuando se active la vista de expedientes
     */
    setupViewActivationListener() {
        // Cargar expedientes cuando se muestre la vista
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const vistaCrud = document.getElementById('vista-crud');
                    if (vistaCrud && vistaCrud.classList.contains('active') && !this.isInitialized) {
                        console.log('🎯 Vista de expedientes activada - Cargando datos...');
                        this.isInitialized = true;
                        this.loadExpedientes();
                    }
                }
            });
        });

        // Observar cambios en la vista-crud
        const vistaCrud = document.getElementById('vista-crud');
        if (vistaCrud) {
            observer.observe(vistaCrud, { attributes: true });
            
            // Si ya está activa al cargar, cargar datos inmediatamente
            if (vistaCrud.classList.contains('active')) {
                console.log('🎯 Vista de expedientes ya activa - Cargando datos...');
                this.isInitialized = true;
                this.loadExpedientes();
            }
        }
    }

    initializeElements() {
        // Elementos de la tabla
        this.tbody = document.getElementById('expedientes-tbody');
        this.paginationInfo = document.getElementById('pagination-info');
        this.pageInfo = document.getElementById('page-info');
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        
        // Elementos de búsqueda y filtros
        this.searchInput = document.getElementById('search-crud-input');
        this.searchBtn = document.getElementById('search-crud-btn');
        this.filterAnio = document.getElementById('filter-anio');
        this.filterUnidad = document.getElementById('filter-unidad');
        this.limpiarFiltrosBtn = document.getElementById('limpiar-filtros-btn');
        
        // Botones
        this.nuevoExpedienteBtn = document.getElementById('nuevo-expediente-btn');
    }

    initializeEventListeners() {
        // Búsqueda
        this.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Filtros
        this.filterAnio?.addEventListener('change', () => this.applyFilters());
        this.filterUnidad?.addEventListener('change', () => this.applyFilters());
        this.limpiarFiltrosBtn?.addEventListener('click', () => this.clearFilters());

        // Paginación
        this.prevPageBtn?.addEventListener('click', () => this.previousPage());
        this.nextPageBtn?.addEventListener('click', () => this.nextPage());

        // Nuevo expediente
        this.nuevoExpedienteBtn?.addEventListener('click', () => this.openNewExpedienteModal());

        // Escuchar eventos de eliminación del backend
        if (window.api && window.api.on) {
            window.api.on('expediente-eliminado', (data) => {
                console.log('📢 Evento recibido: expediente-eliminado', data);
                // Recargar expedientes automáticamente
                this.loadExpedientes().catch(error => {
                    console.error('Error al recargar expedientes después de eliminación:', error);
                });
            });
        }
    }

    // 🔄 Suscribirse a eventos para actualización reactiva
    subscribeToEvents() {
        console.log('🔔 Suscribiendo ExpedientesCRUD a eventos del sistema...');
        
        // Escuchar cuando se actualiza un expediente
        eventBus.on(APP_EVENTS.EXPEDIENTE_UPDATED, (data) => {
            console.log('📢 Evento EXPEDIENTE_UPDATED recibido:', data);
            this.refreshExpedienteInTable(data.expediente);
        });

        // Escuchar cuando se elimina un expediente
        eventBus.on(APP_EVENTS.EXPEDIENTE_DELETED, (data) => {
            console.log('📢 Evento EXPEDIENTE_DELETED recibido:', data);
            this.removeExpedienteFromTable(data.expedienteId);
        });

        // Escuchar cuando se crea un expediente
        eventBus.on(APP_EVENTS.EXPEDIENTE_CREATED, (data) => {
            console.log('📢 Evento EXPEDIENTE_CREATED recibido:', data);
            this.addExpedienteToTable(data.expediente);
        });

        console.log('✅ Suscripción a eventos completada');
    }

    // 🔄 Actualizar un expediente específico en la tabla sin recargar todo
    async refreshExpedienteInTable(updatedExpediente) {
        try {
            console.log('🔄 Actualizando expediente en tabla local:', updatedExpediente);
            
            // Buscar y actualizar en el array principal
            const index = this.expedientes.findIndex(e => e._id === updatedExpediente._id);
            if (index !== -1) {
                this.expedientes[index] = { ...this.expedientes[index], ...updatedExpediente };
                console.log('✅ Expediente actualizado en array principal');
            } else {
                console.warn('⚠️ Expediente no encontrado en array principal, recargaremos todo');
                await this.loadExpedientes();
                return;
            }

            // Actualizar en el array filtrado si existe
            const filteredIndex = this.filteredExpedientes.findIndex(e => e._id === updatedExpediente._id);
            if (filteredIndex !== -1) {
                this.filteredExpedientes[filteredIndex] = { ...this.filteredExpedientes[filteredIndex], ...updatedExpediente };
                console.log('✅ Expediente actualizado en array filtrado');
            }

            // Re-renderizar solo la tabla (no hace llamada al backend)
            this.renderTable();
            this.updatePagination();
            
            console.log('✨ Tabla actualizada exitosamente sin recargar desde API');
        } catch (error) {
            console.error('❌ Error al actualizar expediente en tabla:', error);
        }
    }

    // 🗑️ Eliminar un expediente de la tabla sin recargar todo
    removeExpedienteFromTable(expedienteId) {
        try {
            console.log('🗑️ Eliminando expediente de tabla local:', expedienteId);
            
            // Eliminar del array principal
            this.expedientes = this.expedientes.filter(e => e._id !== expedienteId);
            
            // Eliminar del array filtrado
            this.filteredExpedientes = this.filteredExpedientes.filter(e => e._id !== expedienteId);
            
            // Re-renderizar tabla
            this.renderTable();
            this.updatePagination();
            
            console.log('✨ Expediente eliminado de la tabla exitosamente');
        } catch (error) {
            console.error('❌ Error al eliminar expediente de tabla:', error);
        }
    }

    // ➕ Agregar un nuevo expediente a la tabla sin recargar todo
    addExpedienteToTable(newExpediente) {
        try {
            console.log('➕ Agregando nuevo expediente a tabla local:', newExpediente);
            
            // Agregar al principio del array principal
            this.expedientes.unshift(newExpediente);
            
            // Aplicar filtros para ver si el nuevo expediente debe aparecer
            this.applyFilters();
            
            // Re-renderizar tabla
            this.renderTable();
            this.updatePagination();
            
            console.log('✨ Nuevo expediente agregado a la tabla exitosamente');
        } catch (error) {
            console.error('❌ Error al agregar expediente a tabla:', error);
        }
    }

    async initializeFilters() {
        // Llenar filtro de años
        try {
            const expedientes = await dataService.getAllExpedientes();
            const years = [...new Set(expedientes.map(exp => exp.anioExpediente || new Date(exp.fecha).getFullYear()))]
                .sort((a, b) => b - a);

            this.filterAnio.innerHTML = '<option value="">Todos</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                this.filterAnio.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar filtros:', error);
        }
    }

    async loadExpedientes() {
        try {
            console.log('🔄 Cargando expedientes...');
            this.showLoadingTable();
            
            // Verificar que dataService esté disponible
            if (!dataService) {
                console.warn('⚠️ DataService no está disponible, usando datos de prueba');
                this.expedientes = this.createTestData();
                this.filteredExpedientes = [...this.expedientes];
                this.currentPage = 1;
                this.renderTable();
                this.updatePagination();
                this.populateYearFilter();
                return;
            }

            // 🆕 Usar paginación del backend
            if (this.usePagination) {
                const resultado = await dataService.getExpedientesPaginados({
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    sortBy: 'fechaExpediente',
                    sortOrder: 'desc'
                });

                if (resultado.success) {
                    this.expedientes = resultado.data;
                    this.filteredExpedientes = [...this.expedientes];
                    this.totalPages = resultado.pagination.totalPages;
                    this.totalRecords = resultado.pagination.totalRecords;
                    
                    console.log(`✅ Expedientes paginados cargados: ${this.expedientes.length} de ${this.totalRecords}`);
                } else {
                    console.error('❌ Error al cargar expedientes paginados:', resultado.message);
                    this.expedientes = [];
                    this.filteredExpedientes = [];
                }
            } else {
                // Modo antiguo (cargar todo)
                this.expedientes = await dataService.getAllExpedientes();
                
                if (!this.expedientes) {
                    console.warn('⚠️ La respuesta de expedientes es null/undefined, usando datos de prueba');
                    this.expedientes = this.createTestData();
                } else if (!Array.isArray(this.expedientes)) {
                    console.warn('⚠️ Los expedientes no son un array:', this.expedientes, 'usando datos de prueba');
                    this.expedientes = this.createTestData();
                } else {
                    console.log('Total de expedientes cargados:', this.expedientes.length);
                }
                
                this.filteredExpedientes = [...this.expedientes];
            }
            
            this.renderTable();
            this.updatePagination();
            this.populateYearFilter();
            
            console.log('✅ Expedientes cargados y renderizados correctamente');
        } catch (error) {
            console.error('❌ Error al cargar expedientes:', error);
            console.log('🔧 Usando datos de prueba como fallback');
            this.expedientes = this.createTestData();
            this.filteredExpedientes = [...this.expedientes];
            this.currentPage = 1;
            this.renderTable();
            this.updatePagination();
            this.populateYearFilter();
        }
    }

    createTestData() {
        return [
            {
                _id: 'test1',
                numeroExpediente: '001',
                anioExpediente: '2024',
                fecha: '2024-01-15',
                numeroResolucion: 'RES-001-2024',
                nombreEmpresa: 'Empresa de Prueba S.A.',
                unidadNegocio: 'C1',
                tarjetasAsociadas: [{ numero: '123456789' }, { numero: '987654321' }]
            },
            {
                _id: 'test2',
                numeroExpediente: '002',
                anioExpediente: '2024',
                fecha: '2024-02-20',
                numeroResolucion: 'RES-002-2024',
                nombreEmpresa: 'Transportes Ejemplo Ltda.',
                unidadNegocio: 'C2',
                tarjetasAsociadas: [{ numero: '555666777' }]
            },
            {
                _id: 'test3',
                numeroExpediente: '003',
                anioExpediente: '2023',
                fecha: '2023-12-10',
                numeroResolucion: 'RES-003-2023',
                nombreEmpresa: 'Logística Demo Corp.',
                unidadNegocio: 'C3',
                tarjetasAsociadas: []
            }
        ];
    }

    showLoadingTable() {
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

    showEmptyTable() {
        if (!this.tbody) return;
        
        this.tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    No se encontraron expedientes
                </td>
            </tr>
        `;
    }

    populateYearFilter() {
        if (!this.filterAnio || !this.expedientes || this.expedientes.length === 0) return;
        
        const years = [...new Set(this.expedientes.map(exp => 
            exp.anioExpediente || new Date(exp.fecha).getFullYear()
        ))].sort((a, b) => b - a);

        this.filterAnio.innerHTML = '<option value="">Todos</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.filterAnio.appendChild(option);
        });
    }

    renderTable() {
        if (!this.tbody) return;

        // 🆕 Si usamos paginación del backend, los datos ya vienen paginados
        let expedientesToShow;
        if (this.usePagination) {
            expedientesToShow = this.filteredExpedientes; // Ya están paginados
        } else {
            // Paginación local (modo antiguo)
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            expedientesToShow = this.filteredExpedientes.slice(startIndex, endIndex);
        }

        this.tbody.innerHTML = '';

        if (expedientesToShow.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    No se encontraron expedientes
                </td>
            `;
            this.tbody.appendChild(row);
            return;
        }

        expedientesToShow.forEach(expediente => {
            const row = document.createElement('tr');
            const expedienteCompleto = `${expediente.numeroExpediente || 'N/A'}-${expediente.anioExpediente || 'N/A'}`;
            
            // Calcular información de tarjetas - solo mostrar número
            const tarjetasAsociadas = expediente.tarjetasAsociadas || [];
            const tarjetasCount = tarjetasAsociadas.length;
            
            // Crear texto simple de tarjetas (solo número)
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
                            👁️
                        </button>
                        <button class="btn-action btn-edit" onclick="expedientesCRUD.editExpediente(${expediente._id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-action btn-delete" onclick="expedientesCRUD.confirmDelete(${expediente._id})" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            this.tbody.appendChild(row);
        });
    }

    updatePagination() {
        // 🆕 Si usamos paginación del backend, usar los valores del servidor
        const totalItems = this.usePagination ? this.totalRecords : this.filteredExpedientes.length;
        const totalPages = this.usePagination ? this.totalPages : Math.ceil(this.filteredExpedientes.length / this.itemsPerPage);

        // Información
        if (this.paginationInfo) {
            if (this.usePagination) {
                const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
                const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
                this.paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} expedientes`;
            } else {
                const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
                const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
                this.paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} expedientes`;
            }
        }

        if (this.pageInfo) {
            this.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        }

        // Botones
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage <= 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    handleSearch() {
        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        
        // Verificar que expedientes esté inicializado
        if (!this.expedientes || !Array.isArray(this.expedientes)) {
            this.filteredExpedientes = [];
            this.renderTable();
            this.updatePagination();
            return;
        }
        
        if (searchTerm === '') {
            this.filteredExpedientes = [...this.expedientes];
        } else {
            this.filteredExpedientes = this.expedientes.filter(expediente => {
                const expedienteCompleto = `${expediente.numeroExpediente || ''}-${expediente.anioExpediente || ''}`;
                return (
                    expedienteCompleto.toLowerCase().includes(searchTerm) ||
                    (expediente.numeroResolucion && expediente.numeroResolucion.toLowerCase().includes(searchTerm)) ||
                    (expediente.nombreEmpresa && expediente.nombreEmpresa.toLowerCase().includes(searchTerm)) ||
                    (expediente.unidadNegocio && expediente.unidadNegocio.toLowerCase().includes(searchTerm)) ||
                    (expediente.informeTecnico && expediente.informeTecnico.toLowerCase().includes(searchTerm))
                );
            });
        }

        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.filteredExpedientes];

        // Filtro por año
        const selectedYear = this.filterAnio?.value;
        if (selectedYear) {
            filtered = filtered.filter(exp => 
                exp.anioExpediente == selectedYear || 
                new Date(exp.fecha).getFullYear() == selectedYear
            );
        }

        // Filtro por unidad
        const selectedUnidad = this.filterUnidad?.value;
        if (selectedUnidad) {
            filtered = filtered.filter(exp => exp.unidadNegocio === selectedUnidad);
        }

        this.filteredExpedientes = filtered;
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    clearFilters() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.filterAnio) this.filterAnio.value = '';
        if (this.filterUnidad) this.filterUnidad.value = '';
        
        this.filteredExpedientes = [...this.expedientes];
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            
            // 🆕 Si usamos paginación del backend, recargar datos
            if (this.usePagination) {
                this.loadExpedientes();
            } else {
                this.renderTable();
                this.updatePagination();
            }
        }
    }

    nextPage() {
        const totalPages = this.usePagination ? this.totalPages : Math.ceil(this.filteredExpedientes.length / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            
            // 🆕 Si usamos paginación del backend, recargar datos
            if (this.usePagination) {
                this.loadExpedientes();
            } else {
                this.renderTable();
                this.updatePagination();
            }
        }
    }

    async viewExpediente(expedienteId) {
        try {
            if (!this.expedientes || !Array.isArray(this.expedientes)) {
                this.showError('Los expedientes no están cargados');
                return;
            }
            
            const expediente = this.expedientes.find(exp => exp._id === expedienteId);
            if (expediente) {
                const expedienteCompleto = `${expediente.numeroExpediente}-${expediente.anioExpediente}`;
                const tarjetasAsociadas = expediente.tarjetasAsociadas || [];
                
                // Crear lista de tarjetas detallada
                let tarjetasInfo = '';
                if (tarjetasAsociadas.length === 0) {
                    tarjetasInfo = 'No hay tarjetas asociadas';
                } else {
                    tarjetasInfo = `Total: ${tarjetasAsociadas.length} tarjetas\n\n`;
                    tarjetasAsociadas.forEach((tarjeta, index) => {
                        tarjetasInfo += `${index + 1}. Placa: ${tarjeta.placa || 'N/A'} | Tarjeta: ${tarjeta.numeroTarjeta || tarjeta.tarjeta || 'N/A'}\n`;
                    });
                }
                
                const info = `📋 DETALLES DEL EXPEDIENTE

🔢 Expediente: ${expedienteCompleto}
📅 Fecha: ${expediente.fecha || 'N/A'}
📄 N° Resolución: ${expediente.numeroResolucion || 'Sin resolución'}
🏢 Empresa: ${expediente.nombreEmpresa || 'N/A'}
🏭 Unidad de Negocio: ${expediente.unidadNegocio || 'N/A'}
� Informe Técnico: ${expediente.informeTecnico || 'N/A'}
📁 Fichero: ${expediente.numeroFichero || 'N/A'}

🎫 TARJETAS ASOCIADAS:
${tarjetasInfo}

📎 Archivos:
${expediente.pdfPath ? '✅ PDF del expediente disponible' : '❌ Sin PDF del expediente'}

💬 Observaciones:
${expediente.observaciones || 'Sin observaciones'}`;
                
                alert(info);
            } else {
                this.showError('Expediente no encontrado');
            }
        } catch (error) {
            console.error('Error al ver expediente:', error);
            this.showError('Error al ver expediente');
        }
    }

    async editExpediente(expedienteId) {
        try {
            console.log('🔍 editExpediente llamado con ID:', expedienteId, `(tipo: ${typeof expedienteId})`);
            
            // Buscar expediente en el array local primero
            let expedienteCompleto = this.expedientes.find(exp => exp._id === expedienteId);
            
            if (!expedienteCompleto) {
                console.error('❌ Expediente no encontrado en array local');
                this.showError('Expediente no encontrado');
                return;
            }
            
            console.log('✅ Expediente encontrado en array local:', expedienteCompleto);
            console.log('� Tarjetas asociadas:', expedienteCompleto.tarjetasAsociadas);
            
            // NOTA: El acta de entrega se obtiene desde las tarjetas, no del expediente
            // Esto se maneja en loadExpedienteIntoForm()
            
            console.log('✅ Expediente completo preparado, navegando al formulario');
            
            // Navegar a la vista de registro
            if (window.navigationManager) {
                window.navigationManager.navigateTo('vista-registro');
                
                // Esperar a que la vista esté visible
                setTimeout(() => {
                    this.loadExpedienteIntoForm(expedienteCompleto);
                }, 100);
            } else {
                console.error('❌ navigationManager no disponible');
            }
        } catch (error) {
            console.error('Error al editar expediente:', error);
            this.showError('Error al cargar expediente para edición');
        }
    }

    async loadExpedienteIntoForm(expediente) {
        try {
            console.log('📝 Cargando expediente completo en formulario:', expediente);
            
            // 1️⃣ Cargar datos básicos del expediente
            document.getElementById('numeroExpediente').value = expediente.numeroExpediente || '';
            document.getElementById('anioExpediente').value = expediente.anioExpediente || new Date().getFullYear();
            document.getElementById('numeroResolucion').value = expediente.numeroResolucion || '';
            document.getElementById('fecha').value = expediente.fechaExpediente || expediente.fecha || '';
            document.getElementById('informeTecnico').value = expediente.informeTecnico || '';
            document.getElementById('numeroFichero').value = expediente.numeroFichero || '';
            document.getElementById('nombreEmpresa').value = expediente.nombreEmpresa || '';
            document.getElementById('unidadNegocio').value = expediente.unidadNegocio || '';
            document.getElementById('observaciones').value = expediente.observaciones || '';
            
            // Si hay observaciones, mostrar el contenedor
            if (expediente.observaciones) {
                const observacionesContainer = document.getElementById('observaciones-container');
                if (observacionesContainer) {
                    observacionesContainer.classList.remove('hidden');
                }
            }
            
            // 2️⃣ Cargar TARJETAS ASOCIADAS (EDITABLES)
            if (expediente.tarjetasAsociadas && expediente.tarjetasAsociadas.length > 0) {
                console.log(`📋 Cargando ${expediente.tarjetasAsociadas.length} tarjetas asociadas`);
                console.log('🔍 Estructura completa de tarjetas:', JSON.stringify(expediente.tarjetasAsociadas, null, 2));
                
                const tarjetasList = document.getElementById('tarjetas-list');
                if (tarjetasList) {
                    tarjetasList.innerHTML = ''; // Limpiar lista
                    
                    // 🔍 Verificar si alguna tarjeta tiene acta de entrega asociada
                    let actaEntregaId = null;
                    for (const tarjeta of expediente.tarjetasAsociadas) {
                        console.log(`🔍 Revisando tarjeta:`, {
                            placa: tarjeta.placa,
                            numero: tarjeta.numero || tarjeta.numeroTarjeta,
                            actaEntregaId: tarjeta.actaEntregaId,
                            _id: tarjeta._id
                        });
                        
                        if (tarjeta.actaEntregaId) {
                            actaEntregaId = tarjeta.actaEntregaId;
                            console.log(`✅ ¡ENCONTRADO! Tarjeta ${tarjeta.placa} tiene acta de entrega ID: ${actaEntregaId}`);
                            break;
                        }
                    }
                    
                    // Si encontramos un acta, cargarla
                    if (actaEntregaId) {
                        console.log(`🚀 Llamando a loadActaEntregaInfo con ID: ${actaEntregaId}`);
                        await this.loadActaEntregaInfo(actaEntregaId);
                    } else {
                        console.warn('⚠️ No se encontró ninguna tarjeta con actaEntregaId');
                    }
                    
                    expediente.tarjetasAsociadas.forEach((tarjeta, index) => {
                        const tarjetaDiv = document.createElement('div');
                        tarjetaDiv.className = 'tarjeta-item';
                        tarjetaDiv.dataset.tarjetaIndex = index;
                        tarjetaDiv.innerHTML = `
                            <input type="text" 
                                   placeholder="Placa del vehículo" 
                                   value="${tarjeta.placa || ''}"
                                   data-field="placa"
                                   onchange="window.expedientesCRUD.updateTarjetaData(${index}, 'placa', this.value)">
                            <input type="text" 
                                   placeholder="Número de tarjeta" 
                                   value="${tarjeta.numero || tarjeta.numeroTarjeta || ''}"
                                   data-field="numero"
                                   onchange="window.expedientesCRUD.updateTarjetaData(${index}, 'numero', this.value)">
                            <button type="button" 
                                    class="eliminar-tarjeta-btn" 
                                    onclick="window.expedientesCRUD.removeTarjetaFromForm(${index})">
                                🗑️ Eliminar
                            </button>
                        `;
                        tarjetasList.appendChild(tarjetaDiv);
                    });
                }
            }
            
            // 3️⃣ NOTA: El acta de entrega se carga desde las tarjetas, no directamente del expediente
            
            // 4️⃣ Cargar ruta de PDF si existe
            if (expediente.pdfPath) {
                console.log('📎 Cargando ruta de PDF:', expediente.pdfPath);
                const pdfFilePathInput = document.getElementById('pdf-file-path');
                if (pdfFilePathInput) {
                    pdfFilePathInput.value = expediente.pdfPath;
                }
            }
            
            // 5️⃣ Cambiar título del formulario a "Editar Expediente"
            const formTitle = document.querySelector('#vista-registro h2');
            if (formTitle) {
                formTitle.textContent = `✏️ Editar Expediente ${expediente.numeroExpediente}-${expediente.anioExpediente}`;
            }
            
            // 6️⃣ Cambiar texto del botón de guardar
            const guardarBtn = document.getElementById('guardar-expediente-btn');
            if (guardarBtn) {
                guardarBtn.textContent = '💾 Actualizar Expediente';
            }
            
            // 7️⃣ Guardar el ID del expediente para actualización
            const form = document.getElementById('expediente-form');
            if (form) {
                form.dataset.editingId = expediente._id;
                
                // Guardar tarjetas en formato JSON para el submit
                if (expediente.tarjetasAsociadas) {
                    form.dataset.tarjetas = JSON.stringify(expediente.tarjetasAsociadas);
                }
                
                // Guardar acta de entrega si existe
                if (expediente.actaEntrega) {
                    form.dataset.actaEntregaId = expediente.actaEntrega._id;
                }
            }
            
            console.log('✅ Expediente cargado completamente en formulario');
        } catch (error) {
            console.error('❌ Error al cargar expediente en formulario:', error);
            this.showError('Error al cargar datos en el formulario');
        }
    }
    
    // 🔄 Método para actualizar datos de tarjeta en tiempo real
    updateTarjetaData(index, field, value) {
        try {
            const form = document.getElementById('expediente-form');
            if (!form || !form.dataset.tarjetas) return;
            
            const tarjetas = JSON.parse(form.dataset.tarjetas);
            if (tarjetas[index]) {
                tarjetas[index][field] = value;
                form.dataset.tarjetas = JSON.stringify(tarjetas);
                console.log(`✅ Tarjeta ${index} actualizada: ${field} = ${value}`);
            }
        } catch (error) {
            console.error('❌ Error al actualizar tarjeta:', error);
        }
    }
    
    // 🗑️ Método para eliminar tarjeta del formulario durante edición
    removeTarjetaFromForm(index) {
        try {
            const form = document.getElementById('expediente-form');
            if (!form || !form.dataset.tarjetas) return;
            
            const tarjetas = JSON.parse(form.dataset.tarjetas);
            tarjetas.splice(index, 1);
            form.dataset.tarjetas = JSON.stringify(tarjetas);
            
            // Re-renderizar la lista CON CAMPOS EDITABLES
            const tarjetasList = document.getElementById('tarjetas-list');
            if (tarjetasList) {
                tarjetasList.innerHTML = '';
                tarjetas.forEach((tarjeta, idx) => {
                    const tarjetaDiv = document.createElement('div');
                    tarjetaDiv.className = 'tarjeta-item';
                    tarjetaDiv.dataset.tarjetaIndex = idx;
                    tarjetaDiv.innerHTML = `
                        <input type="text" 
                               placeholder="Placa del vehículo" 
                               value="${tarjeta.placa || ''}"
                               data-field="placa"
                               onchange="window.expedientesCRUD.updateTarjetaData(${idx}, 'placa', this.value)">
                        <input type="text" 
                               placeholder="Número de tarjeta" 
                               value="${tarjeta.numero || tarjeta.numeroTarjeta || ''}"
                               data-field="numero"
                               onchange="window.expedientesCRUD.updateTarjetaData(${idx}, 'numero', this.value)">
                        <button type="button" 
                                class="eliminar-tarjeta-btn" 
                                onclick="window.expedientesCRUD.removeTarjetaFromForm(${idx})">
                            🗑️ Eliminar
                        </button>
                    `;
                    tarjetasList.appendChild(tarjetaDiv);
                });
            }
            
            console.log('✅ Tarjeta eliminada del formulario');
        } catch (error) {
            console.error('❌ Error al eliminar tarjeta:', error);
        }
    }
    
    // 📄 Método para cargar información del Acta de Entrega (SOLO LECTURA)
    async loadActaEntregaInfo(actaEntregaId) {
        try {
            console.log('📄 ========================================');
            console.log('📄 INICIANDO CARGA DE ACTA DE ENTREGA');
            console.log('📄 Acta ID:', actaEntregaId);
            console.log('📄 ========================================');
            
            // Usar invoke en lugar de enviar para este canal IPC
            const actaResponse = await window.api.invoke('acta-entrega:obtener-por-id', actaEntregaId);
            
            console.log('📄 Respuesta del backend:', actaResponse);
            
            // El handler retorna { success, acta } en lugar de { success, data }
            if (actaResponse && actaResponse.success && actaResponse.acta) {
                const acta = actaResponse.acta;
                console.log('✅ Acta de entrega obtenida:', JSON.stringify(acta, null, 2));
                
                // Mostrar la sección del acta
                const incluirActaCheckbox = document.getElementById('incluir-acta-entrega');
                const actaFields = document.getElementById('acta-entrega-fields');
                
                if (incluirActaCheckbox) {
                    incluirActaCheckbox.checked = true;
                    incluirActaCheckbox.disabled = true; // Deshabilitar para que no se pueda modificar
                }
                
                if (actaFields) {
                    actaFields.style.display = 'block';
                }
                
                // Esperar un momento para que se muestren los campos
                setTimeout(() => {
                    // Cargar datos del acta (SOLO LECTURA)
                    const fechaEntregaInput = document.getElementById('fechaEntrega');
                    const nTarjetasInput = document.getElementById('n_tarjetas_entregadas');
                    const observacionesActaInput = document.getElementById('observacionesActa');
                    const pdfActaPathInput = document.getElementById('pdf-acta-path');
                    
                    if (fechaEntregaInput) {
                        fechaEntregaInput.value = acta.fechaEntrega || '';
                        fechaEntregaInput.readOnly = true; // SOLO LECTURA
                        fechaEntregaInput.style.backgroundColor = '#f5f5f5';
                        fechaEntregaInput.style.cursor = 'not-allowed';
                    }
                    
                    if (nTarjetasInput) {
                        nTarjetasInput.value = acta.n_tarjetas_entregadas || 0;
                        nTarjetasInput.readOnly = true; // SOLO LECTURA
                        nTarjetasInput.style.backgroundColor = '#f5f5f5';
                        nTarjetasInput.style.cursor = 'not-allowed';
                    }
                    
                    if (observacionesActaInput) {
                        observacionesActaInput.value = acta.observaciones || '';
                        observacionesActaInput.readOnly = true; // SOLO LECTURA
                        observacionesActaInput.style.backgroundColor = '#f5f5f5';
                        observacionesActaInput.style.cursor = 'not-allowed';
                    }
                    
                    if (pdfActaPathInput) {
                        pdfActaPathInput.value = acta.pdfPathEntrega || 'Sin PDF asociado';
                    }
                    
                    // Deshabilitar botón de seleccionar PDF
                    const seleccionarPdfActaBtn = document.getElementById('seleccionar-pdf-acta-btn');
                    if (seleccionarPdfActaBtn) {
                        seleccionarPdfActaBtn.disabled = true;
                        seleccionarPdfActaBtn.style.opacity = '0.5';
                        seleccionarPdfActaBtn.style.cursor = 'not-allowed';
                    }
                    
                    console.log('✅ Acta de entrega mostrada como SOLO LECTURA');
                }, 100);
            } else {
                console.warn('⚠️ No se pudo obtener el acta de entrega');
            }
        } catch (error) {
            console.error('❌ Error al cargar acta de entrega:', error);
        }
    }

    async confirmDelete(expedienteId) {
        try {
            console.log('🔍 Obteniendo información detallada para eliminación...');
            
            // Obtener información detallada del expediente y sus dependencias
            const infoResult = await dataService.getDeleteInfo(expedienteId);
            
            if (!infoResult.success) {
                this.showError('Error al obtener información del expediente: ' + infoResult.error);
                return;
            }

            const { expediente, tarjetas, summary } = infoResult.data;
            
            // Crear mensaje de advertencia detallado
            let warningMessage = `⚠️ ADVERTENCIA: Esta acción eliminará permanentemente:\n\n`;
            warningMessage += `📄 Expediente: ${expediente.numero}\n`;
            warningMessage += `🏢 Empresa: ${expediente.empresa}\n`;
            warningMessage += `📄 N° Resolución: ${expediente.resolucion}\n`;
            
            if (expediente.pdfPath) {
                warningMessage += `📎 Archivo PDF del expediente\n`;
            }
            
            if (summary.totalTarjetas > 0) {
                warningMessage += `🎫 ${summary.totalTarjetas} tarjeta(s) asociada(s):\n`;
                // Mostrar las primeras 5 tarjetas para que el usuario sepa exactamente qué se eliminará
                tarjetas.slice(0, 5).forEach((tarjeta, index) => {
                    warningMessage += `   ${index + 1}. Placa: ${tarjeta.placa || 'N/A'}${tarjeta.tarjeta ? ` | Tarjeta: ${tarjeta.tarjeta}` : ''}\n`;
                });
                if (summary.totalTarjetas > 5) {
                    warningMessage += `   ... y ${summary.totalTarjetas - 5} tarjeta(s) más\n`;
                }
                
                if (summary.tarjetasConPDF > 0) {
                    warningMessage += `📎 ${summary.tarjetasConPDF} archivo(s) PDF de tarjetas\n`;
                }
            }
            
            if (summary.totalArchivos > 0) {
                warningMessage += `\n📁 Total de archivos a eliminar: ${summary.totalArchivos}\n`;
            }
            
            warningMessage += `\n🚨 Esta acción NO se puede deshacer.\n\n`;
            warningMessage += `¿Está seguro de que desea continuar?`;
            
            const confirmed = confirm(warningMessage);
            
            if (confirmed) {
                await this.executeDelete(expedienteId, expediente);
            }
            
        } catch (error) {
            console.error('❌ Error en confirmación de eliminación:', error);
            this.showError('Error al confirmar eliminación: ' + error.message);
        }
    }

    async executeDelete(expedienteId, expedienteInfo) {
        const operacion = 'eliminar-expediente';
        
        try {
            // Mostrar indicador de carga
            if (window.loadingManager) {
                window.loadingManager.show(operacion, 'Eliminando expediente...');
            }
            
            console.log('🗑️ Ejecutando eliminación en cascada...');
            console.log('📋 ExpedienteId:', expedienteId);
            
            const result = await dataService.deleteExpediente(expedienteId);
            
            // ✅ OPTIMIZACIÓN: Ocultar loading INMEDIATAMENTE después de recibir respuesta
            if (window.loadingManager) {
                window.loadingManager.hide(operacion);
            }
            
            console.log('📊 Resultado completo recibido:', result);
            console.log('✅ result.success:', result?.success);
            console.log('📝 result.summary:', result?.summary);
            
            // Verificar si result existe y tiene la estructura correcta
            if (!result) {
                console.error('❌ Resultado es null o undefined');
                this.showError('Error: No se recibió respuesta del servidor');
                return;
            }
            
            if (result.success) {
                // Mensaje de éxito detallado
                let successMessage = `✅ Eliminación exitosa:\n\n`;
                successMessage += `📄 Expediente: ${result.summary.expediente}\n`;
                successMessage += `🏢 Empresa: ${result.summary.empresa}\n`;
                successMessage += `🎫 Tarjetas eliminadas: ${result.summary.tarjetasEliminadas}\n`;
                successMessage += `📎 Archivos eliminados: ${result.summary.archivosEliminados}\n`;
                
                if (result.summary.warnings > 0) {
                    successMessage += `⚠️ Advertencias: ${result.summary.warnings}\n`;
                }
                
                successMessage += `⏱️ Tiempo: ${result.summary.duration}ms`;
                
                this.showSuccess(successMessage);
                
                // 🔔 EMITIR EVENTO para actualización reactiva
                console.log('� Emitiendo evento EXPEDIENTE_DELETED...');
                eventBus.emit(APP_EVENTS.EXPEDIENTE_DELETED, { 
                    expedienteId: expedienteId,
                    summary: result.summary 
                });
                console.log('✅ Evento emitido - la tabla se actualizará automáticamente');
            } else {
                this.showError('Error en la eliminación: ' + result.message);
            }
            
        } catch (error) {
            // Ocultar loading en caso de error
            if (window.loadingManager) {
                window.loadingManager.hide(operacion);
            }
            
            console.error('❌ Error ejecutando eliminación:', error);
            
            let errorMessage = 'Error al eliminar expediente';
            
            if (error.operation && error.operation.steps) {
                const failedStep = error.operation.steps.find(s => s.status === 'failed');
                if (failedStep) {
                    errorMessage += `\nFallo en: ${failedStep.step}`;
                    errorMessage += `\nError: ${failedStep.error}`;
                }
            }
            
            if (error.message) {
                errorMessage += `\nDetalle: ${error.message}`;
            }
            
            this.showError(errorMessage);
        }
    }

    // Método legacy - ahora redirige al nuevo sistema
    async deleteExpediente(expedienteId, expediente) {
        console.log('⚠️ Usando método legacy deleteExpediente, redirigiendo a executeDelete');
        await this.executeDelete(expedienteId, expediente);
    }

    async deleteExpedienteById(expedienteId) {
        try {
            await dataService.deleteExpediente(expedienteId);
            this.showSuccess('Expediente eliminado correctamente');
            this.loadExpedientes(); // Recargar lista
        } catch (error) {
            console.error('Error al eliminar expediente:', error);
            this.showError('Error al eliminar expediente');
        }
    }

    openNewExpedienteModal() {
        // Navegar a la vista de registro
        if (window.navigationManager) {
            window.navigationManager.navigateTo('vista-registro');
            
            // Limpiar el formulario y prepararlo para crear nuevo expediente
            setTimeout(() => {
                this.prepareFormForNew();
            }, 100);
        } else {
            console.error('❌ navigationManager no disponible');
        }
    }
    
    // 🆕 Preparar formulario para crear nuevo expediente
    prepareFormForNew() {
        try {
            console.log('📝 Preparando formulario para nuevo expediente');
            
            // 1️⃣ Limpiar el formulario
            const form = document.getElementById('expediente-form');
            if (form) {
                form.reset();
                delete form.dataset.editingId;
                delete form.dataset.tarjetas;
            }
            
            // 2️⃣ Limpiar lista de tarjetas
            const tarjetasList = document.getElementById('tarjetas-list');
            if (tarjetasList) {
                tarjetasList.innerHTML = '';
            }
            
            // 3️⃣ Ocultar campos de acta de entrega
            const actaFields = document.getElementById('acta-entrega-fields');
            const incluirActaCheckbox = document.getElementById('incluir-acta-entrega');
            if (actaFields) actaFields.style.display = 'none';
            if (incluirActaCheckbox) incluirActaCheckbox.checked = false;
            
            // 4️⃣ Ocultar observaciones
            const observacionesContainer = document.getElementById('observaciones-container');
            if (observacionesContainer) {
                observacionesContainer.classList.add('hidden');
            }
            
            // 5️⃣ Cambiar título del formulario
            const formTitle = document.querySelector('#vista-registro h2');
            if (formTitle) {
                formTitle.textContent = '📋 Nuevo Registro de Expediente';
            }
            
            // 6️⃣ Cambiar texto del botón de guardar
            const guardarBtn = document.getElementById('guardar-expediente-btn');
            if (guardarBtn) {
                guardarBtn.textContent = '💾 Guardar Expediente';
            }
            
            // 7️⃣ Establecer año actual por defecto
            const anioInput = document.getElementById('anioExpediente');
            if (anioInput) {
                anioInput.value = new Date().getFullYear();
            }
            
            console.log('✅ Formulario preparado para nuevo expediente');
        } catch (error) {
            console.error('❌ Error al preparar formulario:', error);
        }
    }

    showSuccess(message) {
        // Implementar sistema de notificaciones
        console.log('SUCCESS:', message);
        alert(message); // Temporal
    }

    showError(message) {
        // Implementar sistema de notificaciones
        console.error('ERROR:', message);
        alert(message); // Temporal
    }
}

// Crear instancia global
export const expedientesCRUD = new ExpedientesCRUD();

// Hacer disponible globalmente para los onclick en HTML
window.expedientesCRUD = expedientesCRUD;