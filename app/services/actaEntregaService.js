// app/services/actaEntregaService.js
/**
 * Servicio para gestionar Actas de Entrega
 * Trabaja con la estructura existente de la BD:
 * - n_tarjetas_entregadas
 * - fechaEntrega
 * - pdfPathEntrega
 * - observaciones
 */

class ActaEntregaService {
    constructor(db, fileHandlers = null) {
        this.db = db;
        this.fileHandlers = fileHandlers;
    }

    /**
     * Crear una nueva Acta de Entrega
     * @param {Object} actaData - Datos del acta
     * @param {string} pdfFilePath - Ruta del PDF (opcional)
     * @param {Object} metadata - Metadata para organizar archivos (numeroResolucion, numeroExpediente)
     * @returns {Object} - Resultado de la operación
     */
    async createActaEntrega(actaData, pdfFilePath = null, metadata = {}) {
        try {
            console.log('📝 Creando Acta de Entrega:', actaData);

            // Validaciones
            if (!actaData.fechaEntrega) {
                return { success: false, message: 'La fecha de entrega es requerida' };
            }

            // Guardar PDF si se proporcionó (en la carpeta del expediente)
            let pdfPath = null;
            if (pdfFilePath && this.fileHandlers) {
                console.log('💾 Guardando PDF del acta de entrega en la carpeta del expediente...');
                const fileName = `acta-entrega-${Date.now()}.pdf`;
                const saveResult = await this.fileHandlers.savePdf(
                    pdfFilePath, 
                    fileName,
                    metadata
                );
                
                if (saveResult.success) {
                    pdfPath = saveResult.path;
                    console.log('✅ PDF guardado en:', pdfPath);
                } else {
                    console.warn('⚠️ No se pudo guardar el PDF:', saveResult.message);
                }
            }

            // Preparar datos para inserción
            const actaToInsert = {
                n_tarjetas_entregadas: actaData.n_tarjetas_entregadas || 0,
                fechaEntrega: actaData.fechaEntrega,
                pdfPathEntrega: pdfPath,
                observaciones: actaData.observaciones || null
            };

            // Insertar en la base de datos
            const insertedActa = this.db.actasEntrega.insert(actaToInsert);

            console.log('✅ Acta de Entrega creada exitosamente:', insertedActa._id);

            return {
                success: true,
                message: 'Acta de Entrega creada exitosamente',
                acta: insertedActa
            };

        } catch (error) {
            console.error('❌ Error al crear Acta de Entrega:', error);
            return {
                success: false,
                message: error.message || 'Error al crear Acta de Entrega',
                acta: null
            };
        }
    }

    /**
     * Obtener todas las Actas de Entrega
     * @param {Object} filtros - Filtros opcionales
     * @returns {Object} - Lista de actas
     */
    getActasEntrega(filtros = {}) {
        try {
            console.log('📋 Obteniendo Actas de Entrega');

            const actas = this.db.actasEntrega.find(filtros);

            console.log(`✅ Se encontraron ${actas.length} actas`);

            return {
                success: true,
                actas: actas,
                count: actas.length
            };

        } catch (error) {
            console.error('❌ Error al obtener Actas de Entrega:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener Actas de Entrega',
                actas: [],
                count: 0
            };
        }
    }

    /**
     * Obtener un Acta de Entrega por ID
     * @param {string} actaId - ID del acta
     * @returns {Object} - Acta encontrada
     */
    getActaEntregaById(actaId) {
        try {
            console.log('🔍 Buscando Acta de Entrega con ID:', actaId);

            const acta = this.db.actasEntrega.findOne({ _id: actaId });

            if (!acta) {
                return {
                    success: false,
                    message: 'Acta de Entrega no encontrada',
                    acta: null
                };
            }

            return {
                success: true,
                acta: acta
            };

        } catch (error) {
            console.error('❌ Error al buscar Acta de Entrega:', error);
            return {
                success: false,
                message: error.message || 'Error al buscar Acta de Entrega',
                acta: null
            };
        }
    }

    /**
     * Actualizar un Acta de Entrega
     * @param {string} actaId - ID del acta
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} - Resultado de la operación
     */
    updateActaEntrega(actaId, updateData) {
        try {
            console.log('📝 Actualizando Acta de Entrega:', actaId);

            const changes = this.db.actasEntrega.update({ _id: actaId }, updateData);

            if (changes === 0) {
                return {
                    success: false,
                    message: 'Acta de Entrega no encontrada'
                };
            }

            console.log('✅ Acta de Entrega actualizada exitosamente');

            return {
                success: true,
                message: 'Acta de Entrega actualizada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar Acta de Entrega:', error);
            return {
                success: false,
                message: error.message || 'Error al actualizar Acta de Entrega'
            };
        }
    }

    /**
     * Eliminar un Acta de Entrega
     * @param {string} actaId - ID del acta
     * @returns {Object} - Resultado de la operación
     */
    deleteActaEntrega(actaId) {
        try {
            console.log('🗑️ Eliminando Acta de Entrega:', actaId);

            const changes = this.db.actasEntrega.remove({ _id: actaId });

            if (changes === 0) {
                return {
                    success: false,
                    message: 'Acta de Entrega no encontrada'
                };
            }

            console.log('✅ Acta de Entrega eliminada exitosamente');

            return {
                success: true,
                message: 'Acta de Entrega eliminada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al eliminar Acta de Entrega:', error);
            return {
                success: false,
                message: error.message || 'Error al eliminar Acta de Entrega'
            };
        }
    }

    /**
     * Obtener tarjetas asociadas a un acta de entrega
     * @param {string} actaId - ID del acta
     * @returns {Object} - Tarjetas asociadas
     */
    getTarjetasByActa(actaId) {
        try {
            console.log('🔍 Buscando tarjetas del Acta:', actaId);

            const tarjetas = this.db.tarjetas.find({ actaEntregaId: actaId });

            return {
                success: true,
                tarjetas: tarjetas,
                count: tarjetas.length
            };

        } catch (error) {
            console.error('❌ Error al buscar tarjetas:', error);
            return {
                success: false,
                message: error.message || 'Error al buscar tarjetas',
                tarjetas: [],
                count: 0
            };
        }
    }
}

module.exports = ActaEntregaService;
