// app/services/tarjetaService/tarjetaManager.js
/**
 * Gestor de operaciones CRUD de Tarjetas
 * Maneja las operaciones básicas de base de datos
 */

const queries = require('./queries');
const { normalizePlaca, buildQuery } = require('./utils');

/**
 * Crear módulo de gestión de tarjetas
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar tarjetas
 */
module.exports = function createTarjetaManager(db) {
    return {
        /**
         * Insertar nueva tarjeta en BD
         * @param {Object} tarjetaData - Datos de la tarjeta
         * @returns {Object} Tarjeta creada
         */
        insertTarjeta(tarjetaData) {
            const tarjetaToInsert = {
                placa: normalizePlaca(tarjetaData.placa),
                numeroTarjeta: tarjetaData.numeroTarjeta || null,
                pdfPath: tarjetaData.pdfPath || null,
                resolucionId: tarjetaData.resolucionId || null,
                actaEntregaId: tarjetaData.actaEntregaId || null
            };

            const nuevaTarjeta = db.tarjetas.insert(tarjetaToInsert);
            console.log('✅ Tarjeta creada con ID:', nuevaTarjeta._id);

            return nuevaTarjeta;
        },

        /**
         * Obtener tarjeta por ID
         * @param {number} tarjetaId - ID de la tarjeta
         * @returns {Object} Datos de la tarjeta
         */
        getTarjetaById(tarjetaId) {
            const tarjeta = db.tarjetas.findOne({ _id: tarjetaId });

            if (!tarjeta) {
                throw new Error('Tarjeta no encontrada');
            }

            return tarjeta;
        },

        /**
         * Obtener tarjeta por placa
         * @param {string} placa - Placa del vehículo
         * @returns {Object|null} Tarjeta encontrada o null
         */
        getTarjetaByPlaca(placa) {
            return db.tarjetas.findOne({ placa: normalizePlaca(placa) });
        },

        /**
         * Obtener todas las tarjetas
         * @param {Object} filtros - Filtros opcionales
         * @returns {Array} Lista de tarjetas
         */
        getAllTarjetas(filtros = {}) {
            const query = buildQuery(filtros);
            
            // Usar el wrapper db.tarjetas.find() en lugar de prepare()
            const tarjetas = db.tarjetas.find(query);
            return tarjetas;
        },

        /**
         * Obtener tarjetas por resolución
         * @param {number} resolucionId - ID de la resolución
         * @returns {Array} Lista de tarjetas
         */
        getTarjetasByResolucion(resolucionId) {
            return db.tarjetas.find({ resolucionId: resolucionId });
        },

        /**
         * Obtener tarjetas por acta de entrega
         * @param {number} actaEntregaId - ID del acta
         * @returns {Array} Lista de tarjetas
         */
        getTarjetasByActaEntrega(actaEntregaId) {
            return db.tarjetas.find({ actaEntregaId: actaEntregaId });
        },

        /**
         * Actualizar tarjeta
         * @param {number} tarjetaId - ID de la tarjeta
         * @param {Object} updateData - Datos a actualizar
         * @returns {Object} Tarjeta actualizada
         */
        updateTarjeta(tarjetaId, updateData) {
            const result = db.tarjetas.update(
                { _id: tarjetaId },
                updateData
            );

            if (result.changes === 0) {
                throw new Error('No se pudo actualizar la tarjeta');
            }

            console.log('✅ Tarjeta actualizada:', tarjetaId);
            return this.getTarjetaById(tarjetaId);
        },

        /**
         * Eliminar tarjeta
         * @param {number} tarjetaId - ID de la tarjeta
         * @returns {number} Cantidad eliminada
         */
        deleteTarjeta(tarjetaId) {
            const result = db.tarjetas.remove({ _id: tarjetaId });
            
            console.log('✅ Tarjeta eliminada:', tarjetaId);
            return result.changes || result;
        },

        /**
         * Eliminar tarjetas por resolución
         * @param {number} resolucionId - ID de la resolución
         * @returns {number} Cantidad eliminada
         */
        deleteTarjetasByResolucion(resolucionId) {
            const result = db.tarjetas.remove({ resolucionId: resolucionId });
            
            const changes = result.changes || result;
            console.log(`✅ ${changes} tarjetas eliminadas de resolución ${resolucionId}`);
            return changes;
        },

        /**
         * Buscar tarjetas por término
         * @param {string} searchTerm - Término de búsqueda
         * @returns {Array} Tarjetas encontradas
         */
        searchTarjetas(searchTerm) {
            if (!searchTerm || searchTerm.trim() === '') {
                return this.getAllTarjetas();
            }

            const termUpper = searchTerm.toUpperCase().trim();
            
            // Buscar por placa o número de tarjeta
            const tarjetas = db.tarjetas.find({})
                .filter(t => 
                    (t.placa && t.placa.toUpperCase().includes(termUpper)) ||
                    (t.numeroTarjeta && t.numeroTarjeta.toUpperCase().includes(termUpper))
                );

            return tarjetas;
        },

        /**
         * Verificar si existe tarjeta por ID
         * @param {number} tarjetaId - ID de la tarjeta
         * @returns {boolean} true si existe
         */
        existsTarjeta(tarjetaId) {
            try {
                this.getTarjetaById(tarjetaId);
                return true;
            } catch (error) {
                return false;
            }
        }
    };
};
