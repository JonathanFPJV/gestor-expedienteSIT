// src/js/modules/components/BaseComponent.js
/**
 * Clase base para todos los componentes reutilizables
 * Proporciona funcionalidad común como manejo de eventos, DOM y validación
 */
export class BaseComponent {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = { ...this.defaultOptions, ...options };
        this.element = null;
        this.events = new Map();
        this.isDestroyed = false;

        if (!this.container) {
            throw new Error(`Container not found: ${container}`);
        }

        this.init();
    }

    // Opciones por defecto - cada componente puede sobrescribir
    get defaultOptions() {
        return {
            className: '',
            id: '',
            attributes: {}
        };
    }

    // Método de inicialización - cada componente debe implementar
    init() {
        this.render();
        this.bindEvents();
    }

    // Método de renderizado - cada componente debe implementar
    render() {
        throw new Error('render() method must be implemented by subclass');
    }

    // Método para vincular eventos - cada componente puede sobrescribir
    bindEvents() {
        // Implementación base vacía
    }

    // Crear elemento DOM con configuración
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        return element;
    }

    // Método para agregar event listeners de manera controlada
    addEventListener(element, event, handler, options = {}) {
        if (!element || typeof handler !== 'function') return;
        
        const eventKey = `${event}_${Date.now()}_${Math.random()}`;
        element.addEventListener(event, handler, options);
        
        this.events.set(eventKey, {
            element,
            event,
            handler,
            options
        });
        
        return eventKey;
    }

    // Método para remover event listeners
    removeEventListener(eventKey) {
        const eventData = this.events.get(eventKey);
        if (eventData) {
            eventData.element.removeEventListener(
                eventData.event, 
                eventData.handler, 
                eventData.options
            );
            this.events.delete(eventKey);
        }
    }

    // Método para mostrar el componente
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.element.classList.remove('hidden');
        }
        return this;
    }

    // Método para ocultar el componente
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.element.classList.add('hidden');
        }
        return this;
    }

    // Método para alternar visibilidad
    toggle() {
        if (this.element) {
            const isHidden = this.element.style.display === 'none' || 
                           this.element.classList.contains('hidden');
            return isHidden ? this.show() : this.hide();
        }
        return this;
    }

    // Método para validar datos
    validate(data, rules = {}) {
        const errors = [];
        
        Object.entries(rules).forEach(([field, fieldRules]) => {
            const value = data[field];
            
            if (fieldRules.required && (!value || value.toString().trim() === '')) {
                errors.push(`${field} es requerido`);
            }
            
            if (value && fieldRules.minLength && value.toString().length < fieldRules.minLength) {
                errors.push(`${field} debe tener al menos ${fieldRules.minLength} caracteres`);
            }
            
            if (value && fieldRules.maxLength && value.toString().length > fieldRules.maxLength) {
                errors.push(`${field} debe tener máximo ${fieldRules.maxLength} caracteres`);
            }
            
            if (value && fieldRules.pattern && !fieldRules.pattern.test(value.toString())) {
                errors.push(`${field} tiene formato inválido`);
            }
            
            if (value && fieldRules.custom && typeof fieldRules.custom === 'function') {
                const customError = fieldRules.custom(value);
                if (customError) {
                    errors.push(customError);
                }
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Método para limpiar recursos
    destroy() {
        if (this.isDestroyed) return;
        
        // Remover todos los event listeners
        this.events.forEach((_, eventKey) => {
            this.removeEventListener(eventKey);
        });
        
        // Remover elemento del DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.isDestroyed = true;
    }

    // Método estático para crear múltiples instancias
    static createMultiple(containers, options = {}) {
        return containers.map(container => new this(container, options));
    }

    // Método para actualizar opciones
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        return this;
    }

    // Método para obtener datos del componente
    getData() {
        // Implementación base - cada componente puede sobrescribir
        return {};
    }

    // Método para establecer datos en el componente
    setData(data) {
        // Implementación base - cada componente puede sobrescribir
        return this;
    }

    // Método para limpiar el componente
    clear() {
        // Implementación base - cada componente puede sobrescribir
        return this;
    }
}