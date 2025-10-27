// app/services/actaEntregaService.js
/**
 * Servicio para gestión de Actas de Entrega
 * Maneja operaciones CRUD y relaciones con tarjetas usando SQLite3
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class ActaEntregaService {
    constructor(db, fileHandlers = null) {
        this.db = db;
        this.fileHandlers = fileHandlers;
        
        // Debug: Verificar que db es válido
        if (!db) {
            console.error('❌ ActaEntregaService: db es null o undefined');
        } else if (typeof db.prepare !== 'function') {
            console.error('❌ ActaEntregaService: db no tiene método prepare');
            console.error('❌ Tipo de db:', typeof db);
            console.error('❌ Propiedades de db:', Object.keys(db));
        } else {
            console.log('✅ ActaEntregaService inicializado con db válido');
        }
    }

    /**
     * Crear nueva Acta de Entrega
     * @param {Object} actaData - Datos del acta
     * @param {Array} tarjetasIds - IDs de tarjetas a asociar
     * @returns {Object} Resultado de la operación
     */
    createActaEntrega(actaData, tarjetasIds = []) {
        console.log('📝 Creando acta de entrega:', actaData);
        
        const transaction = this.db.transaction(() => {
            try {
                // 1. Insertar acta de entrega
                const insertActa = this.db.prepare(`
                    INSERT INTO ActasEntrega (
                        n_tarjetas_entregadas,
                        fechaEntrega,
                        pdfPathEntrega,
                        observaciones
                    ) VALUES (?, ?, ?, ?)
                `);

                const result = insertActa.run(
                    actaData.n_tarjetas_entregadas || tarjetasIds.length,
                    actaData.fechaEntrega,
                    null, // Se actualizará después de copiar el PDF
                    actaData.observaciones || null
                );

                const actaId = result.lastInsertRowid;
                console.log('✅ Acta creada con ID:', actaId);

                // 2. Copiar PDF si existe
                let finalPdfPath = null;
                if (actaData.pdfSourcePath && fs.existsSync(actaData.pdfSourcePath)) {
                    finalPdfPath = this._copyPdfFile(actaData.pdfSourcePath, actaId);
                    
                    // Actualizar ruta del PDF
                    const updatePdf = this.db.prepare(`
                        UPDATE ActasEntrega 
                        SET pdfPathEntrega = ?
                        WHERE _id = ?
                    `);
                    updatePdf.run(finalPdfPath, actaId);
                }

                // 3. Asociar tarjetas al acta
                if (tarjetasIds && tarjetasIds.length > 0) {
                    const updateTarjeta = this.db.prepare(`
                        UPDATE TarjetasVehiculos 
                        SET actaEntregaId = ?,
                            fechaModificacion = CURRENT_TIMESTAMP
                        WHERE _id = ?
                    `);

                    for (const tarjetaId of tarjetasIds) {
                        updateTarjeta.run(actaId, tarjetaId);
                    }
                    console.log(`✅ ${tarjetasIds.length} tarjetas asociadas al acta`);
                }

                // 4. Obtener acta completa
                const actaCompleta = this.getActaEntregaById(actaId);

                return {
                    success: true,
                    message: 'Acta de entrega creada exitosamente',
                    acta: actaCompleta
                };

            } catch (error) {
                console.error('❌ Error al crear acta:', error);
                throw error;
            }
        });

        return transaction();
    }

    /**
     * Obtener acta de entrega por ID con sus tarjetas asociadas
     */
    getActaEntregaById(actaId) {
        console.log('🔍 Obteniendo acta ID:', actaId);

        const acta = this.db.prepare(`
            SELECT * FROM ActasEntrega WHERE _id = ?
        `).get(actaId);

        if (!acta) {
            throw new Error(`Acta de entrega ${actaId} no encontrada`);
        }

        // Obtener tarjetas asociadas
        const tarjetas = this.db.prepare(`
            SELECT 
                t._id,
                t.placa,
                t.numeroTarjeta,
                t.pdfPath,
                t.resolucionId,
                ar.numeroExpediente,
                ar.anioExpediente,
                ar.nombreEmpresa
            FROM TarjetasVehiculos t
            LEFT JOIN ActasResolucion ar ON t.resolucionId = ar._id
            WHERE t.actaEntregaId = ?
            ORDER BY t.placa
        `).all(actaId);

        return {
            ...acta,
            tarjetas: tarjetas
        };
    }

    /**
     * Obtener todas las actas de entrega
     */
    getAllActasEntrega(filtros = {}) {
        console.log('📋 Obteniendo todas las actas de entrega');

        let query = `
            SELECT 
                ae.*,
                COUNT(t._id) as cantidadTarjetas
            FROM ActasEntrega ae
            LEFT JOIN TarjetasVehiculos t ON t.actaEntregaId = ae._id
        `;

        const conditions = [];
        const params = [];

        if (filtros.fechaDesde) {
            conditions.push('ae.fechaEntrega >= ?');
            params.push(filtros.fechaDesde);
        }

        if (filtros.fechaHasta) {
            conditions.push('ae.fechaEntrega <= ?');
            params.push(filtros.fechaHasta);
        }

        if (filtros.anio) {
            conditions.push('strftime("%Y", ae.fechaEntrega) = ?');
            params.push(filtros.anio.toString());
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY ae._id ORDER BY ae.fechaEntrega DESC';

        const actas = this.db.prepare(query).all(...params);

        console.log(`✅ ${actas.length} actas encontradas`);
        return actas;
    }

    /**
     * Actualizar acta de entrega
     */
    updateActaEntrega(actaId, actaData, tarjetasIds = null) {
        console.log('📝 Actualizando acta ID:', actaId);

        const transaction = this.db.transaction(() => {
            try {
                const actaExistente = this.db.prepare(
                    'SELECT * FROM ActasEntrega WHERE _id = ?'
                ).get(actaId);

                if (!actaExistente) {
                    throw new Error(`Acta ${actaId} no encontrada`);
                }

                // Actualizar campos
                const updateActa = this.db.prepare(`
                    UPDATE ActasEntrega
                    SET n_tarjetas_entregadas = ?,
                        fechaEntrega = ?,
                        observaciones = ?,
                        fechaModificacion = CURRENT_TIMESTAMP
                    WHERE _id = ?
                `);

                updateActa.run(
                    actaData.n_tarjetas_entregadas || actaExistente.n_tarjetas_entregadas,
                    actaData.fechaEntrega || actaExistente.fechaEntrega,
                    actaData.observaciones !== undefined ? actaData.observaciones : actaExistente.observaciones,
                    actaId
                );

                // Gestionar PDF
                if (actaData.pdfSourcePath && fs.existsSync(actaData.pdfSourcePath)) {
                    if (actaExistente.pdfPathEntrega && fs.existsSync(actaExistente.pdfPathEntrega)) {
                        fs.unlinkSync(actaExistente.pdfPathEntrega);
                    }

                    const newPdfPath = this._copyPdfFile(actaData.pdfSourcePath, actaId);
                    
                    const updatePdf = this.db.prepare(`
                        UPDATE ActasEntrega SET pdfPathEntrega = ? WHERE _id = ?
                    `);
                    updatePdf.run(newPdfPath, actaId);
                }

                // Actualizar tarjetas
                if (tarjetasIds !== null && Array.isArray(tarjetasIds)) {
                    this.db.prepare(`
                        UPDATE TarjetasVehiculos 
                        SET actaEntregaId = NULL,
                            fechaModificacion = CURRENT_TIMESTAMP
                        WHERE actaEntregaId = ?
                    `).run(actaId);

                    if (tarjetasIds.length > 0) {
                        const asociar = this.db.prepare(`
                            UPDATE TarjetasVehiculos 
                            SET actaEntregaId = ?,
                                fechaModificacion = CURRENT_TIMESTAMP
                            WHERE _id = ?
                        `);

                        for (const tarjetaId of tarjetasIds) {
                            asociar.run(actaId, tarjetaId);
                        }
                    }
                }

                const actaActualizada = this.getActaEntregaById(actaId);

                return {
                    success: true,
                    message: 'Acta actualizada exitosamente',
                    acta: actaActualizada
                };

            } catch (error) {
                console.error('❌ Error al actualizar acta:', error);
                throw error;
            }
        });

        return transaction();
    }

    /**
     * Eliminar acta de entrega
     */
    deleteActaEntrega(actaId) {
        console.log('🗑️ Eliminando acta ID:', actaId);

        const transaction = this.db.transaction(() => {
            try {
                const acta = this.db.prepare(
                    'SELECT * FROM ActasEntrega WHERE _id = ?'
                ).get(actaId);

                if (!acta) {
                    throw new Error(`Acta ${actaId} no encontrada`);
                }

                const tarjetas = this.db.prepare(`
                    SELECT COUNT(*) as cantidad
                    FROM TarjetasVehiculos
                    WHERE actaEntregaId = ?
                `).get(actaId);

                // Desasociar tarjetas
                this.db.prepare(`
                    UPDATE TarjetasVehiculos 
                    SET actaEntregaId = NULL,
                        fechaModificacion = CURRENT_TIMESTAMP
                    WHERE actaEntregaId = ?
                `).run(actaId);

                // Eliminar PDF
                let pdfEliminado = false;
                if (acta.pdfPathEntrega && fs.existsSync(acta.pdfPathEntrega)) {
                    try {
                        fs.unlinkSync(acta.pdfPathEntrega);
                        pdfEliminado = true;
                    } catch (error) {
                        console.warn('⚠️ No se pudo eliminar el PDF:', error.message);
                    }
                }

                // Eliminar acta
                this.db.prepare('DELETE FROM ActasEntrega WHERE _id = ?').run(actaId);

                return {
                    success: true,
                    message: 'Acta de entrega eliminada exitosamente',
                    summary: {
                        actaId: actaId,
                        fechaEntrega: acta.fechaEntrega,
                        tarjetasDesasociadas: tarjetas.cantidad,
                        pdfEliminado: pdfEliminado
                    }
                };

            } catch (error) {
                console.error('❌ Error al eliminar acta:', error);
                throw error;
            }
        });

        return transaction();
    }

    /**
     * Obtener información para eliminar (preview)
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
     */
    searchActasEntrega(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return this.getAllActasEntrega();
        }

        const term = `%${searchTerm.toLowerCase()}%`;

        const actas = this.db.prepare(`
            SELECT DISTINCT
                ae.*,
                COUNT(DISTINCT t._id) as cantidadTarjetas
            FROM ActasEntrega ae
            LEFT JOIN TarjetasVehiculos t ON t.actaEntregaId = ae._id
            LEFT JOIN ActasResolucion ar ON t.resolucionId = ar._id
            WHERE 
                LOWER(ae.observaciones) LIKE ?
                OR LOWER(t.placa) LIKE ?
                OR LOWER(t.numeroTarjeta) LIKE ?
                OR LOWER(ar.numeroExpediente) LIKE ?
                OR LOWER(ar.nombreEmpresa) LIKE ?
                OR strftime('%Y', ae.fechaEntrega) LIKE ?
            GROUP BY ae._id
            ORDER BY ae.fechaEntrega DESC
        `).all(term, term, term, term, term, term);

        return actas;
    }

    /**
     * Obtener tarjetas disponibles (sin acta)
     */
    getTarjetasDisponibles() {
        const tarjetas = this.db.prepare(`
            SELECT 
                t._id,
                t.placa,
                t.numeroTarjeta,
                t.resolucionId,
                ar.numeroExpediente,
                ar.anioExpediente,
                ar.nombreEmpresa,
                ar.fechaExpediente
            FROM TarjetasVehiculos t
            LEFT JOIN ActasResolucion ar ON t.resolucionId = ar._id
            WHERE t.actaEntregaId IS NULL
            ORDER BY ar.fechaExpediente DESC, t.placa ASC
        `).all();

        return tarjetas;
    }

    /**
     * Obtener estadísticas
     */
    getEstadisticas() {
        const stats = {};

        stats.totalActas = this.db.prepare(
            'SELECT COUNT(*) as count FROM ActasEntrega'
        ).get().count;

        stats.tarjetasEntregadas = this.db.prepare(
            'SELECT COUNT(*) as count FROM TarjetasVehiculos WHERE actaEntregaId IS NOT NULL'
        ).get().count;

        stats.tarjetasPendientes = this.db.prepare(
            'SELECT COUNT(*) as count FROM TarjetasVehiculos WHERE actaEntregaId IS NULL'
        ).get().count;

        stats.actasPorAnio = this.db.prepare(`
            SELECT 
                strftime('%Y', fechaEntrega) as anio,
                COUNT(*) as cantidad,
                SUM(n_tarjetas_entregadas) as totalTarjetas
            FROM ActasEntrega
            GROUP BY anio
            ORDER BY anio DESC
        `).all();

        return stats;
    }

    /**
     * Copiar archivo PDF
     * @private
     */
    _copyPdfFile(sourcePath, actaId) {
        const pdfDir = path.join(app.getPath('userData'), 'pdfs', 'actas-entrega');
        
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        const fileName = `acta_${actaId}_${Date.now()}.pdf`;
        const destPath = path.join(pdfDir, fileName);

        fs.copyFileSync(sourcePath, destPath);
        console.log('📄 PDF copiado a:', destPath);

        return destPath;
    }
}

module.exports = ActaEntregaService;

