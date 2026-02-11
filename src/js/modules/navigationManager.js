// js/modules/navigation.js - Sistema de Navegación Responsive

/**
 * Módulo de Navegación
 * Maneja la navegación entre vistas y el menú hamburguesa responsive
 */

class NavigationManager {
    constructor() {
        this.currentView = 'vista-busqueda';
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.views = document.querySelectorAll('.vista-container');
        this.navToggle = null;
        this.navMenu = null;
        this.navOverlay = null;

        this.init();
    }

    init() {
        this.setupNavButtons();
        this.setupMobileMenu();
        this.setupViewTransitions();

        // Activar vista por defecto
        this.showView('vista-busqueda');

        console.log('NavigationManager inicializado');
    }

    /**
     * Configurar botones de navegación
     */
    setupNavButtons() {
        const navMapping = {
            'nav-dashboard': 'vista-dashboard',
            'nav-busqueda': 'vista-busqueda',
            'nav-crud': 'vista-crud',
            'nav-tarjetas': 'vista-tarjetas-crud',
            'nav-actas': 'vista-actas-crud'
        };

        this.navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = navMapping[button.id];

                if (viewId) {
                    this.showView(viewId);
                    this.setActiveButton(button);

                    // Ejecutar callback de cambio de vista
                    this.onViewChange(viewId);

                    // Cerrar menú mobile si está abierto
                    this.closeMobileMenu();
                }
            });
        });
    }

    /**
     * Configurar menú hamburguesa para mobile
     */
    setupMobileMenu() {
        // Crear botón hamburguesa si no existe
        if (!document.querySelector('.nav-toggle')) {
            this.createMobileMenuButton();
        }

        // Crear overlay si no existe
        if (!document.querySelector('.nav-overlay')) {
            this.createOverlay();
        }

        this.navToggle = document.querySelector('.nav-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.navOverlay = document.querySelector('.nav-overlay');

        // Toggle del menú
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Cerrar al hacer click en el overlay
        if (this.navOverlay) {
            this.navOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // Cerrar con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen()) {
                this.closeMobileMenu();
            }
        });

        // Manejar cambios de tamaño de ventana
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isMobileMenuOpen()) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Crear botón hamburguesa
     */
    createMobileMenuButton() {
        const navContainer = document.querySelector('.nav-container') ||
            document.querySelector('.main-nav');

        if (!navContainer) return;

        const toggleButton = document.createElement('button');
        toggleButton.className = 'nav-toggle';
        toggleButton.setAttribute('aria-label', 'Menú de navegación');
        toggleButton.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        navContainer.appendChild(toggleButton);
    }

    /**
     * Crear overlay para mobile
     */
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);
    }

    /**
     * Toggle del menú mobile
     */
    toggleMobileMenu() {
        if (this.isMobileMenuOpen()) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /**
     * Abrir menú mobile
     */
    openMobileMenu() {
        this.navToggle?.classList.add('active');
        this.navMenu?.classList.add('active');
        this.navOverlay?.classList.add('active');
        document.body.classList.add('nav-open');
    }

    /**
     * Cerrar menú mobile
     */
    closeMobileMenu() {
        this.navToggle?.classList.remove('active');
        this.navMenu?.classList.remove('active');
        this.navOverlay?.classList.remove('active');
        document.body.classList.remove('nav-open');
    }

    /**
     * Verificar si el menú mobile está abierto
     */
    isMobileMenuOpen() {
        return this.navMenu?.classList.contains('active');
    }

    /**
     * Configurar transiciones de vistas
     */
    setupViewTransitions() {
        // Agregar clase para animaciones
        this.views.forEach(view => {
            view.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });
    }

    /**
     * Mostrar vista específica
     */
    showView(viewId) {
        // Ocultar todas las vistas
        this.views.forEach(view => {
            view.classList.remove('active');
        });

        // Mostrar vista seleccionada
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;

            // Scroll suave al inicio
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            console.log(`Vista activa: ${viewId}`);
        }
    }

    /**
     * Establecer botón activo
     */
    setActiveButton(activeButton) {
        this.navButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    /**
     * Obtener vista actual
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Navegar programáticamente
     */
    navigateTo(viewId) {
        const buttonId = this.getButtonIdFromView(viewId);
        const button = document.getElementById(buttonId);

        if (button) {
            this.showView(viewId);
            this.setActiveButton(button);
        }
    }

    /**
     * Mapear vista a ID de botón
     */
    getButtonIdFromView(viewId) {
        const mapping = {
            'vista-dashboard': 'nav-dashboard',
            'vista-busqueda': 'nav-busqueda',
            'vista-registro': 'nav-crud', // El formulario se accede desde el botón interno de gestión
            'vista-crud': 'nav-crud',
            'vista-tarjetas-crud': 'nav-tarjetas',
            'vista-actas-crud': 'nav-actas'
        };
        return mapping[viewId];
    }

    /**
     * Callback cuando cambia la vista - para inicializar el dashboard
     */
    onViewChange(viewId) {
        if (viewId === 'vista-dashboard' && window.dashboardManager) {
            console.log('Navegando al Dashboard, actualizando datos...');
            window.dashboardManager.refreshDashboard();
        }
    }
}

// Exportar para uso en otros módulos
export const navigationManager = new NavigationManager();

// También exportar la clase por si se necesita instanciar
export default NavigationManager;
