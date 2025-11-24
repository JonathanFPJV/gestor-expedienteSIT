/**
 * Módulo: Procesador OCR para Actas de Entrega
 * 
 * Extrae información de documentos PDF de Actas de Entrega:
 * - Fecha de entrega
 * - Número de expediente
 * - Número de tarjetas
 * - Observaciones
 * - Tabla de vehículos (opcional)
 * 
 * Dependencias: PDF.js, Tesseract.js
 */

class ActaOcrProcessor {
    constructor() {
        this.pdfjsLib = window.pdfjsLib;
        this.Tesseract = window.Tesseract;
        this.currentPdf = null;
        this.extractedData = null;
    }

    /**
     * Procesa un PDF de Acta de Entrega
     * @param {string} pdfPath - Ruta absoluta del archivo PDF
     * @returns {Promise<Object>} Datos extraídos del acta
     */
    async procesarActaPdf(pdfPath) {
        try {
            console.log('\n📄 ==========================================');
            console.log('📄 PROCESANDO ACTA DE ENTREGA CON OCR');
            console.log('📄 ==========================================\n');
            console.log(`📁 Archivo: ${pdfPath}`);

            // Leer y cargar el PDF
            const pdfData = await window.api.readPdfFile(pdfPath);
            const loadingTask = this.pdfjsLib.getDocument({ data: pdfData });
            this.currentPdf = await loadingTask.promise;

            console.log(`📊 PDF cargado: ${this.currentPdf.numPages} página(s)`);

            // Procesar la primera página (las actas suelen ser de 1 página)
            const pageNum = 1;
            const canvas = await this.renderPageToImage(pageNum);
            const text = await this.performOCR(canvas);
            
            console.log('\n📝 TEXTO EXTRAÍDO (Preliminar):');
            console.log('─────────────────────────────────────────');
            console.log(text);
            console.log('─────────────────────────────────────────\n');

            // Extraer datos estructurados
            const extractedData = this.extractActaData(text);

            console.log('✅ Datos extraídos del Acta:');
            console.log(JSON.stringify(extractedData, null, 2));

            this.extractedData = extractedData;

            return {
                success: true,
                data: extractedData,
                rawText: text
            };

        } catch (error) {
            console.error('❌ Error procesando Acta de Entrega:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Renderiza una página del PDF a canvas con alta resolución
     * @param {number} pageNum - Número de página
     * @returns {Promise<HTMLCanvasElement>} Canvas con la página renderizada
     */
    async renderPageToImage(pageNum) {
        console.log(`🖼️ Renderizando página ${pageNum}...`);

        const page = await this.currentPdf.getPage(pageNum);
        
        // Escala alta para mejor calidad de OCR
        const scale = 3.0;
        const viewport = page.getViewport({ scale, intent: 'print' });

        // Crear canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Renderizar
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Aplicar mejoras de contraste
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Aumentar contraste para mejor OCR
        const contrast = 1.3;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));       // R
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
        }
        
        context.putImageData(imageData, 0, 0);

        console.log(`   ✅ Página renderizada: ${canvas.width}x${canvas.height}px`);
        
        return canvas;
    }

    /**
     * Ejecuta OCR sobre el canvas
     * @param {HTMLCanvasElement} canvas - Canvas con la imagen
     * @returns {Promise<string>} Texto extraído
     */
    async performOCR(canvas) {
        console.log('🔍 Ejecutando OCR...');

        const result = await this.Tesseract.recognize(canvas, 'spa', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`   📊 Progreso OCR: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        console.log('✅ OCR completado');
        
        return result.data.text;
    }

    /**
     * Extrae datos estructurados del texto OCR
     * @param {string} text - Texto extraído por OCR
     * @returns {Object} Datos estructurados
     */
    extractActaData(text) {
        console.log('\n🔍 Extrayendo datos del Acta...');

        const data = {
            fechaEntrega: null,
            numeroExpediente: null,
            numeroTarjetas: 0,
            observaciones: null
        };

        // Normalizar texto
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // 1. Extraer Fecha de Entrega
        data.fechaEntrega = this.extractFechaEntrega(lines, text);
        
        // 2. Extraer Número de Expediente
        data.numeroExpediente = this.extractNumeroExpediente(lines, text);
        
        // 3. Extraer Número de Tarjetas
        data.numeroTarjetas = this.extractNumeroTarjetas(lines, text);
        
        // 4. Extraer Observaciones (texto largo al final)
        data.observaciones = this.extractObservaciones(lines, text);

        console.log('✅ Extracción de datos completada');
        
        return data;
    }

    /**
     * Extrae la fecha de entrega
     * @param {Array} lines - Líneas de texto
     * @param {string} fullText - Texto completo
     * @returns {string|null} Fecha en formato YYYY-MM-DD
     */
    extractFechaEntrega(lines, fullText) {
        console.log('   🔍 Buscando fecha de entrega...');

        // Buscar patrones de fecha: dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy
        const fechaPatterns = [
            /(\d{2})\.(\d{2})\.(\d{4})/,  // 30.07.2025
            /(\d{2})\/(\d{2})\/(\d{4})/,  // 30/07/2025
            /(\d{2})-(\d{2})-(\d{4})/     // 30-07-2025
        ];

        for (const pattern of fechaPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                const [_, dia, mes, anio] = match;
                const fecha = `${anio}-${mes}-${dia}`;
                console.log(`      ✅ Fecha encontrada: ${fecha} (${match[0]})`);
                return fecha;
            }
        }

        console.log('      ⚠️ Fecha no encontrada');
        return null;
    }

    /**
     * Extrae el número de expediente
     * @param {Array} lines - Líneas de texto
     * @param {string} fullText - Texto completo
     * @returns {string|null} Número de expediente
     */
    extractNumeroExpediente(lines, fullText) {
        console.log('   🔍 Buscando número de expediente...');

        // Buscar patrones: "Expediente N° 50035-2025" o "50035-2025"
        const expPatterns = [
            /Expediente\s*N[°º]?\s*(\d{4,6}-\d{4})/i,
            /N[°º]?\s*(\d{4,6}-\d{4})/,
            /(\d{4,6}-\d{4})/
        ];

        for (const pattern of expPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                const expediente = match[1];
                console.log(`      ✅ Expediente encontrado: ${expediente}`);
                return expediente;
            }
        }

        console.log('      ⚠️ Expediente no encontrado');
        return null;
    }

    /**
     * Extrae el número de tarjetas mencionadas
     * @param {Array} lines - Líneas de texto
     * @param {string} fullText - Texto completo
     * @returns {number} Número de tarjetas
     */
    extractNumeroTarjetas(lines, fullText) {
        console.log('   🔍 Buscando número de tarjetas...');

        // Buscar: "09 Tarjetas de Acreditación" o variantes
        const patterns = [
            /(\d{1,2})\s*Tarjetas?\s*de\s*Acreditaci[oó]n/i,
            /(\d{1,2})\s*Tarjeta/i
        ];

        for (const pattern of patterns) {
            const match = fullText.match(pattern);
            if (match) {
                const numero = parseInt(match[1]);
                console.log(`      ✅ Número de tarjetas: ${numero}`);
                return numero;
            }
        }

        console.log('      ⚠️ Número de tarjetas no encontrado');
        return 0;
    }

    /**
     * Extrae las observaciones del acta
     * @param {Array} lines - Líneas de texto
     * @param {string} fullText - Texto completo
     * @returns {string|null} Observaciones
     */
    extractObservaciones(lines, fullText) {
        console.log('   🔍 Buscando observaciones...');

        // Buscar texto después de "conformidad" o al final del documento
        const observacionesPatterns = [
            /En señal de conformidad.*?(?=\n\n|$)/is,
            /conformidad.*?(?=\n\n|$)/is
        ];

        for (const pattern of observacionesPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                const obs = match[0].trim();
                console.log(`      ✅ Observaciones encontradas (${obs.length} caracteres)`);
                return obs;
            }
        }

        // Si no encontramos observaciones específicas, tomar las últimas líneas
        if (lines.length > 10) {
            const ultimasLineas = lines.slice(-5).join(' ');
            if (ultimasLineas.length > 50) {
                console.log(`      ✅ Observaciones (últimas líneas): ${ultimasLineas.substring(0, 50)}...`);
                return ultimasLineas;
            }
        }

        console.log('      ⚠️ Observaciones no encontradas');
        return null;
    }

    /**
     * Obtiene los datos extraídos
     * @returns {Object|null} Datos extraídos
     */
    getExtractedData() {
        return this.extractedData;
    }

    /**
     * Limpia los datos temporales
     */
    clear() {
        this.currentPdf = null;
        this.extractedData = null;
        console.log('🔄 Datos del procesador limpiados');
    }
}

// Exportar como singleton
const actaOcrProcessor = new ActaOcrProcessor();
export default actaOcrProcessor;
