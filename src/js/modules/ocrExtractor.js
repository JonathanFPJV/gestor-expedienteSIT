/**
 * ocrExtractor.js
 * 
 * Servicio para extracción de texto OCR de archivos PDF.
 * Utiliza ocrProcessor y ocrParser para extraer y estructurar datos.
 * Proporciona callbacks de progreso y manejo de cancelación.
 * 
 * @module ocrExtractor
 */

import { ocrProcessor } from './ocrProcessor.js';
import { ocrParser } from './ocrParser.js';

class OcrExtractor {
    constructor() {
        this.isProcessing = false;
        this.shouldCancel = false;
        this.currentProgressCallback = null;
    }

    /**
     * Extrae texto y datos estructurados de un PDF
     * 
     * @param {string} pdfPath - Ruta absoluta del archivo PDF
     * @param {Object} options - Opciones de extracción
     * @param {boolean} options.cleanText - Si debe limpiar el texto (default: true)
     * @param {boolean} options.parseData - Si debe parsear datos estructurados (default: true)
     * @param {number} options.pageNumber - Número de página a procesar (default: 1)
     * @returns {Promise<{success: boolean, extractedData?: Object, rawText?: string, error?: string}>}
     */
    async extractFromPdf(pdfPath, options = {}) {
        // Opciones por defecto
        const {
            cleanText = true,
            parseData = true,
            pageNumber = 1
        } = options;

        try {
            console.log('[ocrExtractor] Iniciando extracción OCR...');
            console.log('Archivo:', pdfPath);
            console.log('Opciones:', { cleanText, parseData, pageNumber });

            // Validar que no haya otro proceso en ejecución
            if (this.isProcessing) {
                return {
                    success: false,
                    error: 'Ya hay un proceso de OCR en ejecución'
                };
            }

            this.isProcessing = true;
            this.shouldCancel = false;

            // Verificar que el archivo existe y es accesible
            if (!pdfPath || typeof pdfPath !== 'string') {
                throw new Error('Ruta de PDF inválida');
            }

            // Extraer texto usando ocrProcessor
            console.log('Extrayendo texto de la página', pageNumber);
            const rawText = await ocrProcessor.extractTextFromFirstPage(pdfPath);

            // Verificar si se canceló durante la extracción
            if (this.shouldCancel) {
                console.log('Extracción OCR cancelada por el usuario');
                this.isProcessing = false;
                return {
                    success: false,
                    error: 'Proceso cancelado por el usuario'
                };
            }

            if (!rawText) {
                throw new Error('No se pudo extraer texto del PDF');
            }

            console.log('Texto extraído exitosamente');
            console.log('Longitud del texto:', rawText.length, 'caracteres');

            // Parsear datos estructurados si está habilitado
            let extractedData = null;
            if (parseData) {
                console.log('Parseando datos estructurados...');
                extractedData = ocrParser.parseExpedienteData(rawText);
                console.log('Datos parseados:', extractedData);
            }

            this.isProcessing = false;

            return {
                success: true,
                extractedData: extractedData,
                rawText: rawText
            };

        } catch (error) {
            console.error('Error en extracción OCR:', error);
            this.isProcessing = false;

            return {
                success: false,
                error: error.message || 'Error al extraer texto del PDF'
            };
        }
    }

    /**
     * Extrae texto con callback de progreso
     * 
     * @param {string} pdfPath - Ruta del PDF
     * @param {Function} progressCallback - Función que recibe (percent, message)
     * @param {Object} options - Opciones de extracción
     * @returns {Promise<{success: boolean, extractedData?: Object, rawText?: string, error?: string}>}
     */
    async extractWithProgress(pdfPath, progressCallback, options = {}) {
        try {
            this.currentProgressCallback = progressCallback;

            // Notificar inicio
            if (progressCallback) {
                progressCallback(0, 'Preparando extracción OCR...');
            }

            // Validaciones
            if (this.isProcessing) {
                return {
                    success: false,
                    error: 'Ya hay un proceso de OCR en ejecución'
                };
            }

            this.isProcessing = true;
            this.shouldCancel = false;

            if (progressCallback) {
                progressCallback(10, 'Cargando archivo PDF...');
            }

            // Dar tiempo para que la UI se actualice
            await this.sleep(100);

            if (progressCallback) {
                progressCallback(30, 'Extrayendo texto con OCR...');
            }

            // Extraer texto
            const rawText = await ocrProcessor.extractTextFromFirstPage(pdfPath);

            if (this.shouldCancel) {
                this.isProcessing = false;
                if (progressCallback) {
                    progressCallback(0, 'Cancelado');
                }
                return {
                    success: false,
                    error: 'Proceso cancelado por el usuario'
                };
            }

            if (!rawText) {
                throw new Error('No se pudo extraer texto del PDF');
            }

            if (progressCallback) {
                progressCallback(70, 'Parseando datos...');
            }

            // Parsear datos
            const extractedData = options.parseData !== false
                ? ocrParser.parseExpedienteData(rawText)
                : null;

            if (progressCallback) {
                progressCallback(100, 'Extracción completada');
            }

            this.isProcessing = false;
            this.currentProgressCallback = null;

            // Dar tiempo para mostrar el 100%
            await this.sleep(500);

            return {
                success: true,
                extractedData: extractedData,
                rawText: rawText
            };

        } catch (error) {
            console.error('Error en extracción OCR con progreso:', error);
            this.isProcessing = false;
            this.currentProgressCallback = null;

            if (progressCallback) {
                progressCallback(0, 'Error en extracción');
            }

            return {
                success: false,
                error: error.message || 'Error al extraer texto del PDF'
            };
        }
    }

    /**
     * Cancela el proceso de extracción en curso
     */
    cancelExtraction() {
        console.log('Solicitando cancelación de OCR...');
        this.shouldCancel = true;

        if (this.currentProgressCallback) {
            this.currentProgressCallback(0, 'Cancelando...');
        }
    }

    /**
     * Verifica si hay un proceso OCR en ejecución
     * 
     * @returns {boolean}
     */
    isExtracting() {
        return this.isProcessing;
    }

    /**
     * Limpia el estado del extractor
     */
    reset() {
        this.isProcessing = false;
        this.shouldCancel = false;
        this.currentProgressCallback = null;
    }

    /**
     * Utilidad para pausar ejecución (promises)
     * 
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise<void>}
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exportar instancia singleton
export const ocrExtractor = new OcrExtractor();
