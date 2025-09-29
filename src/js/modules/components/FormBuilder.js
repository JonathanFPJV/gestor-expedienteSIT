// src/js/modules/components/FormBuilder.js
import { BaseComponent } from './BaseComponent.js';

/**
 * Componente para crear formularios dinámicos con validación
 * Permite generar formularios complejos de manera programática
 */
export class FormBuilder extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);
        this.fields = [];
        this.validationRules = {};
        this.formData = {};
    }

    get defaultOptions() {
        return {
            ...super.defaultOptions,
            className: 'form-builder',
            submitButtonText: 'Enviar',
            resetButtonText: 'Limpiar',
            showSubmitButton: true,
            showResetButton: true,
            validateOnSubmit: true,
            validateOnBlur: false,
            noValidate: true
        };
    }

    render() {
        this.element = this.createElement('form', {
            className: `form-builder ${this.options.className}`,
            id: this.options.id,
            attributes: {
                novalidate: this.options.noValidate
            }
        });

        this.container.appendChild(this.element);
        return this;
    }

    bindEvents() {
        // Evento de envío del formulario
        this.addEventListener(this.element, 'submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Evento de reset del formulario
        this.addEventListener(this.element, 'reset', (e) => {
            e.preventDefault();
            this.handleReset();
        });
    }

    /**
     * Agregar un campo al formulario
     */
    addField(fieldConfig) {
        const field = this.createField(fieldConfig);
        this.fields.push({ config: fieldConfig, element: field });
        
        if (fieldConfig.validation) {
            this.validationRules[fieldConfig.name] = fieldConfig.validation;
        }

        this.element.appendChild(field);
        
        // Agregar validación en tiempo real si está habilitada
        if (this.options.validateOnBlur && fieldConfig.validation) {
            const input = field.querySelector('input, select, textarea');
            if (input) {
                this.addEventListener(input, 'blur', () => {
                    this.validateField(fieldConfig.name);
                });
            }
        }

        return this;
    }

    /**
     * Crear un campo individual
     */
    createField(config) {
        const fieldContainer = this.createElement('div', {
            className: `form-field ${config.type}-field`
        });

        // Crear label si existe
        if (config.label) {
            const label = this.createElement('label', {
                className: 'form-label',
                textContent: config.label,
                attributes: { for: config.name }
            });
            
            if (config.validation && config.validation.required) {
                label.classList.add('required');
                label.innerHTML += ' <span class="required-asterisk">*</span>';
            }
            
            fieldContainer.appendChild(label);
        }

        // Crear el input según el tipo
        let input;
        switch (config.type) {
            case 'select':
                input = this.createSelectField(config);
                break;
            case 'textarea':
                input = this.createTextareaField(config);
                break;
            case 'checkbox':
                input = this.createCheckboxField(config);
                break;
            case 'radio':
                input = this.createRadioField(config);
                break;
            case 'file':
                input = this.createFileField(config);
                break;
            default:
                input = this.createInputField(config);
        }

        fieldContainer.appendChild(input);

        // Crear contenedor para mensajes de error
        const errorContainer = this.createElement('div', {
            className: 'field-error',
            id: `${config.name}-error`
        });
        fieldContainer.appendChild(errorContainer);

        // Crear texto de ayuda si existe
        if (config.helpText) {
            const helpText = this.createElement('small', {
                className: 'form-help-text',
                textContent: config.helpText
            });
            fieldContainer.appendChild(helpText);
        }

        return fieldContainer;
    }

    createInputField(config) {
        return this.createElement('input', {
            className: 'form-input',
            attributes: {
                type: config.type || 'text',
                name: config.name,
                id: config.name,
                placeholder: config.placeholder || '',
                value: config.value || '',
                ...config.attributes
            }
        });
    }

    createSelectField(config) {
        const select = this.createElement('select', {
            className: 'form-select',
            attributes: {
                name: config.name,
                id: config.name,
                ...config.attributes
            }
        });

        if (config.options) {
            config.options.forEach(option => {
                const optionElement = this.createElement('option', {
                    attributes: {
                        value: option.value
                    },
                    textContent: option.label
                });
                
                if (option.selected) {
                    optionElement.selected = true;
                }
                
                select.appendChild(optionElement);
            });
        }

        return select;
    }

    createTextareaField(config) {
        return this.createElement('textarea', {
            className: 'form-textarea',
            attributes: {
                name: config.name,
                id: config.name,
                placeholder: config.placeholder || '',
                rows: config.rows || 3,
                ...config.attributes
            },
            textContent: config.value || ''
        });
    }

    createCheckboxField(config) {
        const container = this.createElement('div', {
            className: 'checkbox-container'
        });

        const checkbox = this.createElement('input', {
            className: 'form-checkbox',
            attributes: {
                type: 'checkbox',
                name: config.name,
                id: config.name,
                value: config.value || '1',
                ...config.attributes
            }
        });

        if (config.checked) {
            checkbox.checked = true;
        }

        const label = this.createElement('label', {
            className: 'checkbox-label',
            textContent: config.checkboxLabel || config.label,
            attributes: { for: config.name }
        });

        container.appendChild(checkbox);
        container.appendChild(label);
        
        return container;
    }

    createRadioField(config) {
        const container = this.createElement('div', {
            className: 'radio-group'
        });

        if (config.options) {
            config.options.forEach((option, index) => {
                const radioContainer = this.createElement('div', {
                    className: 'radio-option'
                });

                const radio = this.createElement('input', {
                    className: 'form-radio',
                    attributes: {
                        type: 'radio',
                        name: config.name,
                        id: `${config.name}_${index}`,
                        value: option.value
                    }
                });

                if (option.checked) {
                    radio.checked = true;
                }

                const label = this.createElement('label', {
                    className: 'radio-label',
                    textContent: option.label,
                    attributes: { for: `${config.name}_${index}` }
                });

                radioContainer.appendChild(radio);
                radioContainer.appendChild(label);
                container.appendChild(radioContainer);
            });
        }

        return container;
    }

    createFileField(config) {
        const container = this.createElement('div', {
            className: 'file-input-container'
        });

        const input = this.createElement('input', {
            className: 'form-file',
            attributes: {
                type: 'file',
                name: config.name,
                id: config.name,
                accept: config.accept || '',
                ...config.attributes
            }
        });

        const button = this.createElement('button', {
            className: 'file-select-btn',
            textContent: config.buttonText || 'Seleccionar archivo',
            attributes: { type: 'button' }
        });

        const fileName = this.createElement('span', {
            className: 'file-name',
            textContent: 'Ningún archivo seleccionado'
        });

        // Manejar selección de archivo
        this.addEventListener(input, 'change', (e) => {
            const file = e.target.files[0];
            fileName.textContent = file ? file.name : 'Ningún archivo seleccionado';
        });

        this.addEventListener(button, 'click', () => {
            input.click();
        });

        container.appendChild(input);
        container.appendChild(button);
        container.appendChild(fileName);

        return container;
    }

    /**
     * Agregar botones al formulario
     */
    addButtons() {
        const buttonContainer = this.createElement('div', {
            className: 'form-buttons'
        });

        if (this.options.showSubmitButton) {
            const submitButton = this.createElement('button', {
                className: 'btn btn-primary submit-btn',
                textContent: this.options.submitButtonText,
                attributes: { type: 'submit' }
            });
            buttonContainer.appendChild(submitButton);
        }

        if (this.options.showResetButton) {
            const resetButton = this.createElement('button', {
                className: 'btn btn-secondary reset-btn',
                textContent: this.options.resetButtonText,
                attributes: { type: 'reset' }
            });
            buttonContainer.appendChild(resetButton);
        }

        this.element.appendChild(buttonContainer);
        return this;
    }

    /**
     * Validar un campo específico
     */
    validateField(fieldName) {
        const rules = this.validationRules[fieldName];
        if (!rules) return { isValid: true, errors: [] };

        const value = this.getFieldValue(fieldName);
        const result = this.validate({ [fieldName]: value }, { [fieldName]: rules });
        
        this.displayFieldErrors(fieldName, result.errors);
        
        return result;
    }

    /**
     * Validar todo el formulario
     */
    validateForm() {
        this.formData = this.getData();
        const result = this.validate(this.formData, this.validationRules);
        
        // Mostrar errores para cada campo
        Object.keys(this.validationRules).forEach(fieldName => {
            const fieldErrors = result.errors.filter(error => error.includes(fieldName));
            this.displayFieldErrors(fieldName, fieldErrors);
        });
        
        return result;
    }

    /**
     * Mostrar errores de un campo
     */
    displayFieldErrors(fieldName, errors) {
        const errorContainer = document.getElementById(`${fieldName}-error`);
        if (errorContainer) {
            errorContainer.innerHTML = '';
            if (errors.length > 0) {
                errorContainer.innerHTML = errors.map(error => 
                    `<span class="error-message">${error}</span>`
                ).join('');
                errorContainer.classList.add('has-error');
            } else {
                errorContainer.classList.remove('has-error');
            }
        }
    }

    /**
     * Obtener valor de un campo
     */
    getFieldValue(fieldName) {
        const field = this.element.querySelector(`[name="${fieldName}"]`);
        if (!field) return '';

        if (field.type === 'checkbox') {
            return field.checked;
        } else if (field.type === 'radio') {
            const checked = this.element.querySelector(`[name="${fieldName}"]:checked`);
            return checked ? checked.value : '';
        } else if (field.type === 'file') {
            return field.files[0] || null;
        }

        return field.value;
    }

    /**
     * Obtener todos los datos del formulario
     */
    getData() {
        const data = {};
        this.fields.forEach(({ config }) => {
            data[config.name] = this.getFieldValue(config.name);
        });
        return data;
    }

    /**
     * Establecer datos en el formulario
     */
    setData(data) {
        Object.entries(data).forEach(([fieldName, value]) => {
            this.setFieldValue(fieldName, value);
        });
        return this;
    }

    /**
     * Establecer valor de un campo
     */
    setFieldValue(fieldName, value) {
        const field = this.element.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else if (field.type === 'radio') {
            const radio = this.element.querySelector(`[name="${fieldName}"][value="${value}"]`);
            if (radio) radio.checked = true;
        } else {
            field.value = value;
        }
    }

    /**
     * Limpiar el formulario
     */
    clear() {
        this.element.reset();
        // Limpiar errores
        this.element.querySelectorAll('.field-error').forEach(errorContainer => {
            errorContainer.innerHTML = '';
            errorContainer.classList.remove('has-error');
        });
        return this;
    }

    /**
     * Manejar envío del formulario
     */
    handleSubmit() {
        if (this.options.validateOnSubmit) {
            const validation = this.validateForm();
            if (!validation.isValid) {
                this.onValidationError && this.onValidationError(validation.errors);
                return;
            }
        }

        const data = this.getData();
        this.onSubmit && this.onSubmit(data);
    }

    /**
     * Manejar reset del formulario
     */
    handleReset() {
        this.clear();
        this.onReset && this.onReset();
    }

    /**
     * Métodos de callback - se pueden sobrescribir
     */
    onSubmit(data) {
        console.log('Form submitted:', data);
    }

    onReset() {
        console.log('Form reset');
    }

    onValidationError(errors) {
        console.log('Validation errors:', errors);
    }

    /**
     * Método estático para crear formulario con configuración
     */
    static createForm(container, config) {
        const form = new FormBuilder(container, config.options || {});
        
        if (config.fields) {
            config.fields.forEach(fieldConfig => {
                form.addField(fieldConfig);
            });
        }
        
        if (config.options && (config.options.showSubmitButton || config.options.showResetButton)) {
            form.addButtons();
        }
        
        return form;
    }
}