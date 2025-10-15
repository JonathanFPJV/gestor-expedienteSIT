// src/js/modules/navigation.js
export class NavigationManager {
    constructor() {
        this.currentView = 'busqueda';
        this.views = {
            'busqueda': document.getElementById('vista-busqueda'),
            'registro': document.getElementById('vista-registro'),
            'crud': document.getElementById('vista-crud'),
            'tarjetas-crud': document.getElementById('vista-tarjetas-crud')
        };
        this.navButtons = {
            'busqueda': document.getElementById('nav-busqueda'),
            'registro': document.getElementById('nav-registro'),
            'crud': document.getElementById('nav-crud'),
            'tarjetas-crud': document.getElementById('nav-tarjetas')
        };
        
        this.initializeNavigation();
    }

    initializeNavigation() {
        // Event listeners para los botones de navegación
        Object.keys(this.navButtons).forEach(viewName => {
            const button = this.navButtons[viewName];
            if (button) {
                button.addEventListener('click', () => {
                    this.navigateToView(viewName);
                });
            }
        });

        // Mostrar vista inicial
        this.navigateToView('busqueda');
    }

    navigateToView(viewName) {
        if (!this.views[viewName]) {
            console.error(`Vista '${viewName}' no encontrada`);
            return;
        }

        // Ocultar todas las vistas
        Object.values(this.views).forEach(view => {
            if (view) view.classList.remove('active');
        });

        // Remover clase active de todos los botones
        Object.values(this.navButtons).forEach(button => {
            if (button) button.classList.remove('active');
        });

        // Mostrar vista seleccionada
        this.views[viewName].classList.add('active');
        this.navButtons[viewName].classList.add('active');

        // Actualizar vista actual
        this.currentView = viewName;

        // Ejecutar callbacks específicos de vista
        this.onViewChange(viewName);
    }

    onViewChange(viewName) {
        switch(viewName) {
            case 'crud':
                // Cargar expedientes cuando se accede al CRUD
                if (window.expedientesCRUD) {
                    window.expedientesCRUD.loadExpedientes();
                }
                break;
            case 'tarjetas-crud':
                // Cargar tarjetas cuando se accede al CRUD de tarjetas
                if (window.tarjetasCRUD) {
                    window.tarjetasCRUD.cargarTarjetas();
                }
                break;
            case 'busqueda':
                // Reinicializar búsqueda cuando se accede a la vista
                if (window.searchManager) {
                    window.searchManager.reinitialize();
                }
                break;
            case 'registro':
                // Resetear formulario si es necesario
                break;
        }
    }

    getCurrentView() {
        return this.currentView;
    }
}

// Crear instancia global
export const navigationManager = new NavigationManager();