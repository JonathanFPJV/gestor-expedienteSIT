// app/services/deletionService/expedienteManager.js
/**
 * Gestor de Expedientes para DeletionService
 * Maneja la obtención y validación de expedientes para eliminación
 */

/**
 * Crear módulo de gestión de expedientes
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar expedientes
 */
module.exports = function createExpedienteManager(db) {
    return {
        /**
         * Obtener expediente por ID
         * @param {string|number} expedienteId - ID del expediente
         * @returns {Promise<Object>} Expediente encontrado
         */
        async getExpedienteById(expedienteId) {
            const expediente = await db.expedientes.findOne({ _id: expedienteId });
            
            if (!expediente) {
                throw new Error(`Expediente con ID ${expedienteId} no encontrado`);
            }

            return expediente;
        },

        /**
         * Obtener información detallada del expediente para eliminación
         * @param {string|number} expedienteId - ID del expediente
         * @returns {Promise<Object>} Información detallada
         */
        async getExpedienteDeleteInfo(expedienteId) {
            const expediente = await this.getExpedienteById(expedienteId);
            const tarjetas = await db.tarjetas.find({ expedienteId: expedienteId });

            return {
                expediente: {
                    id: expediente._id,
                    numero: `${expediente.numeroExpediente}-${expediente.anioExpediente}`,
                    empresa: expediente.nombreEmpresa || 'N/A',
                    resolucion: expediente.numeroResolucion || 'Sin resolución',
                    fecha: expediente.fechaExpediente,
                    pdfPath: expediente.pdfPathActa
                },
                tarjetas: tarjetas.map(t => ({
                    id: t._id,
                    placa: t.placa,
                    tarjeta: t.numeroTarjeta,
                    pdfPath: t.pdfPath
                })),
                summary: {
                    totalTarjetas: tarjetas.length,
                    tarjetasConPDF: tarjetas.filter(t => t.pdfPath).length,
                    expedienteConPDF: !!expediente.pdfPathActa,
                    totalArchivos: tarjetas.filter(t => t.pdfPath).length + (expediente.pdfPathActa ? 1 : 0)
                }
            };
        }
    };
};
