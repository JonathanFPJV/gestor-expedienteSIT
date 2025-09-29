// src/js/modules/components/Modal.js
import { BaseComponent } from './BaseComponent.js';

/**
 * Componente Modal reutilizable para ventanas emergentes
 * Incluye overlay, animaciones, y manejo de eventos
 */
export class Modal extends BaseComponent {
    constructor(options = {}) {
        // Para modales, no necesitamos un container específico ya que se agregan al body
        super(document.body, options);
        this.isOpen = false;
        this.backdrop = null;
        this.modalDialog = null;
        this.modalContent = null;
        this.modalHeader = null;
        this.modalBody = null;
        this.modalFooter = null;
        this.focusableElements = [];
        this.previousFocus = null;
    }

    get defaultOptions() {
        return {
            ...super.defaultOptions,
            className: 'modal-component',
            // Configuración de modal
            title: '',
            content: '',
            size: 'medium', // 'small', 'medium', 'large', 'extra-large'
            centered: true,
            backdrop: true, // true, false, 'static'
            keyboard: true, // cerrar con Escape
            focus: true,
            animation: true,
            // Botones
            showCloseButton: true,
            showFooter: true,
            buttons: [],
            // Callbacks
            onShow: null,
            onShown: null,
            onHide: null,
            onHidden: null
        };
    }

    render() {
        // Crear backdrop
        this.backdrop = this.createElement('div', {
            className: 'modal-backdrop'
        });

        // Crear modal principal
        this.element = this.createElement('div', {
            className: `modal ${this.options.className}`,
            id: this.options.id,
            attributes: {
                tabindex: '-1',
                role: 'dialog',
                'aria-hidden': 'true'
            }
        });

        // Crear dialog
        this.modalDialog = this.createElement('div', {
            className: `modal-dialog ${this.getSizeClass()}`,
            attributes: { role: 'document' }
        });

        if (this.options.centered) {
            this.modalDialog.classList.add('modal-dialog-centered');
        }

        // Crear content
        this.modalContent = this.createElement('div', {
            className: 'modal-content'
        });

        // Crear header
        this.createHeader();

        // Crear body
        this.createBody();

        // Crear footer
        if (this.options.showFooter) {
            this.createFooter();
        }

        // Ensamblar estructura
        this.modalContent.appendChild(this.modalHeader);
        this.modalContent.appendChild(this.modalBody);
        if (this.modalFooter) {
            this.modalContent.appendChild(this.modalFooter);
        }

        this.modalDialog.appendChild(this.modalContent);
        this.element.appendChild(this.modalDialog);

        return this;
    }

    getSizeClass() {
        const sizeMap = {
            'small': 'modal-sm',
            'medium': '',
            'large': 'modal-lg',
            'extra-large': 'modal-xl'
        };
        return sizeMap[this.options.size] || '';
    }

    createHeader() {
        this.modalHeader = this.createElement('div', {
            className: 'modal-header'
        });

        if (this.options.title) {
            const title = this.createElement('h5', {
                className: 'modal-title',
                textContent: this.options.title
            });
            this.modalHeader.appendChild(title);
        }

        if (this.options.showCloseButton) {
            const closeButton = this.createElement('button', {
                className: 'modal-close',
                innerHTML: '&times;',
                attributes: {
                    type: 'button',
                    'aria-label': 'Cerrar'
                }
            });

            this.addEventListener(closeButton, 'click', () => {
                this.hide();
            });

            this.modalHeader.appendChild(closeButton);
        }
    }

    createBody() {
        this.modalBody = this.createElement('div', {
            className: 'modal-body'
        });

        if (this.options.content) {
            if (typeof this.options.content === 'string') {
                this.modalBody.innerHTML = this.options.content;
            } else {
                this.modalBody.appendChild(this.options.content);
            }
        }
    }

    createFooter() {
        this.modalFooter = this.createElement('div', {
            className: 'modal-footer'
        });

        // Agregar botones predeterminados si no hay botones personalizados
        if (this.options.buttons.length === 0) {
            this.options.buttons = [
                {
                    text: 'Cerrar',
                    className: 'btn btn-secondary',
                    action: () => this.hide()
                }
            ];
        }

        // Crear botones
        this.options.buttons.forEach(button => {
            const btn = this.createElement('button', {
                className: button.className || 'btn btn-primary',
                textContent: button.text,
                attributes: {
                    type: 'button',
                    ...button.attributes
                }
            });

            if (button.action) {
                this.addEventListener(btn, 'click', (e) => {
                    button.action(this, e);
                });
            }

            this.modalFooter.appendChild(btn);
        });
    }

    bindEvents() {
        // Evento de click en backdrop
        if (this.options.backdrop === true) {
            this.addEventListener(this.element, 'click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }

        // Evento de teclado
        if (this.options.keyboard) {
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.hide();
                }
            });
        }

        // Navegación con Tab
        this.addEventListener(this.element, 'keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });
    }

    /**
     * Mostrar el modal
     */
    show() {
        if (this.isOpen) return this;

        // Guardar elemento con foco actual
        this.previousFocus = document.activeElement;

        // Agregar al DOM
        document.body.appendChild(this.backdrop);
        document.body.appendChild(this.element);

        // Callback antes de mostrar
        if (this.options.onShow) {
            this.options.onShow(this);
        }

        // Mostrar backdrop
        if (this.options.backdrop) {
            this.backdrop.classList.add('show');
            document.body.classList.add('modal-open');
        }

        // Mostrar modal
        this.element.style.display = 'block';
        this.element.setAttribute('aria-hidden', 'false');

        if (this.options.animation) {
            // Forzar reflow para animación
            this.element.offsetHeight;
            this.element.classList.add('show');
        }

        this.isOpen = true;

        // Encontrar elementos enfocables
        this.updateFocusableElements();

        // Dar foco al modal
        if (this.options.focus && this.focusableElements.length > 0) {
            this.focusableElements[0].focus();
        }

        // Callback después de mostrar
        setTimeout(() => {
            if (this.options.onShown) {
                this.options.onShown(this);
            }
        }, this.options.animation ? 150 : 0);

        return this;
    }

    /**
     * Ocultar el modal
     */
    hide() {
        if (!this.isOpen) return this;

        // Callback antes de ocultar
        if (this.options.onHide) {
            this.options.onHide(this);
        }

        this.isOpen = false;
        this.element.setAttribute('aria-hidden', 'true');

        if (this.options.animation) {
            this.element.classList.remove('show');
            this.backdrop.classList.remove('show');

            // Esperar a que termine la animación
            setTimeout(() => {
                this.finalizeHide();
            }, 150);
        } else {
            this.finalizeHide();
        }

        return this;
    }

    finalizeHide() {
        this.element.style.display = 'none';
        
        // Remover del DOM
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        if (this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
        }

        document.body.classList.remove('modal-open');

        // Restaurar foco anterior
        if (this.previousFocus) {
            this.previousFocus.focus();
        }

        // Callback después de ocultar
        if (this.options.onHidden) {
            this.options.onHidden(this);
        }
    }

    /**
     * Alternar visibilidad del modal
     */
    toggle() {
        return this.isOpen ? this.hide() : this.show();
    }

    /**
     * Actualizar contenido del modal
     */
    setContent(content) {
        this.modalBody.innerHTML = '';
        if (typeof content === 'string') {
            this.modalBody.innerHTML = content;
        } else {
            this.modalBody.appendChild(content);
        }
        this.updateFocusableElements();
        return this;
    }

    /**
     * Actualizar título del modal
     */
    setTitle(title) {
        const titleElement = this.modalHeader.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
        return this;
    }

    /**
     * Actualizar elementos enfocables
     */
    updateFocusableElements() {
        const focusableSelectors = [
            'button',
            'input',
            'select',
            'textarea',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');

        this.focusableElements = Array.from(
            this.element.querySelectorAll(focusableSelectors)
        ).filter(el => !el.disabled && el.offsetParent !== null);
    }

    /**
     * Manejar navegación con Tab
     */
    handleTabNavigation(e) {
        if (this.focusableElements.length === 0) return;

        const firstElement = this.focusableElements[0];
        const lastElement = this.focusableElements[this.focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Verificar si el modal está abierto
     */
    isShown() {
        return this.isOpen;
    }

    /**
     * Destruir el modal
     */
    destroy() {
        if (this.isOpen) {
            this.hide();
        }
        super.destroy();
    }

    /**
     * Método estático para crear modal de confirmación
     */
    static confirm(options = {}) {
        const defaultOptions = {
            title: 'Confirmar',
            content: '¿Está seguro?',
            size: 'small',
            buttons: [
                {
                    text: 'Cancelar',
                    className: 'btn btn-secondary',
                    action: (modal) => {
                        modal.hide();
                        if (options.onCancel) options.onCancel();
                    }
                },
                {
                    text: 'Confirmar',
                    className: 'btn btn-primary',
                    action: (modal) => {
                        modal.hide();
                        if (options.onConfirm) options.onConfirm();
                    }
                }
            ]
        };

        const modal = new Modal({ ...defaultOptions, ...options });
        modal.show();
        return modal;
    }

    /**
     * Método estático para crear modal de alerta
     */
    static alert(options = {}) {
        const defaultOptions = {
            title: 'Información',
            content: 'Mensaje de alerta',
            size: 'small',
            buttons: [
                {
                    text: 'Aceptar',
                    className: 'btn btn-primary',
                    action: (modal) => {
                        modal.hide();
                        if (options.onAccept) options.onAccept();
                    }
                }
            ]
        };

        const modal = new Modal({ ...defaultOptions, ...options });
        modal.show();
        return modal;
    }

    /**
     * Método estático para crear modal con formulario
     */
    static form(options = {}) {
        const defaultOptions = {
            title: 'Formulario',
            size: 'medium',
            buttons: [
                {
                    text: 'Cancelar',
                    className: 'btn btn-secondary',
                    action: (modal) => {
                        modal.hide();
                        if (options.onCancel) options.onCancel();
                    }
                },
                {
                    text: 'Guardar',
                    className: 'btn btn-primary',
                    action: (modal) => {
                        // Obtener datos del formulario
                        const form = modal.modalBody.querySelector('form');
                        if (form) {
                            const formData = new FormData(form);
                            const data = Object.fromEntries(formData);
                            if (options.onSubmit) {
                                options.onSubmit(data, modal);
                            }
                        }
                    }
                }
            ]
        };

        const modal = new Modal({ ...defaultOptions, ...options });
        modal.show();
        return modal;
    }
}