// src/js/modules/services/ExpedienteService.js
// Servicio para operaciones CRUD de expedientes

import { dataService } from '../dataService.js';

/**
 * Servicio especializado para operaciones de expedientes
 * Responsabilidad: Lógica de negocio y comunicación con el backend
 */
export class ExpedienteService {
    constructor() {
        this.usePagination = true; // Usar paginación por defecto
    }

    /**
     * Cargar expedientes con o sin paginación
     * @param {Object} options - Opciones de carga
     * @param {number} options.page - Página actual
     * @param {number} options.limit - Items por página
     * @param {boolean} options.usePagination - Usar paginación
     * @returns {Promise<Object>} { success, data, pagination }
     */
    async loadExpedientes(options = {}) {
        const {
            page = 1,
            limit = 10,
            usePagination = this.usePagination
        } = options;

        try {
            // Verificar que dataService esté disponible
            if (!dataService) {
                console.warn('DataService no está disponible, usando datos de prueba');
                return {
                    success: true,
                    data: this.createTestData(),
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalRecords: 3,
                        itemsPerPage: 10
                    }
                };
            }

            // Usar paginación del backend
            if (usePagination) {
                const resultado = await dataService.getExpedientesPaginados({
                    page,
                    limit,
                    sortBy: 'fechaExpediente',
                    sortOrder: 'desc'
                });

                if (resultado.success) {
                    return resultado;
                } else {
                    console.error('Error al cargar expedientes paginados:', resultado.message);
                    return {
                        success: false,
                        data: [],
                        pagination: {
                            currentPage: 1,
                            totalPages: 1,
                            totalRecords: 0,
                            itemsPerPage: limit
                        },
                        error: resultado.message
                    };
                }
            } else {
                // Modo sin paginación (cargar todo)
                const expedientes = await dataService.getAllExpedientes();

                if (!expedientes || !Array.isArray(expedientes)) {
                    console.warn('Expedientes inválidos, usando datos de prueba');
                    const testData = this.createTestData();
                    return {
                        success: true,
                        data: testData,
                        pagination: {
                            currentPage: 1,
                            totalPages: 1,
                            totalRecords: testData.length,
                            itemsPerPage: testData.length
                        }
                    };
                }

                return {
                    success: true,
                    data: expedientes,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalRecords: expedientes.length,
                        itemsPerPage: expedientes.length
                    }
                };
            }
        } catch (error) {
            console.error('Error al cargar expedientes:', error);
            const testData = this.createTestData();
            return {
                success: false,
                data: testData,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalRecords: testData.length,
                    itemsPerPage: 10
                },
                error: error.message
            };
        }
    }

    /**
     * Crear expediente
     * @param {Object} expedienteData - Datos del expediente
     * @returns {Promise<Object>} Resultado de la operación
     */
    async createExpediente(expedienteData) {
        try {
            const result = await dataService.createExpediente(expedienteData);
            return result;
        } catch (error) {
            console.error('Error al crear expediente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Actualizar expediente
     * @param {string|number} expedienteId - ID del expediente
     * @param {Object} expedienteData - Datos actualizados
     * @returns {Promise<Object>} Resultado de la operación
     */
    async updateExpediente(expedienteId, expedienteData) {
        try {
            const result = await dataService.updateExpediente(expedienteId, expedienteData);
            return result;
        } catch (error) {
            console.error('Error al actualizar expediente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Eliminar expediente
     * @param {string|number} expedienteId - ID del expediente
     * @returns {Promise<Object>} Resultado de la operación
     */
    async deleteExpediente(expedienteId) {
        try {
            const result = await dataService.deleteExpediente(expedienteId);
            return result;
        } catch (error) {
            console.error('Error al eliminar expediente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener información para eliminación
     * @param {string|number} expedienteId - ID del expediente
     * @returns {Promise<Object>} Información del expediente y relaciones
     */
    async getDeleteInfo(expedienteId) {
        try {
            const result = await dataService.getDeleteInfo(expedienteId);
            return result;
        } catch (error) {
            console.error('Error al obtener info de eliminación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Crear datos de prueba
     * @returns {Array} Array de expedientes de prueba
     */
    createTestData() {
        return [
            {
                _id: 'test1',
                numeroExpediente: '001',
                anioExpediente: '2024',
                fecha: '2024-01-15',
                numeroResolucion: 'RES-001-2024',
                nombreEmpresa: 'Empresa de Prueba S.A.',
                unidadNegocio: 'C1',
                tarjetasAsociadas: [{ numero: '123456789' }, { numero: '987654321' }]
            },
            {
                _id: 'test2',
                numeroExpediente: '002',
                anioExpediente: '2024',
                fecha: '2024-02-20',
                numeroResolucion: 'RES-002-2024',
                nombreEmpresa: 'Transportes Ejemplo Ltda.',
                unidadNegocio: 'C2',
                tarjetasAsociadas: [{ numero: '555666777' }]
            },
            {
                _id: 'test3',
                numeroExpediente: '003',
                anioExpediente: '2023',
                fecha: '2023-12-10',
                numeroResolucion: 'RES-003-2023',
                nombreEmpresa: 'Logística Demo Corp.',
                unidadNegocio: 'C3',
                tarjetasAsociadas: []
            }
        ];
    }
}

// Export singleton instance
export const expedienteService = new ExpedienteService();
