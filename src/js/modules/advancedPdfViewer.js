// src/js/modules/advancedPdfViewer.js
import * as pdfjsLib from '../../../node_modules/pdfjs-dist/build/pdf.mjs';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

export class AdvancedPDFViewer {
    constructor() {
        this.currentPdf = null;
        this.currentPage = 1;
        this.scale = 1.0;
        this.rotation = 0;
        this.viewMode = 'single'; // 'single', 'continuous', 'grid'
        this.renderedPages = new Map();
        this.thumbnails = [];
        this.isLoading = false;
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
            this.currentPage = 1;
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
            console.error('PDF no cargado o canvas no disponible');
            return false;
        }

        try {
            const page = await this.currentPdf.getPage(pageNumber);
            const currentScale = scale !== null ? scale : this.scale;
            const currentRotation = rotation !== null ? rotation : this.rotation;

            const viewport = page.getViewport({
                scale: currentScale,
                rotation: currentRotation
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

            // Guardar en cache
            this.renderedPages.set(`${pageNumber}-${currentScale}-${currentRotation}`, {
                canvas: canvas.cloneNode(),
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('Error al renderizar la página:', error);
            return false;
        }
    }

    async renderThumbnail(pageNumber, canvas) {
        if (!this.currentPdf) return false;

        try {
            const page = await this.currentPdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 0.2 }); // Escala pequeña para miniaturas

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.maxWidth = '120px';
            canvas.style.maxHeight = '160px';

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            return true;
        } catch (error) {
            console.error('Error al renderizar miniatura:', error);
            return false;
        }
    }

    createViewer(containerId, pdfPath, title = 'PDF Viewer') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Contenedor no encontrado:', containerId);
            return;
        }

        const viewerId = `pdf-viewer-${Date.now()}`;

        // Crear estructura del visor avanzado
        const viewerHTML = `
            <div class="advanced-pdf-viewer" id="${viewerId}">
                <div class="pdf-header">
                    <div class="pdf-title">
                        <h4>${title}</h4>
                        <div class="pdf-info">
                            <span class="page-counter">Página <span class="current-page">1</span> de <span class="total-pages">1</span></span>
                            <span class="zoom-level">100%</span>
                        </div>
                    </div>
                    <div class="pdf-toolbar">
                        <div class="toolbar-group">
                            <button class="pdf-btn toggle-viewer" title="Mostrar/Ocultar PDF">
                                <span class="btn-text">Ver/Ocultar</span>
                            </button>
                            <button class="pdf-btn toggle-thumbnails" title="Panel de miniaturas">
                                <span class="btn-text">Miniaturas</span>
                            </button>
                        </div>
                        
                        <div class="toolbar-group navigation-group">
                            <button class="pdf-btn first-page" title="Primera página">
                                <span class="btn-text">|&lt;</span>
                            </button>
                            <button class="pdf-btn prev-page" title="Página anterior">
                                <span class="btn-text">&lt;</span>
                            </button>
                            <input type="number" class="page-input" min="1" value="1" title="Ir a página">
                            <button class="pdf-btn next-page" title="Página siguiente">
                                <span class="btn-text">&gt;</span>
                            </button>
                            <button class="pdf-btn last-page" title="Última página">
                                <span class="btn-text">&gt;|</span>
                            </button>
                        </div>

                        <div class="toolbar-group zoom-group">
                            <button class="pdf-btn zoom-out" title="Reducir zoom">
                                <span class="btn-text">-</span>
                            </button>
                            <select class="zoom-select">
                                <option value="0.5">50%</option>
                                <option value="0.75">75%</option>
                                <option value="1" selected>100%</option>
                                <option value="1.25">125%</option>
                                <option value="1.5">150%</option>
                                <option value="2">200%</option>
                                <option value="fit-width">Ajustar ancho</option>
                                <option value="fit-page">Ajustar página</option>
                            </select>
                            <button class="pdf-btn zoom-in" title="Aumentar zoom">
                                <span class="btn-text">+</span>
                            </button>
                        </div>

                        <div class="toolbar-group rotation-group">
                            <button class="pdf-btn rotate-left" title="Rotar izquierda">
                                <span class="btn-icon">↺</span>
                            </button>
                            <button class="pdf-btn rotate-right" title="Rotar derecha">
                                <span class="btn-icon">↻</span>
                            </button>
                        </div>

                        <div class="toolbar-group view-group">
                            <select class="view-mode-select">
                                <option value="single">Vista simple</option>
                                <option value="continuous">Vista continua</option>
                                <option value="grid">Vista grilla</option>
                            </select>
                        </div>

                        <div class="toolbar-group actions-group">
                            <button class="pdf-btn download-pdf" title="Descargar PDF">
                                <span class="btn-text">Guardar</span>
                            </button>
                            <button class="pdf-btn print-pdf" title="Imprimir PDF">
                                <span class="btn-text">Imprimir</span>
                            </button>
                            <button class="pdf-btn open-external" title="Abrir en aplicación externa">
                                <span class="btn-text">Abrir</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="pdf-content" style="display: block;">
                    <div class="pdf-sidebar">
                        <div class="thumbnails-panel">
                            <h5>Páginas</h5>
                            <div class="thumbnails-container"></div>
                        </div>
                    </div>
                    
                    <div class="pdf-main-content">
                        <div class="pdf-loading" style="display: none;">
                            <div class="loading-spinner"></div>
                            <span>Cargando PDF...</span>
                        </div>
                        
                        <div class="pdf-error" style="display: none;">
                            <span class="error-message">Error al cargar el PDF</span>
                            <button class="retry-btn">Reintentar</button>
                        </div>
                        
                        <div class="pdf-viewport">
                            <!-- Las páginas se renderizan aquí -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', viewerHTML);

        const viewer = container.querySelector(`#${viewerId}`);

        // Inicializar estilos
        this.addStyles();

        // Cargar y mostrar el PDF
        this.loadAndDisplay(pdfPath, viewer);

        // Configurar controles
        this.setupAdvancedControls(viewer, pdfPath);

        return viewer;
    }

    async loadAndDisplay(pdfPath, viewer) {
        const loadingDiv = viewer.querySelector('.pdf-loading');
        const errorDiv = viewer.querySelector('.pdf-error');
        const viewport = viewer.querySelector('.pdf-viewport');

        // Mostrar loading
        loadingDiv.style.display = 'flex';
        errorDiv.style.display = 'none';
        viewport.innerHTML = '';

        const success = await this.loadPDF(pdfPath);
        loadingDiv.style.display = 'none';

        if (success) {
            // Actualizar información de páginas
            const totalPages = this.currentPdf.numPages;
            viewer.querySelector('.total-pages').textContent = totalPages;
            viewer.querySelector('.page-input').max = totalPages;

            // Generar todas las páginas según el modo de vista
            await this.renderAllPages(viewer);

            // Generar miniaturas
            await this.generateThumbnails(viewer);

            this.updatePageInfo(viewer);
        } else {
            errorDiv.style.display = 'flex';
        }
    }

    async renderAllPages(viewer) {
        const viewport = viewer.querySelector('.pdf-viewport');
        viewport.innerHTML = '';

        const totalPages = this.currentPdf.numPages;

        if (this.viewMode === 'single') {
            // Solo renderizar la página actual
            await this.renderSinglePage(viewer, this.currentPage);
        } else if (this.viewMode === 'continuous') {
            // Renderizar todas las páginas en una vista continua
            for (let i = 1; i <= totalPages; i++) {
                await this.renderPageInViewport(viewer, i);
            }
        } else if (this.viewMode === 'grid') {
            // Renderizar en formato grilla (2 columnas)
            for (let i = 1; i <= totalPages; i++) {
                await this.renderPageInGrid(viewer, i);
            }
        }
    }

    async renderSinglePage(viewer, pageNumber) {
        const viewport = viewer.querySelector('.pdf-viewport');
        viewport.innerHTML = '';

        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container single-page';
        pageContainer.innerHTML = `
            <div class="page-number">Página ${pageNumber}</div>
            <canvas class="pdf-page-canvas" data-page="${pageNumber}"></canvas>
        `;

        viewport.appendChild(pageContainer);

        const canvas = pageContainer.querySelector('.pdf-page-canvas');
        await this.renderPage(pageNumber, canvas);
    }

    async renderPageInViewport(viewer, pageNumber) {
        const viewport = viewer.querySelector('.pdf-viewport');

        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container continuous-page';
        pageContainer.innerHTML = `
            <div class="page-number">Página ${pageNumber}</div>
            <canvas class="pdf-page-canvas" data-page="${pageNumber}"></canvas>
        `;

        viewport.appendChild(pageContainer);

        const canvas = pageContainer.querySelector('.pdf-page-canvas');
        await this.renderPage(pageNumber, canvas);
    }

    async renderPageInGrid(viewer, pageNumber) {
        const viewport = viewer.querySelector('.pdf-viewport');

        // Crear contenedor de grilla si no existe
        let gridContainer = viewport.querySelector('.pdf-grid-container');
        if (!gridContainer) {
            gridContainer = document.createElement('div');
            gridContainer.className = 'pdf-grid-container';
            viewport.appendChild(gridContainer);
        }

        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container grid-page';
        pageContainer.innerHTML = `
            <div class="page-number">Página ${pageNumber}</div>
            <canvas class="pdf-page-canvas" data-page="${pageNumber}"></canvas>
        `;

        gridContainer.appendChild(pageContainer);

        const canvas = pageContainer.querySelector('.pdf-page-canvas');
        await this.renderPage(pageNumber, canvas, 0.8); // Escala reducida para grilla
    }

    async generateThumbnails(viewer) {
        const thumbnailsContainer = viewer.querySelector('.thumbnails-container');
        thumbnailsContainer.innerHTML = '';

        const totalPages = this.currentPdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = 'thumbnail-item';
            if (i === this.currentPage) {
                thumbnailDiv.classList.add('active');
            }

            thumbnailDiv.innerHTML = `
                <canvas class="thumbnail-canvas" data-page="${i}"></canvas>
                <div class="thumbnail-number">${i}</div>
            `;

            thumbnailDiv.addEventListener('click', async () => {
                this.currentPage = i;
                await this.goToPage(viewer, i);
                this.updateThumbnailSelection(viewer);
            });

            thumbnailsContainer.appendChild(thumbnailDiv);

            const canvas = thumbnailDiv.querySelector('.thumbnail-canvas');
            await this.renderThumbnail(i, canvas);
        }
    }

    async goToPage(viewer, pageNumber) {
        if (pageNumber < 1 || pageNumber > this.currentPdf.numPages) return;

        this.currentPage = pageNumber;

        if (this.viewMode === 'single') {
            await this.renderSinglePage(viewer, pageNumber);
        } else {
            // En vista continua o grilla, hacer scroll a la página
            const pageElement = viewer.querySelector(`[data-page="${pageNumber}"]`);
            if (pageElement) {
                pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        this.updatePageInfo(viewer);
        this.updateThumbnailSelection(viewer);
    }

    updateThumbnailSelection(viewer) {
        viewer.querySelectorAll('.thumbnail-item').forEach((item, index) => {
            if (index + 1 === this.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    setupAdvancedControls(viewer, pdfPath) {
        // Controles de navegación
        this.setupNavigationControls(viewer);

        // Controles de zoom
        this.setupZoomControls(viewer);

        // Controles de rotación
        this.setupRotationControls(viewer);

        // Controles de vista
        this.setupViewControls(viewer);

        // Controles de acción
        this.setupActionControls(viewer, pdfPath);

        // Toggle de visibilidad
        this.setupToggleControls(viewer);
    }

    setupNavigationControls(viewer) {
        const firstBtn = viewer.querySelector('.first-page');
        const prevBtn = viewer.querySelector('.prev-page');
        const nextBtn = viewer.querySelector('.next-page');
        const lastBtn = viewer.querySelector('.last-page');
        const pageInput = viewer.querySelector('.page-input');

        firstBtn.addEventListener('click', () => this.goToPage(viewer, 1));

        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.goToPage(viewer, this.currentPage - 1);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (this.currentPage < this.currentPdf.numPages) {
                this.goToPage(viewer, this.currentPage + 1);
            }
        });

        lastBtn.addEventListener('click', () => {
            this.goToPage(viewer, this.currentPdf.numPages);
        });

        pageInput.addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (pageNum >= 1 && pageNum <= this.currentPdf.numPages) {
                this.goToPage(viewer, pageNum);
            }
        });

        // Navegación con teclado
        document.addEventListener('keydown', (e) => {
            if (viewer.querySelector('.pdf-content').style.display !== 'none') {
                if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    e.preventDefault();
                    prevBtn.click();
                } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                    e.preventDefault();
                    nextBtn.click();
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    firstBtn.click();
                } else if (e.key === 'End') {
                    e.preventDefault();
                    lastBtn.click();
                }
            }
        });
    }

    setupZoomControls(viewer) {
        const zoomInBtn = viewer.querySelector('.zoom-in');
        const zoomOutBtn = viewer.querySelector('.zoom-out');
        const zoomSelect = viewer.querySelector('.zoom-select');

        zoomInBtn.addEventListener('click', async () => {
            this.scale = Math.min(this.scale + 0.25, 3.0);
            await this.refreshCurrentView(viewer);
        });

        zoomOutBtn.addEventListener('click', async () => {
            this.scale = Math.max(this.scale - 0.25, 0.25);
            await this.refreshCurrentView(viewer);
        });

        zoomSelect.addEventListener('change', async (e) => {
            const value = e.target.value;
            if (value === 'fit-width') {
                this.fitToWidth(viewer);
            } else if (value === 'fit-page') {
                this.fitToPage(viewer);
            } else {
                this.scale = parseFloat(value);
                await this.refreshCurrentView(viewer);
            }
        });
    }

    setupRotationControls(viewer) {
        const rotateLeftBtn = viewer.querySelector('.rotate-left');
        const rotateRightBtn = viewer.querySelector('.rotate-right');

        rotateLeftBtn.addEventListener('click', async () => {
            this.rotation = (this.rotation - 90) % 360;
            await this.refreshCurrentView(viewer);
        });

        rotateRightBtn.addEventListener('click', async () => {
            this.rotation = (this.rotation + 90) % 360;
            await this.refreshCurrentView(viewer);
        });
    }

    setupViewControls(viewer) {
        const viewModeSelect = viewer.querySelector('.view-mode-select');

        viewModeSelect.addEventListener('change', async (e) => {
            this.viewMode = e.target.value;
            await this.renderAllPages(viewer);

            // Mostrar/ocultar panel de miniaturas según el modo
            const sidebar = viewer.querySelector('.pdf-sidebar');
            if (this.viewMode === 'single') {
                sidebar.style.display = 'block';
            } else {
                sidebar.style.display = 'none';
            }
        });
    }

    setupActionControls(viewer, pdfPath) {
        const downloadBtn = viewer.querySelector('.download-pdf');
        const printBtn = viewer.querySelector('.print-pdf');
        const openExternalBtn = viewer.querySelector('.open-external');

        downloadBtn.addEventListener('click', () => {
            // Implementar descarga del PDF
            window.api.enviar('descargar-pdf', pdfPath);
        });

        printBtn.addEventListener('click', () => {
            // Implementar impresión del PDF
            window.print();
        });

        openExternalBtn.addEventListener('click', () => {
            window.api.enviar('abrir-pdf', pdfPath);
        });
    }

    setupToggleControls(viewer) {
        const toggleViewerBtn = viewer.querySelector('.toggle-viewer');
        const toggleThumbnailsBtn = viewer.querySelector('.toggle-thumbnails');
        const pdfContent = viewer.querySelector('.pdf-content');
        const sidebar = viewer.querySelector('.pdf-sidebar');

        toggleViewerBtn.addEventListener('click', () => {
            const btnText = toggleViewerBtn.querySelector('.btn-text');
            if (pdfContent.style.display === 'none') {
                pdfContent.style.display = 'flex';
                btnText.textContent = 'Ocultar';
            } else {
                pdfContent.style.display = 'none';
                btnText.textContent = 'Mostrar';
            }
        });

        toggleThumbnailsBtn.addEventListener('click', () => {
            if (sidebar.style.display === 'none') {
                sidebar.style.display = 'block';
            } else {
                sidebar.style.display = 'none';
            }
        });
    }

    async refreshCurrentView(viewer) {
        if (this.viewMode === 'single') {
            await this.renderSinglePage(viewer, this.currentPage);
        } else {
            await this.renderAllPages(viewer);
        }
        this.updateZoomInfo(viewer);
    }

    fitToWidth(viewer) {
        const viewport = viewer.querySelector('.pdf-viewport');
        const containerWidth = viewport.clientWidth - 40; // Margen
        // Calcular escala basada en el ancho del contenedor
        // Esta es una aproximación, se puede mejorar obteniendo el ancho real de la página
        this.scale = containerWidth / 600; // 600 es el ancho aproximado de una página A4
        this.refreshCurrentView(viewer);
    }

    fitToPage(viewer) {
        const viewport = viewer.querySelector('.pdf-viewport');
        const containerHeight = viewport.clientHeight - 40;
        // Calcular escala basada en la altura del contenedor
        this.scale = containerHeight / 800; // 800 es la altura aproximada de una página A4
        this.refreshCurrentView(viewer);
    }

    updatePageInfo(viewer) {
        viewer.querySelector('.current-page').textContent = this.currentPage;
        viewer.querySelector('.page-input').value = this.currentPage;
    }

    updateZoomInfo(viewer) {
        const percentage = Math.round(this.scale * 100);
        viewer.querySelector('.zoom-level').textContent = `${percentage}%`;
        viewer.querySelector('.zoom-select').value = this.scale.toString();
    }

    addStyles() {
        if (document.getElementById('advanced-pdf-styles')) return;

        const style = document.createElement('style');
        style.id = 'advanced-pdf-styles';
        style.textContent = `
            .advanced-pdf-viewer {
                border: 1px solid #ddd;
                border-radius: 8px;
                margin: 20px 0;
                background: white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .pdf-header {
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
                border-radius: 8px 8px 0 0;
                padding: 12px 16px;
            }

            .pdf-title {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .pdf-title h4 {
                margin: 0;
                color: #333;
                font-size: 1.1rem;
            }

            .pdf-info {
                display: flex;
                gap: 20px;
                font-size: 0.9rem;
                color: #666;
            }

            .pdf-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                align-items: center;
            }

            .toolbar-group {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 0 8px;
                border-right: 1px solid #ddd;
            }

            .toolbar-group:last-child {
                border-right: none;
            }

            .pdf-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 10px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: all 0.2s ease;
            }

            .pdf-btn:hover {
                background: #f0f0f0;
                border-color: #bbb;
            }

            .pdf-btn:active {
                background: #e0e0e0;
            }

            .pdf-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .btn-icon {
                font-size: 1rem;
            }

            .btn-text {
                font-size: 0.8rem;
            }

            .page-input, .zoom-select, .view-mode-select {
                padding: 4px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.85rem;
                min-width: 60px;
            }

            .pdf-content {
                display: flex;
                height: 600px;
                background: #f5f5f5;
            }

            .pdf-sidebar {
                width: 200px;
                border-right: 1px solid #ddd;
                background: white;
                overflow-y: auto;
            }

            .thumbnails-panel h5 {
                margin: 12px;
                font-size: 0.9rem;
                color: #333;
            }

            .thumbnails-container {
                padding: 0 8px;
            }

            .thumbnail-item {
                margin-bottom: 12px;
                padding: 6px;
                border: 2px solid transparent;
                border-radius: 4px;
                cursor: pointer;
                transition: border-color 0.2s ease;
                text-align: center;
            }

            .thumbnail-item:hover {
                border-color: #007bff;
                background: #f8f9fa;
            }

            .thumbnail-item.active {
                border-color: #007bff;
                background: #e3f2fd;
            }

            .thumbnail-canvas {
                display: block;
                margin: 0 auto 4px;
                border: 1px solid #ddd;
                border-radius: 2px;
            }

            .thumbnail-number {
                font-size: 0.75rem;
                color: #666;
            }

            .pdf-main-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .pdf-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #666;
                gap: 16px;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .pdf-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #dc3545;
                gap: 16px;
            }

            .error-icon {
                font-size: 2rem;
            }

            .retry-btn {
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .pdf-viewport {
                flex: 1;
                overflow: auto;
                padding: 20px;
                background: #f5f5f5;
            }

            .pdf-page-container {
                margin-bottom: 20px;
                text-align: center;
                background: white;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                padding: 16px;
                position: relative;
            }

            .pdf-page-container.single-page {
                max-width: fit-content;
                margin: 0 auto 20px;
            }

            .pdf-grid-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }

            .pdf-page-container.grid-page {
                margin-bottom: 0;
            }

            .page-number {
                position: absolute;
                top: 8px;
                left: 12px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                z-index: 10;
            }

            .pdf-page-canvas {
                display: block;
                margin: 0 auto;
                border: 1px solid #ddd;
                border-radius: 4px;
                max-width: 100%;
                height: auto;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .pdf-toolbar {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .toolbar-group {
                    border-right: none;
                    border-bottom: 1px solid #ddd;
                    padding: 8px 0;
                    justify-content: center;
                }
                
                .pdf-content {
                    height: 500px;
                }
                
                .pdf-sidebar {
                    width: 150px;
                }
                
                .pdf-grid-container {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Instancia global del visor avanzado
export const advancedPdfViewer = new AdvancedPDFViewer();