// src/js/modules/simplePdfViewer.js
import * as pdfjsLib from '../../../node_modules/pdfjs-dist/build/pdf.mjs';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

export class SimplePDFViewer {
    constructor() {
        this.currentPdf = null;
        this.scale = 1.0;
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
                            <span class="control-icon">👁️</span>
                            <span class="control-text">Ocultar</span>
                        </button>
                        
                        <div class="control-separator"></div>
                        
                        <button class="pdf-control-btn zoom-out" title="Reducir zoom">
                            <span class="control-icon">🔍➖</span>
                        </button>
                        <span class="zoom-display">100%</span>
                        <button class="pdf-control-btn zoom-in" title="Aumentar zoom">
                            <span class="control-icon">🔍➕</span>
                        </button>
                        <button class="pdf-control-btn fit-width" title="Ajustar al ancho">
                            <span class="control-icon">↔️</span>
                        </button>
                        
                        <div class="control-separator"></div>
                        
                        <button class="pdf-control-btn rotate-left" title="Rotar izquierda">
                            <span class="control-icon">↺</span>
                        </button>
                        <button class="pdf-control-btn rotate-right" title="Rotar derecha">
                            <span class="control-icon">↻</span>
                        </button>
                        
                        <div class="control-separator"></div>
                        
                        <button class="pdf-control-btn download-pdf" title="Descargar PDF">
                            <span class="control-icon">💾</span>
                        </button>
                        <button class="pdf-control-btn open-external" title="Abrir externo">
                            <span class="control-icon">🔗</span>
                        </button>
                    </div>
                </div>

                <div class="pdf-viewer-container">
                    <div class="pdf-loading-state" style="display: none;">
                        <div class="loading-spinner"></div>
                        <span>Cargando PDF...</span>
                    </div>
                    
                    <div class="pdf-error-state" style="display: none;">
                        <span class="error-icon">⚠️</span>
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
        
        return viewer;
    }

    async loadAndDisplay(pdfPath, viewer) {
        const loadingDiv = viewer.querySelector('.pdf-loading-state');
        const errorDiv = viewer.querySelector('.pdf-error-state');
        const scrollContainer = viewer.querySelector('.pdf-scroll-container');
        const pagesWrapper = viewer.querySelector('.pdf-pages-wrapper');
        const pagesInfo = viewer.querySelector('.pdf-pages-info');
        
        // Mostrar loading
        loadingDiv.style.display = 'flex';
        errorDiv.style.display = 'none';
        scrollContainer.style.display = 'none';
        
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
        const downloadBtn = viewer.querySelector('.download-pdf');
        const openExternalBtn = viewer.querySelector('.open-external');

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

    addSimpleStyles() {
        if (document.getElementById('simple-pdf-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'simple-pdf-styles';
        style.textContent = `
            .simple-pdf-viewer {
                border: 1px solid #ddd;
                border-radius: 8px;
                margin: 15px 0;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .pdf-controls-bar {
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
                border-radius: 8px 8px 0 0;
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }

            .pdf-title h4 {
                margin: 0 0 5px 0;
                color: #333;
                font-size: 1rem;
            }

            .pdf-pages-info {
                font-size: 0.85rem;
                color: #666;
            }

            .pdf-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .pdf-control-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 10px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s ease;
                min-height: 32px;
            }

            .pdf-control-btn:hover {
                background: #f0f0f0;
                border-color: #bbb;
                transform: translateY(-1px);
            }

            .pdf-control-btn:active {
                background: #e0e0e0;
                transform: translateY(0);
            }

            .control-icon {
                font-size: 0.9rem;
            }

            .control-text {
                font-size: 0.75rem;
                font-weight: 500;
            }

            .control-separator {
                width: 1px;
                height: 24px;
                background: #ddd;
                margin: 0 4px;
            }

            .zoom-display {
                font-size: 0.8rem;
                color: #333;
                font-weight: 500;
                min-width: 40px;
                text-align: center;
            }

            .pdf-viewer-container {
                background: #f5f5f5;
                border-radius: 0 0 8px 8px;
            }

            .pdf-loading-state,
            .pdf-error-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: #666;
                gap: 15px;
            }

            .loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .pdf-error-state {
                color: #dc3545;
            }

            .error-icon {
                font-size: 2rem;
            }

            .retry-button {
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85rem;
            }

            .retry-button:hover {
                background: #0056b3;
            }

            .pdf-scroll-container {
                height: 500px;
                overflow-y: auto;
                overflow-x: hidden;
                background: #f5f5f5;
                border-radius: 0 0 8px 8px;
                scroll-behavior: smooth;
            }

            .pdf-scroll-container::-webkit-scrollbar {
                width: 8px;
            }

            .pdf-scroll-container::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }

            .pdf-scroll-container::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }

            .pdf-scroll-container::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            .pdf-pages-wrapper {
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }

            .pdf-page-container {
                background: white;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                max-width: 100%;
                transition: transform 0.2s ease;
            }

            .pdf-page-container:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .page-header {
                background: #f8f9fa;
                padding: 8px 15px;
                border-bottom: 1px solid #eee;
                text-align: center;
            }

            .page-number {
                font-size: 0.8rem;
                color: #666;
                font-weight: 500;
            }

            .page-canvas-container {
                padding: 15px;
                text-align: center;
                background: white;
            }

            .pdf-page-canvas {
                display: block;
                margin: 0 auto;
                border: 1px solid #ddd;
                border-radius: 4px;
                max-width: 100%;
                height: auto;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .pdf-controls-bar {
                    flex-direction: column;
                    align-items: stretch;
                    text-align: center;
                }
                
                .pdf-controls {
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .pdf-scroll-container {
                    height: 400px;
                }
                
                .pdf-pages-wrapper {
                    padding: 15px 10px;
                }
                
                .control-separator {
                    display: none;
                }
            }

            @media (max-width: 480px) {
                .pdf-control-btn .control-text {
                    display: none;
                }
                
                .pdf-control-btn {
                    padding: 8px;
                    min-width: 36px;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Instancia global del visor simple
export const simplePdfViewer = new SimplePDFViewer();