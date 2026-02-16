/**
 * ocrProcessor.js
 * Módulo para procesamiento OCR de documentos PDF
 * Extrae texto de la primera página de un PDF usando PDF.js + Tesseract.js
 */

export class OCRProcessor {
    constructor() {
        this.extractedText = null;
        this.isProcessing = false;
    }

    /**
     * Extrae texto de la primera página de un PDF
     * @param {string} pdfPath - Ruta absoluta del archivo PDF
     * @returns {Promise<string>} - Texto extraído
     */
    async extractTextFromFirstPage(pdfPath) {
        if (this.isProcessing) {
            throw new Error('Ya hay un proceso OCR en ejecución');
        }

        this.isProcessing = true;

        try {
            // Paso 1: Leer el archivo PDF desde el sistema

            // Paso 2: Cargar PDF con PDF.js
            const arrayBuffer = await window.api.readPdfFile(pdfPath);

            // Paso 2: Cargar PDF con PDF.js
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Paso 3: Renderizar SOLO la primera página a imagen
            // Paso 3: Renderizar SOLO la primera página a imagen
            const page = await pdf.getPage(1);

            // Configurar escala ALTA para mejor calidad OCR (3x mejora precisión)
            const scale = 3.0;
            const viewport = page.getViewport({ scale });

            // Crear canvas para renderizar con configuración optimizada
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', {
                alpha: false,  // Sin canal alpha = mejor rendimiento
                willReadFrequently: true
            });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Fondo blanco para mejor contraste
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Renderizar página en canvas con modo impresión
            await page.render({
                canvasContext: context,
                viewport: viewport,
                intent: 'print' // Mejor calidad que 'display'
            }).promise;


            // Convertir canvas a imagen PNG de máxima calidad
            const imageData = canvas.toDataURL('image/png', 1.0);

            // Paso 4: Extraer texto con Tesseract OCR - Configuración optimizada
            // Paso 4: Extraer texto con Tesseract OCR - Configuración optimizada
            const result = await Tesseract.recognize(
                imageData,
                'spa', // Idioma español
                {
                    logger: info => {
                        if (info.status === 'recognizing text') {
                            const progress = Math.round(info.progress * 100);
                            if (progress % 25 === 0) { // Log cada 25%
                                // console.log(`Progreso OCR: ${progress}%`);
                            }
                        }
                    },
                    // Configuración avanzada de Tesseract
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Auto detección de layout
                    // Lista de caracteres permitidos (reduce errores)
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyzáéíóúÁÉÍÓÚüÜ0123456789°º/-:.,()ª ',
                    preserve_interword_spaces: '1' // Preservar espacios
                }
            );

            const text = result.data.text;
            const confidence = Math.round(result.data.confidence);


            // Limpiar y corregir el texto
            const cleanedText = this.cleanOCRText(text);


            // Guardar temporalmente el texto LIMPIO
            this.extractedText = cleanedText;

            // Limpiar canvas
            canvas.remove();

            return cleanedText;

        } catch (error) {
            console.error('Error en procesamiento OCR:', {
                tipo: error.name,
                mensaje: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Limpia y mejora el texto extraído por OCR
     * Corrige errores comunes de reconocimiento
     * @param {string} text - Texto bruto del OCR
     * @returns {string} - Texto limpio
     */
    cleanOCRText(text) {
        if (!text) return '';


        let cleaned = text;

        // 1. Eliminar caracteres basura comunes al inicio
        cleaned = cleaned.replace(/^[fúYTÑ\+\-EuNóMUpaa7laLconh»"]+\s*/gm, '');

        // 2. Corregir "N*" a "Nº" (número)
        cleaned = cleaned.replace(/N\s?\*/g, 'Nº');

        // 3. Corregir números con espacios: "8 0 3" → "803"
        cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1$2');

        // 4. Corregir "GTVIS" a "GTMS" (error común)
        cleaned = cleaned.replace(/GTVIS/g, 'GTMS');

        // 5. Corregir "vcic" a "vcfc" si aparece después de GTMS
        cleaned = cleaned.replace(/GTMS-vcic/g, 'GTMS-vcfc');

        // 6. Eliminar saltos de línea múltiples (dejar máximo 2)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        // 7. Limpiar espacios múltiples
        cleaned = cleaned.replace(/ {2,}/g, ' ');

        // 8. Eliminar espacios antes de puntuación
        cleaned = cleaned.replace(/\s+([,.:;])/g, '$1');

        // 9. Corregir "AGP" común error por "AQP" (Arequipa)
        cleaned = cleaned.replace(/AGP\s+MASIVO/g, 'AQP MASIVO');

        // 10. Trim de cada línea
        cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

        // 11. Eliminar líneas vacías al inicio y final
        cleaned = cleaned.trim();

        // console.log(`Longitud original: ${text.length} → limpia: ${cleaned.length}`);

        return cleaned;
    }

    /**
     * Obtiene el texto extraído más reciente
     * @returns {string|null}
     */
    getExtractedText() {
        return this.extractedText;
    }

    /**
     * Limpia el texto almacenado temporalmente
     */
    clearExtractedText() {
        this.extractedText = null;
    }

    /**
     * Verifica si hay un proceso OCR en ejecución
     * @returns {boolean}
     */
    isOCRProcessing() {
        return this.isProcessing;
    }
}

// Exportar instancia única (singleton)
export const ocrProcessor = new OCRProcessor();
