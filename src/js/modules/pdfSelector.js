/**
 * pdfSelector.js
 * 
 * Servicio especializado para selección de archivos PDF.
 * Proporciona una interfaz limpia para abrir diálogos de selección
 * de archivos con validación de tipo PDF.
 * 
 * @module pdfSelector
 */

class PdfSelector {
    constructor() {
        this.lastSelectedPath = null;
    }

    /**
     * Abre un diálogo para seleccionar un archivo PDF
     * 
     * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
     */
    async selectPdf() {
        try {
            console.log('📎 Abriendo diálogo de selección de PDF...');

            // Invocar el handler IPC para abrir diálogo de archivo
            const filePath = await window.api.invoke('tarjeta:seleccionar-pdf');

            if (filePath) {
                // Validar que sea un archivo PDF
                if (!this.isPdfFile(filePath)) {
                    return {
                        success: false,
                        error: 'El archivo seleccionado no es un PDF válido'
                    };
                }

                this.lastSelectedPath = filePath;
                console.log('✅ PDF seleccionado:', filePath);

                return {
                    success: true,
                    filePath: filePath
                };
            } else {
                // Usuario canceló la selección
                console.log('⚠️ Selección de PDF cancelada por el usuario');
                return {
                    success: false,
                    error: 'Selección cancelada'
                };
            }
        } catch (error) {
            console.error('❌ Error al seleccionar PDF:', error);
            return {
                success: false,
                error: error.message || 'Error al seleccionar archivo PDF'
            };
        }
    }

    /**
     * Abre un diálogo para seleccionar múltiples archivos PDF (batch)
     * 
     * @returns {Promise<{success: boolean, filePaths?: string[], error?: string}>}
     */
    async selectMultiplePdfs() {
        try {
            console.log('📎 Abriendo diálogo de selección múltiple de PDFs...');

            const filePaths = await window.api.invoke('tarjeta:seleccionar-pdfs-multiples');

            if (filePaths && filePaths.length > 0) {
                // Validar que todos sean PDFs
                const invalidFiles = filePaths.filter(path => !this.isPdfFile(path));

                if (invalidFiles.length > 0) {
                    return {
                        success: false,
                        error: `${invalidFiles.length} archivo(s) no son PDFs válidos`
                    };
                }

                console.log(`✅ ${filePaths.length} PDFs seleccionados`);

                return {
                    success: true,
                    filePaths: filePaths
                };
            } else {
                console.log('⚠️ Selección múltiple cancelada por el usuario');
                return {
                    success: false,
                    error: 'Selección cancelada'
                };
            }
        } catch (error) {
            console.error('❌ Error al seleccionar PDFs múltiples:', error);
            return {
                success: false,
                error: error.message || 'Error al seleccionar archivos PDF'
            };
        }
    }

    /**
     * Valida si un archivo es PDF basándose en su extensión
     * 
     * @param {string} filePath - Ruta del archivo
     * @returns {boolean}
     * @private
     */
    isPdfFile(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }

        const extension = filePath.split('.').pop().toLowerCase();
        return extension === 'pdf';
    }

    /**
     * Obtiene la última ruta de PDF seleccionada
     * 
     * @returns {string|null}
     */
    getLastSelectedPath() {
        return this.lastSelectedPath;
    }

    /**
     * Limpia el historial de selección
     */
    clearHistory() {
        this.lastSelectedPath = null;
    }

    /**
     * Extrae el nombre del archivo de una ruta
     * 
     * @param {string} filePath - Ruta completa del archivo
     * @returns {string} - Nombre del archivo
     */
    getFileName(filePath) {
        if (!filePath) return '';
        return filePath.split(/[\\/]/).pop();
    }
}

// Exportar instancia singleton
export const pdfSelector = new PdfSelector();
