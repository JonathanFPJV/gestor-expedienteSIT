// app/services/tarjetaService/queries.js
/**
 * Consultas SQL para Tarjetas de Vehículos
 * Centraliza todas las queries en un solo lugar
 */

module.exports = {
    // ==================== TARJETAS ====================
    
    insertTarjeta: `
        INSERT INTO TarjetasVehiculos (
            placa,
            numeroTarjeta,
            estado,
            pdfPath,
            resolucionId,
            actaEntregaId
        ) VALUES (?, ?, ?, ?, ?, ?)
    `,

    updateTarjeta: `
        UPDATE TarjetasVehiculos
        SET placa = ?,
            numeroTarjeta = ?,
            estado = ?,
            pdfPath = ?,
            resolucionId = ?,
            actaEntregaId = ?,
            fechaModificacion = CURRENT_TIMESTAMP
        WHERE _id = ?
    `,

    getTarjetaById: `
        SELECT * FROM TarjetasVehiculos WHERE _id = ?
    `,

    getTarjetaByPlaca: `
        SELECT * FROM TarjetasVehiculos WHERE placa = ?
    `,

    getAllTarjetas: `
        SELECT * FROM TarjetasVehiculos ORDER BY _id DESC
    `,

    getTarjetasByResolucion: `
        SELECT * FROM TarjetasVehiculos 
        WHERE resolucionId = ?
        ORDER BY _id DESC
    `,

    getTarjetasByActaEntrega: `
        SELECT * FROM TarjetasVehiculos 
        WHERE actaEntregaId = ?
        ORDER BY _id DESC
    `,

    deleteTarjeta: `
        DELETE FROM TarjetasVehiculos WHERE _id = ?
    `,

    deleteTarjetasByResolucion: `
        DELETE FROM TarjetasVehiculos WHERE resolucionId = ?
    `,

    // ==================== BÚSQUEDAS ====================

    searchTarjetas: `
        SELECT * FROM TarjetasVehiculos
        WHERE LOWER(placa) LIKE ? OR LOWER(numeroTarjeta) LIKE ?
        ORDER BY _id DESC
    `,

    getTarjetasByEstado: `
        SELECT * FROM TarjetasVehiculos
        WHERE estado = ?
        ORDER BY _id DESC
    `,

    // ==================== ESTADÍSTICAS ====================

    countTotalTarjetas: `
        SELECT COUNT(*) as count FROM TarjetasVehiculos
    `,

    countTarjetasConResolucion: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE resolucionId IS NOT NULL
    `,

    countTarjetasSinResolucion: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE resolucionId IS NULL
    `,

    countTarjetasConActaEntrega: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE actaEntregaId IS NOT NULL
    `,

    countTarjetasActivas: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE estado = 'ACTIVA'
    `,

    countTarjetasCanceladas: `
        SELECT COUNT(*) as count 
        FROM TarjetasVehiculos 
        WHERE estado = 'CANCELADA'
    `
};
