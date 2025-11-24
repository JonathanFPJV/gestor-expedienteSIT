// app/services/expedienteService/tarjetaManager.js
/**
 * Gestor de Tarjetas para Expedientes
 * Maneja la creación y gestión de tarjetas asociadas a expedientes
 */

const { buildTarjetaFileName } = require('./utils');

/**
 * Crear módulo de gestión de tarjetas
 * @param {Database} db - Instancia de base de datos
 * @param {Object} fileHandlers - Manejador de archivos
 * @returns {Object} Métodos para gestionar tarjetas
 */
module.exports = function createTarjetaManager(db, fileHandlers) {
    return {
        /**
         * Guardar tarjetas para un expediente (resolución)
         * @param {Object} expediente - Expediente al que pertenecen las tarjetas
         * @param {Array} tarjetas - Array de tarjetas a guardar
         * @param {number} actaEntregaId - ID del acta de entrega (opcional)
         * @param {Object} options - Opciones adicionales
         * @returns {Promise<Array>} Tarjetas guardadas
         */
        async saveTarjetasParaExpediente(expediente, tarjetas, actaEntregaId = null, options = {}) {
            if (!Array.isArray(tarjetas) || tarjetas.length === 0) {
                console.log('⚠️ No hay tarjetas para guardar');
                return [];
            }

            const { replaceExisting = false } = options;
            const resolucionId = expediente._id;

            if (replaceExisting) {
                db.tarjetas.remove({ resolucionId });
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
                if (tarjetaData.pdfSourcePath && fileHandlers) {
                    console.log('💾 Guardando PDF de tarjeta:', tarjetaData.pdfSourcePath);
                    const fileName = tarjetaData.pdfPath || buildTarjetaFileName(tarjetaData);
                    
                    try {
                        const saveResult = await fileHandlers.savePdf(
                            tarjetaData.pdfSourcePath,
                            fileName,
                            {
                                resolutionNumber: expediente.numeroResolucion,
                                expedienteNumero: expediente.numeroExpediente
                            }
                        );
                        console.log('✅ PDF guardado en:', saveResult.path);
                        tarjetaData.pdfPath = saveResult.path;
                    } catch (error) {
                        console.warn('⚠️ No se pudo guardar PDF de tarjeta:', error);
                    }
                    
                    delete tarjetaData.pdfSourcePath;
                } else {
                    console.warn('⚠️ Tarjeta sin PDF:', tarjetaData.placa);
                }

                // Preparar datos para TarjetasVehiculos
                const tarjetaToInsert = {
                    placa: tarjetaData.placa ? tarjetaData.placa.toUpperCase() : null,
                    numeroTarjeta: tarjetaData.numeroTarjeta || tarjetaData.tarjeta || null,
                    estado: tarjetaData.estado || 'ACTIVA',
                    pdfPath: tarjetaData.pdfPath || null,
                    resolucionId: resolucionId,
                    actaEntregaId: actaEntregaId || tarjetaData.actaEntregaId || null
                };
                
                console.log('💾 Insertando tarjeta en BD:', {
                    placa: tarjetaToInsert.placa,
                    numeroTarjeta: tarjetaToInsert.numeroTarjeta,
                    estado: tarjetaToInsert.estado,
                    pdfPath: tarjetaToInsert.pdfPath || '❌ NULL',
                    resolucionId: tarjetaToInsert.resolucionId,
                    actaEntregaId: tarjetaToInsert.actaEntregaId || '❌ NULL'
                });

                // Insertar tarjeta
                const savedTarjeta = db.tarjetas.insert(tarjetaToInsert);
                console.log('✅ Tarjeta guardada con ID:', savedTarjeta._id, '| pdfPath:', savedTarjeta.pdfPath || '❌ NULL');
                tarjetasGuardadas.push(savedTarjeta);
            }

            console.log(`✅ ${tarjetasGuardadas.length} tarjetas guardadas para resolución ${resolucionId}`);
            return tarjetasGuardadas;
        },

        /**
         * Obtener tarjetas de un expediente
         * @param {number} expedienteId - ID del expediente
         * @returns {Array} Tarjetas asociadas
         */
        getTarjetasByExpediente(expedienteId) {
            return db.tarjetas.find({ resolucionId: expedienteId });
        },

        /**
         * Eliminar tarjetas de un expediente
         * @param {number} expedienteId - ID del expediente
         * @returns {number} Cantidad eliminada
         */
        deleteTarjetasByExpediente(expedienteId) {
            const result = db.tarjetas.remove({ resolucionId: expedienteId });
            const changes = typeof result === 'number' ? result : (result.changes || 0);
            
            console.log(`✅ ${changes} tarjetas eliminadas de expediente ${expedienteId}`);
            return changes;
        }
    };
};
