// app/services/expedienteService/expedienteManager.js
/**
 * Gestor de operaciones CRUD de Expedientes
 * Maneja las operaciones básicas de base de datos
 */

const { normalizeId, buildExpedienteQuery } = require('./utils');

/**
 * Crear módulo de gestión de expedientes
 * @param {Database} db - Instancia de base de datos
 * @returns {Object} Métodos para gestionar expedientes
 */
module.exports = function createExpedienteManager(db) {
    return {
        /**
         * Insertar nuevo expediente en BD
         * @param {Object} expedienteData - Datos del expediente
         * @returns {Object} Expediente creado
         */
        insertExpediente(expedienteData) {
            const expedienteToInsert = {
                numeroExpediente: expedienteData.numeroExpediente,
                anioExpediente: expedienteData.anioExpediente || new Date().getFullYear(),
                numeroResolucion: expedienteData.numeroResolucion || null,
                fechaExpediente: expedienteData.fechaExpediente || new Date().toISOString().split('T')[0],
                unidadNegocio: expedienteData.unidadNegocio || null,
                nombreEmpresa: expedienteData.nombreEmpresa || null,
                numeroFichero: expedienteData.numeroFichero || null,
                observaciones: expedienteData.observaciones || null,
                pdfPathActa: expedienteData.pdfPathActa || null,
                informeTecnico: expedienteData.informeTecnico || null
            };

            const newExpediente = db.expedientes.insert(expedienteToInsert);
            console.log('✅ Acta de Resolución creada con ID:', newExpediente._id);

            return newExpediente;
        },

        /**
         * Obtener expediente por ID
         * @param {number} expedienteId - ID del expediente
         * @returns {Object} Datos del expediente
         */
        getExpedienteById(expedienteId) {
            const numericId = normalizeId(expedienteId);
            const expediente = db.expedientes.findOne({ _id: numericId });

            if (!expediente) {
                throw new Error('Expediente no encontrado');
            }

            return expediente;
        },

        /**
         * Obtener todos los expedientes
         * @param {Object} filtros - Filtros opcionales
         * @returns {Array} Lista de expedientes
         */
        getAllExpedientes(filtros = {}) {
            const query = buildExpedienteQuery(filtros);
            const expedientes = db.expedientes.find(query);
            
            console.log(`📊 Expedientes obtenidos: ${expedientes.length}`);
            return expedientes;
        },

        /**
         * Actualizar expediente
         * @param {number} expedienteId - ID del expediente
         * @param {Object} updateData - Datos a actualizar
         * @returns {Object} Expediente actualizado
         */
        updateExpediente(expedienteId, updateData) {
            const numericId = normalizeId(expedienteId);
            
            const result = db.expedientes.update(
                { _id: numericId },
                updateData
            );

            const changesCount = typeof result === 'number' ? result : (result.changes || 0);
            
            if (changesCount === 0) {
                throw new Error('No se pudo actualizar el expediente');
            }

            console.log('✅ Acta de Resolución actualizada:', expedienteId);
            return this.getExpedienteById(numericId);
        },

        /**
         * Eliminar expediente
         * @param {number} expedienteId - ID del expediente
         * @returns {number} Cantidad eliminada
         */
        deleteExpediente(expedienteId) {
            const numericId = normalizeId(expedienteId);
            
            const result = db.expedientes.remove({ _id: numericId });
            const expedienteChanges = typeof result === 'number' ? result : (result.changes || 0);
            
            if (expedienteChanges === 0) {
                throw new Error('No se pudo eliminar el expediente de la base de datos');
            }

            console.log('✅ Expediente eliminado de la BD');
            return expedienteChanges;
        },

        /**
         * Buscar expedientes por término
         * @param {string} searchTerm - Término de búsqueda
         * @returns {Array} Expedientes encontrados
         */
        searchExpedientes(searchTerm) {
            if (!searchTerm || searchTerm.trim() === '') {
                return this.getAllExpedientes();
            }

            const term = searchTerm.toUpperCase().trim();
            
            const expedientes = db.expedientes.find({})
                .filter(exp => 
                    (exp.numeroExpediente && exp.numeroExpediente.toUpperCase().includes(term)) ||
                    (exp.numeroResolucion && exp.numeroResolucion.toUpperCase().includes(term)) ||
                    (exp.nombreEmpresa && exp.nombreEmpresa.toUpperCase().includes(term))
                );

            console.log(`🔍 Búsqueda "${searchTerm}": ${expedientes.length} resultados`);
            return expedientes;
        },

        /**
         * Verificar si existe expediente
         * @param {number} expedienteId - ID del expediente
         * @returns {boolean} true si existe
         */
        existsExpediente(expedienteId) {
            try {
                this.getExpedienteById(expedienteId);
                return true;
            } catch (error) {
                return false;
            }
        }
    };
};
