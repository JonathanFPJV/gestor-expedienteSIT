// app/handlers/fileHandlers.js
const { dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

class FileHandlers {
    getFullPath(fileName) {
        return path.join(this.dataDir, fileName);
    }
    constructor(appInstance) {
        this.app = appInstance;
        this.dataDir = path.join(this.app.getPath('userData'), 'archivos-vehiculos');

        // Asegura que la carpeta exista.
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir);
        }
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

    savePdf(filePath, fileName) {
        const destinationPath = path.join(this.dataDir, fileName);
        return new Promise((resolve, reject) => {
            fs.copyFile(filePath, destinationPath, (err) => {
                if (err) {
                    console.error('Error al guardar el archivo:', err);
                    return reject(err);
                }
                console.log('Archivo guardado exitosamente:', destinationPath);
                resolve({ success: true, path: destinationPath });
            });
        });
    }

    openPdf(fileName) {
        const fullPath = path.join(this.dataDir, fileName);
        if (fs.existsSync(fullPath)) {
            shell.openPath(fullPath).catch(err => {
                console.error('Error al abrir el archivo:', err);
                dialog.showErrorBox('Error', `No se pudo abrir el archivo: ${err.message}`);
            });
        } else {
            dialog.showErrorBox('Archivo no encontrado', 'El archivo no existe en la ruta especificada.');
        }
    }
}

module.exports = FileHandlers;