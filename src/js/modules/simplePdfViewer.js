// src/js/modules/simplePdfViewer.js
import * as pdfjsLib from '../../../node_modules/pdfjs-dist/build/pdf.mjs';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

export class SimplePDFViewer {
    constructor() {
        this.currentPdf = null;
        this.scale = 1.4; // Aumentado de 1.0 a 1.4 para mejor visibilidad
        this.rotation = 0;
        this.renderedPages = new Map();
        this.isLoading = false;
        this.pageElements = [];
    }

    async loadPDF(pdfPath) {
        if (this.isLoading) return false;

        try {
            this.isLoading = true;

            // Obtener los datos del PDF desde el backend
            const pdfData = await window.api.invoke('obtener-pdf-data', pdfPath);
            if (!pdfData) {
                throw new Error('No se pudieron obtener los datos del PDF');
            }

            // Cargar el PDF con PDF.js
            const uint8Array = new Uint8Array(pdfData);
            this.currentPdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            this.renderedPages.clear();

            return true;
        } catch (error) {
            console.error('Error al cargar el PDF:', error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    async renderPage(pageNumber, canvas, scale = null, rotation = null) {
        if (!this.currentPdf || !canvas) {
            return false;
        }

        try {
            const page = await this.currentPdf.getPage(pageNumber);
            const currentScale = scale !== null ? scale : this.scale;

            // Obtener la rotación original del PDF y combinarla con la rotación del usuario
            const pageRotation = page.rotate || 0;
            const userRotation = rotation !== null ? rotation : this.rotation;
            const totalRotation = (pageRotation + userRotation) % 360;

            const viewport = page.getViewport({
                scale: currentScale,
                rotation: totalRotation
            });

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Limpiar canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            return true;
        } catch (error) {
            console.error('Error al renderizar la página:', error);
            return false;
        }
    }

    createViewer(containerId, pdfPath, title = 'Visualizador PDF') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Contenedor no encontrado:', containerId);
            return;
        }

        const viewerId = `simple-pdf-viewer-${Date.now()}`;

        // Crear estructura del visor simplificado con altura fija
        const viewerHTML = `
            <div class="simple-pdf-viewer" id="${viewerId}">
                <div class="pdf-controls-bar">
                    <div class="pdf-title">
                        <h4>${title}</h4>
                        <span class="pdf-pages-info">Cargando...</span>
                    </div>
                    <div class="pdf-controls">
                        <button class="pdf-control-btn toggle-viewer" title="Mostrar/Ocultar PDF">
                            <span class="control-text">Ver/Ocultar</span>
                        </button>
                        
                        <div class="control-separator"></div>
                        
                        <button class="pdf-control-btn zoom-out" title="Reducir zoom">
                            <span class="control-text">-</span>
                        </button>
                        <span class="zoom-display">100%</span>
                        <button class="pdf-control-btn zoom-in" title="Aumentar zoom">
                            <span class="control-text">+</span>
                        </button>
                        <button class="pdf-control-btn fit-width" title="Ajustar al ancho">
                            <span class="control-text">Ancho</span>
                        </button>
                        
                        <div class="control-separator"></div>
                        
                        <button class="pdf-control-btn rotate-left" title="Rotar izquierda">
                            <span class="control-icon">↺</span>
                        </button>
                        <button class="pdf-control-btn rotate-right" title="Rotar derecha">
                            <span class="control-icon">↻</span>
                        </button>
                        
                        <div class="control-separator"></div>
                        
                        <button class="pdf-control-btn print-pdf" title="Imprimir PDF (Clic derecho: Ver impresoras)">
                            <span class="control-text">Imprimir</span>
                        </button>
                        <button class="pdf-control-btn download-pdf" title="Descargar PDF">
                            <span class="control-text">Guardar</span>
                        </button>
                        <button class="pdf-control-btn open-external" title="Abrir externo">
                            <span class="control-text">Abrir</span>
                        </button>
                    </div>
                </div>

                <div class="pdf-viewer-container">
                    <div class="pdf-loading-state" style="display: none;">
                        <div class="loading-spinner"></div>
                        <span>Cargando PDF...</span>
                    </div>
                    
                    <div class="pdf-error-state" style="display: none;">
                        <span class="error-message">Error al cargar el PDF</span>
                        <button class="retry-button">Reintentar</button>
                    </div>
                    
                    <div class="pdf-scroll-container">
                        <div class="pdf-pages-wrapper">
                            <!-- Las páginas se renderizan aquí -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', viewerHTML);

        const viewer = container.querySelector(`#${viewerId}`);

        // Agregar estilos
        this.addSimpleStyles();

        // Cargar y mostrar el PDF
        this.loadAndDisplay(pdfPath, viewer);

        // Configurar controles
        this.setupSimpleControls(viewer, pdfPath);

        // Inicializar zoom display
        this.initializeZoomDisplay(viewer);

        return viewer;
    }

    async loadAndDisplay(pdfPath, viewer, retryCount = 0) {
        const loadingDiv = viewer.querySelector('.pdf-loading-state');
        const errorDiv = viewer.querySelector('.pdf-error-state');
        const scrollContainer = viewer.querySelector('.pdf-scroll-container');
        const pagesWrapper = viewer.querySelector('.pdf-pages-wrapper');
        const pagesInfo = viewer.querySelector('.pdf-pages-info');

        const MAX_RETRIES = 2; // Intentar hasta 3 veces (0, 1, 2)

        // Mostrar loading
        loadingDiv.style.display = 'flex';
        errorDiv.style.display = 'none';
        scrollContainer.style.display = 'none';

        // Pequeño delay antes de cargar para evitar problemas de timing
        if (retryCount === 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const success = await this.loadPDF(pdfPath);
        loadingDiv.style.display = 'none';

        if (success) {
            const totalPages = this.currentPdf.numPages;
            pagesInfo.textContent = `${totalPages} página${totalPages > 1 ? 's' : ''}`;

            // Limpiar contenedor
            pagesWrapper.innerHTML = '';
            this.pageElements = [];

            // Crear todas las páginas
            await this.renderAllPages(pagesWrapper, totalPages);

            scrollContainer.style.display = 'block';
        } else {
            // Si falla y no hemos alcanzado el máximo de reintentos, reintentar automáticamente
            if (retryCount < MAX_RETRIES) {
                console.log(`Reintentando cargar PDF (intento ${retryCount + 2}/${MAX_RETRIES + 1})...`);
                const retryDelay = 500 * (retryCount + 1); // Delay creciente: 500ms, 1000ms
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.loadAndDisplay(pdfPath, viewer, retryCount + 1);
            }

            // Si ya agotamos los reintentos, mostrar error
            console.error('No se pudo cargar el PDF después de', MAX_RETRIES + 1, 'intentos');
            errorDiv.style.display = 'flex';
        }
    }

    async renderAllPages(container, totalPages) {
        // Crear elementos para todas las páginas
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.innerHTML = `
                <div class="page-header">
                    <span class="page-number">Página ${pageNum} de ${totalPages}</span>
                </div>
                <div class="page-canvas-container">
                    <canvas class="pdf-page-canvas" data-page="${pageNum}"></canvas>
                </div>
            `;

            container.appendChild(pageContainer);
            this.pageElements.push(pageContainer);

            // Renderizar la página
            const canvas = pageContainer.querySelector('.pdf-page-canvas');
            await this.renderPage(pageNum, canvas);

            // Pequeña pausa para no bloquear la UI
            if (pageNum % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }

    setupSimpleControls(viewer, pdfPath) {
        // Toggle de visibilidad
        const toggleBtn = viewer.querySelector('.toggle-viewer');
        const viewerContainer = viewer.querySelector('.pdf-viewer-container');

        toggleBtn.addEventListener('click', () => {
            const controlText = toggleBtn.querySelector('.control-text');
            if (viewerContainer.style.display === 'none') {
                viewerContainer.style.display = 'block';
                controlText.textContent = 'Ocultar';
            } else {
                viewerContainer.style.display = 'none';
                controlText.textContent = 'Mostrar';
            }
        });

        // Controles de zoom
        const zoomInBtn = viewer.querySelector('.zoom-in');
        const zoomOutBtn = viewer.querySelector('.zoom-out');
        const fitWidthBtn = viewer.querySelector('.fit-width');
        const zoomDisplay = viewer.querySelector('.zoom-display');

        zoomInBtn.addEventListener('click', async () => {
            this.scale = Math.min(this.scale + 0.25, 3.0);
            await this.refreshAllPages(viewer);
            this.updateZoomDisplay(zoomDisplay);
        });

        zoomOutBtn.addEventListener('click', async () => {
            this.scale = Math.max(this.scale - 0.25, 0.5);
            await this.refreshAllPages(viewer);
            this.updateZoomDisplay(zoomDisplay);
        });

        fitWidthBtn.addEventListener('click', async () => {
            await this.fitToContainerWidth(viewer);
            this.updateZoomDisplay(zoomDisplay);
        });

        // Controles de rotación
        const rotateLeftBtn = viewer.querySelector('.rotate-left');
        const rotateRightBtn = viewer.querySelector('.rotate-right');

        rotateLeftBtn.addEventListener('click', async () => {
            this.rotation = (this.rotation - 90) % 360;
            await this.refreshAllPages(viewer);
        });

        rotateRightBtn.addEventListener('click', async () => {
            this.rotation = (this.rotation + 90) % 360;
            await this.refreshAllPages(viewer);
        });

        // Controles de archivo
        const printBtn = viewer.querySelector('.print-pdf');
        const downloadBtn = viewer.querySelector('.download-pdf');
        const openExternalBtn = viewer.querySelector('.open-external');

        printBtn.addEventListener('click', async () => {
            try {
                console.log('Iniciando impresión del PDF:', pdfPath);

                // Mostrar mensaje de carga
                const originalText = printBtn.querySelector('.control-text');
                const originalContent = originalText ? originalText.textContent : '';
                if (originalText) {
                    originalText.textContent = 'Preparando...';
                }
                printBtn.disabled = true;

                // Llamar a la función de impresión
                const result = await window.api.imprimirPdf(pdfPath);

                // Restaurar botón
                printBtn.disabled = false;
                if (originalText) {
                    originalText.textContent = originalContent;
                }

                if (result && result.success) {
                    console.log('PDF enviado a impresión');
                    console.log(`Impresoras disponibles: ${result.printers}`);

                    // Mostrar confirmación visual temporal
                    if (originalText) {
                        originalText.textContent = 'Enviado';
                        setTimeout(() => {
                            originalText.textContent = originalContent;
                        }, 2000);
                    }
                } else {
                    console.warn('Impresión cancelada o fallida');
                }
            } catch (error) {
                console.error('Error al imprimir PDF:', error);
                printBtn.disabled = false;
                const originalText = printBtn.querySelector('.control-text');
                if (originalText) {
                    originalText.textContent = 'Error';
                    setTimeout(() => {
                        originalText.textContent = 'Imprimir';
                    }, 2000);
                }
                alert('Error al intentar imprimir el PDF. Por favor, intente nuevamente.');
            }
        });

        // Clic derecho en el botón de impresión para ver impresoras disponibles
        printBtn.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            await this.showPrintersInfo();
        });

        downloadBtn.addEventListener('click', () => {
            window.api.enviar('descargar-pdf', pdfPath);
        });

        openExternalBtn.addEventListener('click', () => {
            window.api.enviar('abrir-pdf', pdfPath);
        });

        // Retry button
        const retryBtn = viewer.querySelector('.retry-button');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadAndDisplay(pdfPath, viewer);
            });
        }

        // Scroll suave con wheel
        const scrollContainer = viewer.querySelector('.pdf-scroll-container');
        scrollContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            scrollContainer.scrollTop += e.deltaY * 0.5; // Scroll más suave
        });

        // Atajo de teclado Ctrl+P para imprimir
        const handleKeyPress = async (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                console.log('Atajo Ctrl+P detectado - Iniciando impresión...');

                // Simular click en el botón de impresión
                printBtn.click();
            }
        };

        // Agregar listener al visor y al documento
        viewer.addEventListener('keydown', handleKeyPress);
        document.addEventListener('keydown', handleKeyPress);

        // Guardar referencia para poder limpiar después si es necesario
        viewer.dataset.keypressHandler = 'active';
    }

    async refreshAllPages(viewer) {
        const canvases = viewer.querySelectorAll('.pdf-page-canvas');
        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const pageNum = parseInt(canvas.dataset.page);
            await this.renderPage(pageNum, canvas);

            // Pausa pequeña para no bloquear
            if (i % 2 === 0) {
                await new Promise(resolve => setTimeout(resolve, 25));
            }
        }
    }

    async fitToContainerWidth(viewer) {
        const scrollContainer = viewer.querySelector('.pdf-scroll-container');
        const containerWidth = scrollContainer.clientWidth - 40; // Margen

        // Calcular escala basada en el ancho típico de página A4 (aproximado)
        this.scale = Math.min(containerWidth / 595, 2.0); // 595 puntos = ancho A4
        await this.refreshAllPages(viewer);
    }

    updateZoomDisplay(zoomDisplay) {
        const percentage = Math.round(this.scale * 100);
        zoomDisplay.textContent = `${percentage}%`;
    }

    // Método para inicializar el zoom display con el valor correcto
    initializeZoomDisplay(viewer) {
        const zoomDisplay = viewer.querySelector('.zoom-display');
        if (zoomDisplay) {
            this.updateZoomDisplay(zoomDisplay);
        }
    }

    addSimpleStyles() {
        // Los estilos ahora se cargan desde pdfViewer.css
        // Este método se mantiene por compatibilidad pero ya no hace nada
        return;
    }

    /**
     * Obtiene la lista de impresoras disponibles en el sistema
     * @returns {Array} Lista de impresoras con sus detalles
     */
    async getAvailablePrinters() {
        try {
            if (window.api && window.api.obtenerImpresoras) {
                const printers = await window.api.obtenerImpresoras();
                console.log('Impresoras disponibles:', printers);
                return printers;
            }
            return [];
        } catch (error) {
            console.error('Error al obtener impresoras:', error);
            return [];
        }
    }

    /**
     * Muestra un diálogo con información de impresoras disponibles
     */
    async showPrintersInfo() {
        const printers = await this.getAvailablePrinters();

        if (printers.length === 0) {
            alert('No se detectaron impresoras en el sistema.');
            return;
        }

        const defaultPrinter = printers.find(p => p.isDefault);
        let message = `Se detectaron ${printers.length} impresora(s):\n\n`;

        printers.forEach((printer, index) => {
            message += `${index + 1}. ${printer.displayName || printer.name}`;
            if (printer.isDefault) {
                message += ' (Predeterminada)';
            }
            message += `\n   Estado: ${printer.status || 'Desconocido'}\n`;
            if (printer.description) {
                message += `   ${printer.description}\n`;
            }
            message += '\n';
        });

        console.log(message);
        alert(message);
    }
}

// Instancia global del visor simple
export const simplePdfViewer = new SimplePDFViewer();