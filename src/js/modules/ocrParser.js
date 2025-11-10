/**
 * ocrParser.js
 * Módulo para parsear y estructurar texto extraído por OCR
 * Detecta y extrae campos específicos de expedientes
 */

export class OCRParser {
    constructor() {
        this.parsedData = null;
    }

    /**
     * Parsea el texto extraído y extrae campos del formulario
     * @param {string} text - Texto limpio del OCR
     * @returns {Object} - Datos estructurados para el formulario
     */
    parseExpedienteData(text) {
        if (!text || text.trim().length === 0) {
            console.warn('⚠️ Texto vacío para parsear');
            return null;
        }

        console.log('🔍 ==========================================');
        console.log('🔍 INICIANDO PARSEO DE DATOS DEL EXPEDIENTE');
        console.log('🔍 ==========================================');

        const data = {
            numeroExpediente: this.extractNumeroExpediente(text),
            anioExpediente: this.extractAnio(text),
            numeroResolucion: this.extractNumeroResolucion(text),
            fecha: this.extractFecha(text),
            informeTecnico: this.extractInformeTecnico(text),
            numeroFichero: null, // Se extrae de unidad de negocio
            nombreEmpresa: this.extractNombreEmpresa(text),
            unidadNegocio: this.extractUnidadNegocio(text)
        };

        // N° de Fichero es el mismo que Unidad de Negocio
        data.numeroFichero = data.unidadNegocio;

        console.log('📊 DATOS EXTRAÍDOS:');
        console.log('-------------------------------------------');
        Object.entries(data).forEach(([key, value]) => {
            const icon = value ? '✅' : '❌';
            console.log(`${icon} ${key}: ${value || 'NO DETECTADO'}`);
        });
        console.log('-------------------------------------------');
        console.log('🔍 ==========================================');

        this.parsedData = data;
        return data;
    }

    /**
     * Extrae el número de expediente
     * Busca patrones como: "expediente Nº53964-2025" o "expediente N°53964-2025"
     * VALIDACIÓN: Si hay múltiples, toma solo el PRIMERO
     */
    extractNumeroExpediente(text) {
        const patterns = [
            /expediente\s+N[°º]\s*(\d+)-\d{4}/gi,
            /expediente\s+N[°º]\s*(\d+)/gi,
            /exp[.\s]+N[°º]\s*(\d+)/gi
        ];

        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            
            if (matches.length > 0) {
                const primerExpediente = matches[0][1];
                
                if (matches.length > 1) {
                    console.log(`   ⚠️ Se encontraron ${matches.length} números de expediente`);
                    console.log(`   📋 Expedientes detectados:`, matches.map(m => m[1]));
                    console.log(`   🎯 Usando el PRIMERO: "${matches[0][0]}" → ${primerExpediente}`);
                } else {
                    console.log(`   🎯 Expediente encontrado: "${matches[0][0]}" → ${primerExpediente}`);
                }
                
                return primerExpediente;
            }
        }

        console.warn('   ⚠️ No se detectó número de expediente');
        return null;
    }

    /**
     * Extrae el año del expediente
     * Busca año en formato "expediente Nº53964-2025" o "del 2025"
     */
    extractAnio(text) {
        const patterns = [
            /expediente\s+N[°º]\s*\d+-(202\d)/i,
            /del\s+(202\d)/i,
            /año\s+(202\d)/i,
            /(202\d)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                console.log(`   🎯 Año encontrado: "${match[0]}" → ${match[1]}`);
                return match[1];
            }
        }

        // Por defecto usar año actual
        const currentYear = new Date().getFullYear().toString();
        console.log(`   ℹ️ Usando año actual por defecto: ${currentYear}`);
        return currentYear;
    }

    /**
     * Extrae el número de resolución
     * Busca: "RESOLUCIÓN GERENCIAL Nº 803-2025-MPA/GTMS"
     * Maneja números con espacios: "8 0 3" o "— 803 -"
     * VALIDACIÓN: Si hay múltiples, toma solo el PRIMERO
     */
    extractNumeroResolucion(text) {
        // Primero intentar con el texto ya limpio (números sin espacios)
        const patterns = [
            /RESOLUCIÓN\s+GERENCIAL\s+N[°º]\s*—?\s*(\d+)/gi,
            /RESOLUCIÓN\s+GERENCIAL\s+N[°º]\s+(\d+)/gi,
            /RESOLUCIÓN\s+N[°º]\s*—?\s*(\d+)/gi,
            /R\.G\.\s+N[°º]\s*(\d+)/gi
        ];

        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            
            if (matches.length > 0) {
                const primeraResolucion = matches[0][1];
                
                if (matches.length > 1) {
                    console.log(`   ⚠️ Se encontraron ${matches.length} números de resolución`);
                    console.log(`   📋 Resoluciones detectadas:`, matches.map(m => m[1]));
                    console.log(`   🎯 Usando la PRIMERA: "${matches[0][0]}" → ${primeraResolucion}`);
                } else {
                    console.log(`   🎯 Resolución encontrada: "${matches[0][0]}" → ${primeraResolucion}`);
                }
                
                return primeraResolucion;
            }
        }

        // Si no encuentra, buscar en la primera línea que contenga "RESOLUCIÓN GERENCIAL"
        const lines = text.split('\n');
        for (const line of lines) {
            if (/RESOLUCIÓN\s+GERENCIAL/i.test(line)) {
                // Extraer todos los dígitos de esa línea
                const digitsOnly = line.replace(/[^\d]/g, '');
                
                // Tomar los primeros 3-4 dígitos (número de resolución típico)
                if (digitsOnly.length >= 3) {
                    const resolution = digitsOnly.substring(0, Math.min(4, digitsOnly.length));
                    console.log(`   🎯 Resolución extraída de línea (fallback): "${line.trim()}" → ${resolution}`);
                    return resolution;
                }
            }
        }

        console.warn('   ⚠️ No se detectó número de resolución');
        return null;
    }

    /**
     * Extrae la fecha del expediente
     * Busca: "25 de julio del 2025" y convierte a formato YYYY-MM-DD
     */
    extractFecha(text) {
        const meses = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
            'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
            'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        // Patrón: "25 de julio del 2025"
        const pattern = /(\d{1,2})\s+de\s+(\w+)\s+del?\s+(202\d)/i;
        const match = text.match(pattern);

        if (match) {
            const dia = match[1].padStart(2, '0');
            const mesNombre = match[2].toLowerCase();
            const anio = match[3];
            const mes = meses[mesNombre];

            if (mes) {
                const fecha = `${anio}-${mes}-${dia}`;
                console.log(`   🎯 Fecha encontrada: "${match[0]}" → ${fecha}`);
                return fecha;
            }
        }

        // Patrón alternativo: "19 de junio del 2025" (fecha de presentación)
        const pattern2 = /presentado.*?(\d{1,2})\s+de\s+(\w+)\s+del?\s+(202\d)/i;
        const match2 = text.match(pattern2);

        if (match2) {
            const dia = match2[1].padStart(2, '0');
            const mesNombre = match2[2].toLowerCase();
            const anio = match2[3];
            const mes = meses[mesNombre];

            if (mes) {
                const fecha = `${anio}-${mes}-${dia}`;
                console.log(`   🎯 Fecha (presentación) encontrada: "${match2[0]}" → ${fecha}`);
                return fecha;
            }
        }

        console.warn('   ⚠️ No se detectó fecha');
        return null;
    }

    /**
     * Extrae el número de informe técnico
     * Busca: "Informe Técnico N°086-2025-MPA/GTMS-vcfc"
     * VALIDACIÓN: Si hay múltiples, toma solo el PRIMERO
     */
    extractInformeTecnico(text) {
        const patterns = [
            /Informe\s+T[eé]cnico\s+N[°º]\s*([\d\-A-Z\/a-z]+)/gi, // Global para encontrar todos
            /I\.T\.\s+N[°º]\s*([\d\-A-Z\/]+)/gi
        ];

        for (const pattern of patterns) {
            // Usar matchAll para obtener todas las coincidencias
            const matches = [...text.matchAll(pattern)];
            
            if (matches.length > 0) {
                const primerInforme = matches[0][1];
                
                if (matches.length > 1) {
                    console.log(`   ⚠️ Se encontraron ${matches.length} informes técnicos`);
                    console.log(`   📋 Informes detectados:`, matches.map(m => m[1]));
                    console.log(`   🎯 Usando el PRIMERO: "${matches[0][0]}" → ${primerInforme}`);
                } else {
                    console.log(`   🎯 Informe Técnico encontrado: "${matches[0][0]}" → ${primerInforme}`);
                }
                
                return primerInforme;
            }
        }

        console.warn('   ⚠️ No se detectó informe técnico');
        return null;
    }

    /**
     * Extrae el nombre de la empresa
     * Busca: "AQP MASIVO AREQUIPA S.A.C." o similar
     * VALIDACIÓN: Si hay múltiples, toma solo la PRIMERA
     */
    extractNombreEmpresa(text) {
        const patterns = [
            /Empresa\s+de\s+([A-ZÁÉÍÓÚÑ\s]+S\.A\.C\.)/gi,
            /Empresa\s+([A-ZÁÉÍÓÚÑ\s]+S\.R\.L\.)/gi,
            /Empresa\s+([A-ZÁÉÍÓÚÑ\s]+E\.I\.R\.L\.)/gi,
            /representante\s+legal\s+de\s+la\s+Empresa\s+de\s+([A-ZÁÉÍÓÚÑ\s.]+?)(?:,|de\s+la)/gi
        ];

        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            
            if (matches.length > 0) {
                const primeraEmpresa = matches[0][1].trim();
                
                if (matches.length > 1) {
                    console.log(`   ⚠️ Se encontraron ${matches.length} nombres de empresa`);
                    console.log(`   📋 Empresas detectadas:`, matches.map(m => m[1].trim()));
                    console.log(`   🎯 Usando la PRIMERA: "${matches[0][0]}" → ${primeraEmpresa}`);
                } else {
                    console.log(`   🎯 Empresa encontrada: "${matches[0][0]}" → ${primeraEmpresa}`);
                }
                
                return primeraEmpresa;
            }
        }

        console.warn('   ⚠️ No se detectó nombre de empresa');
        return null;
    }

    /**
     * Extrae la unidad de negocio
     * Busca: "unidad de negocio C-7" o "C-7"
     * Retorna solo el código: "C7" (sin guion)
     * VALIDACIÓN: Si hay múltiples, toma solo la PRIMERA
     */
    extractUnidadNegocio(text) {
        const patterns = [
            /unidad\s+de\s+negocio\s+C-?(\d+)/gi,
            /C-(\d+)/g,
            /(?:^|\s)C(\d+)(?:\s|$)/g
        ];

        for (const pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            
            if (matches.length > 0) {
                const primeraUnidad = `C${matches[0][1]}`;
                
                if (matches.length > 1) {
                    console.log(`   ⚠️ Se encontraron ${matches.length} unidades de negocio`);
                    console.log(`   📋 Unidades detectadas:`, matches.map(m => `C${m[1]}`));
                    console.log(`   🎯 Usando la PRIMERA: "${matches[0][0]}" → ${primeraUnidad}`);
                } else {
                    console.log(`   🎯 Unidad de Negocio encontrada: "${matches[0][0]}" → ${primeraUnidad}`);
                }
                
                return primeraUnidad;
            }
        }

        console.warn('   ⚠️ No se detectó unidad de negocio');
        return null;
    }

    /**
     * Obtiene los datos parseados más recientes
     * @returns {Object|null}
     */
    getParsedData() {
        return this.parsedData;
    }

    /**
     * Limpia los datos parseados
     */
    clearParsedData() {
        this.parsedData = null;
        console.log('🗑️ Datos parseados limpiados');
    }
}

// Exportar instancia única (singleton)
export const ocrParser = new OCRParser();
