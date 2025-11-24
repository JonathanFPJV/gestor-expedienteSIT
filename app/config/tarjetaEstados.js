// app/config/tarjetaEstados.js
/**
 * Configuración centralizada de Estados de Tarjetas
 * Para agregar un nuevo estado, simplemente añádelo a este archivo
 */

/**
 * Estados permitidos para tarjetas
 * @type {Object}
 */
const ESTADOS_TARJETA = {
    ACTIVA: {
        valor: 'ACTIVA',
        descripcion: 'Tarjeta válida y en uso',
        color: '#28a745',      // Verde
        icono: '✅',
        accionesPermitidas: ['cancelar', 'suspender', 'editar']
    },
    CANCELADA: {
        valor: 'CANCELADA',
        descripcion: 'Tarjeta cancelada permanentemente',
        color: '#dc3545',      // Rojo
        icono: '❌',
        accionesPermitidas: ['reactivar', 'consultar']
    },
    SUSPENDIDA: {
        valor: 'SUSPENDIDA',
        descripcion: 'Tarjeta suspendida temporalmente',
        color: '#ffc107',      // Amarillo
        icono: '⏸️',
        accionesPermitidas: ['activar', 'cancelar', 'consultar']
    },
    VENCIDA: {
        valor: 'VENCIDA',
        descripcion: 'Tarjeta fuera de vigencia',
        color: '#6c757d',      // Gris
        icono: '⏰',
        accionesPermitidas: ['renovar', 'cancelar', 'consultar']
    },
    EN_TRAMITE: {
        valor: 'EN_TRAMITE',
        descripcion: 'Tarjeta en proceso de emisión',
        color: '#17a2b8',      // Azul claro
        icono: '🔄',
        accionesPermitidas: ['activar', 'cancelar', 'editar']
    }
};

/**
 * Lista de valores de estados (para validación)
 * @type {Array<string>}
 */
const ESTADOS_VALORES = Object.keys(ESTADOS_TARJETA);

/**
 * Estado por defecto para nuevas tarjetas
 * @type {string}
 */
const ESTADO_DEFAULT = 'ACTIVA';

/**
 * Validar si un estado es válido
 * @param {string} estado - Estado a validar
 * @returns {boolean} true si es válido
 */
function esEstadoValido(estado) {
    if (!estado) return false;
    return ESTADOS_VALORES.includes(estado.toUpperCase());
}

/**
 * Obtener información de un estado
 * @param {string} estado - Estado a consultar
 * @returns {Object|null} Información del estado o null
 */
function getInfoEstado(estado) {
    if (!estado) return null;
    return ESTADOS_TARJETA[estado.toUpperCase()] || null;
}

/**
 * Obtener todos los estados disponibles
 * @returns {Array<Object>} Lista de estados con su información
 */
function getAllEstados() {
    return Object.entries(ESTADOS_TARJETA).map(([key, info]) => ({
        key,
        ...info
    }));
}

/**
 * Verificar si una transición de estado es permitida
 * @param {string} estadoActual - Estado actual
 * @param {string} estadoNuevo - Estado al que se quiere cambiar
 * @returns {boolean} true si la transición es permitida
 */
function esTransicionPermitida(estadoActual, estadoNuevo) {
    if (!esEstadoValido(estadoActual) || !esEstadoValido(estadoNuevo)) {
        return false;
    }

    // Matriz de transiciones permitidas
    const TRANSICIONES_PERMITIDAS = {
        'ACTIVA': ['CANCELADA', 'SUSPENDIDA', 'VENCIDA'],
        'CANCELADA': ['ACTIVA'],  // Reactivación
        'SUSPENDIDA': ['ACTIVA', 'CANCELADA'],
        'VENCIDA': ['ACTIVA', 'CANCELADA'],  // Renovación
        'EN_TRAMITE': ['ACTIVA', 'CANCELADA']
    };

    const transicionesDesde = TRANSICIONES_PERMITIDAS[estadoActual.toUpperCase()];
    return transicionesDesde ? transicionesDesde.includes(estadoNuevo.toUpperCase()) : false;
}

/**
 * Obtener mensaje de error personalizado para estado inválido
 * @param {string} estado - Estado inválido
 * @returns {string} Mensaje de error
 */
function getMensajeErrorEstado(estado) {
    return `Estado inválido: "${estado}". Estados permitidos: ${ESTADOS_VALORES.join(', ')}`;
}

module.exports = {
    ESTADOS_TARJETA,
    ESTADOS_VALORES,
    ESTADO_DEFAULT,
    esEstadoValido,
    getInfoEstado,
    getAllEstados,
    esTransicionPermitida,
    getMensajeErrorEstado
};
