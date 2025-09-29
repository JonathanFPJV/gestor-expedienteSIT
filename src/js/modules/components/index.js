// src/js/modules/components/index.js
/**
 * Índice principal del sistema de componentes
 * Exporta todos los componentes reutilizables
 */

export { BaseComponent } from './BaseComponent.js';
export { FormBuilder } from './FormBuilder.js';
export { Table } from './Table.js';
export { Modal } from './Modal.js';
export { 
    Notification, 
    NotificationHelpers, 
    notify, 
    createGlobalNotificationSystem, 
    getGlobalNotificationSystem 
} from './Notification.js';

/**
 * Inicializar sistema de componentes
 * Configura los estilos y el sistema de notificaciones global
 */
export function initializeComponentSystem(options = {}) {
    // Verificar si los estilos están cargados
    if (!document.querySelector('link[href*="components.css"]') && 
        !document.querySelector('style[data-components]')) {
        console.warn('Advertencia: Los estilos de componentes no están cargados. Asegúrate de incluir components.css');
    }

    // Inicializar sistema de notificaciones global
    const notificationOptions = {
        position: 'top-right',
        duration: 5000,
        maxNotifications: 5,
        animation: true,
        pauseOnHover: true,
        closeButton: true,
        ...options.notifications
    };

    createGlobalNotificationSystem(notificationOptions);

    // Agregar clase al body para indicar que el sistema está inicializado
    document.body.classList.add('components-initialized');

    console.log('Sistema de componentes inicializado correctamente');
}

/**
 * Utilidades para crear componentes rápidamente
 */
export const ComponentUtils = {
    /**
     * Crear formulario simple
     */
    createSimpleForm(container, config) {
        const form = new FormBuilder(container, config.options);
        
        if (config.fields) {
            config.fields.forEach(field => form.addField(field));
        }
        
        if (config.showButtons !== false) {
            form.addButtons();
        }
        
        return form;
    },

    /**
     * Crear tabla simple
     */
    createSimpleTable(container, columns, data = [], options = {}) {
        const table = new Table(container, options);
        table.setColumns(columns);
        if (data.length > 0) {
            table.setData(data);
        }
        return table;
    },

    /**
     * Crear modal de confirmación rápido
     */
    confirmAction(message, onConfirm, onCancel) {
        return Modal.confirm({
            content: message,
            onConfirm,
            onCancel
        });
    },

    /**
     * Crear modal de alerta rápido
     */
    showAlert(message, title = 'Información') {
        return Modal.alert({
            title,
            content: message
        });
    },

    /**
     * Mostrar notificación de éxito
     */
    showSuccess(message, options = {}) {
        return notify.success(message, options);
    },

    /**
     * Mostrar notificación de error
     */
    showError(message, options = {}) {
        return notify.error(message, options);
    },

    /**
     * Mostrar notificación de información
     */
    showInfo(message, options = {}) {
        return notify.info(message, options);
    },

    /**
     * Mostrar notificación de advertencia
     */
    showWarning(message, options = {}) {
        return notify.warning(message, options);
    },

    /**
     * Mostrar indicador de carga
     */
    showLoading(message = 'Cargando...', options = {}) {
        return notify.loading(message, options);
    },

    /**
     * Ocultar indicador de carga
     */
    hideLoading(id) {
        return notify.remove(id);
    }
};

/**
 * Configuraciones predefinidas para casos comunes
 */
export const ComponentPresets = {
    /**
     * Configuración de formulario de contacto
     */
    contactForm: {
        fields: [
            {
                type: 'text',
                name: 'name',
                label: 'Nombre',
                placeholder: 'Ingresa tu nombre',
                validation: { required: true, minLength: 2 }
            },
            {
                type: 'email',
                name: 'email',
                label: 'Email',
                placeholder: 'tu@email.com',
                validation: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
            },
            {
                type: 'textarea',
                name: 'message',
                label: 'Mensaje',
                placeholder: 'Escribe tu mensaje aquí...',
                rows: 5,
                validation: { required: true, minLength: 10 }
            }
        ],
        options: {
            submitButtonText: 'Enviar',
            resetButtonText: 'Limpiar'
        }
    },

    /**
     * Configuración de tabla de usuarios
     */
    usersTable: {
        columns: [
            { key: 'id', title: 'ID', width: '80px' },
            { key: 'name', title: 'Nombre' },
            { key: 'email', title: 'Email' },
            { 
                key: 'created_at', 
                title: 'Fecha de Creación',
                render: (value) => new Date(value).toLocaleDateString()
            }
        ],
        options: {
            pagination: true,
            pageSize: 10,
            sortable: true,
            selectable: true,
            actions: [
                {
                    text: 'Editar',
                    className: 'btn btn-sm btn-primary',
                    handler: (row, index) => console.log('Editar:', row)
                },
                {
                    text: 'Eliminar',
                    className: 'btn btn-sm btn-danger',
                    handler: (row, index) => console.log('Eliminar:', row)
                }
            ]
        }
    },

    /**
     * Configuración de modal de confirmación de eliminación
     */
    deleteConfirmModal: {
        title: 'Confirmar Eliminación',
        content: '¿Está seguro de que desea eliminar este elemento? Esta acción no se puede deshacer.',
        size: 'small',
        buttons: [
            {
                text: 'Cancelar',
                className: 'btn btn-secondary'
            },
            {
                text: 'Eliminar',
                className: 'btn btn-danger'
            }
        ]
    }
};

/**
 * Mixin para agregar funcionalidad de componentes a objetos existentes
 */
export function withComponents(target) {
    return Object.assign(target, {
        // Métodos de formulario
        createForm: ComponentUtils.createSimpleForm,
        
        // Métodos de tabla
        createTable: ComponentUtils.createSimpleTable,
        
        // Métodos de modal
        confirm: ComponentUtils.confirmAction,
        alert: ComponentUtils.showAlert,
        
        // Métodos de notificación
        notify: {
            success: ComponentUtils.showSuccess,
            error: ComponentUtils.showError,
            info: ComponentUtils.showInfo,
            warning: ComponentUtils.showWarning,
            loading: ComponentUtils.showLoading,
            hide: ComponentUtils.hideLoading
        }
    });
}

// Exportar todo por defecto para facilitar el uso
export default {
    BaseComponent,
    FormBuilder,
    Table,
    Modal,
    Notification,
    NotificationHelpers,
    notify,
    ComponentUtils,
    ComponentPresets,
    withComponents,
    initializeComponentSystem,
    createGlobalNotificationSystem,
    getGlobalNotificationSystem
};