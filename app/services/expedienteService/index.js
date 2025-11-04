// app/services/expedienteService/index.js
/**
 * ExpedienteService - Orquestador Principal
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Coordina todos los módulos especializados:
 * - expedienteManager: CRUD de expedientes
 * - tarjetaManager: Gestión de tarjetas asociadas
 * - actaEntregaManager: Gestión de actas de entrega
 * - pdfManager: Manejo de PDFs
 * - deletionManager: Eliminación en cascada
 * - utils: Utilidades compartidas
 */

const createExpedienteManager = require('./expedienteManager');
const createTarjetaManager = require('./tarjetaManager');
const createActaEntregaManager = require('./actaEntregaManager');
const createPdfManager = require('./pdfManager');
const createDeletionManager = require('./deletionManager');
const { 
    buildExpedienteLabel,
    buildTarjetaFileName,
    buildExpedienteQuery,
    formatSuccessResponse,
    formatErrorResponse
} = require('./utils');

class ExpedienteService {
    constructor(db, fileHandlers) {
        this.db = db;
        this.fileHandlers = fileHandlers;

        // Inicializar módulos especializados
        this.expedienteManager = createExpedienteManager(db);
        this.tarjetaManager = createTarjetaManager(db, fileHandlers);
        this.actaEntregaManager = createActaEntregaManager(db);
        this.pdfManager = createPdfManager(fileHandlers);
        this.deletionManager = createDeletionManager(
            db,
            this.expedienteManager,
            this.tarjetaManager,
            this.actaEntregaManager,
            this.pdfManager
        );
    }

    /**
     * Crear un nuevo expediente (Acta de Resolución) con sus tarjetas
     * @param {Object} rawData - Datos del expediente
     * @returns {Promise<Object>} Expediente creado con sus tarjetas
     */
    async createExpediente(rawData = {}) {
        const expedienteData = { ...rawData };
        const tarjetas = Array.isArray(expedienteData.tarjetas) ? expedienteData.tarjetas : [];
        delete expedienteData.tarjetas;
        
        // Extraer datos del acta de entrega si existen
        const actaEntregaData = expedienteData.actaEntrega;
        delete expedienteData.actaEntrega;

        // Manejo de PDF del acta de resolución
        if (expedienteData.pdfSourcePath) {
            const pdfPath = await this.pdfManager.saveExpedientePdf(
                expedienteData.pdfSourcePath,
                expedienteData
            );
            expedienteData.pdfPathActa = pdfPath;
            delete expedienteData.pdfSourcePath;
        }

        // Preparar datos para inserción en ActasResolucion
        const actaData = {
            numeroExpediente: expedienteData.expediente || expedienteData.numeroExpediente || buildExpedienteLabel(expedienteData),
            anioExpediente: expedienteData.anioExpediente || new Date().getFullYear(),
            numeroResolucion: expedienteData.numeroResolucion || null,
            fechaExpediente: expedienteData.fecha || expedienteData.fechaExpediente || new Date().toISOString().split('T')[0],
            unidadNegocio: expedienteData.unidadNegocio || null,
            nombreEmpresa: expedienteData.nombreEmpresa || null,
            numeroFichero: expedienteData.numeroFichero || null,
            observaciones: expedienteData.observaciones || null,
            pdfPathActa: expedienteData.pdfPathActa || null,
            informeTecnico: expedienteData.informeTecnico || null
        };

        // Insertar en ActasResolucion
        const newExpediente = this.expedienteManager.insertExpediente(actaData);

        // Crear acta de entrega si se proporcionó
        let actaEntregaId = null;
        if (actaEntregaData) {
            console.log('📋 Procesando Acta de Entrega...');
            
            // Guardar PDF del acta de entrega si existe
            if (actaEntregaData.pdfSourcePath && this.fileHandlers) {
                const pdfPath = await this.pdfManager.saveActaEntregaPdf(
                    actaEntregaData.pdfSourcePath,
                    newExpediente
                );
                
                if (pdfPath) {
                    actaEntregaData.pdfPathEntrega = pdfPath;
                    delete actaEntregaData.pdfSourcePath;
                }
            }

            // Crear acta de entrega
            const newActaEntrega = this.actaEntregaManager.createActaEntrega(
                actaEntregaData,
                tarjetas.length
            );
            actaEntregaId = newActaEntrega._id;
        }

        // Guardar tarjetas asociadas
        const tarjetasGuardadas = await this.tarjetaManager.saveTarjetasParaExpediente(
            newExpediente,
            tarjetas,
            actaEntregaId
        );

        console.log('✅ Acta de Resolución creada:', newExpediente._id);
        return formatSuccessResponse(
            {
                expediente: newExpediente,
                tarjetas: tarjetasGuardadas,
                actaEntregaId: actaEntregaId
            },
            'Expediente y tarjetas guardados exitosamente.'
        );
    }

    /**
     * Actualizar un expediente existente y sus tarjetas
     * @param {string|number} expedienteId - ID del expediente (resolución)
     * @param {Object} rawData - Datos actualizados
     * @returns {Promise<Object>} Expediente actualizado
     */
    async updateExpediente(expedienteId, rawData = {}) {
        console.log(`🔄 updateExpediente llamado con ID: "${expedienteId}" (tipo: ${typeof expedienteId})`);
        
        // Verificar que el expediente existe
        const expedienteExistente = this.expedienteManager.getExpedienteById(expedienteId);
        console.log(`🔎 Resultado de búsqueda:`, expedienteExistente ? `✅ Encontrado: ${expedienteExistente.numeroExpediente}` : '❌ NO encontrado');

        const expedienteData = { ...rawData };
        const tarjetasProvided = Object.prototype.hasOwnProperty.call(expedienteData, 'tarjetas');
        const tarjetas = tarjetasProvided && Array.isArray(expedienteData.tarjetas) ? expedienteData.tarjetas : [];
        if (tarjetasProvided) {
            delete expedienteData.tarjetas;
        }

        const numeroResolucion = expedienteData.numeroResolucion || expedienteExistente.numeroResolucion;
        const numeroExpediente = expedienteData.numeroExpediente || expedienteExistente.numeroExpediente;

        // Manejo de PDF del acta - ELIMINAR EL ANTIGUO SI SE PROPORCIONA UNO NUEVO
        if (expedienteData.pdfSourcePath) {
            // Eliminar PDF antiguo si existe
            if (expedienteExistente.pdfPathActa) {
                await this.pdfManager.deletePdf(expedienteExistente.pdfPathActa);
            }

            // Guardar nuevo PDF
            const pdfPath = await this.pdfManager.saveExpedientePdf(
                expedienteData.pdfSourcePath,
                { ...expedienteData, numeroResolucion, numeroExpediente }
            );
            expedienteData.pdfPathActa = pdfPath;
            delete expedienteData.pdfSourcePath;
        }

        // Preparar datos para actualización
        const updateData = {};
        
        if (expedienteData.numeroExpediente !== undefined) {
            updateData.numeroExpediente = expedienteData.numeroExpediente;
        } else if (expedienteData.expediente !== undefined) {
            updateData.numeroExpediente = expedienteData.expediente;
        }
        
        if (expedienteData.anioExpediente !== undefined) updateData.anioExpediente = expedienteData.anioExpediente;
        if (expedienteData.numeroResolucion !== undefined) updateData.numeroResolucion = expedienteData.numeroResolucion;
        if (expedienteData.fecha !== undefined) updateData.fechaExpediente = expedienteData.fecha;
        else if (expedienteData.fechaExpediente !== undefined) updateData.fechaExpediente = expedienteData.fechaExpediente;
        if (expedienteData.unidadNegocio !== undefined) updateData.unidadNegocio = expedienteData.unidadNegocio;
        if (expedienteData.nombreEmpresa !== undefined) updateData.nombreEmpresa = expedienteData.nombreEmpresa;
        if (expedienteData.numeroFichero !== undefined) updateData.numeroFichero = expedienteData.numeroFichero;
        if (expedienteData.observaciones !== undefined) updateData.observaciones = expedienteData.observaciones;
        if (expedienteData.pdfPathActa !== undefined) updateData.pdfPathActa = expedienteData.pdfPathActa;
        if (expedienteData.informeTecnico !== undefined) updateData.informeTecnico = expedienteData.informeTecnico;

        // Actualizar en la base de datos
        const expedienteActualizado = this.expedienteManager.updateExpediente(expedienteId, updateData);

        // Manejar tarjetas si se proporcionaron
        let tarjetasGuardadas = [];
        if (tarjetasProvided) {
            // Eliminar tarjetas anteriores
            this.tarjetaManager.deleteTarjetasByExpediente(expedienteActualizado._id);
            
            if (tarjetas.length > 0) {
                tarjetasGuardadas = await this.tarjetaManager.saveTarjetasParaExpediente(
                    expedienteActualizado,
                    tarjetas
                );
            }
        }

        console.log('✅ Acta de Resolución actualizada:', expedienteId);
        return formatSuccessResponse(
            {
                expediente: expedienteActualizado,
                tarjetas: tarjetasGuardadas
            },
            'Expediente actualizado exitosamente.'
        );
    }

    /**
     * Eliminar un expediente con todas sus tarjetas y archivos asociados (eliminación en cascada)
     * @param {string|number} expedienteId - ID del expediente a eliminar
     * @returns {Promise<Object>} Resultado de la eliminación con resumen
     */
    async deleteExpediente(expedienteId) {
        try {
            return await this.deletionManager.deleteExpedienteWithCascade(expedienteId);
        } catch (error) {
            throw formatErrorResponse(error, error.summary);
        }
    }

    /**
     * Obtener detalle completo de un expediente con sus tarjetas
     * @param {string|number} expedienteId - ID del expediente
     * @returns {Object} Expediente con tarjetas asociadas
     */
    getExpedienteDetalle(expedienteId) {
        console.log(`🔍 getExpedienteDetalle llamado con ID: "${expedienteId}" (tipo: ${typeof expedienteId})`);
        
        const expediente = this.expedienteManager.getExpedienteById(expedienteId);
        const tarjetas = this.tarjetaManager.getTarjetasByExpediente(expediente._id);

        console.log(`📋 Detalle de expediente ${expediente._id}: ${tarjetas.length} tarjetas`);
        return {
            success: true,
            expediente,
            tarjetas
        };
    }

    /**
     * Construir etiqueta de expediente (método público para retrocompatibilidad)
     * @param {Object} param0 - numeroExpediente y anioExpediente
     * @returns {string} Etiqueta formateada
     */
    buildExpedienteLabel(data) {
        return buildExpedienteLabel(data);
    }

    /**
     * Guardar tarjetas para un expediente (método público para retrocompatibilidad)
     * @param {Object} expediente - Expediente al que pertenecen las tarjetas
     * @param {Array} tarjetas - Array de tarjetas a guardar
     * @param {number} actaEntregaId - ID del acta de entrega (opcional)
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Array>} Tarjetas guardadas
     */
    async saveTarjetasParaExpediente(expediente, tarjetas, actaEntregaId = null, options = {}) {
        return await this.tarjetaManager.saveTarjetasParaExpediente(
            expediente,
            tarjetas,
            actaEntregaId,
            options
        );
    }

    /**
     * Construir nombre de archivo para PDF de tarjeta (método público para retrocompatibilidad)
     * @param {Object} tarjetaData - Datos de la tarjeta
     * @returns {string} Nombre de archivo
     */
    buildTarjetaFileName(tarjetaData) {
        return buildTarjetaFileName(tarjetaData);
    }

    /**
     * Obtener todos los expedientes
     * @param {Object} filtros - Filtros de búsqueda opcionales
     * @returns {Array} Lista de expedientes
     */
    getAllExpedientes(filtros = {}) {
        try {
            return this.expedienteManager.getAllExpedientes(filtros);
        } catch (error) {
            console.error('❌ Error al obtener expedientes:', error);
            throw error;
        }
    }

    /**
     * Buscar expedientes por término de búsqueda
     * @param {string} searchTerm - Término a buscar
     * @returns {Array} Expedientes encontrados
     */
    searchExpedientes(searchTerm) {
        try {
            return this.expedienteManager.searchExpedientes(searchTerm);
        } catch (error) {
            console.error('❌ Error en búsqueda de expedientes:', error);
            throw error;
        }
    }

    /**
     * Construir query de búsqueda (método público para retrocompatibilidad)
     * @param {Object} filtros - Filtros a aplicar
     * @returns {Object} Query para SQLite
     */
    buildExpedienteQuery(filtros) {
        return buildExpedienteQuery(filtros);
    }
}

module.exports = ExpedienteService;
