// app/services/tarjetaService/index.js
/**
 * TarjetaService - Orquestador Principal
 * ⚡ REFACTORIZADO - Arquitectura Limpia
 * 
 * Coordina todos los módulos especializados:
 * - tarjetaManager: CRUD de tarjetas
 * - pdfManager: Manejo de PDFs
 * - statsManager: Estadísticas
 * - utils: Utilidades compartidas
 */

const createTarjetaManager = require('./tarjetaManager');
const createPdfManager = require('./pdfManager');
const createStatsManager = require('./statsManager');
const { 
    validateTarjetaData, 
    normalizePlaca,
    formatSuccessResponse, 
    formatErrorResponse 
} = require('./utils');

class TarjetaService {
    constructor(db, fileHandlers = null) {
        this.db = db;
        this.fileHandlers = fileHandlers;

        // Inicializar módulos especializados
        this.tarjetaManager = createTarjetaManager(db);
        this.pdfManager = createPdfManager(fileHandlers);
        this.statsManager = createStatsManager(db);
    }

    /**
     * Crear una nueva tarjeta
     * @param {Object} tarjetaData - Datos de la tarjeta
     * @param {string} pdfFilePath - Ruta temporal del archivo PDF (opcional)
     * @returns {Object} Tarjeta creada con su ID
     */
    createTarjeta(tarjetaData, pdfFilePath = null) {
        try {
            // Validación de campos requeridos
            validateTarjetaData(tarjetaData);

            // Verificar si ya existe una tarjeta con la misma placa
            if (tarjetaData.placa) {
                const existente = this.tarjetaManager.getTarjetaByPlaca(tarjetaData.placa);
                
                if (existente) {
                    throw new Error(`Ya existe una tarjeta con la placa ${tarjetaData.placa}`);
                }
            }

            // Preparar datos para inserción
            const tarjetaToInsert = {
                placa: normalizePlaca(tarjetaData.placa),
                numeroTarjeta: tarjetaData.numeroTarjeta || null,
                resolucionId: tarjetaData.expedienteId || tarjetaData.resolucionId || null,
                actaEntregaId: tarjetaData.actaEntregaId || null,
                pdfPath: null // Se actualizará después si hay archivo
            };

            // Insertar en la base de datos
            const nuevaTarjeta = this.tarjetaManager.insertTarjeta(tarjetaToInsert);

            // Si hay archivo PDF y resolucionId, guardarlo
            if (pdfFilePath && nuevaTarjeta.resolucionId && this.fileHandlers) {
                try {
                    const resolucion = this.db.expedientes.findOne({ 
                        _id: nuevaTarjeta.resolucionId 
                    });

                    if (resolucion) {
                        const pdfPath = this.pdfManager.savePdf(
                            pdfFilePath,
                            nuevaTarjeta,
                            resolucion
                        );

                        // Actualizar ruta del PDF
                        nuevaTarjeta.pdfPath = pdfPath;
                        this.tarjetaManager.updateTarjeta(nuevaTarjeta._id, nuevaTarjeta);
                    }
                } catch (pdfError) {
                    console.warn('⚠️ No se pudo guardar el PDF de la tarjeta:', pdfError);
                    // No fallar la creación de la tarjeta si el PDF falla
                }
            }
            
            console.log('✅ Tarjeta creada exitosamente:', nuevaTarjeta._id);
            return formatSuccessResponse(nuevaTarjeta, 'Tarjeta creada exitosamente');

        } catch (error) {
            console.error('❌ Error al crear tarjeta:', error);
            return formatErrorResponse(error);
        }
    }

    /**
     * Obtener todas las tarjetas
     * @param {Object} filtros - Filtros opcionales de búsqueda
     * @returns {Object} Lista de tarjetas
     */
    getTarjetas(filtros = {}) {
        try {
            const tarjetas = this.tarjetaManager.getAllTarjetas(filtros);
            
            console.log(`📋 Tarjetas obtenidas: ${tarjetas.length}`);
            return {
                success: true,
                tarjetas: tarjetas,
                count: tarjetas.length
            };

        } catch (error) {
            console.error('❌ Error al obtener tarjetas:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener tarjetas',
                tarjetas: []
            };
        }
    }

    /**
     * Obtener una tarjeta por ID
     * @param {string} tarjetaId - ID de la tarjeta
     * @returns {Object} Datos de la tarjeta
     */
    getTarjetaById(tarjetaId) {
        try {
            if (!tarjetaId) {
                throw new Error('ID de tarjeta no proporcionado');
            }

            const tarjeta = this.tarjetaManager.getTarjetaById(tarjetaId);

            // Si tiene resolución asociada, obtener sus datos
            if (tarjeta.resolucionId) {
                const resolucion = this.db.expedientes.findOne({ 
                    _id: tarjeta.resolucionId 
                });
                
                return {
                    success: true,
                    tarjeta: {
                        ...tarjeta,
                        resolucion: resolucion || null
                    }
                };
            }

            return {
                success: true,
                tarjeta: tarjeta
            };

        } catch (error) {
            console.error('❌ Error al obtener tarjeta:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener tarjeta'
            };
        }
    }

    /**
     * Buscar tarjetas por placa o número de tarjeta
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Object} Lista de tarjetas encontradas
     */
    searchTarjetas(searchTerm) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return this.getTarjetas();
            }

            const tarjetas = this.tarjetaManager.searchTarjetas(searchTerm);

            console.log(`🔍 Búsqueda "${searchTerm}": ${tarjetas.length} resultados`);
            
            return {
                success: true,
                tarjetas: tarjetas,
                count: tarjetas.length,
                searchTerm: searchTerm
            };

        } catch (error) {
            console.error('❌ Error en búsqueda de tarjetas:', error);
            return {
                success: false,
                message: error.message || 'Error en búsqueda de tarjetas',
                tarjetas: []
            };
        }
    }

    /**
     * Obtener tarjetas asociadas a una resolución (expediente)
     * @param {string} resolucionId - ID de la resolución (antiguo expedienteId)
     * @returns {Object} Lista de tarjetas de la resolución
     */
    getTarjetasByExpediente(resolucionId) {
        try {
            if (!resolucionId) {
                throw new Error('ID de resolución no proporcionado');
            }

            const tarjetas = this.tarjetaManager.getTarjetasByResolucion(resolucionId);

            console.log(`🎫 Tarjetas de la resolución ${resolucionId}: ${tarjetas.length}`);
            
            return {
                success: true,
                tarjetas: tarjetas,
                count: tarjetas.length,
                resolucionId: resolucionId
            };

        } catch (error) {
            console.error('❌ Error al obtener tarjetas de la resolución:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener tarjetas de la resolución',
                tarjetas: []
            };
        }
    }

    /**
     * Actualizar una tarjeta
     * @param {string} tarjetaId - ID de la tarjeta
     * @param {Object} updateData - Datos a actualizar
     * @param {string} pdfFilePath - Ruta temporal del nuevo archivo PDF (opcional)
     * @returns {Object} Resultado de la actualización
     */
    updateTarjeta(tarjetaId, updateData, pdfFilePath = null) {
        try {
            if (!tarjetaId) {
                throw new Error('ID de tarjeta no proporcionado');
            }

            // Verificar que la tarjeta existe
            const tarjetaExistente = this.tarjetaManager.getTarjetaById(tarjetaId);

            // Si se está actualizando la placa, verificar que no exista otra con la misma
            if (updateData.placa && normalizePlaca(updateData.placa) !== tarjetaExistente.placa) {
                const placaExistente = this.tarjetaManager.getTarjetaByPlaca(updateData.placa);

                if (placaExistente && placaExistente._id !== tarjetaId) {
                    throw new Error(`Ya existe otra tarjeta con la placa ${updateData.placa}`);
                }
            }

            // Preparar datos de actualización
            const dataToUpdate = {
                placa: normalizePlaca(updateData.placa) || tarjetaExistente.placa,
                numeroTarjeta: updateData.numeroTarjeta !== undefined ? updateData.numeroTarjeta : tarjetaExistente.numeroTarjeta,
                resolucionId: updateData.expedienteId !== undefined ? updateData.expedienteId : 
                             (updateData.resolucionId !== undefined ? updateData.resolucionId : tarjetaExistente.resolucionId),
                actaEntregaId: updateData.actaEntregaId !== undefined ? updateData.actaEntregaId : tarjetaExistente.actaEntregaId,
                pdfPath: tarjetaExistente.pdfPath
            };

            // Manejar archivo PDF si se proporciona
            if (pdfFilePath && dataToUpdate.resolucionId && this.fileHandlers) {
                try {
                    const resolucion = this.db.expedientes.findOne({ 
                        _id: dataToUpdate.resolucionId 
                    });

                    if (resolucion) {
                        // Eliminar PDF anterior si existe
                        if (tarjetaExistente.pdfPath) {
                            this.pdfManager.deletePdf(tarjetaExistente.pdfPath);
                        }

                        // Guardar nuevo PDF
                        const pdfPath = this.pdfManager.savePdf(
                            pdfFilePath,
                            dataToUpdate,
                            resolucion
                        );
                        dataToUpdate.pdfPath = pdfPath;
                    }
                } catch (pdfError) {
                    console.warn('⚠️ No se pudo actualizar el PDF:', pdfError);
                }
            }

            // Actualizar en la base de datos
            const tarjetaActualizada = this.tarjetaManager.updateTarjeta(tarjetaId, dataToUpdate);

            console.log('✅ Tarjeta actualizada exitosamente:', tarjetaId);
            return formatSuccessResponse(tarjetaActualizada, 'Tarjeta actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error al actualizar tarjeta:', error);
            return formatErrorResponse(error);
        }
    }

    /**
     * Eliminar una tarjeta
     * @param {string} tarjetaId - ID de la tarjeta
     * @returns {Object} Resultado de la eliminación
     */
    deleteTarjeta(tarjetaId) {
        try {
            if (!tarjetaId) {
                throw new Error('ID de tarjeta no proporcionado');
            }

            // Verificar que la tarjeta existe
            const tarjetaExistente = this.tarjetaManager.getTarjetaById(tarjetaId);

            // Eliminar PDF asociado si existe
            if (tarjetaExistente.pdfPath && this.fileHandlers) {
                try {
                    this.pdfManager.deletePdf(tarjetaExistente.pdfPath);
                } catch (deleteError) {
                    console.warn('⚠️ No se pudo eliminar el PDF:', deleteError);
                }
            }

            // Eliminar la tarjeta
            const changes = this.tarjetaManager.deleteTarjeta(tarjetaId);

            if (changes === 0) {
                throw new Error('No se pudo eliminar la tarjeta');
            }

            console.log('✅ Tarjeta eliminada exitosamente:', tarjetaId);
            return {
                success: true,
                message: 'Tarjeta eliminada exitosamente',
                tarjetaId: tarjetaId
            };

        } catch (error) {
            console.error('❌ Error al eliminar tarjeta:', error);
            return formatErrorResponse(error);
        }
    }

    /**
     * Eliminar todas las tarjetas de una resolución (expediente)
     * @param {string} resolucionId - ID de la resolución
     * @returns {Object} Resultado de la eliminación
     */
    deleteTarjetasByExpediente(resolucionId) {
        try {
            if (!resolucionId) {
                throw new Error('ID de resolución no proporcionado');
            }

            // Obtener todas las tarjetas antes de eliminar (para PDFs)
            const tarjetas = this.tarjetaManager.getTarjetasByResolucion(resolucionId);

            // Eliminar PDFs asociados
            if (this.fileHandlers) {
                tarjetas.forEach(tarjeta => {
                    if (tarjeta.pdfPath) {
                        try {
                            this.pdfManager.deletePdf(tarjeta.pdfPath);
                        } catch (deleteError) {
                            console.warn('⚠️ No se pudo eliminar PDF:', deleteError);
                        }
                    }
                });
            }

            // Eliminar las tarjetas
            const changes = this.tarjetaManager.deleteTarjetasByResolucion(resolucionId);

            console.log(`✅ ${changes} tarjetas eliminadas de la resolución ${resolucionId}`);
            return {
                success: true,
                message: `${changes} tarjetas eliminadas exitosamente`,
                count: changes
            };

        } catch (error) {
            console.error('❌ Error al eliminar tarjetas de la resolución:', error);
            return formatErrorResponse(error);
        }
    }

    /**
     * Validar datos de tarjeta (método público para retrocompatibilidad)
     * @param {Object} tarjetaData - Datos a validar
     * @throws {Error} Si faltan campos requeridos
     */
    validateTarjetaData(tarjetaData) {
        return validateTarjetaData(tarjetaData);
    }

    /**
     * Construir query de búsqueda (método público para retrocompatibilidad)
     * @param {Object} filtros - Filtros aplicados
     * @returns {Object} Query para SQLite
     */
    buildQuery(filtros) {
        const { buildQuery } = require('./utils');
        return buildQuery(filtros);
    }

    /**
     * Obtener estadísticas de tarjetas
     * @returns {Object} Estadísticas
     */
    getEstadisticas() {
        try {
            const estadisticas = this.statsManager.getEstadisticas();

            return {
                success: true,
                estadisticas: estadisticas
            };

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener estadísticas'
            };
        }
    }

    /**
     * Buscar tarjetas por placa (método especializado)
     * @param {string} placa - Placa a buscar
     * @returns {Object} Tarjeta encontrada o null
     */
    getTarjetaByPlaca(placa) {
        try {
            if (!placa) {
                throw new Error('Placa no proporcionada');
            }

            const tarjeta = this.tarjetaManager.getTarjetaByPlaca(placa);

            if (!tarjeta) {
                return {
                    success: false,
                    message: 'No se encontró tarjeta con esa placa',
                    tarjeta: null
                };
            }

            return {
                success: true,
                tarjeta: tarjeta
            };

        } catch (error) {
            console.error('❌ Error al buscar tarjeta por placa:', error);
            return {
                success: false,
                message: error.message || 'Error al buscar tarjeta por placa',
                tarjeta: null
            };
        }
    }

    /**
     * Obtener tarjetas por acta de entrega
     * @param {number} actaEntregaId - ID del acta de entrega
     * @returns {Object} Lista de tarjetas
     */
    getTarjetasByActaEntrega(actaEntregaId) {
        try {
            if (!actaEntregaId) {
                throw new Error('ID de acta de entrega no proporcionado');
            }

            const tarjetas = this.tarjetaManager.getTarjetasByActaEntrega(actaEntregaId);

            console.log(`📋 Tarjetas del acta de entrega ${actaEntregaId}: ${tarjetas.length}`);
            
            return {
                success: true,
                tarjetas: tarjetas,
                count: tarjetas.length,
                actaEntregaId: actaEntregaId
            };

        } catch (error) {
            console.error('❌ Error al obtener tarjetas por acta de entrega:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener tarjetas por acta de entrega',
                tarjetas: []
            };
        }
    }

    /**
     * Construir nombre de archivo para PDF (método público para retrocompatibilidad)
     * @param {Object} tarjetaData - Datos de la tarjeta
     * @returns {string} Nombre de archivo
     */
    buildTarjetaFileName(tarjetaData) {
        const { buildTarjetaFileName } = require('./utils');
        return buildTarjetaFileName(tarjetaData);
    }
}

module.exports = TarjetaService;
