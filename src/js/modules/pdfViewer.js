// src/js/modules/pdfViewer.js
import * as pdfjsLib from '../../../node_modules/pdfjs-dist/build/pdf.mjs';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

export class PDFViewer {
    constructor() {
        this.currentPdf = null;
        this.currentPage = 1;
        this.scale = 1.0;
    }

    async loadPDF(pdfPath) {
        try {
            // Obtener los datos del PDF desde el backend
            const pdfData = await window.api.invoke('obtener-pdf-data', pdfPath);
            if (!pdfData) {
                console.error('No se pudieron obtener los datos del PDF');
                return false;
            }

            // Cargar el PDF con PDF.js
            const uint8Array = new Uint8Array(pdfData);
            this.currentPdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            this.currentPage = 1;
            
            return true;
        } catch (error) {
            console.error('Error al cargar el PDF:', error);
            return false;
        }
    }

    async renderPage(pageNumber, canvas) {
        if (!this.currentPdf || !canvas) {
            console.error('PDF no cargado o canvas no disponible');
            return false;
        }

        try {
            const page = await this.currentPdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: this.scale });
            
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

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

    createViewer(containerId, pdfPath, title = 'PDF Viewer') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Contenedor no encontrado:', containerId);
            return;
        }

        // Crear estructura del visor
        const viewerHTML = `
            <div class="pdf-viewer" id="pdf-viewer-${Date.now()}">
                <div class="pdf-header">
                    <h4>${title}</h4>
                    <div class="pdf-controls">
                        <button class="pdf-btn" onclick="this.closest('.pdf-viewer').querySelector('.pdf-canvas-container').style.display = this.closest('.pdf-viewer').querySelector('.pdf-canvas-container').style.display === 'none' ? 'block' : 'none'">
                            <span class="toggle-text">Ocultar PDF</span>
                        </button>
                        <button class="pdf-btn prev-page">← Anterior</button>
                        <span class="page-info">Página <span class="current-page">1</span> de <span class="total-pages">1</span></span>
                        <button class="pdf-btn next-page">Siguiente →</button>
                        <button class="pdf-btn zoom-out">-</button>
                        <span class="zoom-info">100%</span>
                        <button class="pdf-btn zoom-in">+</button>
                        <button class="pdf-btn open-external">Abrir Externo</button>
                    </div>
                </div>
                <div class="pdf-canvas-container">
                    <canvas class="pdf-canvas"></canvas>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', viewerHTML);
        
        const viewer = container.querySelector('.pdf-viewer:last-child');
        const canvas = viewer.querySelector('.pdf-canvas');
        
        // Cargar y mostrar el PDF
        this.loadAndDisplay(pdfPath, viewer, canvas);
        
        // Configurar controles
        this.setupControls(viewer, pdfPath);
    }

    async loadAndDisplay(pdfPath, viewer, canvas) {
        const success = await this.loadPDF(pdfPath);
        if (success) {
            // Actualizar información de páginas
            const totalPages = this.currentPdf.numPages;
            viewer.querySelector('.total-pages').textContent = totalPages;
            
            // Renderizar primera página
            await this.renderPage(1, canvas);
            this.updatePageInfo(viewer);
        } else {
            canvas.parentElement.innerHTML = '<p class="pdf-error">Error al cargar el PDF</p>';
        }
    }

    setupControls(viewer, pdfPath) {
        const prevBtn = viewer.querySelector('.prev-page');
        const nextBtn = viewer.querySelector('.next-page');
        const zoomInBtn = viewer.querySelector('.zoom-in');
        const zoomOutBtn = viewer.querySelector('.zoom-out');
        const openExternalBtn = viewer.querySelector('.open-external');
        const toggleBtn = viewer.querySelector('.pdf-btn');
        const canvas = viewer.querySelector('.pdf-canvas');

        // Navegación de páginas
        prevBtn.addEventListener('click', async () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                await this.renderPage(this.currentPage, canvas);
                this.updatePageInfo(viewer);
            }
        });

        nextBtn.addEventListener('click', async () => {
            if (this.currentPdf && this.currentPage < this.currentPdf.numPages) {
                this.currentPage++;
                await this.renderPage(this.currentPage, canvas);
                this.updatePageInfo(viewer);
            }
        });

        // Zoom
        zoomInBtn.addEventListener('click', async () => {
            this.scale = Math.min(this.scale + 0.2, 3.0);
            await this.renderPage(this.currentPage, canvas);
            this.updateZoomInfo(viewer);
        });

        zoomOutBtn.addEventListener('click', async () => {
            this.scale = Math.max(this.scale - 0.2, 0.5);
            await this.renderPage(this.currentPage, canvas);
            this.updateZoomInfo(viewer);
        });

        // Abrir externo
        openExternalBtn.addEventListener('click', () => {
            window.api.enviar('abrir-pdf', pdfPath);
        });

        // Toggle visibility
        toggleBtn.addEventListener('click', () => {
            const container = viewer.querySelector('.pdf-canvas-container');
            const toggleText = toggleBtn.querySelector('.toggle-text');
            if (container.style.display === 'none') {
                container.style.display = 'block';
                toggleText.textContent = 'Ocultar PDF';
            } else {
                container.style.display = 'none';
                toggleText.textContent = 'Mostrar PDF';
            }
        });
    }

    updatePageInfo(viewer) {
        viewer.querySelector('.current-page').textContent = this.currentPage;
    }

    updateZoomInfo(viewer) {
        const percentage = Math.round(this.scale * 100);
        viewer.querySelector('.zoom-info').textContent = `${percentage}%`;
    }
}

// Instancia global del visor
export const pdfViewer = new PDFViewer();