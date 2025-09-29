// src/js/modules/debounce.js
// Utilidad para debouncing - evitar llamadas excesivas de funciones

/**
 * Crea una versión debounced de una función
 * @param {Function} func - Función a ejecutar con debounce
 * @param {number} delay - Tiempo de espera en millisegundos
 * @param {boolean} immediate - Si ejecutar inmediatamente en el primer llamado
 * @returns {Function} Función con debounce aplicado
 */
export function debounce(func, delay = 300, immediate = false) {
    let timeoutId;
    let lastArgs;
    let lastThis;
    
    const debounced = function(...args) {
        lastArgs = args;
        lastThis = this;
        
        const callNow = immediate && !timeoutId;
        
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (!immediate) {
                func.apply(lastThis, lastArgs);
            }
        }, delay);
        
        if (callNow) {
            func.apply(lastThis, lastArgs);
        }
    };
    
    // Método para cancelar el debounce
    debounced.cancel = function() {
        clearTimeout(timeoutId);
        timeoutId = null;
    };
    
    // Método para ejecutar inmediatamente
    debounced.flush = function() {
        if (timeoutId) {
            clearTimeout(timeoutId);
            func.apply(lastThis, lastArgs);
            timeoutId = null;
        }
    };
    
    return debounced;
}

/**
 * Crea una versión throttled de una función
 * @param {Function} func - Función a ejecutar con throttle
 * @param {number} limit - Tiempo límite en millisegundos
 * @returns {Function} Función con throttle aplicado
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    let lastArgs;
    let lastThis;
    
    return function(...args) {
        lastArgs = args;
        lastThis = this;
        
        if (!inThrottle) {
            func.apply(lastThis, lastArgs);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Debounce específico para búsquedas con loading states
 * @param {Function} searchFunc - Función de búsqueda
 * @param {number} delay - Tiempo de debounce
 * @returns {Function} Función de búsqueda con debounce
 */
export function debounceSearch(searchFunc, delay = 500) {
    let timeoutId;
    let isSearching = false;
    
    return function(searchTerm, ...args) {
        clearTimeout(timeoutId);
        
        // Si ya hay una búsqueda en progreso, no iniciar otra
        if (isSearching) {
            return;
        }
        
        timeoutId = setTimeout(async () => {
            if (searchTerm && searchTerm.trim()) {
                isSearching = true;
                try {
                    await searchFunc(searchTerm, ...args);
                } catch (error) {
                    console.error('Error en búsqueda debounced:', error);
                } finally {
                    isSearching = false;
                }
            }
        }, delay);
    };
}

/**
 * Utilidad para ejecutar una función solo una vez
 * @param {Function} func - Función a ejecutar una sola vez
 * @returns {Function} Función que solo se ejecuta una vez
 */
export function once(func) {
    let executed = false;
    let result;
    
    return function(...args) {
        if (!executed) {
            executed = true;
            result = func.apply(this, args);
        }
        return result;
    };
}

/**
 * Agrupa múltiples llamadas a una función para ejecutarlas juntas
 * @param {Function} func - Función a agrupar
 * @param {number} delay - Tiempo de espera para agrupar
 * @returns {Function} Función agrupada
 */
export function batch(func, delay = 50) {
    let timeoutId;
    let batched = [];
    
    return function(...args) {
        batched.push(args);
        
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            const allArgs = batched;
            batched = [];
            func(allArgs);
        }, delay);
    };
}