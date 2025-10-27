// app/handlers/fileHandlers.js
const { dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const pathConfig = require('../config/pathConfig');

class FileHandlers {
    constructor(appInstance) {
        this.app = appInstance;
        // Usar pathConfig para obtener la ruta de archivos (portable o estándar)
        this.dataDir = pathConfig.getFilesPath();

        // Asegura que la carpeta raíz exista.
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    getFullPath(fileName) {
        if (!fileName) return null;
        const isAbsolute = path.isAbsolute(fileName);
        return isAbsolute ? fileName : path.join(this.dataDir, fileName);
    }

    sanitizeName(name) {
        if (!name) return null;
        return String(name)
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '') // quitar acentos
            .replace(/[^a-zA-Z0-9_-]/g, '-')   // caracteres válidos
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();
    }

    getResolutionFolder(resolutionNumber, expedienteNumero) {
        const sanitizedResolution = this.sanitizeName(resolutionNumber);
        if (sanitizedResolution) {
            return `resolucion-${sanitizedResolution}`;
        }

        const sanitizedExpediente = this.sanitizeName(expedienteNumero);
        if (sanitizedExpediente) {
            return `expediente-${sanitizedExpediente}`;
        }

        return 'sin-resolucion';
    }

    ensureFolder(folderName) {
        const targetDir = path.join(this.dataDir, folderName);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return targetDir;
    }

    async openPdfDialog() {
        console.log('Abriendo diálogo de selección de PDF...');
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                title: 'Seleccionar archivo PDF'
            });
            
            console.log('Diálogo cerrado. Cancelado:', canceled, 'Archivos:', filePaths);
            return canceled ? null : filePaths[0];
        } catch (error) {
            console.error('Error al abrir diálogo:', error);
            return null;
        }
    }

    savePdf(filePath, fileName, options = {}) {
        const { resolutionNumber, expedienteNumero } = options;
        const folderName = this.getResolutionFolder(resolutionNumber, expedienteNumero);
        const baseDir = this.ensureFolder(folderName);
        const destinationPath = path.join(baseDir, fileName);

        return new Promise((resolve, reject) => {
            fs.copyFile(filePath, destinationPath, (err) => {
                if (err) {
                    console.error('Error al guardar el archivo:', err);
                    return reject(err);
                }
                console.log('Archivo guardado exitosamente:', destinationPath);
                const relativePath = path.relative(this.dataDir, destinationPath);
                resolve({ success: true, path: relativePath, folder: folderName });
            });
        });
    }

    openPdf(fileName) {
        const fullPath = this.getFullPath(fileName);
        if (!fullPath) {
            dialog.showErrorBox('Archivo no encontrado', 'No se proporcionó una ruta de archivo válida.');
            return;
        }
        if (fs.existsSync(fullPath)) {
            shell.openPath(fullPath).catch(err => {
                console.error('Error al abrir el archivo:', err);
                dialog.showErrorBox('Error', `No se pudo abrir el archivo: ${err.message}`);
            });
        } else {
            dialog.showErrorBox('Archivo no encontrado', 'El archivo no existe en la ruta especificada.');
        }
    }

    deletePdf(fileName) {
        const fullPath = this.getFullPath(fileName);
        return new Promise((resolve, reject) => {
            if (!fullPath) {
                console.warn('No se proporcionó ruta para eliminar PDF');
                return resolve({ success: true, message: 'Ruta no especificada' });
            }
            if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, (err) => {
                    if (err) {
                        console.error('Error al eliminar el archivo:', err);
                        return reject(err);
                    }
                    console.log('Archivo PDF eliminado exitosamente:', fullPath);
                    this.cleanupEmptyFolder(fullPath);
                    resolve({ success: true, path: fullPath });
                });
            } else {
                console.warn('Archivo PDF no existe, omitiendo eliminación:', fullPath);
                resolve({ success: true, message: 'Archivo no existía' });
            }
        });
    }

    cleanupEmptyFolder(filePath) {
        const folderPath = path.dirname(filePath);

        if (!folderPath.startsWith(this.dataDir) || folderPath === this.dataDir) {
            return;
        }

        try {
            const remaining = fs.readdirSync(folderPath);
            if (remaining.length === 0) {
                fs.rmdirSync(folderPath, { recursive: false });
                console.log('Carpeta eliminada por estar vacía:', folderPath);
            }
        } catch (error) {
            console.warn('No se pudo limpiar la carpeta:', folderPath, error.message);
        }
    }
}

module.exports = FileHandlers;