// app/config/appConfig.js
const path = require('path');

const AppConfig = {
    // Configuración de modo portable
    portable: {
        enabled: true,
        markerFile: 'portable.txt',
        dataFolder: 'data',
        description: 'Si existe portable.txt junto al .exe, todos los datos se guardan en carpeta data/'
    },
    
    // Configuración de base de datos
    database: {
        expedientes: 'expedientes.db',
        tarjetas: 'tarjetas.db'
    },
    
    // Configuración de archivos
    files: {
        uploadDir: 'archivos-vehiculos',
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['.pdf'],
        namingConvention: {
            expediente: 'expediente-{timestamp}.pdf',
            tarjeta: 'tarjeta-{timestamp}.pdf'
        }
    },
    
    // Configuración de eliminación
    deletion: {
        cascadeTimeout: 30000, // 30 segundos
        maxRetries: 3,
        confirmationRequired: true,
        backupBeforeDelete: false
    },
    
    // Configuración de logs
    logging: {
        level: 'info', // debug, info, warn, error
        logToFile: false,
        logDirectory: 'logs'
    },
    
    // Configuración de UI
    ui: {
        pagination: {
            defaultPageSize: 10,
            maxPageSize: 100
        },
        notifications: {
            duration: 5000, // 5 segundos
            position: 'top-right'
        }
    },
    
    // Eventos de aplicación
    events: {
        EXPEDIENTE_CREATED: 'expediente-created',
        EXPEDIENTE_UPDATED: 'expediente-updated',
        EXPEDIENTE_DELETED: 'expediente-deleted',
        TARJETA_CREATED: 'tarjeta-created',
        TARJETA_UPDATED: 'tarjeta-updated',
        TARJETA_DELETED: 'tarjeta-deleted',
        FILE_UPLOADED: 'file-uploaded',
        FILE_DELETED: 'file-deleted',
        ERROR_OCCURRED: 'error-occurred'
    }
};

module.exports = AppConfig;