// app/services/expedienteService/actaEntregaManager.js
/**
 * Gestor de Actas de Entrega para Expedientes
 * Maneja la creación y gestión de actas de entrega
 */

/**
 * Crear módulo de gestión de actas de entrega
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar actas de entrega
 */
module.exports = function createActaEntregaManager(db) {
    return {
        /**
         * Crear acta de entrega
         * @param {Object} actaData - Datos del acta
         * @param {number} tarjetasLength - Cantidad de tarjetas
         * @returns {Object} Acta creada
         */
        createActaEntrega(actaData, tarjetasLength = 0) {
            const actaToInsert = {
                fechaEntrega: actaData.fechaEntrega,
                n_tarjetas_entregadas: actaData.n_tarjetas_entregadas || tarjetasLength,
                pdfPathEntrega: actaData.pdfPathEntrega || null,
                observaciones: actaData.observaciones || null
            };

            const newActaEntrega = db.actasEntrega.insert(actaToInsert);
            console.log('✅ Acta de Entrega creada:', newActaEntrega._id);

            return newActaEntrega;
        },

        /**
         * Obtener acta de entrega por ID
         * @param {number} actaId - ID del acta
         * @returns {Object|null} Acta encontrada o null
         */
        getActaEntregaById(actaId) {
            return db.actasEntrega.findOne({ _id: actaId });
        },

        /**
         * Actualizar acta de entrega
         * @param {number} actaId - ID del acta
         * @param {Object} actaData - Datos a actualizar
         * @returns {Object} Acta actualizada
         */
        updateActaEntrega(actaId, actaData) {
            const updateData = {};
            
            if (actaData.fechaEntrega !== undefined) updateData.fechaEntrega = actaData.fechaEntrega;
            if (actaData.n_tarjetas_entregadas !== undefined) updateData.n_tarjetas_entregadas = actaData.n_tarjetas_entregadas;
            if (actaData.pdfPathEntrega !== undefined) updateData.pdfPathEntrega = actaData.pdfPathEntrega;
            if (actaData.observaciones !== undefined) updateData.observaciones = actaData.observaciones;

            db.actasEntrega.update({ _id: actaId }, { $set: updateData });
            const actaActualizada = db.actasEntrega.findOne({ _id: actaId });
            
            console.log('✅ Acta de Entrega actualizada:', actaId);
            return actaActualizada;
        },

        /**
         * Eliminar acta de entrega
         * @param {number} actaId - ID del acta
         * @returns {number} Cantidad eliminada
         */
        deleteActaEntrega(actaId) {
            const result = db.actasEntrega.remove({ _id: actaId });
            const changes = typeof result === 'number' ? result : (result.changes || 0);
            
            if (changes > 0) {
                console.log('✅ Acta de Entrega eliminada de la BD');
            }
            
            return changes;
        }
    };
};
