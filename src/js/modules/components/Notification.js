// src/js/modules/components/Notification.js
import { BaseComponent } from './BaseComponent.js';

/**
 * Sistema de notificaciones centralizado
 * Maneja toast notifications y alertas del sistema
 */
export class Notification extends BaseComponent {
    constructor(container, options = {}) {
        super(container || document.body, options);
        this.notifications = new Map();
        this.notificationId = 0;
    }

    get defaultOptions() {
        return {
            ...super.defaultOptions,
            className: 'notification-system',
            // Posición del contenedor de notificaciones
            position: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'
            // Configuración por defecto de notificaciones
            duration: 5000, // milisegundos, 0 = no auto-close
            maxNotifications: 5,
            animation: true,
            pauseOnHover: true,
            closeButton: true,
            // Configuración de audio
            playSound: false,
            soundVolume: 0.5
        };
    }

    render() {
        this.element = this.createElement('div', {
            className: `notification-container ${this.options.className} ${this.getPositionClass()}`,
            id: this.options.id,
            attributes: {
                'aria-live': 'polite',
                'aria-atomic': 'false'
            }
        });

        this.container.appendChild(this.element);
        return this;
    }

    getPositionClass() {
        return `position-${this.options.position}`;
    }

    /**
     * Crear una notificación
     */
    create(type, message, options = {}) {
        const notificationOptions = {
            ...this.options,
            ...options,
            type,
            message,
            id: ++this.notificationId
        };

        // Remover notificaciones en exceso
        this.limitNotifications();

        // Crear elemento de notificación
        const notificationElement = this.createNotificationElement(notificationOptions);
        
        // Agregar al contenedor
        this.element.appendChild(notificationElement);
        
        // Almacenar referencia
        this.notifications.set(notificationOptions.id, {
            element: notificationElement,
            options: notificationOptions,
            timer: null
        });

        // Mostrar con animación
        if (this.options.animation) {
            requestAnimationFrame(() => {
                notificationElement.classList.add('show');
            });
        } else {
            notificationElement.classList.add('show');
        }

        // Configurar auto-close
        if (notificationOptions.duration > 0) {
            this.setAutoClose(notificationOptions.id, notificationOptions.duration);
        }

        // Reproducir sonido si está habilitado
        if (this.options.playSound) {
            this.playNotificationSound(type);
        }

        return notificationOptions.id;
    }

    /**
     * Crear elemento DOM de notificación
     */
    createNotificationElement(options) {
        const notification = this.createElement('div', {
            className: `notification notification-${options.type}`,
            attributes: {
                'data-notification-id': options.id,
                role: 'alert'
            }
        });

        // Icono
        const icon = this.createElement('div', {
            className: 'notification-icon',
            innerHTML: this.getTypeIcon(options.type)
        });

        // Contenido
        const content = this.createElement('div', {
            className: 'notification-content'
        });

        // Título si existe
        if (options.title) {
            const title = this.createElement('div', {
                className: 'notification-title',
                textContent: options.title
            });
            content.appendChild(title);
        }

        // Mensaje
        const message = this.createElement('div', {
            className: 'notification-message',
            innerHTML: options.message
        });
        content.appendChild(message);

        // Botón de cerrar
        let closeButton = null;
        if (options.closeButton) {
            closeButton = this.createElement('button', {
                className: 'notification-close',
                innerHTML: '&times;',
                attributes: {
                    type: 'button',
                    'aria-label': 'Cerrar notificación'
                }
            });

            this.addEventListener(closeButton, 'click', () => {
                this.remove(options.id);
            });
        }

        // Barra de progreso para auto-close
        let progressBar = null;
        if (options.duration > 0) {
            progressBar = this.createElement('div', {
                className: 'notification-progress'
            });
        }

        // Ensamblar notificación
        notification.appendChild(icon);
        notification.appendChild(content);
        if (closeButton) {
            notification.appendChild(closeButton);
        }
        if (progressBar) {
            notification.appendChild(progressBar);
        }

        // Eventos de hover para pausar timer
        if (options.pauseOnHover && options.duration > 0) {
            this.addEventListener(notification, 'mouseenter', () => {
                this.pauseTimer(options.id);
            });

            this.addEventListener(notification, 'mouseleave', () => {
                this.resumeTimer(options.id);
            });
        }

        // Evento de click en notificación
        if (options.onClick) {
            this.addEventListener(notification, 'click', (e) => {
                if (e.target.classList.contains('notification-close')) return;
                options.onClick(options.id, e);
            });
            notification.style.cursor = 'pointer';
        }

        return notification;
    }

    /**
     * Obtener icono según el tipo
     */
    getTypeIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ⓘ',
            loading: '⟳'
        };
        return icons[type] || icons.info;
    }

    /**
     * Configurar auto-close con timer
     */
    setAutoClose(id, duration) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const progressBar = notification.element.querySelector('.notification-progress');
        
        if (progressBar) {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        }

        notification.timer = setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    /**
     * Pausar timer de auto-close
     */
    pauseTimer(id) {
        const notification = this.notifications.get(id);
        if (!notification || !notification.timer) return;

        clearTimeout(notification.timer);
        notification.timer = null;

        const progressBar = notification.element.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
    }

    /**
     * Reanudar timer de auto-close
     */
    resumeTimer(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const remainingTime = notification.options.duration;
        this.setAutoClose(id, remainingTime);
    }

    /**
     * Remover notificación
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Limpiar timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animar salida
        if (this.options.animation) {
            notification.element.classList.add('hide');
            setTimeout(() => {
                this.finalizeRemoval(id);
            }, 300);
        } else {
            this.finalizeRemoval(id);
        }
    }

    /**
     * Finalizar remoción de notificación
     */
    finalizeRemoval(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        if (notification.element.parentNode) {
            notification.element.parentNode.removeChild(notification.element);
        }

        this.notifications.delete(id);
    }

    /**
     * Limitar número de notificaciones
     */
    limitNotifications() {
        if (this.notifications.size >= this.options.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }
    }

    /**
     * Limpiar todas las notificaciones
     */
    clear() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
        return this;
    }

    /**
     * Reproducir sonido de notificación
     */
    playNotificationSound(type) {
        // Implementación básica con Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Frecuencias según el tipo
            const frequencies = {
                success: 800,
                error: 300,
                warning: 600,
                info: 500,
                loading: 400
            };

            oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
            gainNode.gain.setValueAtTime(this.options.soundVolume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('No se pudo reproducir el sonido de notificación:', error);
        }
    }

    /**
     * Obtener notificación por ID
     */
    get(id) {
        return this.notifications.get(id);
    }

    /**
     * Verificar si existe una notificación
     */
    exists(id) {
        return this.notifications.has(id);
    }

    /**
     * Obtener todas las notificaciones
     */
    getAll() {
        return Array.from(this.notifications.values());
    }

    /**
     * Contar notificaciones por tipo
     */
    countByType(type) {
        return Array.from(this.notifications.values())
            .filter(n => n.options.type === type).length;
    }
}

// Instancia global del sistema de notificaciones
let globalNotificationSystem = null;

/**
 * Crear sistema global de notificaciones
 */
export function createGlobalNotificationSystem(options = {}) {
    if (!globalNotificationSystem) {
        globalNotificationSystem = new Notification(null, options);
    }
    return globalNotificationSystem;
}

/**
 * Obtener sistema global de notificaciones
 */
export function getGlobalNotificationSystem() {
    if (!globalNotificationSystem) {
        globalNotificationSystem = createGlobalNotificationSystem();
    }
    return globalNotificationSystem;
}

/**
 * Métodos estáticos para crear notificaciones rápidamente
 */
export class NotificationHelpers {
    static success(message, options = {}) {
        return getGlobalNotificationSystem().create('success', message, options);
    }

    static error(message, options = {}) {
        return getGlobalNotificationSystem().create('error', message, {
            duration: 7000, // Errores duran más tiempo
            ...options
        });
    }

    static warning(message, options = {}) {
        return getGlobalNotificationSystem().create('warning', message, options);
    }

    static info(message, options = {}) {
        return getGlobalNotificationSystem().create('info', message, options);
    }

    static loading(message, options = {}) {
        return getGlobalNotificationSystem().create('loading', message, {
            duration: 0, // Loading no se cierra automáticamente
            closeButton: false,
            ...options
        });
    }

    static remove(id) {
        return getGlobalNotificationSystem().remove(id);
    }

    static clear() {
        return getGlobalNotificationSystem().clear();
    }

    static configure(options) {
        const system = getGlobalNotificationSystem();
        system.updateOptions(options);
        return system;
    }
}

// Alias más corto para uso común
export const notify = NotificationHelpers;