// app/services/tarjetaService.js
/**
 * Servicio para la gestión de Tarjetas
 * Maneja la lógica de negocio para el CRUD de tarjetas
 */

class TarjetaService {
    constructor(db, fileHandlers = null) {
        this.db = db;
        this.fileHandlers = fileHandlers;
    }

    /**
     * Crear una nueva tarjeta
     * @param {Object} tarjetaData - Datos de la tarjeta
     * @param {string} pdfFilePath - Ruta temporal del archivo PDF (opcional)
     * @returns {Promise<Object>} Tarjeta creada con su ID
     */
    async createTarjeta(tarjetaData, pdfFilePath = null) {
        try {
            // Validación de campos requeridos
            this.validateTarjetaData(tarjetaData);

            // Verificar si ya existe una tarjeta con la misma placa
            if (tarjetaData.placa) {
                const existente = await this.db.tarjetas.findOne({ 
                    placa: tarjetaData.placa.toUpperCase() 
                });
                
                if (existente) {
                    throw new Error(`Ya existe una tarjeta con la placa ${tarjetaData.placa}`);
                }
            }

            // Preparar datos para inserción
            const tarjetaToInsert = {
                ...tarjetaData,
                placa: tarjetaData.placa ? tarjetaData.placa.toUpperCase() : null,
                numeroTarjeta: tarjetaData.numeroTarjeta || null,
                expedienteId: tarjetaData.expedienteId || null,
                pdfPath: null, // Se actualizará después si hay archivo
                fechaCreacion: new Date().toISOString(),
                fechaModificacion: new Date().toISOString()
            };

            // Insertar en la base de datos
            const nuevaTarjeta = await this.db.tarjetas.insert(tarjetaToInsert);

            // Si hay archivo PDF y expedienteId, guardarlo
            if (pdfFilePath && nuevaTarjeta.expedienteId && this.fileHandlers) {
                try {
                    const expediente = await this.db.expedientes.findOne({ 
                        _id: nuevaTarjeta.expedienteId 
                    });

                    if (expediente) {
                        const pdfFileName = `tarjeta-${nuevaTarjeta.placa || nuevaTarjeta._id}.pdf`;
                        const saveResult = await this.fileHandlers.savePdf(pdfFilePath, pdfFileName, {
                            resolutionNumber: expediente.numeroResolucion,
                            expedienteNumero: expediente.expediente
                        });

                        if (saveResult.success) {
                            // Actualizar tarjeta con la ruta del PDF
                            await this.db.tarjetas.update(
                                { _id: nuevaTarjeta._id },
                                { $set: { pdfPath: saveResult.path } },
                                {}
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
     * @returns {Promise<Array>} Lista de tarjetas
     */
    async getTarjetas(filtros = {}) {
        try {
            const query = this.buildQuery(filtros);
            const tarjetas = await this.db.tarjetas.find(query);
            
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
     * @returns {Promise<Object>} Datos de la tarjeta
     */
    async getTarjetaById(tarjetaId) {
        try {
            if (!tarjetaId) {
                throw new Error('ID de tarjeta no proporcionado');
            }

            const tarjeta = await this.db.tarjetas.findOne({ _id: tarjetaId });
            
            if (!tarjeta) {
                throw new Error('Tarjeta no encontrada');
            }

            // Si tiene expediente asociado, obtener sus datos
            if (tarjeta.expedienteId) {
                const expediente = await this.db.expedientes.findOne({ 
                    _id: tarjeta.expedienteId 
                });
                
                return {
                    success: true,
                    tarjeta: {
                        ...tarjeta,
                        expediente: expediente || null
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
     * @returns {Promise<Array>} Lista de tarjetas encontradas
     */
    async searchTarjetas(searchTerm) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return await this.getTarjetas();
            }

            const termUpper = searchTerm.toUpperCase().trim();
            
            // Buscar por placa o número de tarjeta (usando regex para coincidencia parcial)
            const tarjetas = await this.db.tarjetas.find({
                $or: [
                    { placa: new RegExp(termUpper, 'i') },
                    { numeroTarjeta: new RegExp(termUpper, 'i') }
                ]
            });

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
     * Obtener tarjetas asociadas a un expediente
     * @param {string} expedienteId - ID del expediente
     * @returns {Promise<Array>} Lista de tarjetas del expediente
     */
    async getTarjetasByExpediente(expedienteId) {
        try {
            if (!expedienteId) {
                throw new Error('ID de expediente no proporcionado');
            }

            const tarjetas = await this.db.tarjetas.find({ 
                expedienteId: expedienteId 
            });

            console.log(`🎫 Tarjetas del expediente ${expedienteId}: ${tarjetas.length}`);
            
            return {
                success: true,
                tarjetas: tarjetas,
                count: tarjetas.length,
                expedienteId: expedienteId
            };

        } catch (error) {
            console.error('❌ Error al obtener tarjetas del expediente:', error);
            return {
                success: false,
                message: error.message || 'Error al obtener tarjetas del expediente',
                tarjetas: []
            };
        }
    }

    /**
     * Actualizar una tarjeta
     * @param {string} tarjetaId - ID de la tarjeta
     * @param {Object} updateData - Datos a actualizar
     * @param {string} pdfFilePath - Ruta temporal del nuevo archivo PDF (opcional)
     * @returns {Promise<Object>} Resultado de la actualización
     */
    async updateTarjeta(tarjetaId, updateData, pdfFilePath = null) {
        try {
            if (!tarjetaId) {
                throw new Error('ID de tarjeta no proporcionado');
            }

            // Verificar que la tarjeta existe
            const tarjetaExistente = await this.db.tarjetas.findOne({ _id: tarjetaId });
            if (!tarjetaExistente) {
                throw new Error('Tarjeta no encontrada');
            }

            // Si se está actualizando la placa, verificar que no exista otra con la misma
            if (updateData.placa && updateData.placa !== tarjetaExistente.placa) {
                const placaExistente = await this.db.tarjetas.findOne({
                    placa: updateData.placa.toUpperCase(),
                    _id: { $ne: tarjetaId }
                });

                if (placaExistente) {
                    throw new Error(`Ya existe otra tarjeta con la placa ${updateData.placa}`);
                }
            }

            // Preparar datos de actualización
            const dataToUpdate = {
                ...updateData,
                placa: updateData.placa ? updateData.placa.toUpperCase() : tarjetaExistente.placa,
                fechaModificacion: new Date().toISOString()
            };

            // Manejar archivo PDF si se proporciona
            if (pdfFilePath && updateData.expedienteId && this.fileHandlers) {
                try {
                    const expediente = await this.db.expedientes.findOne({ 
                        _id: updateData.expedienteId 
                    });

                    if (expediente) {
                        // Eliminar PDF anterior si existe
                        if (tarjetaExistente.pdfPath) {
                            try {
                                await this.fileHandlers.deletePdf(tarjetaExistente.pdfPath);
                            } catch (deleteError) {
                                console.warn('⚠️ No se pudo eliminar el PDF anterior:', deleteError);
                            }
                        }

                        // Guardar nuevo PDF
                        const pdfFileName = `tarjeta-${dataToUpdate.placa || tarjetaId}.pdf`;
                        const saveResult = await this.fileHandlers.savePdf(pdfFilePath, pdfFileName, {
                            resolutionNumber: expediente.numeroResolucion,
                            expedienteNumero: expediente.expediente
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

            // Actualizar en la base de datos
            const numUpdated = await this.db.tarjetas.update(
                { _id: tarjetaId },
                { $set: dataToUpdate },
                {}
            );

            if (numUpdated === 0) {
                throw new Error('No se pudo actualizar la tarjeta');
            }

            // Obtener la tarjeta actualizada
            const tarjetaActualizada = await this.db.tarjetas.findOne({ _id: tarjetaId });

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
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async deleteTarjeta(tarjetaId) {
        try {
            if (!tarjetaId) {
                throw new Error('ID de tarjeta no proporcionado');
            }

            // Verificar que la tarjeta existe
            const tarjetaExistente = await this.db.tarjetas.findOne({ _id: tarjetaId });
            if (!tarjetaExistente) {
                throw new Error('Tarjeta no encontrada');
            }

            // Eliminar PDF asociado si existe
            if (tarjetaExistente.pdfPath && this.fileHandlers) {
                try {
                    await this.fileHandlers.deletePdf(tarjetaExistente.pdfPath);
                } catch (deleteError) {
                    console.warn('⚠️ No se pudo eliminar el PDF de la tarjeta:', deleteError);
                    // No fallar la eliminación si el PDF falla
                }
            }

            // Eliminar la tarjeta
            const numRemoved = await this.db.tarjetas.remove({ _id: tarjetaId }, {});

            if (numRemoved === 0) {
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
     * Eliminar todas las tarjetas de un expediente
     * @param {string} expedienteId - ID del expediente
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async deleteTarjetasByExpediente(expedienteId) {
        try {
            if (!expedienteId) {
                throw new Error('ID de expediente no proporcionado');
            }

            const numRemoved = await this.db.tarjetas.remove(
                { expedienteId: expedienteId },
                { multi: true }
            );

            console.log(`✅ ${numRemoved} tarjetas eliminadas del expediente ${expedienteId}`);
            return {
                success: true,
                message: `${numRemoved} tarjetas eliminadas exitosamente`,
                count: numRemoved
            };

        } catch (error) {
            console.error('❌ Error al eliminar tarjetas del expediente:', error);
            return {
                success: false,
                message: error.message || 'Error al eliminar tarjetas del expediente',
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
     * Construir query de búsqueda
     * @param {Object} filtros - Filtros aplicados
     * @returns {Object} Query para NeDB
     */
    buildQuery(filtros) {
        const query = {};

        if (filtros.expedienteId) {
            query.expedienteId = filtros.expedienteId;
        }

        if (filtros.placa) {
            query.placa = new RegExp(filtros.placa.toUpperCase(), 'i');
        }

        if (filtros.numeroTarjeta) {
            query.numeroTarjeta = new RegExp(filtros.numeroTarjeta, 'i');
        }

        return query;
    }

    /**
     * Obtener estadísticas de tarjetas
     * @returns {Promise<Object>} Estadísticas
     */
    async getEstadisticas() {
        try {
            const todasTarjetas = await this.db.tarjetas.find({});
            const tarjetasConExpediente = todasTarjetas.filter(t => t.expedienteId);
            const tarjetasSinExpediente = todasTarjetas.filter(t => !t.expedienteId);

            return {
                success: true,
                estadisticas: {
                    total: todasTarjetas.length,
                    conExpediente: tarjetasConExpediente.length,
                    sinExpediente: tarjetasSinExpediente.length
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
}

module.exports = TarjetaService;
