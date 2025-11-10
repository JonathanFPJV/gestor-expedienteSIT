/**
 * formAutofill.js
 * Módulo para auto-completar el formulario de expedientes
 * con datos extraídos del OCR
 */

export class FormAutofill {
    constructor() {
        this.formElements = {};
    }

    /**
     * Inicializa las referencias a los elementos del formulario
     */
    initializeFormElements() {
        this.formElements = {
            numeroExpediente: document.getElementById('numeroExpediente'),
            anioExpediente: document.getElementById('anioExpediente'),
            numeroResolucion: document.getElementById('numeroResolucion'),
            fecha: document.getElementById('fecha'),
            informeTecnico: document.getElementById('informeTecnico'),
            numeroFichero: document.getElementById('numeroFichero'),
            nombreEmpresa: document.getElementById('nombreEmpresa'),
            unidadNegocio: document.getElementById('unidadNegocio')
        };

        console.log('✅ FormAutofill: Elementos del formulario inicializados');
    }

    /**
     * Auto-completa el formulario con los datos parseados
     * @param {Object} data - Datos parseados del OCR
     * @returns {Object} - Estadísticas de campos llenados
     */
    autofillForm(data) {
        if (!data) {
            console.warn('⚠️ No hay datos para auto-completar');
            return { filled: 0, total: 0 };
        }

        console.log('📝 ==========================================');
        console.log('📝 INICIANDO AUTO-COMPLETADO DEL FORMULARIO');
        console.log('📝 ==========================================');

        let filledCount = 0;
        const totalFields = Object.keys(this.formElements).length;

        // Llenar cada campo si hay datos
        if (data.numeroExpediente) {
            this.fillField('numeroExpediente', data.numeroExpediente, 'N° de Expediente');
            filledCount++;
        }

        if (data.anioExpediente) {
            this.fillField('anioExpediente', data.anioExpediente, 'Año');
            filledCount++;
        }

        if (data.numeroResolucion) {
            this.fillField('numeroResolucion', data.numeroResolucion, 'N° de Resolución');
            filledCount++;
        }

        if (data.fecha) {
            this.fillField('fecha', data.fecha, 'Fecha del Expediente');
            filledCount++;
        }

        if (data.informeTecnico) {
            this.fillField('informeTecnico', data.informeTecnico, 'Informe Técnico');
            filledCount++;
        }

        if (data.numeroFichero) {
            this.fillField('numeroFichero', data.numeroFichero, 'N° de Fichero');
            filledCount++;
        }

        if (data.nombreEmpresa) {
            this.fillField('nombreEmpresa', data.nombreEmpresa, 'Nombre de Empresa');
            filledCount++;
        }

        if (data.unidadNegocio) {
            this.fillField('unidadNegocio', data.unidadNegocio, 'Unidad de Negocio');
            filledCount++;
        }

        console.log('✅ ==========================================');
        console.log(`✅ AUTO-COMPLETADO FINALIZADO: ${filledCount}/${totalFields} campos`);
        console.log('✅ ==========================================');

        return { filled: filledCount, total: totalFields };
    }

    /**
     * Llena un campo específico del formulario
     * @param {string} fieldId - ID del elemento
     * @param {string} value - Valor a asignar
     * @param {string} label - Etiqueta descriptiva
     */
    fillField(fieldId, value, label) {
        const element = this.formElements[fieldId];

        if (!element) {
            console.warn(`   ⚠️ Campo no encontrado: ${fieldId}`);
            return;
        }

        element.value = value;
        
        // Añadir clase visual para campos auto-completados
        element.classList.add('autofilled');
        
        // Remover clase después de animación
        setTimeout(() => {
            element.classList.remove('autofilled');
        }, 2000);

        console.log(`   ✅ ${label}: "${value}"`);
    }

    /**
     * Limpia todos los campos del formulario
     */
    clearForm() {
        Object.values(this.formElements).forEach(element => {
            if (element) {
                element.value = '';
                element.classList.remove('autofilled');
            }
        });

        console.log('🗑️ Formulario limpiado');
    }

    /**
     * Resalta los campos que fueron auto-completados
     * @param {number} duration - Duración del resaltado en ms
     */
    highlightAutofilledFields(duration = 2000) {
        const autofilledElements = document.querySelectorAll('.autofilled');
        
        autofilledElements.forEach(element => {
            element.style.transition = 'background-color 0.3s ease';
        });

        setTimeout(() => {
            autofilledElements.forEach(element => {
                element.classList.remove('autofilled');
            });
        }, duration);
    }
}

// Exportar instancia única (singleton)
export const formAutofill = new FormAutofill();
