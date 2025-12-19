// app/db/models/utils.js
/**
 * Utilidades para construcción de queries SQL
 * Funciones helper reutilizables para todos los modelos
 */

/**
 * Helper para construir cláusula WHERE desde un objeto query
 * @param {Object} query - Objeto con condiciones de búsqueda
 * @returns {Object} { clause: string, params: array }
 */
function buildWhereClause(query) {
    if (!query || Object.keys(query).length === 0) {
        return { clause: '', params: [] };
    }

    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(query)) {
        // Saltar valores undefined
        if (value === undefined) {
            continue;
        }
        
        if (key === '_id' || key === 'id') {
            conditions.push('_id = ?');
            params.push(value);
        } else if (typeof value === 'object' && value !== null && value.$ne !== undefined) {
            conditions.push(`${key} != ?`);
            params.push(value.$ne);
        } else {
            // Convertir valores vacíos a null
            const cleanValue = value === '' ? null : value;
            
            // Manejar null con IS NULL
            if (cleanValue === null) {
                conditions.push(`${key} IS NULL`);
            } else {
                conditions.push(`${key} = ?`);
                params.push(cleanValue);
            }
        }
    }

    return {
        clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params
    };
}

/**
 * Helper para construir SET clause desde un objeto update
 * @param {Object} update - Objeto con campos a actualizar
 * @returns {Object} { clause: string, params: array }
 */
function buildSetClause(update) {
    const setClauses = [];
    const params = [];

    // Manejar operadores de actualización ($set, etc)
    const updateData = update.$set || update;

    for (const [key, value] of Object.entries(updateData)) {
        if (key !== '_id') {
            // Filtrar valores inválidos para SQLite
            // SQLite solo acepta: numbers, strings, bigints, buffers, y null
            if (value === undefined) {
                // Saltar campos undefined
                continue;
            }
            
            // Convertir valores vacíos a null
            const cleanValue = (value === '' || value === null) ? null : value;
            
            setClauses.push(`${key} = ?`);
            params.push(cleanValue);
        }
    }

    // Agregar fechaModificacion automáticamente
    setClauses.push('fechaModificacion = CURRENT_TIMESTAMP');

    return {
        clause: setClauses.join(', '),
        params
    };
}

module.exports = {
    buildWhereClause,
    buildSetClause
};
