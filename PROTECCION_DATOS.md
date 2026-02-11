# 🛡️ Sistema de Protección de Datos - Modo Portable

## 📋 Descripción

Este sistema protege tus datos (base de datos y PDFs) cuando trabajas en modo portable y recompilas la aplicación.

## 🎯 Problema Resuelto

**Antes:** Al ejecutar `npm run build`, se eliminaba `dist/` y perdías todos los datos almacenados en `dist/data/`.

**Ahora:** Los datos se guardan en la raíz del proyecto (`data/`) durante desarrollo y se protegen automáticamente.

## 🔄 Cómo Funciona

### 1️⃣ **Detección Inteligente de Entorno**

```javascript
🔧 DESARROLLO (npm start)
  └─ Datos en: D:\SIT\gestor-electron\data\
     ✅ Se mantienen al recompilar

🚀 PRODUCCIÓN (.exe compilado)
  └─ Datos en: [carpeta del .exe]\data\
     ✅ Portátil, viaja con el .exe
```

### 2️⃣ **Backup Automático**

Antes de cada compilación:
```bash
npm run build
  ├─ 1. Crea backup en data-backup/
  ├─ 2. Compila la aplicación
  └─ 3. Tus datos están protegidos ✅
```

### 3️⃣ **Protección en Git**

La carpeta `data/` y `data-backup/` están en `.gitignore`:
- ✅ No se suben al repositorio
- ✅ No se sobrescriben al hacer pull
- ✅ Son locales a tu máquina

## 📝 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Ejecutar en desarrollo (datos en `data/`) |
| `npm run build` | Compilar con backup automático |
| `npm run build:portable` | Compilar portable con backup |
| `npm run backup` | Crear backup manual de datos |
| `npm run restore` | Restaurar datos desde backup |

## 🆘 Recuperación de Datos

Si algo sale mal:

```bash
# Restaurar datos desde el último backup
npm run restore
```

## 📂 Estructura de Carpetas

```
gestor-electron/
├─ data/                    ← Datos en DESARROLLO
│  ├─ database/
│  │  └─ sit-vehiculos.db
│  └─ archivos-vehiculos/
│     ├─ resolucion-XXX/
│     └─ tarjeta-XXX/
│
├─ data-backup/             ← Backup automático
│  └─ [misma estructura]
│
└─ dist/
   └─ win-unpacked/
      ├─ SIT Gestor.exe
      └─ data/              ← Datos en PRODUCCIÓN
         └─ [se crea al ejecutar]
```

## ✅ Mejores Prácticas

### ✔️ **SÍ hacer:**
- Ejecutar `npm run backup` antes de cambios importantes
- Mantener `data-backup/` como respaldo de seguridad
- Probar en desarrollo antes de compilar

### ❌ **NO hacer:**
- No borrar manualmente la carpeta `data/`
- No modificar archivos dentro de `data/database/` directamente
- No subir `data/` al repositorio (ya está en .gitignore)

## 🔍 Solución de Problemas

### Problema: "No encuentro mis datos después de compilar"

**Solución:**
```bash
# 1. Verificar que exista el backup
dir data-backup

# 2. Restaurar datos
npm run restore

# 3. Ejecutar en desarrollo
npm start
```

### Problema: "La base de datos está vacía"

**Causa:** Probablemente ejecutaste el `.exe` en `dist/` en lugar de la versión de desarrollo.

**Solución:** 
- En desarrollo: Siempre usa `npm start`
- Los datos están en la carpeta raíz `data/`, no en `dist/data/`

### Problema: "Se borró mi carpeta data/"

**Solución:**
```bash
# Restaurar desde backup
npm run restore
```

## 🎓 Entendiendo el Sistema

### Modo Desarrollo
```
npm start
  └─ Electron ejecuta desde node_modules/electron/
  └─ Detecta modo desarrollo
  └─ Usa: gestor-electron/data/
  └─ ✅ Tus datos están seguros aquí
```

### Modo Producción
```
.exe compilado
  └─ Ejecutable en dist/win-unpacked/
  └─ Detecta modo producción
  └─ Usa: dist/win-unpacked/data/
  └─ ✅ Datos viajan con el .exe
```

## 📊 Ventajas del Sistema

1. **🛡️ Protección Automática:** Los datos nunca se borran al recompilar
2. **💾 Backup Integrado:** Se crean backups antes de cada build
3. **🔄 Recuperación Fácil:** Un comando restaura todo
4. **🎯 Sin Configuración:** Funciona automáticamente
5. **📱 Portabilidad Real:** El .exe lleva sus datos consigo

## 🚀 Flujo de Trabajo Recomendado

```bash
# 1. Trabajar en desarrollo
npm start

# 2. Agregar/modificar datos en la aplicación
#    (se guardan en data/)

# 3. Cuando quieras compilar
npm run build
#    ├─ Hace backup automático
#    └─ Compila sin perder datos

# 4. Probar el .exe
cd dist/win-unpacked
"SIT Gestor.exe"
#    └─ Tendrá su propia carpeta data/

# 5. Seguir trabajando en desarrollo
npm start
#    └─ Tus datos originales siguen ahí
```

## 🔐 Seguridad

- ✅ Datos no se suben a Git (protegidos por .gitignore)
- ✅ Backup automático antes de cada build
- ✅ Separación clara entre desarrollo y producción
- ✅ Fácil recuperación ante errores

---

**💡 Tip:** Haz backups manuales (`npm run backup`) antes de:
- Cambios importantes en la estructura de datos
- Actualizar la aplicación
- Probar migraciones de base de datos
