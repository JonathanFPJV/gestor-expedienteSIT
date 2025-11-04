// app/services/deletionService/queries.js
/**
 * Consultas SQL para DeletionService
 * Centraliza todas las queries relacionadas con eliminación
 */

module.exports = {
    // ==================== BÚSQUEDAS ====================
    
    getExpedienteById: `
        SELECT * FROM ActasResolucion WHERE _id = ?
    `,

    getTarjetasByExpediente: `
        SELECT * FROM TarjetasVehiculos WHERE resolucionId = ?
    `,

    getActaEntregaById: `
        SELECT * FROM ActasEntrega WHERE _id = ?
    `
};
