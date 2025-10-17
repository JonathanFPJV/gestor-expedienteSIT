// app/services/tarjetaService.js
/**
 * Servicio para la gestión de Tarjetas de Vehículos
 * Maneja la lógica de negocio para el CRUD de tarjetas
 * MIGRADO A SQLITE3 - Operaciones síncronas
 */

class TarjetaService {
    constructor(db, fileHandlers = null) {
        this.db = db; // Instancia de database.js con SQLite3
        this.fileHandlers = fileHandlers;
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
            this.validateTarjetaData(tarjetaData);

            // Verificar si ya existe una tarjeta con la misma placa
            if (tarjetaData.placa) {
                const existente = this.db.tarjetas.findOne({ 
                    placa: tarjetaData.placa.toUpperCase() 
                });
                
                if (existente) {
                    throw new Error(`Ya existe una tarjeta con la placa ${tarjetaData.placa}`);
                }
            }

            // Preparar datos para inserción (SQLite3)
            const tarjetaToInsert = {
                placa: tarjetaData.placa ? tarjetaData.placa.toUpperCase() : null,
                numeroTarjeta: tarjetaData.numeroTarjeta || null,
                resolucionId: tarjetaData.expedienteId || tarjetaData.resolucionId || null,
                actaEntregaId: tarjetaData.actaEntregaId || null,
                pdfPath: null // Se actualizará después si hay archivo
            };

            // Insertar en la base de datos (SYNC - SQLite3)
            const nuevaTarjeta = this.db.tarjetas.insert(tarjetaToInsert);

            // Si hay archivo PDF y resolucionId, guardarlo
            if (pdfFilePath && nuevaTarjeta.resolucionId && this.fileHandlers) {
                try {
                    const resolucion = this.db.expedientes.findOne({ 
                        _id: nuevaTarjeta.resolucionId 
                    });

                    if (resolucion) {
                        const timestamp = Date.now();
                        const pdfFileName = `tarjeta-${nuevaTarjeta.placa}-${timestamp}.pdf`;
                        const saveResult = this.fileHandlers.savePdf(pdfFilePath, pdfFileName, {
                            resolutionNumber: resolucion.numeroResolucion,
                            expedienteNumero: resolucion.numeroExpediente
                        });

                        if (saveResult.success) {
                            // Actualizar tarjeta con la ruta del PDF (SYNC)
                            this.db.tarjetas.update(
                                { _id: nuevaTarjeta._id },
                                { pdfPath: saveResult.path }
                            );
                            nuevaTarjeta.pdfPath = saveResult.path;
                        }
                    }
                } catch (pdfError) {
                    console.warn('⚠️ No se pudo guardar el PDF de la tarjeta:', pdfError);
                    // No fallar la creación de la tarjeta si el PDF falla
                }
            }
            
            console.log('✅ Tarjeta creada exitosamente:', nuevaTarjeta._id);
            return {
                success: true,
                tarjeta: nuevaTarjeta,
                message: 'Tarjeta creada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al crear tarjeta:', error);
            return {
                success: false,
                message: error.message || 'Error al crear tarjeta',
                error: error
            };
        }
    }

    /**
     * Obtener todas las tarjetas
     * @param {Object} filtros - Filtros opcionales de búsqueda
     * @returns {Object} Lista de tarjetas
     */
    getTarjetas(filtros = {}) {
        try {
            const query = this.buildQuery(filtros);
            const tarjetas = this.db.tarjetas.find(query);
            
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

            const tarjeta = this.db.tarjetas.findOne({ _id: tarjetaId });
            
            if (!tarjeta) {
                throw new Error('Tarjeta no encontrada');
            }

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

            const termUpper = searchTerm.toUpperCase().trim();
            
            // Buscar por placa o número de tarjeta usando LIKE
            const tarjetas = this.db.tarjetas.find({})
                .filter(t => 
                    (t.placa && t.placa.toUpperCase().includes(termUpper)) ||
                    (t.numeroTarjeta && t.numeroTarjeta.toUpperCase().includes(termUpper))
                );

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

            const tarjetas = this.db.tarjetas.find({ 
                resolucionId: resolucionId 
            });

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
            const tarjetaExistente = this.db.tarjetas.findOne({ _id: tarjetaId });
            if (!tarjetaExistente) {
                throw new Error('Tarjeta no encontrada');
            }

            // Si se está actualizando la placa, verificar que no exista otra con la misma
            if (updateData.placa && updateData.placa.toUpperCase() !== tarjetaExistente.placa) {
                const placaExistente = this.db.tarjetas.find({ 
                    placa: updateData.placa.toUpperCase()
                }).find(t => t._id !== tarjetaId);

                if (placaExistente) {
                    throw new Error(`Ya existe otra tarjeta con la placa ${updateData.placa}`);
                }
            }

            // Preparar datos de actualización (SQLite3)
            const dataToUpdate = {
                placa: updateData.placa ? updateData.placa.toUpperCase() : tarjetaExistente.placa,
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
                            try {
                                this.fileHandlers.deletePdf(tarjetaExistente.pdfPath);
                            } catch (deleteError) {
                                console.warn('⚠️ No se pudo eliminar el PDF anterior:', deleteError);
                            }
                        }

                        // Guardar nuevo PDF
                        const timestamp = Date.now();
                        const pdfFileName = `tarjeta-${dataToUpdate.placa}-${timestamp}.pdf`;
                        const saveResult = this.fileHandlers.savePdf(pdfFilePath, pdfFileName, {
                            resolutionNumber: resolucion.numeroResolucion,
                            expedienteNumero: resolucion.numeroExpediente
                        });

                        if (saveResult.success) {
                            dataToUpdate.pdfPath = saveResult.path;
                        }
                    }
                } catch (pdfError) {
                    console.warn('⚠️ No se pudo procesar el PDF de la tarjeta:', pdfError);
                    // No fallar la actualización si el PDF falla
                }
            }

            // Actualizar en la base de datos (SYNC - SQLite3)
            const result = this.db.tarjetas.update(
                { _id: tarjetaId },
                dataToUpdate
            );

            if (result.changes === 0) {
                throw new Error('No se pudo actualizar la tarjeta');
            }

            // Obtener la tarjeta actualizada
            const tarjetaActualizada = this.db.tarjetas.findOne({ _id: tarjetaId });

            console.log('✅ Tarjeta actualizada exitosamente:', tarjetaId);
            return {
                success: true,
                tarjeta: tarjetaActualizada,
                message: 'Tarjeta actualizada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar tarjeta:', error);
            return {
                success: false,
                message: error.message || 'Error al actualizar tarjeta',
                error: error
            };
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
            const tarjetaExistente = this.db.tarjetas.findOne({ _id: tarjetaId });
            if (!tarjetaExistente) {
                throw new Error('Tarjeta no encontrada');
            }

            // Eliminar PDF asociado si existe
            if (tarjetaExistente.pdfPath && this.fileHandlers) {
                try {
                    this.fileHandlers.deletePdf(tarjetaExistente.pdfPath);
                } catch (deleteError) {
                    console.warn('⚠️ No se pudo eliminar el PDF de la tarjeta:', deleteError);
                    // No fallar la eliminación si el PDF falla
                }
            }

            // Eliminar la tarjeta (SYNC - SQLite3)
            const result = this.db.tarjetas.remove({ _id: tarjetaId });

            if (result.changes === 0) {
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
            return {
                success: false,
                message: error.message || 'Error al eliminar tarjeta',
                error: error
            };
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
            const tarjetas = this.db.tarjetas.find({ resolucionId: resolucionId });

            // Eliminar PDFs asociados
            if (this.fileHandlers) {
                tarjetas.forEach(tarjeta => {
                    if (tarjeta.pdfPath) {
                        try {
                            this.fileHandlers.deletePdf(tarjeta.pdfPath);
                        } catch (deleteError) {
                            console.warn(`⚠️ No se pudo eliminar PDF de tarjeta ${tarjeta._id}:`, deleteError);
                        }
                    }
                });
            }

            // Eliminar las tarjetas (SYNC - SQLite3)
            const result = this.db.tarjetas.remove({ resolucionId: resolucionId });

            console.log(`✅ ${result.changes} tarjetas eliminadas de la resolución ${resolucionId}`);
            return {
                success: true,
                message: `${result.changes} tarjetas eliminadas exitosamente`,
                count: result.changes
            };

        } catch (error) {
            console.error('❌ Error al eliminar tarjetas de la resolución:', error);
            return {
                success: false,
                message: error.message || 'Error al eliminar tarjetas de la resolución',
                error: error
            };
        }
    }

    /**
     * Validar datos de tarjeta
     * @param {Object} tarjetaData - Datos a validar
     * @throws {Error} Si faltan campos requeridos
     */
    validateTarjetaData(tarjetaData) {
        if (!tarjetaData) {
            throw new Error('No se proporcionaron datos de tarjeta');
        }

        // Al menos debe tener placa o número de tarjeta
        if (!tarjetaData.placa && !tarjetaData.numeroTarjeta) {
            throw new Error('Debe proporcionar al menos la placa o el número de tarjeta');
        }
    }

    /**
     * Construir query de búsqueda (adaptado para SQLite3)
     * @param {Object} filtros - Filtros aplicados
     * @returns {Object} Query para SQLite
     */
    buildQuery(filtros) {
        const query = {};

        // Cambio: expedienteId → resolucionId
        if (filtros.expedienteId) {
            query.resolucionId = filtros.expedienteId;
        }

        if (filtros.resolucionId) {
            query.resolucionId = filtros.resolucionId;
        }

        if (filtros.placa) {
            query.placa = filtros.placa.toUpperCase();
        }

        if (filtros.numeroTarjeta) {
            query.numeroTarjeta = filtros.numeroTarjeta;
        }

        if (filtros.actaEntregaId) {
            query.actaEntregaId = filtros.actaEntregaId;
        }

        return query;
    }

    /**
     * Obtener estadísticas de tarjetas
     * @returns {Object} Estadísticas
     */
    getEstadisticas() {
        try {
            const todasTarjetas = this.db.tarjetas.find({});
            const tarjetasConResolucion = todasTarjetas.filter(t => t.resolucionId);
            const tarjetasSinResolucion = todasTarjetas.filter(t => !t.resolucionId);
            const tarjetasConActaEntrega = todasTarjetas.filter(t => t.actaEntregaId);

            return {
                success: true,
                estadisticas: {
                    total: todasTarjetas.length,
                    conResolucion: tarjetasConResolucion.length,
                    sinResolucion: tarjetasSinResolucion.length,
                    conActaEntrega: tarjetasConActaEntrega.length
                }
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

            const tarjeta = this.db.tarjetas.findOne({ 
                placa: placa.toUpperCase() 
            });

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

            const tarjetas = this.db.tarjetas.find({ 
                actaEntregaId: actaEntregaId 
            });

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
}

module.exports = TarjetaService;
