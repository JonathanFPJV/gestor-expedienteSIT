// src/js/modules/expedientesCRUD.js
import { dataService } from './dataService.js';
import { eventBus, APP_EVENTS } from './eventBus.js';

export class ExpedientesCRUD {
    constructor() {
        this.expedientes = [];
        this.filteredExpedientes = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentExpediente = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeFilters();
        this.subscribeToEvents(); // 🔄 Suscribirse a eventos para reactividad
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
        
        // Modal
        this.modal = document.getElementById('modal-expediente');
        this.modalTitle = document.getElementById('modal-title');
        this.modalForm = document.getElementById('modal-expediente-form');
        this.modalClose = document.getElementById('modal-close');
        this.modalCancelar = document.getElementById('modal-cancelar');
        this.modalGuardar = document.getElementById('modal-guardar');
        this.modalEliminar = document.getElementById('modal-eliminar');
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

        // Modal
        this.modalClose?.addEventListener('click', () => this.closeModal());
        this.modalCancelar?.addEventListener('click', () => this.closeModal());
        this.modalGuardar?.addEventListener('click', () => this.saveExpediente());
        this.modalEliminar?.addEventListener('click', () => this.deleteExpediente());

        // Cerrar modal al hacer clic fuera
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

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
            } else {
                this.expedientes = await dataService.getAllExpedientes();
            }
            
            console.log(' Expedientes obtenidos:', this.expedientes);
            
            // Verificar que la respuesta sea válida
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
            this.currentPage = 1;
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

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const expedientesToShow = this.filteredExpedientes.slice(startIndex, endIndex);

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
        const totalItems = this.filteredExpedientes.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);

        // Información
        if (this.paginationInfo) {
            const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
            this.paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems} expedientes`;
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
            this.renderTable();
            this.updatePagination();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredExpedientes.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
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
            if (!this.expedientes || !Array.isArray(this.expedientes)) {
                this.showError('Los expedientes no están cargados');
                return;
            }
            
            console.log('🔍 editExpediente llamado con ID:', expedienteId, `(tipo: ${typeof expedienteId})`);
            console.log('📊 Expedientes disponibles:', this.expedientes.map(e => ({ _id: e._id, tipo: typeof e._id, numero: e.numeroExpediente })));
            
            const expediente = this.expedientes.find(exp => exp._id === expedienteId);
            console.log('🔎 Expediente encontrado en array:', expediente ? 'SÍ' : 'NO');
            
            if (expediente) {
                console.log('📤 Enviando ID al editor:', expedienteId, `(tipo: ${typeof expedienteId})`);
                if (window.api) {
                    window.api.enviar('abrir-editor-expediente', expedienteId);
                } else {
                    console.warn('window.api no disponible; no se puede abrir el editor');
                }
            } else {
                console.error('❌ Expediente NO encontrado en el array local');
                this.showError('Expediente no encontrado');
            }
        } catch (error) {
            console.error('Error al editar expediente:', error);
            this.showError('Error al cargar expediente para edición');
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
            window.navigationManager.navigateToView('registro');
        }
    }

    openEditModal(expediente) {
        this.modalTitle.textContent = `Editar Expediente ${expediente.numeroExpediente}-${expediente.anioExpediente}`;
        
        // Crear formulario en el modal
        this.modalForm.innerHTML = this.createModalForm(expediente);
        
        // Mostrar modal
        this.modal.classList.add('active');
    }

    createModalForm(expediente = null) {
        const isEdit = expediente !== null;
        
        return `
            <div class="form-grid">
                <div class="form-group">
                    <label for="modal-numeroExpediente">N° de Expediente:</label>
                    <input type="text" id="modal-numeroExpediente" value="${expediente?.numeroExpediente || ''}" required>
                </div>
                <div class="form-group">
                    <label for="modal-anioExpediente">Año:</label>
                    <input type="number" id="modal-anioExpediente" value="${expediente?.anioExpediente || new Date().getFullYear()}" min="2020" max="2030" required>
                </div>
                <div class="form-group">
                    <label for="modal-fecha">Fecha:</label>
                    <input type="date" id="modal-fecha" value="${expediente?.fecha || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="modal-numeroResolucion">N° Resolución:</label>
                    <input type="text" id="modal-numeroResolucion" value="${expediente?.numeroResolucion || ''}">
                </div>
                <div class="form-group">
                    <label for="modal-informeTecnico">Informe Técnico:</label>
                    <input type="text" id="modal-informeTecnico" value="${expediente?.informeTecnico || ''}">
                </div>
                <div class="form-group">
                    <label for="modal-unidadNegocio">Unidad de Negocio:</label>
                    <select id="modal-unidadNegocio">
                        <option value="">Seleccionar...</option>
                        ${['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11'].map(c => 
                            `<option value="${c}" ${expediente?.unidadNegocio === c ? 'selected' : ''}>${c}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="modal-nombreEmpresa">Nombre de la Empresa:</label>
                    <input type="text" id="modal-nombreEmpresa" value="${expediente?.nombreEmpresa || ''}">
                </div>
                <div class="form-group">
                    <label for="modal-numeroFichero">N° Fichero:</label>
                    <input type="text" id="modal-numeroFichero" value="${expediente?.numeroFichero || ''}">
                </div>
            </div>
            <div class="form-group full-width">
                <label for="modal-observaciones">Observaciones:</label>
                <textarea id="modal-observaciones" rows="3">${expediente?.observaciones || ''}</textarea>
            </div>
        `;
    }

    async saveExpediente() {
        const operacion = this.currentExpediente ? 'actualizar-expediente' : 'crear-expediente';
        
        try {
            if (window.loadingManager) {
                window.loadingManager.show(operacion, this.currentExpediente ? 'Actualizando expediente...' : 'Creando expediente...');
            }

            const formData = this.getModalFormData();
            
            if (this.currentExpediente) {
                // Actualizar expediente existente
                const resultado = await dataService.updateExpediente(this.currentExpediente._id, formData);
                
                // ✅ OPTIMIZACIÓN: Ocultar loading INMEDIATAMENTE
                if (window.loadingManager) {
                    window.loadingManager.hide(operacion);
                }
                
                if (resultado.success) {
                    this.showSuccess('Expediente actualizado correctamente');
                    this.closeModal();
                    // ✅ OPTIMIZACIÓN: Actualizar solo la fila modificada, sin recargar
                    await this.actualizarExpedienteEnTabla(resultado.expediente);
                } else {
                    this.showError(resultado.message || 'Error al actualizar expediente');
                }
            } else {
                // Crear nuevo expediente
                const resultado = await dataService.createExpediente(formData);
                
                // ✅ OPTIMIZACIÓN: Ocultar loading INMEDIATAMENTE
                if (window.loadingManager) {
                    window.loadingManager.hide(operacion);
                }
                
                if (resultado.success) {
                    this.showSuccess('Expediente creado correctamente');
                    this.closeModal();
                    // ✅ OPTIMIZACIÓN: Agregar al inicio del array, sin recargar
                    await this.agregarExpedienteATabla(resultado.expediente);
                } else {
                    this.showError(resultado.message || 'Error al crear expediente');
                }
            }
            
        } catch (error) {
            // Ocultar loading en caso de error
            if (window.loadingManager) {
                window.loadingManager.hide(operacion);
            }
            
            console.error('Error al guardar expediente:', error);
            this.showError('Error al guardar expediente: ' + error.message);
        }
    }

    /**
     * Actualizar expediente en el array local y re-renderizar (optimización sin API)
     * @param {Object} expedienteActualizado - Expediente actualizado desde la API
     */
    async actualizarExpedienteEnTabla(expedienteActualizado) {
        const index = this.expedientes.findIndex(exp => exp._id === expedienteActualizado._id);
        
        if (index !== -1) {
            // Obtener tarjetas actualizadas
            const resultadoTarjetas = await window.api.invoke('tarjeta:obtener-por-expediente', expedienteActualizado._id);
            const tarjetas = resultadoTarjetas?.success ? resultadoTarjetas.tarjetas : [];
            
            // Preparar expediente completo con tarjetas
            const expedienteCompleto = {
                ...expedienteActualizado,
                expediente: expedienteActualizado.numeroExpediente,
                fecha: expedienteActualizado.fechaExpediente,
                pdfPath: expedienteActualizado.pdfPathActa,
                tarjetasAsociadas: tarjetas
            };
            
            // Actualizar en ambos arrays
            this.expedientes[index] = expedienteCompleto;
            
            const filteredIndex = this.filteredExpedientes.findIndex(exp => exp._id === expedienteActualizado._id);
            if (filteredIndex !== -1) {
                this.filteredExpedientes[filteredIndex] = expedienteCompleto;
            }
            
            // Re-renderizar sin llamar a la API
            this.renderTable();
            console.log('✅ Expediente actualizado en tabla sin recargar');
        }
    }

    /**
     * Agregar nuevo expediente al array local y re-renderizar (optimización sin API)
     * @param {Object} nuevoExpediente - Expediente recién creado desde la API
     */
    async agregarExpedienteATabla(nuevoExpediente) {
        // Obtener tarjetas del expediente
        const resultadoTarjetas = await window.api.invoke('tarjeta:obtener-por-expediente', nuevoExpediente._id);
        const tarjetas = resultadoTarjetas?.success ? resultadoTarjetas.tarjetas : [];
        
        // Preparar expediente completo con tarjetas
        const expedienteCompleto = {
            ...nuevoExpediente,
            expediente: nuevoExpediente.numeroExpediente,
            fecha: nuevoExpediente.fechaExpediente,
            pdfPath: nuevoExpediente.pdfPathActa,
            tarjetasAsociadas: tarjetas
        };
        
        // Agregar al inicio de ambos arrays
        this.expedientes.unshift(expedienteCompleto);
        this.filteredExpedientes.unshift(expedienteCompleto);
        
        // Re-renderizar sin llamar a la API
        this.renderTable();
        console.log('✅ Expediente agregado a tabla sin recargar');
    }

    async deleteExpediente() {
        if (this.currentExpediente) {
            const expedienteCompleto = `${this.currentExpediente.numeroExpediente}-${this.currentExpediente.anioExpediente}`;
            if (confirm(`¿Está seguro de que desea eliminar el expediente ${expedienteCompleto}?`)) {
                await this.deleteExpedienteById(this.currentExpediente._id);
                this.closeModal();
            }
        }
    }

    getModalFormData() {
        return {
            numeroExpediente: document.getElementById('modal-numeroExpediente')?.value?.trim(),
            anioExpediente: parseInt(document.getElementById('modal-anioExpediente')?.value) || new Date().getFullYear(),
            fecha: document.getElementById('modal-fecha')?.value,
            numeroResolucion: document.getElementById('modal-numeroResolucion')?.value?.trim() || null,
            informeTecnico: document.getElementById('modal-informeTecnico')?.value?.trim() || null,
            unidadNegocio: document.getElementById('modal-unidadNegocio')?.value || null,
            nombreEmpresa: document.getElementById('modal-nombreEmpresa')?.value?.trim() || null,
            numeroFichero: document.getElementById('modal-numeroFichero')?.value?.trim() || null,
            observaciones: document.getElementById('modal-observaciones')?.value?.trim() || null
        };
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.currentExpediente = null;
        
        // ✅ OPTIMIZACIÓN: Limpiar formulario completamente
        if (this.modalForm) {
            this.modalForm.innerHTML = '';
        }
        
        // ✅ OPTIMIZACIÓN: Forzar limpieza de loadings para evitar bloqueos
        if (window.loadingManager) {
            window.loadingManager.clearAll();
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