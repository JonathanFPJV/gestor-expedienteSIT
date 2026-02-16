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
                console.log('No hay tarjetas para guardar');
                return [];
            }

            const { replaceExisting = false } = options;
            const resolucionId = expediente._id;

            if (replaceExisting) {
                db.tarjetas.remove({ resolucionId });
            }

            console.log(`Iniciando guardado de ${tarjetas.length} tarjetas...`);
            const tarjetasGuardadas = [];
            const errores = [];

            // 🚀 Procesar en lotes de 10 para evitar sobrecarga
            const BATCH_SIZE = 10;
            for (let i = 0; i < tarjetas.length; i += BATCH_SIZE) {
                const batch = tarjetas.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(tarjetas.length / BATCH_SIZE);

                console.log(`\nProcesando lote ${batchNumber}/${totalBatches} (${batch.length} tarjetas)...`);

                // Procesar lote en paralelo con Promise.allSettled (no falla si una tarjeta falla)
                const batchPromises = batch.map(async (tarjeta, indexInBatch) => {
                    const globalIndex = i + indexInBatch + 1;
                    const tarjetaData = { ...tarjeta };

                    try {
                        console.log(`  [${globalIndex}/${tarjetas.length}] Procesando: ${tarjetaData.placa || 'sin-placa'}`);

                        delete tarjetaData.selectedPdfPath;

                        // Manejo de PDF de la tarjeta individual
                        if (tarjetaData.pdfSourcePath && fileHandlers) {
                            // 🆕 PDF NUEVO: Usuario seleccionó un archivo del sistema
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
                                tarjetaData.pdfPath = saveResult.path;
                                console.log(`  [${globalIndex}/${tarjetas.length}] PDF guardado (nuevo): ${tarjetaData.pdfPath}`);
                            } catch (pdfError) {
                                console.error(`  [${globalIndex}/${tarjetas.length}] Error guardando PDF:`, pdfError.message);
                                errores.push({
                                    tarjeta: tarjetaData.placa || 'sin-placa',
                                    error: `Error guardando PDF: ${pdfError.message}`
                                });
                                // Continuar sin PDF
                            }

                            delete tarjetaData.pdfSourcePath;
                        } else if (tarjetaData.pdfPath) {
                            // 📎 PDF EXISTENTE: Mantener la referencia de BD (ruta relativa)
                            console.log(`  [${globalIndex}/${tarjetas.length}] Manteniendo PDF existente: ${tarjetaData.pdfPath}`);
                            // No hacemos nada, pdfPath ya tiene el valor correcto
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

                        // Insertar tarjeta en BD
                        const savedTarjeta = db.tarjetas.insert(tarjetaToInsert);
                        console.log(`  [${globalIndex}/${tarjetas.length}] Guardada en BD (ID: ${savedTarjeta._id})`);

                        return { success: true, tarjeta: savedTarjeta };

                    } catch (error) {
                        console.error(`  [${globalIndex}/${tarjetas.length}] Error total:`, error.message);
                        errores.push({
                            tarjeta: tarjetaData.placa || 'sin-placa',
                            error: error.message
                        });
                        return { success: false, error: error.message };
                    }
                });

                // Esperar que el lote complete
                const batchResults = await Promise.allSettled(batchPromises);

                // Recolectar tarjetas exitosas
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value.success) {
                        tarjetasGuardadas.push(result.value.tarjeta);
                    }
                });

                console.log(`Lote ${batchNumber}/${totalBatches} completado (${tarjetasGuardadas.length} exitosas hasta ahora)`);

                // Pequeña pausa entre lotes para evitar saturar el I/O
                if (i + BATCH_SIZE < tarjetas.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Resumen final
            console.log(`\n${'='.repeat(60)}`);
            console.log(`GUARDADO COMPLETADO: ${tarjetasGuardadas.length}/${tarjetas.length} tarjetas`);
            if (errores.length > 0) {
                console.log(`${errores.length} errores encontrados:`);
                errores.forEach((e, idx) => {
                    console.log(`   ${idx + 1}. ${e.tarjeta}: ${e.error}`);
                });
            }
            console.log(`${'='.repeat(60)}\n`);

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

            console.log(`${changes} tarjetas eliminadas de expediente ${expedienteId}`);
            return changes;
        }
    };
};
