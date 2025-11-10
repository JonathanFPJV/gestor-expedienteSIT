/**
 * ocrUI.js
 * Módulo para feedback visual del procesamiento OCR
 * Maneja indicadores de progreso, mensajes y estados
 */

export class OCRUI {
    constructor() {
        this.statusContainer = null;
        this.spinner = null;
        this.messageElement = null;
    }

    /**
     * Inicializa los elementos del DOM para mostrar estado OCR
     */
    initialize() {
        this.statusContainer = document.getElementById('ocr-status');
        this.messageElement = document.getElementById('ocr-message');
        this.spinner = document.getElementById('ocr-spinner');
        
        if (!this.statusContainer || !this.messageElement || !this.spinner) {
            console.warn('⚠️ Elementos de OCR UI no encontrados en el DOM');
        } else {
            console.log('✅ OCR UI inicializado correctamente');
        }
    }

    /**
     * Muestra el indicador de procesamiento OCR
     * @param {string} message - Mensaje a mostrar
     */
    showProcessing(message = 'Procesando documento con OCR...') {
        if (!this.statusContainer) return;
        
        this.statusContainer.style.display = 'flex';
        this.messageElement.textContent = message;
        this.spinner.style.display = 'block';
        
        console.log('📊 OCR UI: Mostrando indicador -', message);
    }

    /**
     * Actualiza el mensaje durante el procesamiento
     * @param {string} message - Nuevo mensaje
     */
    updateMessage(message) {
        if (this.messageElement) {
            this.messageElement.textContent = message;
            console.log('📊 OCR UI: Mensaje actualizado -', message);
        }
    }

    /**
     * Muestra mensaje de éxito temporal
     * @param {string} message - Mensaje de éxito
     * @param {number} duration - Duración en ms (default: 3000)
     */
    showSuccess(message = '✅ Texto extraído exitosamente', duration = 3000) {
        if (!this.statusContainer) return;
        
        this.spinner.style.display = 'none';
        this.statusContainer.classList.add('success');
        this.messageElement.textContent = message;
        
        console.log('✅ OCR UI: Éxito -', message);
        
        // Ocultar después de la duración
        setTimeout(() => {
            this.hide();
        }, duration);
    }

    /**
     * Muestra mensaje de error temporal
     * @param {string} message - Mensaje de error
     * @param {number} duration - Duración en ms (default: 5000)
     */
    showError(message = '❌ Error al procesar el documento', duration = 5000) {
        if (!this.statusContainer) return;
        
        this.spinner.style.display = 'none';
        this.statusContainer.classList.add('error');
        this.messageElement.textContent = message;
        
        console.error('❌ OCR UI: Error -', message);
        
        // Ocultar después de la duración
        setTimeout(() => {
            this.hide();
        }, duration);
    }

    /**
     * Oculta el indicador de estado OCR
     */
    hide() {
        if (!this.statusContainer) return;
        
        this.statusContainer.style.display = 'none';
        this.statusContainer.classList.remove('success', 'error');
        this.spinner.style.display = 'none';
        
        console.log('👁️ OCR UI: Indicador ocultado');
    }

    /**
     * Muestra progreso con porcentaje
     * @param {number} progress - Porcentaje de progreso (0-100)
     */
    showProgress(progress) {
        if (!this.messageElement) return;
        
        const message = `Procesando documento... ${progress}%`;
        this.updateMessage(message);
    }
}

// Exportar instancia única (singleton)
export const ocrUI = new OCRUI();
