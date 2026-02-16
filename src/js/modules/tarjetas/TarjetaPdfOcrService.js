// src/js/modules/tarjetas/TarjetaPdfOcrService.js
/**
 * Servicio de PDF y OCR para Tarjetas
 * Responsabilidad: Selección de PDF, extracción OCR y apertura de archivos
 */

import { pdfSelector } from '../pdfSelector.js';
import { ocrExtractor } from '../ocrExtractor.js';
import { tarjetaDataService } from './TarjetaDataService.js';

class TarjetaPdfOcrService {
    /**
     * Seleccionar archivo PDF
     * @returns {Promise<{success: boolean, filePath?: string, fileName?: string, error?: string}>}
     */
    async seleccionarPdf() {
        try {
            const result = await pdfSelector.selectPdf();

            if (result.success && result.filePath) {
                const fileName = pdfSelector.getFileName(result.filePath);
                console.log('PDF seleccionado:', result.filePath);
                return {
                    success: true,
                    filePath: result.filePath,
                    fileName
                };
            } else if (result.error && result.error !== 'Selección cancelada') {
                return { success: false, error: result.error };
            }

            return { success: false }; // Cancelado por usuario
        } catch (error) {
            console.error('Error al seleccionar PDF:', error);
            return { success: false, error: 'Error al seleccionar archivo PDF' };
        }
    }

    /**
     * Extraer texto OCR del PDF y auto-completar campos
     * @param {string} pdfPath
     * @returns {Promise<{success: boolean, extractedData?: Object, error?: string}>}
     */
    async extraerOcr(pdfPath) {
        if (!pdfPath) {
            return { success: false, error: 'Primero debes seleccionar un archivo PDF' };
        }

        try {
            console.log('Extrayendo OCR del PDF:', pdfPath);

            const result = await ocrExtractor.extractWithProgress(
                pdfPath,
                (percent, message) => {
                    console.log(`Progreso OCR: ${percent}% - ${message}`);
                }
            );

            if (result.success && result.extractedData) {
                console.log('OCR completado:', result.extractedData);

                // Auto-completar campos del modal
                const placaInput = document.getElementById('modal-placa');
                if (placaInput && !placaInput.value && result.extractedData.placa) {
                    placaInput.value = result.extractedData.placa;
                }

                const numeroInput = document.getElementById('modal-numero-tarjeta');
                if (numeroInput && !numeroInput.value && result.extractedData.numeroTarjeta) {
                    numeroInput.value = result.extractedData.numeroTarjeta;
                }

                return { success: true, extractedData: result.extractedData };
            } else {
                return { success: false, error: result.error || 'No se pudo extraer texto del PDF' };
            }
        } catch (error) {
            console.error('Error al extraer OCR:', error);
            return { success: false, error: 'Error al procesar OCR: ' + error.message };
        }
    }

    /**
     * Abrir PDF de tarjeta en aplicación externa
     * @param {string} pdfPath
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async abrirPdf(pdfPath) {
        if (!pdfPath) {
            return { success: false, error: 'No hay PDF asociado a esta tarjeta' };
        }

        const resultado = await tarjetaDataService.openPdf(pdfPath);
        if (!resultado.success) {
            return { success: false, error: resultado.message || 'No se pudo abrir el PDF' };
        }
        return { success: true };
    }
}

export const tarjetaPdfOcrService = new TarjetaPdfOcrService();
