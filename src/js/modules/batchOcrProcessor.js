/**
 * Módulo: Procesador de OCR por Lotes (Batch)
 * 
 * Procesa PDFs de múltiples páginas:
 * - Itera por cada página del PDF
 * - Ejecuta OCR en cada página individualmente
 * - Extrae datos específicos por página
 * - Divide el PDF en archivos individuales por página
 * 
 * Dependencias: PDF.js, Tesseract.js, pdf-lib
 */

class BatchOcrProcessor {
    constructor() {
        this.pdfjsLib = window.pdfjsLib;
        this.Tesseract = window.Tesseract;
        this.PDFLib = window.PDFLib;
        this.currentPdf = null;
        this.totalPages = 0;
        this.processedPages = 0;
        this.results = [];
    }

    /**
     * Procesa un PDF completo página por página
     * @param {string} pdfPath - Ruta absoluta del archivo PDF
     * @returns {Promise<Array>} Array de objetos con datos extraídos por página
     */
    async processPdfBatch(pdfPath) {
        console.log(`Procesando archivo: ${pdfPath}`);

        try {
            // Resetear estado
            this.results = [];
            this.processedPages = 0;

            // Leer PDF completo
            const arrayBuffer = await window.api.readPdfFile(pdfPath);
            const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
            this.currentPdf = await loadingTask.promise;
            this.totalPages = this.currentPdf.numPages;

            console.log(`Total de páginas: ${this.totalPages}`);

            // Procesar cada página
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                console.log(`Procesando página ${pageNum} de ${this.totalPages}`);

                const pageData = await this.processPage(pageNum);
                this.results.push(pageData);
                this.processedPages++;

                // Callback de progreso (opcional)
                if (this.onProgress) {
                    this.onProgress(pageNum, this.totalPages, pageData);
                }
            }

            console.log(`Procesamiento completado: ${this.processedPages}/${this.totalPages}`);

            // LIBERAR MEMORIA
            await this.cleanup();

            return this.results;

        } catch (error) {
            console.error('Error en procesamiento por lotes:', error);

            // LIBERAR MEMORIA incluso si hay error
            await this.cleanup();

            throw error;
        }
    }

    /**
     * Procesa una página individual del PDF
     * @param {number} pageNum - Número de página (1-indexed)
     * @returns {Promise<Object>} Datos extraídos de la página
     */
    async processPage(pageNum) {
        try {
            // 1. Renderizar página a canvas
            const canvas = await this.renderPageToImage(pageNum);

            // Guardar canvas para posible segunda pasada de OCR
            this.currentCanvas = canvas;

            // 2. Ejecutar OCR
            const ocrText = await this.performOCR(canvas, pageNum);

            // 3. Extraer datos específicos
            const extractedData = await this.extractPageData(ocrText, pageNum);

            return {
                pageNumber: pageNum,
                text: ocrText,
                data: extractedData,
                success: true
            };

        } catch (error) {
            console.error(`Error procesando página ${pageNum}:`, error);
            return {
                pageNumber: pageNum,
                text: '',
                data: null,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Renderiza una página del PDF a canvas de alta calidad
     * @param {number} pageNum - Número de página
     * @returns {Promise<HTMLCanvasElement>} Canvas con la página renderizada
     */
    async renderPageToImage(pageNum) {
        const page = await this.currentPdf.getPage(pageNum);

        // Configuración de MAYOR calidad (4x scale en lugar de 3x)
        const scale = 4.0;
        const viewport = page.getViewport({ scale, intent: 'print' });

        // Crear canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Renderizar
        await page.render({
            canvasContext: context,
            viewport: viewport,
            intent: 'print'
        }).promise;

        // PREPROCESAMIENTO: Mejorar contraste para mejor OCR
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Aumentar contraste (ayuda a leer texto borroso)
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));       // Red
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // Green
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // Blue
        }

        context.putImageData(imageData, 0, 0);

        return canvas;
    }

    /**
     * Ejecuta OCR en el canvas de la página
     * @param {HTMLCanvasElement} canvas - Canvas a procesar
     * @param {number} pageNum - Número de página (para logs)
     * @returns {Promise<string>} Texto extraído
     */
    async performOCR(canvas, pageNum) {
        const result = await this.Tesseract.recognize(canvas, 'spa', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789-_.,:/°º()[]ÁÉÍÓÚáéíóú ',
            tessedit_pageseg_mode: this.Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1',
            logger: (m) => {
                // Silenciar logs de progreso detallado
            }
        });

        const text = result.data.text;
        const confidence = result.data.confidence;

        console.log(`OCR completado en página ${pageNum}. Confianza: ${confidence.toFixed(2)}%`);

        // Limpiar texto
        const cleanedText = this.cleanOCRText(text);

        return cleanedText;
    }

    /**
     * Limpia el texto OCR de errores comunes
     * @param {string} text - Texto extraído por OCR
     * @returns {string} Texto limpio
     */
    cleanOCRText(text) {
        let cleaned = text;

        // Correcciones comunes de OCR
        cleaned = cleaned.replace(/N\s?\*/g, 'Nº');
        cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1$2'); // "1 2 3" → "123"
        cleaned = cleaned.replace(/[|¡]/g, 'I');
        cleaned = cleaned.replace(/0(?=[A-Z])/g, 'O'); // "0CR" → "OCR"
        cleaned = cleaned.replace(/l(?=\d)/g, '1'); // "l23" → "123"
        cleaned = cleaned.replace(/O(?=\d)/g, '0'); // "O123" → "0123"

        // Correcciones específicas para tarjetas TUC
        cleaned = cleaned.replace(/CODIGO\s+UNICO/gi, 'CÓDIGO ÚNICO');
        cleaned = cleaned.replace(/IDENTIF[IL]CADOR/gi, 'IDENTIFICADOR');
        cleaned = cleaned.replace(/R[O0]DAJE/gi, 'RODAJE');

        // Limpiar espacios múltiples
        cleaned = cleaned.replace(/\s{3,}/g, '\n'); // 3+ espacios → salto de línea
        cleaned = cleaned.replace(/[ \t]{2,}/g, ' '); // 2+ espacios/tabs → 1 espacio

        return cleaned;
    }

    /**
     * Extrae datos específicos de una página
     * @param {string} text - Texto OCR de la página
     * @param {number} pageNum - Número de página
     * @returns {Promise<Object>} Datos extraídos
     */
    async extractPageData(text, pageNum) {
        // NUEVA ESTRATEGIA: Dividir el texto en regiones por recuadros
        const regiones = this.dividirEnRegiones(text);

        const data = {
            codigoUnico: await this.extractCodigoUnicoDeRegion(regiones),
            placaRodaje: this.extractPlacaRodajeDeRegion(regiones)
        };

        console.log(`Datos extraídos de página ${pageNum}:`, data);

        return data;
    }

    /**
     * Divide el texto OCR en regiones basadas en los encabezados de los recuadros
     * @param {string} text - Texto completo del OCR
     * @returns {Object} Objeto con regiones identificadas
     */
    dividirEnRegiones(text) {
        const regiones = {
            codigoUnico: '',
            placaRodaje: '',
            datosVehiculo: '',
            completo: text
        };

        const lines = text.split('\n');
        let regionActual = null;
        let contenidoRegion = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detectar inicio de región "CÓDIGO ÚNICO IDENTIFICADOR"
            if (/CÓDIGO\s+ÚNICO\s+IDENTIFICADOR|CODIGO\s+UNICO\s+IDENTIFICADOR/i.test(line)) {
                // Guardar región anterior si existe
                if (regionActual && contenidoRegion.length > 0) {
                    regiones[regionActual] = contenidoRegion.join('\n');
                }

                regionActual = 'codigoUnico';
                contenidoRegion = [line];
                continue;
            }

            // Detectar inicio de región "PLACA RODAJE"
            if (/PLACA\s+RODAJE/i.test(line)) {
                // Guardar región anterior si existe
                if (regionActual && contenidoRegion.length > 0) {
                    regiones[regionActual] = contenidoRegion.join('\n');
                }

                regionActual = 'placaRodaje';
                contenidoRegion = [line];
                continue;
            }

            // Detectar inicio de región "DATOS DEL VEHÍCULO"
            if (/DATOS\s+DEL\s+VEH[IÍ]CULO/i.test(line)) {
                // Guardar región anterior si existe
                if (regionActual && contenidoRegion.length > 0) {
                    regiones[regionActual] = contenidoRegion.join('\n');
                }

                regionActual = 'datosVehiculo';
                contenidoRegion = [line];
                continue;
            }

            // Agregar línea a la región actual
            if (regionActual) {
                contenidoRegion.push(line);

                // Límite: si llevamos más de 10 líneas, cerrar región
                if (contenidoRegion.length > 10) {
                    regiones[regionActual] = contenidoRegion.join('\n');
                    regionActual = null;
                    contenidoRegion = [];
                }
            }
        }

        // Guardar última región si existe
        if (regionActual && contenidoRegion.length > 0) {
            regiones[regionActual] = contenidoRegion.join('\n');
        }

        return regiones;
    }

    /**
     * Extrae el código único SOLO de la región específica
     * @param {Object} regiones - Objeto con regiones del documento
     * @returns {Promise<string|null>} Código único encontrado
     */
    async extractCodigoUnicoDeRegion(regiones) {
        const regionCodigo = regiones.codigoUnico;

        if (!regionCodigo) {
            // FALLBACK: Si no hay región específica de código único,
            // buscar número de 4 dígitos en TODO el texto
            return await this.extractCodigoUnicoFallback(regiones.completo);
        }

        const lines = regionCodigo.split('\n');

        // Buscar número de 4 dígitos en las líneas de esta región
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Buscar número de EXACTAMENTE 4 dígitos solo
            const match = line.match(/^(\d{4})$/);
            if (match) {
                const codigo = match[1];
                return codigo;
            }
        }

        // Fallback: buscar patrón en línea con texto
        const match = regionCodigo.match(/IDENTIFICADOR\s*[\n\r\s]*(\d{4})/i);
        if (match) {
            return match[1];
        }

        // Si no se encuentra el código en el texto OCR,
        // hacer OCR FOCALIZADO en la región del sello (parte inferior izquierda)
        return await this.buscarCodigoEnSelloConOCR();
    }

    /**
     * Método de respaldo para extraer código único cuando no hay región específica
     * @param {string} text - Texto completo
     * @returns {Promise<string|null>} Código encontrado
     */
    async extractCodigoUnicoFallback(text) {
        const lines = text.split('\n');
        const codigosEncontrados = [];

        // ESTRATEGIA 1: Buscar cerca de la etiqueta "CÓDIGO ÚNICO IDENTIFICADOR"
        // Incluir variaciones con errores de OCR
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detectar etiqueta con errores de OCR comunes
            // "boIGo Unico IDENTIFICADOR", "CODIGO UNICO", "CUI", etc.
            if (/C[OÓ0o][DÓ0o][IÍ1i][Gg][Oo0]\s*[UÚu][NÑñn][IÍ1i][Cc][Oo0]/i.test(line) ||
                /[Bb][Oo0][IÍ1i][Gg][Oo0]\s*[UÚu][NÑñn][IÍ1i][Cc][Oo0]/i.test(line) ||
                /IDENTIFICADOR/i.test(line)) {

                // Buscar en las siguientes 8 líneas (ampliado de 5 a 8)
                for (let j = i + 1; j < Math.min(i + 9, lines.length); j++) {
                    const nextLine = lines[j].trim();

                    // Buscar número de 4 dígitos (puede tener basura alrededor)
                    const matches = nextLine.matchAll(/(\d{4})/g);

                    for (const match of matches) {
                        const codigo = match[1];
                        const numero = parseInt(codigo);

                        // Evitar años
                        if (numero < 2000 || numero > 2030) {
                            return codigo;
                        }
                    }
                }
            }
        }

        // ESTRATEGIA 2: Buscar número de 4 dígitos aislado en su propia línea
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^(\d{4})$/);

            if (match) {
                const codigo = match[1];
                const numero = parseInt(codigo);

                // Evitar años (2015-2030)
                if (numero < 2000 || numero > 2030) {
                    codigosEncontrados.push({ codigo, linea: i, context: line });
                }
            }
        }

        // ESTRATEGIA 3: Buscar número de 4 dígitos en cualquier parte del texto
        // que NO sea un año ni parte de otros números largos
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Ignorar líneas que claramente no son códigos
            if (line.includes('PLACA') ||
                line.includes('DATOS') ||
                line.includes('RAZÓN') ||
                line.includes('EMPRESA') ||
                line.includes('UNIDAD') ||
                line.includes('MUNICIPALIDAD') ||
                line.includes('GERENCIA')) {
                continue;
            }

            // Buscar 4 dígitos que no estén precedidos ni seguidos de otros dígitos
            const matches = line.matchAll(/(?<!\d)(\d{4})(?!\d)/g);

            for (const match of matches) {
                const codigo = match[1];
                const numero = parseInt(codigo);

                // Evitar años y números que parecen resoluciones
                if (numero < 2000 || numero > 2030) {
                    // Verificar que no sea parte de "RG 734-2025" o fechas
                    if (!line.includes('RG') && !line.includes('/')) {
                        // Dar prioridad a líneas que SOLO tienen el número de 4 dígitos
                        const soloNumero = line.replace(/[^\d]/g, '') === codigo;

                        codigosEncontrados.push({
                            codigo,
                            linea: i,
                            contexto: line,
                            prioridad: soloNumero ? 1 : 2  // Prioridad alta si está solo
                        });
                    }
                }
            }
        }

        // Ordenar por prioridad (códigos solos primero)
        codigosEncontrados.sort((a, b) => a.prioridad - b.prioridad);

        // Si encontramos códigos, tomar el primero
        if (codigosEncontrados.length > 0) {
            return codigosEncontrados[0].codigo;
        }

        // NUEVA ESTRATEGIA: Si no encontramos el código, hacer OCR adicional
        // enfocado SOLO en números (sin whitelist de letras)
        if (codigosEncontrados.length === 0) {
            console.log('No se encontró código con OCR normal, intentando OCR numérico...');
            const codigoNumerico = await this.buscarCodigoConOCRNumerico();

            if (codigoNumerico) {
                return codigoNumerico;
            }
        }

        return null;
    }

    /**
     * Intenta buscar el código único con OCR configurado solo para números
     * @returns {Promise<string|null>} Código encontrado o null
     */
    async buscarCodigoConOCRNumerico() {
        try {
            if (!this.currentCanvas) {
                return null;
            }

            // ESTRATEGIA: Recortar la esquina INFERIOR IZQUIERDA donde está el código
            // Basado en la imagen: el recuadro "CÓDIGO ÚNICO IDENTIFICADOR" está abajo a la izquierda

            const canvas = this.currentCanvas;
            const width = canvas.width;
            const height = canvas.height;

            // Recortar aproximadamente el 25% inferior izquierdo
            // Coordenadas: x=0, y=75% del alto, ancho=35%, alto=25%
            const cropX = 0;
            const cropY = Math.floor(height * 0.70); // Desde 70% hacia abajo
            const cropWidth = Math.floor(width * 0.35); // 35% del ancho
            const cropHeight = Math.floor(height * 0.30); // 30% del alto

            // Crear canvas recortado
            const croppedCanvas = document.createElement('canvas');
            const ctx = croppedCanvas.getContext('2d');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;

            // Copiar región específica
            ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            // OCR con whitelist SOLO de números en la región recortada
            const result = await this.Tesseract.recognize(croppedCanvas, 'spa', {
                tessedit_char_whitelist: '0123456789',
                tessedit_pageseg_mode: this.Tesseract.PSM.SINGLE_BLOCK,
                preserve_interword_spaces: '0',
                logger: () => { } // Sin logs para no saturar
            });

            const text = result.data.text;

            // Buscar números de 4 dígitos
            const matches = text.matchAll(/(\d{4})/g);

            for (const match of matches) {
                const codigo = match[1];
                const numero = parseInt(codigo);

                // Evitar años
                if (numero < 2000 || numero > 2030) {
                    return codigo;
                }
            }

            return null;
        } catch (error) {
            console.warn('Error en OCR numérico de región:', error.message);
            return null;
        }
    }

    /**
     * Extrae la placa SOLO de la región específica
     * @param {Object} regiones - Objeto con regiones del documento
     * @returns {string|null} Placa encontrada
     */
    extractPlacaRodajeDeRegion(regiones) {
        // Prioridad 1: Buscar en región de DATOS DEL VEHÍCULO (formato tabla)
        const regionDatosVehiculo = regiones.datosVehiculo;

        if (regionDatosVehiculo) {

            // ESTRATEGIA 1: Formato tabla con separadores "I"
            // Ejemplo: "PLACA RODAJE I MARCA Y MODELO I ..."
            //          "v9Kes1 HYUNDAI- 2017 ..."
            //          "ATY828 YOUYI- 2016 ..."

            const lines = regionDatosVehiculo.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Si encontramos la línea de encabezado con "PLACA RODAJE"
                if (/PLACA\s+RODAJE/i.test(line)) {

                    // La placa debe estar en la siguiente línea (datos de la tabla)
                    if (i + 1 < lines.length) {
                        const dataLine = lines[i + 1].trim();

                        // Extraer la primera palabra/token (la placa)
                        // Puede estar separada por espacios o "I"
                        const tokens = dataLine.split(/[\s|I]+/).filter(t => t.length > 0);

                        if (tokens.length > 0) {
                            const candidato = tokens[0].toUpperCase().replace(/-/g, '');

                            // Validar que sea una placa válida
                            if (this.esPlacaValida(candidato)) {
                                return candidato;
                            }
                        }
                    }
                }

                // ESTRATEGIA 2: Buscar patrón de placa en cualquier línea de esta región
                const placaMatch = this.extraerPlacaDeLinea(line);
                if (placaMatch) {
                    return placaMatch;
                }
            }
        }

        // Prioridad 2: Buscar en región específica de PLACA RODAJE
        const regionPlaca = regiones.placaRodaje;

        if (regionPlaca) {
            const lines = regionPlaca.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Ignorar la línea del encabezado
                if (/PLACA\s+RODAJE/i.test(line)) {
                    continue;
                }

                // Buscar placa en esta línea
                const placaMatch = this.extraerPlacaDeLinea(line);
                if (placaMatch) {
                    return placaMatch;
                }
            }
        }

        return null;
    }

    /**
     * Extrae una placa de una línea de texto
     * @param {string} line - Línea de texto
     * @returns {string|null} Placa encontrada o null
     */
    extraerPlacaDeLinea(line) {
        const lineUpper = line.toUpperCase().replace(/-/g, '');

        // Buscar diferentes formatos de placa
        const patrones = [
            // Formato 1: 2-3 letras + 3-4 números (AAW207, VOL911, C3A123)
            /\b([A-Z]{2,3}\d{3,4})\b/,

            // Formato 2: Letra + Número + Letra + Números (A4D954, V9K851)
            /\b([A-Z]\d[A-Z]\d{3,4})\b/,

            // Formato 3: Números + Letras (solo si tiene ambos)
            /\b([A-Z0-9]{5,7})\b/
        ];

        for (const patron of patrones) {
            const match = lineUpper.match(patron);
            if (match) {
                const candidato = match[1];

                if (this.esPlacaValida(candidato)) {
                    return candidato;
                }
            }
        }

        return null;
    }

    /**
     * Valida si un string es una placa válida
     * @param {string} placa - Candidato a placa
     * @returns {boolean} True si es válida
     */
    esPlacaValida(placa) {
        // Debe tener letras Y números
        const tieneLetras = /[A-Z]/.test(placa);
        const tieneNumeros = /\d/.test(placa);

        // Lista negra de palabras
        const blacklist = [
            'MARCA', 'MODELO', 'URBANO', 'COUNTY', 'HYUNDAI',
            'YOUYI', 'FABRICACION', 'CATEGORIA', 'RESOLUCION',
            'FECHA', 'RAZON', 'SOCIAL', 'EMPRESA', 'TRANSPORTES',
            'NEGOCIO', 'RADIO', 'ACCION', 'CAYMA', 'ZAMACOLA'
        ];

        const esInvalida = blacklist.some(palabra => placa.includes(palabra));

        // Debe tener longitud adecuada
        const longitudOk = placa.length >= 5 && placa.length <= 8;

        return tieneLetras && tieneNumeros && !esInvalida && longitudOk;
    }

    /**
     * Extrae el CÓDIGO ÚNICO IDENTIFICADOR
     * Patrones basados en tarjetas TUC de Arequipa
     * Estrategia: Buscar número de 4 dígitos AISLADO en línea propia
     */
    extractCodigoUnico(text) {
        // ESTRATEGIA 1: Buscar "CÓDIGO ÚNICO" seguido de número en las siguientes líneas
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Si encontramos la línea con "CÓDIGO ÚNICO"
            if (/CÓDIGO\s+ÚNICO|CODIGO\s+UNICO/i.test(line)) {

                // Buscar en las siguientes 3 líneas un número de exactamente 4 dígitos
                for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                    const nextLine = lines[j].trim();

                    // Buscar número de EXACTAMENTE 4 dígitos, solo en la línea
                    const match = nextLine.match(/^(\d{4})$/);
                    if (match) {
                        const codigo = match[1];
                        return codigo;
                    }
                }
            }
        }

        // ESTRATEGIA 2: Buscar número de 4 dígitos en la misma línea que "CÓDIGO"
        const patterns = [
            /CÓDIGO\s+ÚNICO\s+IDENTIFICADOR\s*[\n\r\s]*(\d{4})/i,
            /CÓDIGO\s+ÚNICO[:\s]+(\d{4})/i,
            /CUI[:\s]+(\d{4})/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const codigo = match[1].trim();
                return codigo;
            }
        }

        // ESTRATEGIA 3: Buscar CUALQUIER número de 4 dígitos aislado en su propia línea
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^(\d{4})$/);
            if (match) {
                const codigo = match[1];
                return codigo;
            }
        }

        return null;
    }

    /**
     * Extrae la PLACA DE RODAJE
     * Patrones basados en tarjetas TUC de Arequipa
     * Estrategia: Buscar placa alfanumérica AISLADA en línea propia
     * Formato típico peruano: ABC123, A1B234, AAW207
     */
    extractPlacaRodaje(text) {
        const lines = text.split('\n');

        // ESTRATEGIA 1: Buscar "PLACA RODAJE" seguido de placa en las siguientes líneas
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Si encontramos la línea con "PLACA RODAJE"
            if (/PLACA\s+RODAJE/i.test(line)) {
                // Buscar en las siguientes 3 líneas una placa válida
                for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                    const nextLine = lines[j].trim().toUpperCase();

                    // Validar que sea una placa válida (alfanumérica, 5-7 caracteres)
                    // Debe tener AL MENOS 1 letra Y 1 número
                    const placaMatch = nextLine.match(/^([A-Z0-9\-]{5,8})$/);
                    if (placaMatch) {
                        const placa = placaMatch[1].replace(/-/g, ''); // Remover guiones

                        // Validar que tenga letras Y números
                        const tieneLetras = /[A-Z]/.test(placa);
                        const tieneNumeros = /\d/.test(placa);

                        // NO debe ser solo una palabra común (MARCA, I, etc.)
                        const palabrasInvalidas = ['MARCA', 'MODELO', 'I', 'II', 'III', 'URBANO', 'COUNTY'];
                        const esInvalida = palabrasInvalidas.includes(placa);

                        if (tieneLetras && tieneNumeros && !esInvalida && placa.length >= 5) {
                            console.log(`Placa de Rodaje encontrada: ${placa}`);
                            return placa;
                        }
                    }
                }
            }
        }

        // ESTRATEGIA 2: Buscar placas en la misma línea que "PLACA RODAJE"
        const patterns = [
            /PLACA\s+RODAJE\s*[\n\r\s]*([A-Z0-9\-]{5,8})/i,
            /PLACA\s+(?:DE\s+)?RODAJE[:\s]+([A-Z0-9\-]{5,8})/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const placa = match[1].trim().toUpperCase().replace(/-/g, '');

                // Validaciones
                const tieneLetras = /[A-Z]/.test(placa);
                const tieneNumeros = /\d/.test(placa);
                const palabrasInvalidas = ['MARCA', 'MODELO', 'I', 'II', 'III', 'URBANO'];
                const esInvalida = palabrasInvalidas.includes(placa);

                if (tieneLetras && tieneNumeros && !esInvalida) {
                    console.log(`Placa de Rodaje encontrada (patrón): ${placa}`);
                    return placa;
                }
            }
        }

        // ESTRATEGIA 3: Buscar formato de placa peruano en líneas aisladas
        // Formato: Letra(s) + Números (ej: AAW207, A4D954, VOL911)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toUpperCase();

            // Formato típico: 2-3 letras + 3-4 números
            const placaMatch = line.match(/^([A-Z]{2,3}\d{3,4})$/);
            if (placaMatch) {
                const placa = placaMatch[1];
                console.log(`Placa de Rodaje encontrada: ${placa}`);
                return placa;
            }

            // Formato alternativo: Letra + Número + Letra + Números (ej: A4D954)
            const placaMatch2 = line.match(/^([A-Z]\d[A-Z]\d{3,4})$/);
            if (placaMatch2) {
                const placa = placaMatch2[1];
                console.log(`Placa de Rodaje encontrada: ${placa}`);
                return placa;
            }
        }

        console.warn('No se detectó placa de rodaje');
        return null;
    }

    /**
     * Busca el código único con OCR FOCALIZADO en la región del sello
     * Esta función hace OCR solo en la parte inferior izquierda donde suele estar el sello grande
     * @returns {Promise<string|null>} Código encontrado o null
     */
    async buscarCodigoEnSelloConOCR() {
        try {
            // Verificar que tengamos un canvas actual
            if (!this.currentCanvas) {
                console.warn('No hay canvas disponible para OCR focalizado');
                return null;
            }

            console.log('Ejecutando OCR focalizado en región del sello...');

            const canvas = this.currentCanvas;
            const width = canvas.width;
            const height = canvas.height;

            // REGIÓN DEL SELLO: Parte inferior izquierda (donde está el código grande)
            const cropX = Math.floor(width * 0.05);
            const cropY = Math.floor(height * 0.65);
            const cropWidth = Math.floor(width * 0.35);
            const cropHeight = Math.floor(height * 0.30);

            // Crear un nuevo canvas con solo esa región
            const croppedCanvas = document.createElement('canvas');
            const ctx = croppedCanvas.getContext('2d');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;

            // Copiar la región del canvas original
            ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            // Ejecutar OCR SOLO EN NÚMEROS (más rápido y preciso)
            const result = await this.Tesseract.recognize(croppedCanvas, 'spa', {
                tessedit_char_whitelist: '0123456789',
                tessedit_pageseg_mode: this.Tesseract.PSM.SINGLE_BLOCK,
                logger: () => { } // Sin logs para ir más rápido
            });

            const text = result.data.text;

            // Buscar números de 4 dígitos en el texto del sello
            const lines = text.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();

                // Buscar exactamente 4 dígitos
                const match = trimmed.match(/(\d{4})/);
                if (match) {
                    const codigo = match[1];
                    const numero = parseInt(codigo);

                    // Evitar años
                    if (numero < 2000 || numero > 2030) {
                        console.log(`Código encontrado en sello: ${codigo}`);
                        return codigo;
                    }
                }
            }

            console.warn('No se encontró código de 4 dígitos en el sello');
            return null;

        } catch (error) {
            console.error('Error en OCR de sello:', error);
            return null;
        }
    }

    /**
     * Divide el PDF original en archivos individuales por página
     * @param {string} pdfPath - Ruta del PDF original
     * @param {string} outputDir - Directorio de salida
     * @returns {Promise<Array>} Rutas de los PDFs generados
     */
    async splitPdfByPage(pdfPath, outputDir) {
        console.log(`Iniciando división de PDF: ${pdfPath}`);

        try {
            // Leer PDF original
            const arrayBuffer = await window.api.readPdfFile(pdfPath);
            const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();
            const outputPaths = [];

            console.log(`Total de páginas a dividir: ${totalPages}`);

            // Crear directorio de salida si no existe
            await window.api.createDirectory(outputDir);

            // Dividir cada página
            for (let i = 0; i < totalPages; i++) {
                const pageNum = i + 1;

                // Crear nuevo PDF con una sola página
                const newPdf = await window.PDFLib.PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);

                // Guardar archivo
                const pdfBytes = await newPdf.save();
                const fileName = `pagina_${pageNum}.pdf`;
                const filePath = await window.api.savePdfPage(outputDir, fileName, pdfBytes);

                outputPaths.push(filePath);
                console.log(`Página ${pageNum} guardada: ${fileName}`);
            }

            console.log(`División completada. Archivos generados: ${outputPaths.length}`);

            return outputPaths;

        } catch (error) {
            console.error('Error dividiendo PDF:', error);
            throw error;
        }
    }

    /**
     * Divide el PDF en páginas individuales y las guarda con el nombre del código único
     * @param {string} pdfPath - Ruta del PDF original
     * @param {Array} results - Resultados del procesamiento con códigos detectados
     * @returns {Promise<Object>} Resultado de la división
     */
    async dividirPdfPorCodigos(pdfPath, results) {
        try {
            console.log('Iniciando división de PDF por códigos extraídos');

            // Solicitar carpeta de destino
            const outputDir = await window.api.abrirDialogoCarpeta();

            if (!outputDir) {
                console.log('Operación cancelada por el usuario');
                return {
                    success: false,
                    message: 'Operación cancelada por el usuario'
                };
            }

            console.log(`Carpeta de destino: ${outputDir}`);

            // Leer el PDF original
            const pdfBytes = await window.api.readPdfFile(pdfPath);
            let pdfDoc = await this.PDFLib.PDFDocument.load(pdfBytes);
            const totalPages = pdfDoc.getPageCount();

            console.log(`PDF tiene ${totalPages} páginas`);

            const archivosCreados = [];
            const errores = [];

            // Procesar cada página
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const pageNum = result.pageNumber;
                const codigoUnico = result.data?.codigoUnico;
                const placaRodaje = result.data?.placaRodaje;

                console.log(`Procesando página ${pageNum}/${totalPages}...`);

                // Determinar nombre del archivo
                let fileName;
                if (codigoUnico) {
                    fileName = `${codigoUnico}.pdf`;
                } else {
                    // Si no hay código, usar placa o número de página
                    if (placaRodaje) {
                        fileName = `${placaRodaje}.pdf`;
                    } else {
                        fileName = `PAGINA_${pageNum}.pdf`;
                    }
                }

                try {
                    // Crear nuevo documento PDF con solo esta página
                    const newPdf = await this.PDFLib.PDFDocument.create();
                    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                    newPdf.addPage(copiedPage);

                    // Serializar a bytes
                    const newPdfBytes = await newPdf.save();

                    // Guardar archivo
                    const savedPath = await window.api.savePdfPage(outputDir, fileName, newPdfBytes);

                    console.log(`Guardado: ${fileName}`);

                    // Actualizar el resultado con la ruta del PDF generado
                    result.pdfPath = savedPath;

                    archivosCreados.push({
                        pagina: pageNum,
                        codigoUnico: codigoUnico || null,
                        placaRodaje: placaRodaje || null,
                        nombreArchivo: fileName,
                        ruta: savedPath
                    });

                } catch (error) {
                    console.error(`Error guardando página ${pageNum}:`, error.message);
                    errores.push({
                        pagina: pageNum,
                        codigoUnico: codigoUnico || null,
                        error: error.message
                    });
                }
            }

            console.log(`División completada. Archivos creados: ${archivosCreados.length}. Errores: ${errores.length}`);

            // LIBERAR MEMORIA del PDF Document
            if (pdfDoc) {
                pdfDoc = null;
            }

            return {
                success: true,
                carpetaDestino: outputDir,
                archivosCreados,
                errores,
                total: results.length
            };

        } catch (error) {
            console.error('Error en división del PDF:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Registra callback de progreso
     * @param {Function} callback - Función (pageNum, totalPages, pageData) => void
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    /**
     * 🧹 LIMPIEZA DE MEMORIA - Libera todos los recursos después del procesamiento
     * - Cierra el documento PDF
     * - Elimina el canvas actual
     * - Limpia resultados almacenados
     * - Fuerza garbage collection
     */
    async cleanup() {
        try {
            // 1. Cerrar documento PDF
            if (this.currentPdf) {
                await this.currentPdf.destroy();
                this.currentPdf = null;
            }

            // 2. Eliminar canvas
            if (this.currentCanvas) {
                const ctx = this.currentCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
                }
                this.currentCanvas.width = 0;
                this.currentCanvas.height = 0;
                this.currentCanvas = null;
            }

            // 3. Limpiar resultados almacenados
            if (this.results && this.results.length > 0) {
                // Limpiar el texto OCR de cada resultado (puede ser muy grande)
                this.results.forEach(result => {
                    if (result.text) {
                        result.text = null;
                    }
                });

                // Mantener solo los datos esenciales
                this.results = this.results.map(r => ({
                    pageNumber: r.pageNumber,
                    data: r.data,
                    success: r.success
                }));
            }

            // 4. Resetear contadores
            this.processedPages = 0;
            this.totalPages = 0;

            // 5. Sugerir garbage collection (solo en entornos que lo soporten)
            if (typeof global !== 'undefined' && global.gc) {
                global.gc();
            }

        } catch (error) {
            console.error('Error al liberar memoria:', error);
        }
    }
}

// Exportar como singleton
const batchOcrProcessor = new BatchOcrProcessor();
export default batchOcrProcessor;
