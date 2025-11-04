// app/services/expedienteService/queries.js
/**
 * Consultas SQL para Expedientes (Actas de Resolución)
 * Centraliza todas las queries en un solo lugar
 */

module.exports = {
    // ==================== EXPEDIENTES (ACTAS DE RESOLUCIÓN) ====================
    
    insertExpediente: `
        INSERT INTO ActasResolucion (
            numeroExpediente,
            anioExpediente,
            numeroResolucion,
            fechaExpediente,
            unidadNegocio,
            nombreEmpresa,
            numeroFichero,
            observaciones,
            pdfPathActa,
            informeTecnico
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    updateExpediente: `
        UPDATE ActasResolucion
        SET numeroExpediente = ?,
            anioExpediente = ?,
            numeroResolucion = ?,
            fechaExpediente = ?,
            unidadNegocio = ?,
            nombreEmpresa = ?,
            numeroFichero = ?,
            observaciones = ?,
            pdfPathActa = ?,
            informeTecnico = ?,
            fechaModificacion = CURRENT_TIMESTAMP
        WHERE _id = ?
    `,

    getExpedienteById: `
        SELECT * FROM ActasResolucion WHERE _id = ?
    `,

    getAllExpedientes: `
        SELECT * FROM ActasResolucion ORDER BY _id DESC
    `,

    deleteExpediente: `
        DELETE FROM ActasResolucion WHERE _id = ?
    `,

    searchExpedientes: `
        SELECT * FROM ActasResolucion
        WHERE LOWER(numeroExpediente) LIKE ? 
           OR LOWER(numeroResolucion) LIKE ?
           OR LOWER(nombreEmpresa) LIKE ?
        ORDER BY _id DESC
    `
};
