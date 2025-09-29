# Visor PDF Simple - Documentación

## Características Principales

### ✅ Vista Continua Unificada
- **Una sola vista**: Eliminadas las vistas múltiples (single, grid, etc.)
- **Vista continua**: Todas las páginas visibles en scroll vertical
- **Altura fija**: Contenedor de 500px de altura con scroll interno
- **Scroll suave**: Navegación fluida entre páginas

### ✅ Espacio Controlado
- **Contenedor fijo**: No crece indefinidamente en la página
- **Scroll interno**: El PDF se desplaza dentro de su contenedor
- **Páginas numeradas**: Cada página muestra su número (ej: "Página 1 de 8")
- **Separación visual**: Cada página tiene su propio contenedor

### ✅ Controles Integrados
- **Barra de controles**: Integrada en la misma página principal
- **Mostrar/Ocultar**: Toggle para ocultar el visor cuando no se necesite
- **Zoom**: Controles de zoom in/out y ajuste automático al ancho
- **Rotación**: Rotar páginas 90° izquierda/derecha
- **Descarga/Abrir**: Descargar o abrir en aplicación externa

## Uso del Visor

### Importación
```javascript
import { simplePdfViewer } from './simplePdfViewer.js';
```

### Crear Visor
```javascript
// Crear en cualquier contenedor
simplePdfViewer.createViewer('mi-contenedor', '/ruta/al/archivo.pdf', 'Mi Documento');
```

### Ejemplo Práctico
```javascript
// En tu código actual:
const container = document.getElementById('main-content');

// El visor se crea con:
// - ID del contenedor donde insertar
// - Ruta del archivo PDF
// - Título del documento
simplePdfViewer.createViewer('main-content', pdfPath, `Acta N° ${numeroActa}`);
```

## Estructura del Visor

### Barra de Controles
```
[Título del PDF] [Páginas info]     [Ocultar] [Zoom-] [100%] [Zoom+] [Ajustar] [↺] [↻] [💾] [🔗]
```

### Área de Visualización
```
┌─────────────── Contenedor Fijo (500px) ───────────────┐
│                                                       │
│  ┌─────────── Página 1 de 8 ───────────┐             │
│  │                                     │             │
│  │        [Contenido del PDF]          │ ← Scroll    │
│  │                                     │   Vertical  │
│  └─────────────────────────────────────┘             │
│                                                       │
│  ┌─────────── Página 2 de 8 ───────────┐             │
│  │        [Contenido del PDF]          │             │
│  └─────────────────────────────────────┘             │
│                                                       │
│  ... (más páginas) ...                               │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## Ventajas de la Vista Continua

### 🎯 Espacio Controlado
- **Altura fija**: El visor nunca ocupa más de 500px de altura
- **Scroll interno**: El contenido se desplaza dentro del visor
- **No interfiere**: No afecta el layout de la página principal

### 🎯 Visualización Completa
- **Todas las páginas**: Muestra las 8 páginas del PDF completo
- **Vista continua**: Scroll suave entre páginas sin saltos
- **Numeración clara**: "Página X de Y" en cada página

### 🎯 Controles Accesibles
- **Siempre visibles**: Los controles están siempre en la parte superior
- **Una sola página**: Todo está en la interfaz principal
- **Responsive**: Se adapta a pantallas móviles

## Controles Disponibles

### 👁️ Mostrar/Ocultar
- **Toggle de visibilidad**: Permite ocultar el visor para ahorrar espacio
- **Estado persistente**: Recuerda si está mostrado u oculto

### 🔍 Zoom
- **Zoom In/Out**: Aumentar/reducir en incrementos de 25%
- **Rango**: 50% - 300%
- **Ajustar al ancho**: Calcula automáticamente el zoom óptimo
- **Indicador**: Muestra el porcentaje actual (ej: "125%")

### 🔄 Rotación
- **90° izquierda/derecha**: Rotar todas las páginas
- **Persistente**: La rotación se mantiene durante toda la sesión

### 💾 Archivo
- **Descargar**: Guarda el PDF en el equipo
- **Abrir externo**: Abre con la aplicación predeterminada del sistema

## Responsive Design

### 📱 Móvil (< 768px)
- **Controles apilados**: La barra se reorganiza verticalmente
- **Botones más grandes**: Mejor accesibilidad táctil
- **Altura reducida**: 400px en lugar de 500px

### 📱 Móvil pequeño (< 480px)
- **Solo iconos**: Oculta el texto de los botones
- **Separadores ocultos**: Más espacio para controles
- **Botones cuadrados**: 36px × 36px mínimo

## Rendimiento

### ⚡ Carga Progresiva
- **Renderizado por lotes**: Renderiza 3 páginas, pausa 50ms
- **Canvas reutilización**: Reutiliza contextos de canvas
- **Memoria controlada**: Libera recursos no necesarios

### ⚡ Scroll Optimizado
- **Scroll suave**: Factor de 0.5x para movimiento más controlado
- **Barra personalizada**: Scroll bar estilizada
- **Scroll behavior**: CSS smooth scroll

## Integración con el Sistema Actual

### 🔗 Reemplaza advancedPdfViewer
```javascript
// Antes:
advancedPdfViewer.createViewer(containerId, pdfPath, title);

// Ahora:
simplePdfViewer.createViewer(containerId, pdfPath, title);
```

### 🔗 Misma API IPC
- **Usa obtener-pdf-data**: El mismo handler del backend
- **Usa descargar-pdf**: Para descargas
- **Usa abrir-pdf**: Para apertura externa

### 🔗 Estilos Integrados
- **Auto-inyección**: Los estilos se agregan automáticamente
- **No conflictos**: ID único (`simple-pdf-styles`)
- **Responsive**: Se adapta al sistema existente

## Ejemplo de Implementación Completa

```javascript
// En tu página principal
import { simplePdfViewer } from './modules/simplePdfViewer.js';

// Cuando el usuario quiere ver un PDF
function mostrarPDF(pdfPath, numeroActa) {
    const container = document.getElementById('main-content');
    
    // Limpiar contenido previo
    container.innerHTML = '';
    
    // Botón de regreso (opcional)
    const backButton = document.createElement('div');
    backButton.innerHTML = `
        <button onclick="volverBusqueda()">← Volver</button>
    `;
    container.appendChild(backButton);
    
    // Crear área para el visor
    const pdfArea = document.createElement('div');
    pdfArea.id = 'pdf-area';
    container.appendChild(pdfArea);
    
    // Crear el visor
    simplePdfViewer.createViewer('pdf-area', pdfPath, `Acta N° ${numeroActa}`);
}
```

## Resultado Final

El usuario ahora tiene:
- ✅ **Vista continua**: Ve las 8 páginas completas del PDF
- ✅ **Espacio fijo**: 500px de altura, no crece indefinidamente  
- ✅ **Controles integrados**: Todo en la misma página principal
- ✅ **Scroll suave**: Navegación fluida entre páginas
- ✅ **Responsive**: Funciona en móvil y desktop
- ✅ **Rendimiento**: Carga rápida y uso eficiente de memoria