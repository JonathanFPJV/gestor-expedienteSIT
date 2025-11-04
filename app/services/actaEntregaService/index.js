// app/services/actaEntregaService/index.js
/**
 * ActaEntregaService - Orquestador Principal
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Coordina todos los módulos especializados:
 * - actaManager: CRUD de actas
 * - tarjetaManager: Gestión de tarjetas asociadas
 * - pdfManager: Manejo de PDFs
 * - statsManager: Estadísticas
 * - utils: Utilidades compartidas
 */

const createActaManager = require('./actaManager');
const createTarjetaManager = require('./tarjetaManager');
const createPdfManager = require('./pdfManager');
const createStatsManager = require('./statsManager');
const { executeTransaction, formatSuccessResponse, validateDatabase } = require('./utils');

class ActaEntregaService {
    constructor(db, fileHandlers = null) {
        // Validar base de datos
        validateDatabase(db);

        this.db = db;
        this.fileHandlers = fileHandlers;

        // Inicializar módulos especializados
        this.actaManager = createActaManager(db);
        this.tarjetaManager = createTarjetaManager(db);
        this.pdfManager = createPdfManager(db);
        this.statsManager = createStatsManager(db);

        console.log('✅ ActaEntregaService inicializado con db válido');
    }

    /**
     * Crear nueva Acta de Entrega
     * @param {Object} actaData - Datos del acta
     * @param {Array} tarjetasIds - IDs de tarjetas a asociar
     * @returns {Object} Resultado de la operación
     */
    createActaEntrega(actaData, tarjetasIds = []) {
        console.log('📝 Creando acta de entrega:', actaData);

        return executeTransaction(this.db, () => {
            // 1. Crear acta
            const actaId = this.actaManager.createActa({
                ...actaData,
                n_tarjetas_entregadas: actaData.n_tarjetas_entregadas || tarjetasIds.length
            });

            // 2. Copiar PDF si existe
            if (actaData.pdfSourcePath) {
                this.pdfManager.copyAndUpdatePdf(actaData.pdfSourcePath, actaId);
            }

            // 3. Asociar tarjetas
            if (tarjetasIds && tarjetasIds.length > 0) {
                this.tarjetaManager.associateTarjetasToActa(actaId, tarjetasIds);
            }

            // 4. Obtener acta completa
            const actaCompleta = this.getActaEntregaById(actaId);

            return formatSuccessResponse(
                actaCompleta,
                'Acta de entrega creada exitosamente'
            );
        });
    }

    /**
     * Obtener acta de entrega por ID con sus tarjetas asociadas
     * @param {number} actaId - ID del acta
     * @returns {Object} Acta completa con tarjetas
     */
    getActaEntregaById(actaId) {
        console.log('🔍 Obteniendo acta ID:', actaId);

        const acta = this.actaManager.getActaById(actaId);
        const tarjetas = this.tarjetaManager.getTarjetasByActaId(actaId);

        return {
            ...acta,
            tarjetas: tarjetas
        };
    }

    /**
     * Obtener todas las actas de entrega
     * @param {Object} filtros - Filtros opcionales
     * @returns {Array} Lista de actas
     */
    getAllActasEntrega(filtros = {}) {
        return this.actaManager.getAllActas(filtros);
    }

    /**
     * Actualizar acta de entrega
     * @param {number} actaId - ID del acta
     * @param {Object} actaData - Nuevos datos
     * @param {Array|null} tarjetasIds - IDs de tarjetas (null = no cambiar)
     * @returns {Object} Resultado de la operación
     */
    updateActaEntrega(actaId, actaData, tarjetasIds = null) {
        console.log('📝 Actualizando acta ID:', actaId);

        return executeTransaction(this.db, () => {
            // 1. Verificar que existe
            const actaExistente = this.actaManager.getActaById(actaId);

            // 2. Actualizar datos del acta
            this.actaManager.updateActa(actaId, actaData, actaExistente);

            // 3. Gestionar PDF si viene nuevo
            if (actaData.pdfSourcePath) {
                this.pdfManager.replacePdf(
                    actaExistente.pdfPathEntrega,
                    actaData.pdfSourcePath,
                    actaId
                );
            }

            // 4. Actualizar tarjetas si se especificaron
            if (tarjetasIds !== null && Array.isArray(tarjetasIds)) {
                this.tarjetaManager.reassociateTarjetas(actaId, tarjetasIds);
            }

            // 5. Obtener acta actualizada
            const actaActualizada = this.getActaEntregaById(actaId);

            return formatSuccessResponse(
                actaActualizada,
                'Acta actualizada exitosamente'
            );
        });
    }

    /**
     * Eliminar acta de entrega
     * @param {number} actaId - ID del acta
     * @returns {Object} Resultado de la operación
     */
    deleteActaEntrega(actaId) {
        console.log('🗑️ Eliminando acta ID:', actaId);

        return executeTransaction(this.db, () => {
            // 1. Obtener acta para información
            const acta = this.actaManager.getActaById(actaId);

            // 2. Contar tarjetas asociadas
            const cantidadTarjetas = this.tarjetaManager.countTarjetasByActa(actaId);

            // 3. Desasociar tarjetas
            this.tarjetaManager.desassociateTarjetasFromActa(actaId);

            // 4. Eliminar PDF
            const pdfEliminado = this.pdfManager.deletePdf(acta.pdfPathEntrega);

            // 5. Eliminar acta
            this.actaManager.deleteActa(actaId);

            return {
                success: true,
                message: 'Acta de entrega eliminada exitosamente',
                summary: {
                    actaId: actaId,
                    fechaEntrega: acta.fechaEntrega,
                    tarjetasDesasociadas: cantidadTarjetas,
                    pdfEliminado: pdfEliminado
                }
            };
        });
    }

    /**
     * Obtener información para eliminar (preview)
     * @param {number} actaId - ID del acta
     * @returns {Object} Información para confirmación
     */
    getDeleteInfo(actaId) {
        const acta = this.getActaEntregaById(actaId);

        return {
            acta: {
                id: acta._id,
                fechaEntrega: acta.fechaEntrega,
                nTarjetas: acta.n_tarjetas_entregadas,
                observaciones: acta.observaciones
            },
            tarjetas: acta.tarjetas.map(t => ({
                id: t._id,
                placa: t.placa,
                numeroTarjeta: t.numeroTarjeta,
                expediente: `${t.numeroExpediente}-${t.anioExpediente}`
            })),
            archivos: {
                pdf: !!acta.pdfPathEntrega
            }
        };
    }

    /**
     * Buscar actas de entrega
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Array} Actas encontradas
     */
    searchActasEntrega(searchTerm) {
        return this.actaManager.searchActas(searchTerm);
    }

    /**
     * Obtener tarjetas disponibles (sin acta)
     * @returns {Array} Lista de tarjetas disponibles
     */
    getTarjetasDisponibles() {
        return this.tarjetaManager.getTarjetasDisponibles();
    }

    /**
     * Obtener estadísticas
     * @returns {Object} Estadísticas completas
     */
    getEstadisticas() {
        return this.statsManager.getEstadisticas();
    }

    /**
     * Copiar archivo PDF (método privado - retrocompatibilidad)
     * @private
     * @deprecated Usar pdfManager directamente
     */
    _copyPdfFile(sourcePath, actaId) {
        return this.pdfManager.copyAndUpdatePdf(sourcePath, actaId);
    }
}

module.exports = ActaEntregaService;
