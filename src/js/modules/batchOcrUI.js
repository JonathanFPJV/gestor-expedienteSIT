/**
 * Módulo: UI para Procesamiento por Lotes (Batch OCR)
 * 
 * Gestiona la interfaz visual del procesamiento batch:
 * - Barra de progreso por página
 * - Tabla de resultados
 * - Mensajes de estado
 * - Animaciones de feedback
 */

class BatchOcrUI {
    constructor() {
        this.progressBar = null;
        this.statusMessage = null;
        this.resultsContainer = null;
        this.isProcessing = false;
    }

    /**
     * Inicializa los elementos de la UI
     */
    initialize() {
        // Contenedor de progreso ya debe existir en el HTML
        this.progressBar = document.getElementById('batch-progress-bar');
        this.statusMessage = document.getElementById('batch-status-message');
        this.resultsContainer = document.getElementById('batch-results-table');
        
        console.log('🎨 BatchOcrUI inicializado');
    }

    /**
     * Muestra el inicio del procesamiento
     * @param {number} totalPages - Total de páginas a procesar
     */
    showProcessingStart(totalPages) {
        this.isProcessing = true;
        
        // Mostrar contenedor de progreso
        const progressContainer = document.getElementById('batch-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        // Resetear barra de progreso
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.setAttribute('aria-valuenow', 0);
        }

        // Mensaje inicial
        this.updateMessage(`🔄 Iniciando procesamiento de ${totalPages} página${totalPages > 1 ? 's' : ''}...`);
        
        // Limpiar tabla de resultados
        if (this.resultsContainer) {
            const tbody = this.resultsContainer.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '';
            }
        }

        console.log(`🚀 Procesamiento batch iniciado: ${totalPages} páginas`);
    }

    /**
     * Actualiza el progreso del procesamiento
     * @param {number} currentPage - Página actual
     * @param {number} totalPages - Total de páginas
     * @param {Object} pageData - Datos extraídos de la página
     */
    updateProgress(currentPage, totalPages, pageData) {
        const percentage = Math.round((currentPage / totalPages) * 100);

        // Actualizar barra de progreso
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
            this.progressBar.setAttribute('aria-valuenow', percentage);
            this.progressBar.textContent = `${percentage}%`;
        }

        // Actualizar mensaje
        this.updateMessage(`📄 Procesando página ${currentPage} de ${totalPages}...`);

        // Agregar fila a la tabla de resultados
        this.addResultRow(pageData);

        console.log(`📊 Progreso: ${currentPage}/${totalPages} (${percentage}%)`);
    }

    /**
     * Muestra el resultado final del procesamiento
     * @param {Array} results - Array de resultados por página
     */
    showProcessingComplete(results) {
        this.isProcessing = false;

        const successCount = results.filter(r => r.success).length;
        const totalPages = results.length;

        // Actualizar barra a 100%
        if (this.progressBar) {
            this.progressBar.style.width = '100%';
            this.progressBar.setAttribute('aria-valuenow', 100);
            this.progressBar.textContent = '100%';
            this.progressBar.classList.add('bg-success');
        }

        // Mensaje de completado
        this.updateMessage(
            `✅ Procesamiento completado: ${successCount}/${totalPages} páginas procesadas exitosamente`,
            'success'
        );

        console.log(`✅ Procesamiento batch completado: ${successCount}/${totalPages} exitosos`);
    }

    /**
     * Muestra un error en el procesamiento
     * @param {string} errorMessage - Mensaje de error
     */
    showError(errorMessage) {
        this.isProcessing = false;

        if (this.progressBar) {
            this.progressBar.classList.remove('bg-success');
            this.progressBar.classList.add('bg-danger');
        }

        this.updateMessage(`❌ Error: ${errorMessage}`, 'error');

        console.error(`❌ Error en procesamiento batch: ${errorMessage}`);
    }

    /**
     * Actualiza el mensaje de estado
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'info', 'success', 'error'
     */
    updateMessage(message, type = 'info') {
        if (this.statusMessage) {
            this.statusMessage.textContent = message;
            
            // Remover clases anteriores
            this.statusMessage.classList.remove('text-info', 'text-success', 'text-danger');
            
            // Agregar clase según tipo
            switch (type) {
                case 'success':
                    this.statusMessage.classList.add('text-success');
                    break;
                case 'error':
                    this.statusMessage.classList.add('text-danger');
                    break;
                default:
                    this.statusMessage.classList.add('text-info');
            }
        }
    }

    /**
     * Agrega una fila a la tabla de resultados
     * @param {Object} pageData - Datos de la página procesada
     */
    addResultRow(pageData) {
        if (!this.resultsContainer) return;

        const tbody = this.resultsContainer.querySelector('tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        
        // Determinar estado
        const status = pageData.success ? '✅' : '❌';
        const statusClass = pageData.success ? 'table-success' : 'table-danger';
        
        row.className = statusClass;
        row.setAttribute('data-page', pageData.pageNumber);
        
        // Verificar si tiene ruta de PDF
        const pdfPathHtml = pageData.pdfPath 
            ? `<small class="text-success" title="${pageData.pdfPath}">📄 PDF generado</small>`
            : '<em class="text-muted">-</em>';
        
        row.innerHTML = `
            <td class="text-center">${status}</td>
            <td class="text-center">${pageData.pageNumber}</td>
            <td>${pageData.data?.codigoUnico || '<em class="text-muted">No detectado</em>'}</td>
            <td>${pageData.data?.placaRodaje || '<em class="text-muted">No detectado</em>'}</td>
            <td class="text-center pdf-path-cell">${pdfPathHtml}</td>
            <td class="text-center">
                ${pageData.data?.codigoUnico && pageData.data?.placaRodaje 
                    ? '<span class="badge bg-success">2/2</span>' 
                    : pageData.data?.codigoUnico || pageData.data?.placaRodaje
                    ? '<span class="badge bg-warning">1/2</span>'
                    : '<span class="badge bg-danger">0/2</span>'}
            </td>
            <td class="text-center">
                ${pageData.success 
                    ? `<button class="btn-small btn-apply-single" data-page="${pageData.pageNumber}" title="Aplicar esta tarjeta">
                        ➕ Aplicar
                       </button>` 
                    : '<em class="text-muted">-</em>'}
            </td>
        `;

        tbody.appendChild(row);

        // Agregar event listener al botón de aplicar individual
        const applyBtn = row.querySelector('.btn-apply-single');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySingleCard(pageData);
            });
        }

        // Scroll automático a la última fila
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Aplica una tarjeta individual al formulario
     * @param {Object} pageData - Datos de la página
     */
    applySingleCard(pageData) {
        if (!pageData.data || (!pageData.data.placaRodaje && !pageData.data.codigoUnico)) {
            console.warn('⚠️ No hay datos para aplicar');
            return;
        }

        console.log(`🎯 Aplicando tarjeta de página ${pageData.pageNumber}:`, pageData.data);

        // Agregar nueva tarjeta al formulario
        const tarjetasList = document.getElementById('tarjetas-list');
        if (!tarjetasList) return;

        // Usar la función de UI existente
        if (window.ui && window.ui.addTarjetaInput) {
            window.ui.addTarjetaInput();

            // Obtener la última tarjeta agregada
            const tarjetaInputs = tarjetasList.querySelectorAll('.tarjeta-item');
            const lastTarjeta = tarjetaInputs[tarjetaInputs.length - 1];

            if (lastTarjeta) {
                const placaInput = lastTarjeta.querySelector('input[placeholder="Placa"]');
                const numeroInput = lastTarjeta.querySelector('input[placeholder="N° Tarjeta"]');
                const pdfInput = lastTarjeta.querySelector('.pdf-tarjeta-path');

                if (placaInput && pageData.data.placaRodaje) {
                    placaInput.value = pageData.data.placaRodaje;
                    placaInput.classList.add('autofilled');
                    setTimeout(() => placaInput.classList.remove('autofilled'), 2000);
                }

                if (numeroInput && pageData.data.codigoUnico) {
                    numeroInput.value = pageData.data.codigoUnico;
                    numeroInput.classList.add('autofilled');
                    setTimeout(() => numeroInput.classList.remove('autofilled'), 2000);
                }

                // Si hay PDF generado, asignar la ruta directamente al input
                if (pageData.pdfPath && pdfInput) {
                    pdfInput.value = pageData.pdfPath;
                    pdfInput.classList.add('autofilled');
                    setTimeout(() => pdfInput.classList.remove('autofilled'), 2000);
                    
                    console.log(`   📄 PDF asignado: ${pageData.pdfPath}`);
                }

                // Mostrar notificación
                if (window.ui && window.ui.showNotification) {
                    window.ui.showNotification(
                        `✅ Tarjeta de página ${pageData.pageNumber} agregada`,
                        'success'
                    );
                }

                // Scroll a la tarjeta agregada
                lastTarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    /**
     * Actualiza las filas de la tabla con las rutas de los PDFs generados
     * @param {Array} results - Array de resultados con rutas actualizadas
     */
    updatePdfPaths(results) {
        if (!this.resultsContainer) return;

        const tbody = this.resultsContainer.querySelector('tbody');
        if (!tbody) return;

        results.forEach(result => {
            if (result.pdfPath) {
                const row = tbody.querySelector(`tr[data-page="${result.pageNumber}"]`);
                if (row) {
                    const pdfPathCell = row.querySelector('.pdf-path-cell');
                    if (pdfPathCell) {
                        const fileName = result.pdfPath.split('\\').pop();
                        pdfPathCell.innerHTML = `
                            <small class="text-success" title="${result.pdfPath}">
                                📄 ${fileName}
                            </small>
                        `;
                        
                        // Animar la actualización
                        pdfPathCell.classList.add('autofilled');
                        setTimeout(() => pdfPathCell.classList.remove('autofilled'), 2000);
                    }
                }
            }
        });

        console.log('✅ Rutas de PDF actualizadas en la tabla');
    }

    /**
     * Oculta el contenedor de progreso
     */
    hide() {
        const progressContainer = document.getElementById('batch-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    /**
     * Resetea la UI a estado inicial
     */
    reset() {
        this.isProcessing = false;

        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.setAttribute('aria-valuenow', 0);
            this.progressBar.textContent = '0%';
            this.progressBar.classList.remove('bg-success', 'bg-danger');
        }

        if (this.statusMessage) {
            this.statusMessage.textContent = '';
        }

        if (this.resultsContainer) {
            const tbody = this.resultsContainer.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '';
            }
        }

        console.log('🔄 BatchOcrUI reseteado');
    }
}

// Exportar como singleton
const batchOcrUI = new BatchOcrUI();
export default batchOcrUI;
