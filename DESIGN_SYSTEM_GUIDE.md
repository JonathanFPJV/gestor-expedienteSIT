# 📚 Guía de Implementación - Sistema de Diseño SITransporte

## 🎯 Propósito
Este documento explica cómo usar correctamente el nuevo sistema de diseño basado en la identidad visual de SITransporte Arequipa.

---

## 🏗️ Arquitectura CSS

### Jerarquía de Importación
```
style.css / editor.css
    ↓
variables.css (Tokens de diseño)
    ↓
typography.css (Sistema de fuentes)
```

**Importante**: No es necesario importar manualmente `variables.css` o `typography.css` en archivos HTML. Los estilos principales (`style.css`, `editor.css`) ya los importan automáticamente.

---

## 🎨 Usando Variables CSS

### Colores

#### Principales
```css
/* Acciones primarias */
background-color: var(--color-primario);        /* #FF7F27 Naranja */
background-color: var(--color-primario-hover);  /* #E66A1A Hover */

/* Éxito / PDFs */
background-color: var(--color-secundario);      /* #00A651 Verde */
background-color: var(--color-secundario-hover); /* #008A42 Hover */

/* Headers / Estructura */
background-color: var(--color-acento);          /* #006699 Azul */
background-color: var(--color-acento-hover);    /* #004D73 Hover */
```

#### Fondos
```css
/* Fondo de cards, modales */
background-color: var(--color-fondo-contenedor); /* #FFFFFF */

/* Fondo general de la app */
background-color: var(--color-fondo-plataforma); /* #F5F7FA */
```

#### Textos
```css
/* Texto principal */
color: var(--color-texto-principal);    /* #2D3748 */

/* Texto secundario / deshabilitado */
color: var(--color-texto-secundario);   /* #718096 */
color: var(--color-texto-deshabilitado); /* #A0AEC0 */

/* Texto sobre fondos oscuros */
color: var(--color-texto-blanco);       /* #FFFFFF */
```

#### Bordes y Estados
```css
/* Bordes normales */
border: 2px solid var(--borde-suave);   /* #E0E4E8 */

/* Estados */
color: var(--color-error);              /* #DC2626 Rojo */
background-color: var(--color-error-fondo); /* #FEE2E2 */
```

---

### Espaciado

```css
/* Usar siempre las variables de espaciado para consistencia */

/* Padding pequeño */
padding: var(--espacio-xs);   /* 4px */
padding: var(--espacio-sm);   /* 8px */

/* Padding estándar (más común) */
padding: var(--espacio-md);   /* 16px */

/* Padding grande */
padding: var(--espacio-lg);   /* 24px */
padding: var(--espacio-xl);   /* 32px */
padding: var(--espacio-2xl);  /* 48px */

/* Márgenes usan las mismas variables */
margin-bottom: var(--espacio-md);
gap: var(--espacio-sm);
```

---

### Border Radius

```css
/* Elementos pequeños (inputs, badges) */
border-radius: var(--radio-pequeno);  /* 4px */

/* Elementos medianos (botones, cards) */
border-radius: var(--radio-medio);    /* 8px */

/* Contenedores grandes */
border-radius: var(--radio-grande);   /* 12px */
```

---

### Sombras

```css
/* Tarjetas normales */
box-shadow: var(--sombra-tarjeta);
/* 0 2px 8px rgba(0, 0, 0, 0.08) */

/* Hover states / elementos elevados */
box-shadow: var(--sombra-elevada);
/* 0 4px 16px rgba(0, 0, 0, 0.12) */

/* Modales / overlays */
box-shadow: var(--sombra-flotante);
/* 0 8px 24px rgba(0, 0, 0, 0.16) */
```

---

### Transiciones

```css
/* Transiciones rápidas (botones, hovers) */
transition: all var(--transicion-rapida);  /* 0.15s */

/* Transiciones normales (cards, modales) */
transition: all var(--transicion-normal);  /* 0.3s */

/* Transiciones lentas (animaciones complejas) */
transition: all var(--transicion-lenta);   /* 0.5s */

/* Easing personalizado */
transition-timing-function: var(--easing-suave);
/* cubic-bezier(0.4, 0, 0.2, 1) */
```

---

### Tipografía

#### Fuentes
```css
/* Texto principal */
font-family: var(--fuente-principal);    /* 'Poppins', sans-serif */

/* Texto secundario (si se necesita) */
font-family: var(--fuente-secundaria);   /* 'Roboto', sans-serif */
```

#### Tamaños
```css
/* Labels pequeñas, hints */
font-size: var(--tamano-xs);    /* 12px */

/* Texto normal, párrafos */
font-size: var(--tamano-sm);    /* 14px */

/* Inputs, botones */
font-size: var(--tamano-base);  /* 16px */

/* Subtítulos */
font-size: var(--tamano-lg);    /* 18px */

/* Títulos sección */
font-size: var(--tamano-xl);    /* 24px */

/* Headers principales */
font-size: var(--tamano-2xl);   /* 32px */
```

#### Pesos
```css
font-weight: var(--peso-normal);    /* 400 */
font-weight: var(--peso-medio);     /* 500 */
font-weight: var(--peso-semibold);  /* 600 */
font-weight: var(--peso-bold);      /* 700 */
```

---

## 🔘 Componentes Estándar

### Botones

#### Botón Primario (Naranja)
```html
<button class="btn-primary">Guardar</button>
```
```css
.btn-primary {
    background-color: var(--color-primario);
    color: var(--color-texto-blanco);
    padding: var(--espacio-sm) var(--espacio-lg);
    border: none;
    border-radius: var(--radio-medio);
    font-weight: var(--peso-medio);
    transition: all var(--transicion-rapida);
    cursor: pointer;
}

.btn-primary:hover {
    background-color: var(--color-primario-hover);
    transform: translateY(-1px);
    box-shadow: var(--sombra-elevada);
}
```

#### Botón Secundario (Gris)
```html
<button class="btn-secondary">Cancelar</button>
```
```css
.btn-secondary {
    background-color: var(--color-fondo-plataforma);
    color: var(--color-texto-principal);
    border: 2px solid var(--borde-suave);
    /* resto igual a btn-primary */
}

.btn-secondary:hover {
    border-color: var(--color-primario);
    color: var(--color-primario);
}
```

#### Botón de Éxito (Verde)
```html
<button class="btn-success">Ver PDF</button>
```
```css
.btn-success {
    background-color: var(--color-secundario);
    color: var(--color-texto-blanco);
    /* resto igual a btn-primary */
}

.btn-success:hover {
    background-color: var(--color-secundario-hover);
}
```

#### Botón de Peligro (Rojo)
```html
<button class="btn-danger">Eliminar</button>
```
```css
.btn-danger {
    background-color: var(--color-error);
    color: var(--color-texto-blanco);
    /* resto igual a btn-primary */
}

.btn-danger:hover {
    background-color: var(--color-error-hover);
}
```

---

### Cards / Tarjetas

#### Card Estándar
```html
<div class="card">
    <h3>Título</h3>
    <p>Contenido...</p>
</div>
```
```css
.card {
    background: var(--color-fondo-contenedor);
    padding: var(--espacio-md);
    border-radius: var(--radio-medio);
    border-left: 4px solid var(--color-primario);
    box-shadow: var(--sombra-tarjeta);
    transition: all var(--transicion-rapida);
}

.card:hover {
    box-shadow: var(--sombra-elevada);
    transform: translateY(-2px);
}

.card h3 {
    color: var(--color-primario);
    margin: 0 0 var(--espacio-sm) 0;
}
```

---

### Formularios

#### Input de Texto
```html
<div class="form-group">
    <label>Placa</label>
    <input type="text" class="form-input">
</div>
```
```css
.form-input {
    width: 100%;
    padding: 12px var(--espacio-md);
    border: 2px solid var(--borde-suave);
    border-radius: var(--radio-medio);
    font-size: var(--tamano-base);
    font-family: var(--fuente-principal);
    transition: all var(--transicion-normal);
}

.form-input:focus {
    outline: none;
    border-color: var(--color-acento);
    box-shadow: 0 0 0 3px rgba(0, 102, 153, 0.1);
}

.form-input:hover {
    border-color: var(--color-acento-light);
}
```

---

### Tablas

#### Tabla CRUD
```css
.crud-table {
    width: 100%;
    border-collapse: collapse;
}

.crud-table th {
    background-color: var(--color-acento);
    color: var(--color-texto-blanco);
    padding: var(--espacio-md) var(--espacio-sm);
    font-weight: var(--peso-semibold);
    text-align: left;
}

.crud-table td {
    padding: var(--espacio-md) var(--espacio-sm);
    border-bottom: 1px solid var(--borde-suave);
}

.crud-table tbody tr:hover {
    background-color: var(--color-fondo-plataforma);
}
```

---

## ✅ Buenas Prácticas

### ✔️ Hacer

1. **Usar variables CSS siempre**
   ```css
   /* ✔️ Correcto */
   color: var(--color-primario);
   
   /* ❌ Incorrecto */
   color: #FF7F27;
   ```

2. **Usar espaciado consistente**
   ```css
   /* ✔️ Correcto */
   margin-bottom: var(--espacio-md);
   
   /* ❌ Incorrecto */
   margin-bottom: 16px;
   ```

3. **Respetar la jerarquía de colores**
   - 🟠 Naranja = Acciones principales
   - 🟢 Verde = Éxito / PDFs
   - 🔵 Azul = Estructura / Headers
   - ⚪ Gris = Acciones secundarias

4. **Agregar transiciones a elementos interactivos**
   ```css
   button {
       transition: all var(--transicion-rapida);
   }
   ```

5. **Usar hover states**
   ```css
   .card:hover {
       transform: translateY(-2px);
       box-shadow: var(--sombra-elevada);
   }
   ```

### ❌ Evitar

1. ❌ Hardcodear colores hex directamente
2. ❌ Usar píxeles directos en lugar de variables de espaciado
3. ❌ Mezclar sistemas de colores (Bootstrap, Material, etc.)
4. ❌ Crear sombras personalizadas sin usar las variables
5. ❌ Ignorar los estados hover/focus

---

## 🎨 Guía de Decisión de Colores

### ¿Qué color usar?

```
┌─ ¿Es una acción principal? (Guardar, Crear, Editar)
│   └─ 🟠 NARANJA (--color-primario)
│
├─ ¿Es éxito o relacionado con PDF?
│   └─ 🟢 VERDE (--color-secundario)
│
├─ ¿Es estructura/navegación/título?
│   └─ 🔵 AZUL (--color-acento)
│
├─ ¿Es acción secundaria? (Cancelar, Volver)
│   └─ ⚪ GRIS (--color-fondo-plataforma)
│
└─ ¿Es destructivo? (Eliminar, Borrar)
    └─ 🔴 ROJO (--color-error)
```

---

## 📦 Nuevos Componentes

### Cómo crear un nuevo componente

1. **Definir el HTML**
```html
<div class="mi-componente">
    <h3>Título</h3>
    <p>Contenido</p>
    <button class="btn-primary">Acción</button>
</div>
```

2. **Aplicar variables CSS**
```css
.mi-componente {
    background: var(--color-fondo-contenedor);
    padding: var(--espacio-md);
    border-radius: var(--radio-medio);
    box-shadow: var(--sombra-tarjeta);
}

.mi-componente h3 {
    color: var(--color-acento);
    font-size: var(--tamano-lg);
    font-weight: var(--peso-semibold);
    margin-bottom: var(--espacio-sm);
}

.mi-componente p {
    color: var(--color-texto-secundario);
    font-size: var(--tamano-sm);
}
```

3. **Agregar interactividad**
```css
.mi-componente:hover {
    box-shadow: var(--sombra-elevada);
    transform: translateY(-2px);
    transition: all var(--transicion-rapida);
}
```

---

## 🔍 Solución de Problemas

### Los colores no se aplican
**Solución**: Verificar que `variables.css` esté siendo importado antes de usarlo.

### Las transiciones no funcionan
**Solución**: Agregar `transition: all var(--transicion-normal);` al elemento base.

### El hover no funciona
**Solución**: Asegurar que el elemento tenga `cursor: pointer;`

### Los espacios no son consistentes
**Solución**: Usar variables de espaciado en lugar de valores fijos.

---

## 📞 Referencia Rápida

| Necesito | Uso |
|----------|-----|
| Color de botón principal | `var(--color-primario)` |
| Color de éxito | `var(--color-secundario)` |
| Color de header | `var(--color-acento)` |
| Padding estándar | `var(--espacio-md)` |
| Sombra de card | `var(--sombra-tarjeta)` |
| Border radius | `var(--radio-medio)` |
| Transición rápida | `var(--transicion-rapida)` |
| Fuente principal | `var(--fuente-principal)` |
| Tamaño de texto | `var(--tamano-base)` |

---

## 📝 Ejemplo Completo

```html
<div class="expediente-card">
    <div class="expediente-header">
        <h3>Expediente N° 123-2024</h3>
        <span class="badge-primary">3 Tarjetas</span>
    </div>
    <div class="expediente-body">
        <p><strong>Placa:</strong> ABC-123</p>
        <p><strong>Resolución:</strong> 2024-04-001</p>
    </div>
    <div class="expediente-actions">
        <button class="btn-primary">Editar</button>
        <button class="btn-success">Ver PDF</button>
        <button class="btn-danger">Eliminar</button>
    </div>
</div>
```

```css
.expediente-card {
    background: var(--color-fondo-contenedor);
    border-radius: var(--radio-medio);
    border-left: 4px solid var(--color-primario);
    box-shadow: var(--sombra-tarjeta);
    padding: var(--espacio-md);
    transition: all var(--transicion-rapida);
}

.expediente-card:hover {
    box-shadow: var(--sombra-elevada);
    transform: translateY(-2px);
}

.expediente-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--espacio-md);
    padding-bottom: var(--espacio-sm);
    border-bottom: 2px solid var(--borde-suave);
}

.expediente-header h3 {
    color: var(--color-primario);
    font-size: var(--tamano-lg);
    margin: 0;
}

.expediente-body {
    margin-bottom: var(--espacio-md);
}

.expediente-body p {
    color: var(--color-texto-secundario);
    font-size: var(--tamano-sm);
    margin: var(--espacio-xs) 0;
}

.expediente-actions {
    display: flex;
    gap: var(--espacio-sm);
}
```

---

**Última actualización**: 2024  
**Versión del sistema de diseño**: 1.0  
**Compatibilidad**: Navegadores modernos (Chrome, Firefox, Edge, Safari)
