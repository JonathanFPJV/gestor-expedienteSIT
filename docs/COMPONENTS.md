# Sistema de Componentes Reutilizables

Este sistema proporciona componentes modulares y reutilizables para la aplicación Electron del gestor de vehículos.

## 🚀 Características

- **Arquitectura Modular**: Cada componente es independiente y reutilizable
- **Sistema de Validación**: Validación automática en formularios
- **Responsivo**: Diseñados para funcionar en diferentes tamaños de pantalla
- **Accesibilidad**: Soporte para navegación por teclado y lectores de pantalla
- **Temas Consistentes**: Variables CSS para mantener consistencia visual
- **TypeScript Ready**: Preparado para migración a TypeScript

## 📦 Componentes Disponibles

### BaseComponent
Clase base que proporciona funcionalidad común a todos los componentes:
- Manejo de eventos automático
- Limpieza de recursos
- Métodos utilitarios para DOM
- Sistema de validación integrado

### FormBuilder
Constructor de formularios dinámicos con validación:
```javascript
import { FormBuilder } from './modules/components/index.js';

const form = new FormBuilder('container', {
    submitButtonText: 'Guardar',
    validateOnSubmit: true
});

form.addField({
    type: 'text',
    name: 'nombre',
    label: 'Nombre',
    validation: { required: true, minLength: 2 }
});
```

**Tipos de campos soportados:**
- `text`, `email`, `password`, `number`, `date`, `time`
- `select` (dropdown)
- `textarea`
- `checkbox`, `radio`
- `file`

**Validaciones disponibles:**
- `required`: Campo obligatorio
- `minLength` / `maxLength`: Longitud mínima/máxima
- `pattern`: Expresión regular
- `custom`: Función de validación personalizada

### Table
Componente de tabla con funcionalidades avanzadas:
```javascript
import { Table } from './modules/components/index.js';

const table = new Table('container', {
    pagination: true,
    sortable: true,
    selectable: true
});

table.setColumns([
    { key: 'name', title: 'Nombre', sortable: true },
    { key: 'email', title: 'Email' },
    { 
        key: 'date', 
        title: 'Fecha',
        render: (value) => new Date(value).toLocaleDateString()
    }
]);
```

**Características:**
- Ordenamiento por columnas
- Paginación automática
- Selección de filas (simple o múltiple)
- Renderizado personalizado de celdas
- Acciones por fila
- Filtrado de datos
- Estados de carga y vacío

### Modal
Sistema de ventanas emergentes:
```javascript
import { Modal } from './modules/components/index.js';

// Modal básico
const modal = new Modal({
    title: 'Mi Modal',
    content: '<p>Contenido del modal</p>',
    size: 'medium'
});
modal.show();

// Modal de confirmación
Modal.confirm({
    content: '¿Confirmar acción?',
    onConfirm: () => console.log('Confirmado'),
    onCancel: () => console.log('Cancelado')
});
```

**Tamaños disponibles:**
- `small` (300px)
- `medium` (500px) - por defecto
- `large` (800px)
- `extra-large` (1140px)

**Características:**
- Backdrop configurable
- Navegación por teclado
- Animaciones suaves
- Auto-focus
- Escape para cerrar

### Notification
Sistema de notificaciones tipo toast:
```javascript
import { notify } from './modules/components/index.js';

// Notificaciones básicas
notify.success('¡Operación exitosa!');
notify.error('Error en el sistema');
notify.warning('Atención requerida');
notify.info('Información importante');

// Notificación de carga
const loadingId = notify.loading('Cargando...');
// ... realizar operación ...
notify.hideLoading(loadingId);
```

**Posiciones disponibles:**
- `top-right` (por defecto)
- `top-left`
- `bottom-right`
- `bottom-left`
- `top-center`
- `bottom-center`

## 🛠 Instalación y Uso

### 1. Incluir Estilos
Agregar el CSS de componentes en tu HTML:
```html
<link rel="stylesheet" href="css/components.css">
```

### 2. Importar Componentes
```javascript
import { 
    FormBuilder, 
    Table, 
    Modal, 
    notify,
    initializeComponentSystem 
} from './modules/components/index.js';

// Inicializar el sistema
document.addEventListener('DOMContentLoaded', () => {
    initializeComponentSystem();
});
```

### 3. Usar Componentes
```javascript
// Crear formulario
const form = new FormBuilder('mi-contenedor');
form.addField({
    type: 'text',
    name: 'nombre',
    label: 'Nombre',
    validation: { required: true }
});

// Crear tabla
const table = new Table('tabla-contenedor');
table.setColumns([
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Nombre' }
]);
table.setData(misDatos);

// Mostrar modal
Modal.alert({
    title: 'Información',
    content: 'Mensaje importante'
});

// Notificación
notify.success('¡Todo funcionando!');
```

## 🎨 Personalización

### Variables CSS
El sistema usa variables CSS que puedes personalizar:
```css
:root {
    --primary-color: #4A90E2;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --border-radius: 8px;
    --transition: all 0.3s ease;
}
```

### Temas Personalizados
Sobrescribe las clases CSS para crear temas personalizados:
```css
.btn-primary {
    background-color: #custom-color;
    border-color: #custom-color;
}

.notification-success {
    background-color: #custom-success-bg;
}
```

## 📋 Ejemplos Completos

### Formulario de Contacto
```javascript
const contactForm = FormBuilder.createForm('contact-container', {
    fields: [
        {
            type: 'text',
            name: 'name',
            label: 'Nombre',
            validation: { required: true }
        },
        {
            type: 'email',
            name: 'email',
            label: 'Email',
            validation: { 
                required: true, 
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
            }
        },
        {
            type: 'textarea',
            name: 'message',
            label: 'Mensaje',
            rows: 5,
            validation: { required: true, minLength: 10 }
        }
    ],
    options: {
        submitButtonText: 'Enviar Mensaje'
    }
});

contactForm.onSubmit = async (data) => {
    const loadingId = notify.loading('Enviando mensaje...');
    try {
        await enviarMensaje(data);
        notify.hideLoading(loadingId);
        notify.success('Mensaje enviado correctamente');
        contactForm.clear();
    } catch (error) {
        notify.hideLoading(loadingId);
        notify.error('Error al enviar mensaje');
    }
};
```

### Tabla de Usuarios con Acciones
```javascript
const usersTable = new Table('users-container', {
    pagination: true,
    pageSize: 10,
    actions: [
        {
            text: 'Editar',
            className: 'btn btn-sm btn-primary',
            handler: (user) => editUser(user)
        },
        {
            text: 'Eliminar',
            className: 'btn btn-sm btn-danger',
            handler: (user) => deleteUser(user)
        }
    ]
});

usersTable.setColumns([
    { key: 'name', title: 'Nombre', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { 
        key: 'created_at', 
        title: 'Fecha de Registro',
        render: (date) => new Date(date).toLocaleDateString()
    },
    {
        key: 'active',
        title: 'Estado',
        render: (active) => active 
            ? '<span class="text-success">Activo</span>'
            : '<span class="text-muted">Inactivo</span>'
    }
]);

// Cargar datos
fetch('/api/users')
    .then(response => response.json())
    .then(users => usersTable.setData(users));
```

## 🔧 Utilidades

### ComponentUtils
Funciones utilitarias para uso rápido:
```javascript
import { ComponentUtils } from './modules/components/index.js';

// Confirmación rápida
ComponentUtils.confirmAction(
    '¿Eliminar este elemento?',
    () => console.log('Confirmado'),
    () => console.log('Cancelado')
);

// Notificaciones rápidas
ComponentUtils.showSuccess('¡Éxito!');
ComponentUtils.showError('Error ocurrido');
```

### withComponents Mixin
Agregar funcionalidad de componentes a objetos existentes:
```javascript
import { withComponents } from './modules/components/index.js';

const myService = withComponents({
    saveData: async function(data) {
        const loadingId = this.notify.loading('Guardando...');
        try {
            await api.save(data);
            this.notify.hide(loadingId);
            this.notify.success('Guardado exitoso');
        } catch (error) {
            this.notify.hide(loadingId);
            this.notify.error('Error al guardar');
        }
    }
});
```

## 🐛 Troubleshooting

### Estilos no se aplican
- Verificar que `components.css` esté incluido
- Comprobar que no hay conflictos CSS
- Asegurar que el DOM esté cargado antes de crear componentes

### Componentes no responden
- Verificar que `initializeComponentSystem()` se haya llamado
- Comprobar errores en la consola
- Asegurar que los contenedores existan en el DOM

### Problemas de memoria
- Los componentes se limpian automáticamente
- Llamar manualmente `component.destroy()` si es necesario
- Evitar referencias circulares en callbacks

## 📚 API Reference

Consulta los comentarios JSDoc en cada archivo de componente para documentación detallada de la API.

## 🤝 Contribución

Para agregar nuevos componentes:
1. Extender `BaseComponent`
2. Implementar métodos `render()` y `bindEvents()`
3. Agregar estilos CSS correspondientes
4. Exportar desde `index.js`
5. Crear ejemplos de uso

## 📄 Licencia

Este sistema de componentes es parte del proyecto gestor-electron y sigue la misma licencia.