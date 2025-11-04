// app/services/actaEntregaService/queries.js
/**
 * Consultas SQL para Actas de Entrega
 * Centraliza todas las queries en un solo lugar
 */

module.exports = {
    // ==================== ACTAS ====================
    
    insertActa: `
        INSERT INTO ActasEntrega (
            n_tarjetas_entregadas,
            fechaEntrega,
            pdfPathEntrega,
            observaciones
        ) VALUES (?, ?, ?, ?)
    `,

    updateActa: `
        UPDATE ActasEntrega
        SET n_tarjetas_entregadas = ?,
            fechaEntrega = ?,
            observaciones = ?,
            fechaModificacion = CURRENT_TIMESTAMP
        WHERE _id = ?
    `,

    updateActaPdf: `
        UPDATE ActasEntrega 
        SET pdfPathEntrega = ?
        WHERE _id = ?
    `,

    getActaById: `
        SELECT * FROM ActasEntrega WHERE _id = ?
    `,

    getAllActas: `
        SELECT 
            ae.*,
            COUNT(t._id) as cantidadTarjetas
        FROM ActasEntrega ae
        LEFT JOIN TarjetasVehiculos t ON t.actaEntregaId = ae._id
    `,

    deleteActa: `
        DELETE FROM ActasEntrega WHERE _id = ?
    `,

    searchActas: `
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
    `,

    // ==================== TARJETAS ====================

    getTarjetasByActaId: `
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
    `,

    updateTarjetaActa: `
        UPDATE TarjetasVehiculos 
        SET actaEntregaId = ?,
            fechaModificacion = CURRENT_TIMESTAMP
        WHERE _id = ?
    `,

    desasociarTarjetasDeActa: `
        UPDATE TarjetasVehiculos 
        SET actaEntregaId = NULL,
            fechaModificacion = CURRENT_TIMESTAMP
        WHERE actaEntregaId = ?
    `,

    countTarjetasByActa: `
        SELECT COUNT(*) as cantidad
        FROM TarjetasVehiculos
        WHERE actaEntregaId = ?
    `,

    getTarjetasDisponibles: `
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
    `,

    // ==================== ESTADÍSTICAS ====================

    countTotalActas: `
        SELECT COUNT(*) as count FROM ActasEntrega
    `,

    countTarjetasEntregadas: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE actaEntregaId IS NOT NULL
    `,

    countTarjetasPendientes: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE actaEntregaId IS NULL
    `,

    getActasPorAnio: `
        SELECT 
            strftime('%Y', fechaEntrega) as anio,
            COUNT(*) as cantidad,
            SUM(n_tarjetas_entregadas) as totalTarjetas
        FROM ActasEntrega
        GROUP BY anio
        ORDER BY anio DESC
    `
};
