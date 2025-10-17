// app/services/expedienteService.js
/**
 * Servicio para la gestión de Expedientes (Actas de Resolución)
 * Maneja la lógica de negocio para el CRUD de expedientes y sus tarjetas asociadas
 * MIGRADO A SQLITE3 - Operaciones síncronas
 */

class ExpedienteService {
    constructor(db, fileHandlers) {
        this.db = db;
        this.fileHandlers = fileHandlers;
    }

    /**
     * Crear un nuevo expediente (Acta de Resolución) con sus tarjetas
     * @param {Object} rawData - Datos del expediente
     * @returns {Object} Expediente creado con sus tarjetas
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
            const fileName = expedienteData.pdfPath || `resolucion-${Date.now()}.pdf`;
            const saveResult = await this.fileHandlers.savePdf(
                expedienteData.pdfSourcePath,
                fileName,
                {
                    resolutionNumber: expedienteData.numeroResolucion,
                    expedienteNumero: expedienteData.numeroExpediente
                }
            );
            // Cambio: pdfPath → pdfPathActa
            expedienteData.pdfPathActa = saveResult.path;
            delete expedienteData.pdfSourcePath;
        }

        // Preparar datos para inserción en ActasResolucion
        const actaData = {
            // Cambio: expediente → numeroExpediente
            numeroExpediente: expedienteData.expediente || expedienteData.numeroExpediente || this.buildExpedienteLabel(expedienteData),
            anioExpediente: expedienteData.anioExpediente || new Date().getFullYear(),
            numeroResolucion: expedienteData.numeroResolucion || null,
            // Cambio: fecha → fechaExpediente
            fechaExpediente: expedienteData.fecha || expedienteData.fechaExpediente || new Date().toISOString().split('T')[0],
            unidadNegocio: expedienteData.unidadNegocio || null,
            nombreEmpresa: expedienteData.nombreEmpresa || null,
            numeroFichero: expedienteData.numeroFichero || null,
            observaciones: expedienteData.observaciones || null,
            pdfPathActa: expedienteData.pdfPathActa || null,
            informeTecnico: expedienteData.informeTecnico || null
        };

        // Insertar en ActasResolucion (SYNC - SQLite3)
        const newExpediente = this.db.expedientes.insert(actaData);

        // Crear acta de entrega si se proporcionó
        let actaEntregaId = null;
        if (actaEntregaData) {
            console.log('📋 Procesando Acta de Entrega...');
            
            // Guardar PDF del acta de entrega si existe (en la misma carpeta que la resolución)
            if (actaEntregaData.pdfSourcePath && this.fileHandlers) {
                const fileName = `acta-entrega-${Date.now()}.pdf`;
                const saveResult = await this.fileHandlers.savePdf(
                    actaEntregaData.pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: newExpediente.numeroResolucion,
                        expedienteNumero: newExpediente.numeroExpediente
                    }
                );
                
                if (saveResult.success) {
                    actaEntregaData.pdfPathEntrega = saveResult.path;
                    console.log('✅ PDF del Acta de Entrega guardado en:', saveResult.path);
                    delete actaEntregaData.pdfSourcePath;
                }
            }

            // Insertar acta de entrega
            const newActaEntrega = this.db.actasEntrega.insert({
                fechaEntrega: actaEntregaData.fechaEntrega,
                n_tarjetas_entregadas: actaEntregaData.n_tarjetas_entregadas || tarjetas.length,
                pdfPathEntrega: actaEntregaData.pdfPathEntrega || null,
                observaciones: actaEntregaData.observaciones || null
            });
            
            actaEntregaId = newActaEntrega._id;
            console.log('✅ Acta de Entrega creada:', actaEntregaId);
        }

        // Guardar tarjetas asociadas (usando resolucionId y actaEntregaId)
        const tarjetasGuardadas = await this.saveTarjetasParaExpediente(newExpediente, tarjetas, actaEntregaId);

        console.log('✅ Acta de Resolución creada:', newExpediente._id);
        return {
            success: true,
            message: 'Expediente y tarjetas guardados exitosamente.',
            expediente: newExpediente,
            tarjetas: tarjetasGuardadas,
            actaEntregaId: actaEntregaId
        };
    }

    /**
     * Actualizar un expediente existente y sus tarjetas
     * @param {string|number} expedienteId - ID del expediente (resolución)
     * @param {Object} rawData - Datos actualizados
     * @returns {Object} Expediente actualizado
     */
    async updateExpediente(expedienteId, rawData = {}) {
        console.log(`🔄 updateExpediente llamado con ID: "${expedienteId}" (tipo: ${typeof expedienteId})`);
        
        // Convertir a número si viene como string (desde URL params)
        const numericId = typeof expedienteId === 'string' ? parseInt(expedienteId, 10) : expedienteId;
        console.log(`🔄 ID convertido a número: ${numericId} (tipo: ${typeof numericId})`);
        
        // Verificar que el expediente existe
        const expedienteExistente = this.db.expedientes.findOne({ _id: numericId });
        console.log(`🔎 Resultado de búsqueda:`, expedienteExistente ? `✅ Encontrado: ${expedienteExistente.numeroExpediente}` : '❌ NO encontrado');
        
        if (!expedienteExistente) {
            throw new Error('Expediente no encontrado');
        }

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
                try {
                    await this.fileHandlers.deletePdf(expedienteExistente.pdfPathActa);
                    console.log('✅ PDF antiguo del expediente eliminado:', expedienteExistente.pdfPathActa);
                } catch (error) {
                    console.warn('⚠️ No se pudo eliminar PDF antiguo:', expedienteExistente.pdfPathActa, error.message);
                }
            }

            // Guardar nuevo PDF
            const fileName = expedienteData.pdfPath || `resolucion-${Date.now()}.pdf`;
            const saveResult = await this.fileHandlers.savePdf(
                expedienteData.pdfSourcePath,
                fileName,
                {
                    resolutionNumber: numeroResolucion,
                    expedienteNumero: numeroExpediente
                }
            );
            expedienteData.pdfPathActa = saveResult.path;
            delete expedienteData.pdfSourcePath;
        }

        // Preparar datos para actualización
        const updateData = {};
        
        if (expedienteData.numeroExpediente !== undefined) {
            updateData.numeroExpediente = expedienteData.numeroExpediente;
        } else if (expedienteData.expediente !== undefined) {
            updateData.numeroExpediente = expedienteData.expediente;
        }
        
        if (expedienteData.anioExpediente !== undefined) {
            updateData.anioExpediente = expedienteData.anioExpediente;
        }
        
        if (expedienteData.numeroResolucion !== undefined) {
            updateData.numeroResolucion = expedienteData.numeroResolucion;
        }
        
        if (expedienteData.fecha !== undefined) {
            updateData.fechaExpediente = expedienteData.fecha;
        } else if (expedienteData.fechaExpediente !== undefined) {
            updateData.fechaExpediente = expedienteData.fechaExpediente;
        }
        
        if (expedienteData.unidadNegocio !== undefined) {
            updateData.unidadNegocio = expedienteData.unidadNegocio;
        }
        
        if (expedienteData.nombreEmpresa !== undefined) {
            updateData.nombreEmpresa = expedienteData.nombreEmpresa;
        }
        
        if (expedienteData.numeroFichero !== undefined) {
            updateData.numeroFichero = expedienteData.numeroFichero;
        }
        
        if (expedienteData.observaciones !== undefined) {
            updateData.observaciones = expedienteData.observaciones;
        }
        
        if (expedienteData.pdfPathActa !== undefined) {
            updateData.pdfPathActa = expedienteData.pdfPathActa;
        }
        
        if (expedienteData.informeTecnico !== undefined) {
            updateData.informeTecnico = expedienteData.informeTecnico;
        }

        // Actualizar en la base de datos (SYNC - SQLite3)
        const result = this.db.expedientes.update(
            { _id: numericId },
            updateData
        );

        // Manejar tanto número como objeto { changes: n }
        const changesCount = typeof result === 'number' ? result : (result.changes || 0);
        
        if (changesCount === 0) {
            throw new Error('No se pudo actualizar el expediente');
        }

        // Obtener expediente actualizado
        const expedienteActualizado = this.db.expedientes.findOne({ _id: numericId });

        // Manejar tarjetas si se proporcionaron
        let tarjetasGuardadas = [];
        if (tarjetasProvided) {
            // Eliminar tarjetas anteriores (CASCADE ya no aplica aquí, lo hacemos manual)
            this.db.tarjetas.remove({ resolucionId: numericId });
            
            if (tarjetas.length > 0) {
                tarjetasGuardadas = await this.saveTarjetasParaExpediente(expedienteActualizado, tarjetas);
            }
        }

        console.log('✅ Acta de Resolución actualizada:', expedienteId);
        return {
            success: true,
            message: 'Expediente actualizado exitosamente.',
            expediente: expedienteActualizado,
            tarjetas: tarjetasGuardadas
        };
    }

    /**
     * Eliminar un expediente con todas sus tarjetas y archivos asociados (eliminación en cascada)
     * @param {string|number} expedienteId - ID del expediente a eliminar
     * @returns {Object} Resultado de la eliminación con resumen
     */
    async deleteExpediente(expedienteId) {
        console.log(`🗑️ deleteExpediente llamado con ID: "${expedienteId}" (tipo: ${typeof expedienteId})`);
        
        // Convertir a número si viene como string
        const numericId = typeof expedienteId === 'string' ? parseInt(expedienteId, 10) : expedienteId;
        console.log(`🔄 ID convertido a número: ${numericId} (tipo: ${typeof numericId})`);
        
        const startTime = Date.now();
        const summary = {
            expediente: null,
            empresa: null,
            tarjetasEliminadas: 0,
            archivosEliminados: 0,
            warnings: 0,
            duration: 0
        };

        try {
            console.log('🗑️ Iniciando eliminación en cascada para expediente:', numericId);

            // 1. Obtener expediente
            const expediente = this.db.expedientes.findOne({ _id: numericId });
            console.log(`🔎 Resultado de búsqueda:`, expediente ? `✅ Encontrado: ${expediente.numeroExpediente}` : '❌ NO encontrado');
            
            if (!expediente) {
                throw new Error('Expediente no encontrado');
            }

            summary.expediente = expediente.numeroExpediente;
            summary.empresa = expediente.nombreEmpresa || 'Sin empresa';

            console.log('📋 Expediente a eliminar:', {
                id: numericId,
                numero: expediente.numeroExpediente,
                resolucion: expediente.numeroResolucion
            });

            // 2. Obtener todas las tarjetas asociadas
            const tarjetas = this.db.tarjetas.find({ resolucionId: numericId });
            console.log(`🎫 Tarjetas asociadas encontradas: ${tarjetas.length}`);

            // 3. Eliminar PDFs de todas las tarjetas
            for (const tarjeta of tarjetas) {
                if (tarjeta.pdfPath) {
                    try {
                        await this.fileHandlers.deletePdf(tarjeta.pdfPath);
                        summary.archivosEliminados++;
                        console.log('✅ PDF de tarjeta eliminado:', tarjeta.pdfPath);
                    } catch (error) {
                        console.warn('⚠️ No se pudo eliminar PDF de tarjeta:', tarjeta.pdfPath, error.message);
                        summary.warnings++;
                    }
                }
            }

            // 4. Eliminar PDF del expediente (acta de resolución)
            if (expediente.pdfPathActa) {
                try {
                    await this.fileHandlers.deletePdf(expediente.pdfPathActa);
                    summary.archivosEliminados++;
                    console.log('✅ PDF del expediente eliminado:', expediente.pdfPathActa);
                } catch (error) {
                    console.warn('⚠️ No se pudo eliminar PDF del expediente:', expediente.pdfPathActa, error.message);
                    summary.warnings++;
                }
            }

            // 5. Eliminar todas las tarjetas de la base de datos
            const resultTarjetas = this.db.tarjetas.remove({ resolucionId: numericId });
            // Manejar tanto número como objeto
            summary.tarjetasEliminadas = typeof resultTarjetas === 'number' ? resultTarjetas : (resultTarjetas.changes || tarjetas.length);
            console.log(`✅ ${summary.tarjetasEliminadas} tarjetas eliminadas de la BD`);

            // 6. Eliminar el expediente de la base de datos
            const resultExpediente = this.db.expedientes.remove({ _id: numericId });
            // Manejar tanto número como objeto
            const expedienteChanges = typeof resultExpediente === 'number' ? resultExpediente : (resultExpediente.changes || 0);
            if (expedienteChanges === 0) {
                throw new Error('No se pudo eliminar el expediente de la base de datos');
            }
            console.log('✅ Expediente eliminado de la BD');

            // 7. Calcular duración
            summary.duration = Date.now() - startTime;

            console.log('✅ Eliminación en cascada completada:', summary);
            return {
                success: true,
                message: 'Expediente y todas sus dependencias eliminados correctamente',
                summary
            };

        } catch (error) {
            summary.duration = Date.now() - startTime;
            console.error('❌ Error en eliminación en cascada:', error);
            throw {
                success: false,
                message: error.message || 'Error al eliminar expediente',
                summary,
                error: error.message
            };
        }
    }

    /**
     * Obtener detalle completo de un expediente con sus tarjetas
     * @param {string|number} expedienteId - ID del expediente
     * @returns {Object} Expediente con tarjetas asociadas
     */
    getExpedienteDetalle(expedienteId) {
        console.log(`🔍 getExpedienteDetalle llamado con ID: "${expedienteId}" (tipo: ${typeof expedienteId})`);
        
        // Convertir a número si viene como string (desde URL params)
        const numericId = typeof expedienteId === 'string' ? parseInt(expedienteId, 10) : expedienteId;
        console.log(`🔄 ID convertido a número: ${numericId} (tipo: ${typeof numericId})`);
        
        // DEBUG: Ver TODOS los expedientes en la BD
        const todosExpedientes = this.db.expedientes.find({});
        console.log('🗄️ TODOS los expedientes en BD:', todosExpedientes.map(e => ({ _id: e._id, tipo: typeof e._id, numeroExpediente: e.numeroExpediente })));
        
        const expediente = this.db.expedientes.findOne({ _id: numericId });
        console.log(`🔎 Resultado de búsqueda con _id=${numericId}:`, expediente ? `✅ Encontrado: ${expediente.numeroExpediente}` : '❌ NO encontrado');
        
        if (!expediente) {
            throw new Error('Expediente no encontrado');
        }

        // Obtener tarjetas asociadas por resolucionId
        const tarjetas = this.db.tarjetas.find({ resolucionId: numericId });

        console.log(`📋 Detalle de expediente ${numericId}: ${tarjetas.length} tarjetas`);
        return {
            success: true,
            expediente,
            tarjetas
        };
    }

    /**
     * Construir etiqueta de expediente (formato: numeroExpediente-año)
     * @param {Object} param0 - numeroExpediente y anioExpediente
     * @returns {string} Etiqueta formateada
     */
    buildExpedienteLabel({ numeroExpediente, anioExpediente }) {
        if (!numeroExpediente && !anioExpediente) return null;
        const numero = numeroExpediente || 'sin-numero';
        const anio = anioExpediente || new Date().getFullYear();
        return `${numero}-${anio}`;
    }

    /**
     * Guardar tarjetas para un expediente (resolución)
     * @param {Object} expediente - Expediente al que pertenecen las tarjetas
     * @param {Array} tarjetas - Array de tarjetas a guardar
     * @param {Object} options - Opciones adicionales
     * @returns {Array} Tarjetas guardadas
     */
    async saveTarjetasParaExpediente(expediente, tarjetas, actaEntregaId = null, options = {}) {
        if (!Array.isArray(tarjetas) || tarjetas.length === 0) {
            console.log('⚠️  No hay tarjetas para guardar');
            return [];
        }

        const { replaceExisting = false } = options;
        const resolucionId = expediente._id;

        if (replaceExisting) {
            this.db.tarjetas.remove({ resolucionId });
        }

        const tarjetasGuardadas = [];
        for (const tarjeta of tarjetas) {
            const tarjetaData = { ...tarjeta };
            console.log('📥 Procesando tarjeta:', {
                placa: tarjetaData.placa,
                numeroTarjeta: tarjetaData.numeroTarjeta,
                pdfSourcePath: tarjetaData.pdfSourcePath ? 'SÍ TIENE' : '❌ NO TIENE'
            });
            
            delete tarjetaData.selectedPdfPath;

            // Manejo de PDF de la tarjeta individual
            if (tarjetaData.pdfSourcePath) {
                console.log('💾 Guardando PDF de tarjeta:', tarjetaData.pdfSourcePath);
                const fileName = tarjetaData.pdfPath || this.buildTarjetaFileName(tarjetaData);
                const saveResult = await this.fileHandlers.savePdf(
                    tarjetaData.pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expediente.numeroResolucion,
                        expedienteNumero: expediente.numeroExpediente
                    }
                );
                console.log('✅ PDF guardado en:', saveResult.path);
                tarjetaData.pdfPath = saveResult.path;
                delete tarjetaData.pdfSourcePath;
            } else {
                console.warn('⚠️  Tarjeta sin PDF:', tarjetaData.placa);
            }

            // Preparar datos para TarjetasVehiculos
            const tarjetaToInsert = {
                placa: tarjetaData.placa ? tarjetaData.placa.toUpperCase() : null,
                numeroTarjeta: tarjetaData.numeroTarjeta || tarjetaData.tarjeta || null,
                pdfPath: tarjetaData.pdfPath || null,
                resolucionId: resolucionId, // Cambio: expedienteId → resolucionId
                actaEntregaId: actaEntregaId || tarjetaData.actaEntregaId || null // ✅ Asignar actaEntregaId
            };
            
            console.log('💾 Insertando tarjeta en BD:', {
                placa: tarjetaToInsert.placa,
                numeroTarjeta: tarjetaToInsert.numeroTarjeta,
                pdfPath: tarjetaToInsert.pdfPath || '❌ NULL',
                resolucionId: tarjetaToInsert.resolucionId,
                actaEntregaId: tarjetaToInsert.actaEntregaId || '❌ NULL'
            });

            // Insertar tarjeta (SYNC - SQLite3)
            const savedTarjeta = this.db.tarjetas.insert(tarjetaToInsert);
            console.log('✅ Tarjeta guardada con ID:', savedTarjeta._id, '| pdfPath:', savedTarjeta.pdfPath || '❌ NULL');
            tarjetasGuardadas.push(savedTarjeta);
        }

        console.log(`✅ ${tarjetasGuardadas.length} tarjetas guardadas para resolución ${resolucionId}`);
        return tarjetasGuardadas;
    }

    /**
     * Construir nombre de archivo para PDF de tarjeta
     * @param {Object} tarjetaData - Datos de la tarjeta
     * @returns {string} Nombre de archivo
     */
    buildTarjetaFileName(tarjetaData = {}) {
        const placa = (tarjetaData.placa || 'sin-placa').replace(/\s+/g, '-');
        const tarjetaNumero = (tarjetaData.tarjeta || tarjetaData.numeroTarjeta || 'sin-numero').replace(/\s+/g, '-');
        const timestamp = Date.now();
        return `tarjeta-${placa}-${tarjetaNumero}-${timestamp}.pdf`;
    }

    /**
     * Obtener todos los expedientes
     * @param {Object} filtros - Filtros de búsqueda opcionales
     * @returns {Array} Lista de expedientes
     */
    getAllExpedientes(filtros = {}) {
        try {
            const query = this.buildExpedienteQuery(filtros);
            const expedientes = this.db.expedientes.find(query);
            
            console.log(`📊 Expedientes obtenidos: ${expedientes.length}`);
            return expedientes;
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
            if (!searchTerm || searchTerm.trim() === '') {
                return this.getAllExpedientes();
            }

            const term = searchTerm.toUpperCase().trim();
            
            // Buscar en múltiples campos
            const expedientes = this.db.expedientes.find({})
                .filter(exp => 
                    (exp.numeroExpediente && exp.numeroExpediente.toUpperCase().includes(term)) ||
                    (exp.numeroResolucion && exp.numeroResolucion.toUpperCase().includes(term)) ||
                    (exp.nombreEmpresa && exp.nombreEmpresa.toUpperCase().includes(term))
                );

            console.log(`🔍 Búsqueda "${searchTerm}": ${expedientes.length} resultados`);
            return expedientes;
        } catch (error) {
            console.error('❌ Error en búsqueda de expedientes:', error);
            throw error;
        }
    }

    /**
     * Construir query de búsqueda
     * @param {Object} filtros - Filtros a aplicar
     * @returns {Object} Query para SQLite
     */
    buildExpedienteQuery(filtros) {
        const query = {};

        if (filtros.anioExpediente) {
            query.anioExpediente = filtros.anioExpediente;
        }

        if (filtros.unidadNegocio) {
            query.unidadNegocio = filtros.unidadNegocio;
        }

        if (filtros.numeroResolucion) {
            query.numeroResolucion = filtros.numeroResolucion;
        }

        return query;
    }
}

module.exports = ExpedienteService;
