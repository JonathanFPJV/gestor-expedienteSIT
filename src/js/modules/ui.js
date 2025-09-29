// src/js/modules/ui.js
import { pdfViewer } from './pdfViewer.js';
import { simplePdfViewer } from './simplePdfViewer.js';

const actaForm = document.getElementById('acta-form');
const pdfFilePathInput = document.getElementById('pdf-file-path');
const tarjetasList = document.getElementById('tarjetas-list');
const searchTarjetasResults = document.getElementById('search-tarjetas-results');
const searchActasResults = document.getElementById('search-actas-results');

// Sistema de notificaciones
let notificationContainer = null;

export const getActaData = () => {
    const expediente = document.getElementById('expediente').value;
    const fecha = document.getElementById('fecha').value;
    return { expediente, fecha };
};

export const getTarjetaData = () => {
    const tarjetas = [];
    const tarjetaItems = tarjetasList.querySelectorAll('.tarjeta-item');
    tarjetaItems.forEach(item => {
        const placa = item.querySelector('.placa-input').value;
        const tarjeta = item.querySelector('.tarjeta-input').value;
        const pdfInput = item.querySelector('.pdf-tarjeta-path');
        const selectedPdfPath = pdfInput ? pdfInput.value : '';
        if (placa) {
            tarjetas.push({ placa, tarjeta, selectedPdfPath });
        }
    });
    return tarjetas;
};

export const addTarjetaInput = () => {
    const div = document.createElement('div');
    div.className = 'tarjeta-item';
    div.innerHTML = `
        <input type="text" class="placa-input" placeholder="Placa" required>
        <input type="text" class="tarjeta-input" placeholder="N° Tarjeta" required>
        <input type="text" class="pdf-tarjeta-path" placeholder="PDF de tarjeta" readonly>
        <button type="button" class="seleccionar-pdf-tarjeta-btn">PDF</button>
        <button type="button" class="eliminar-tarjeta-btn">X</button>
    `;
    tarjetasList.appendChild(div);
    div.querySelector('.eliminar-tarjeta-btn').addEventListener('click', () => {
        div.remove();
    });
    div.querySelector('.seleccionar-pdf-tarjeta-btn').addEventListener('click', async () => {
        if (window.api && window.api.abrirDialogoPdf) {
            const pdfPath = await window.api.abrirDialogoPdf();
            if (pdfPath) {
                div.querySelector('.pdf-tarjeta-path').value = pdfPath;
            }
        }
    });
};

export const resetActaForm = () => {
    actaForm.reset();
    pdfFilePathInput.value = '';
    tarjetasList.innerHTML = '';
    addTarjetaInput(); // Agrega el primer campo por defecto
};

export const updatePdfFilePath = (path) => {
    pdfFilePathInput.value = path;
};

export const getSearchTerm = () => {
    return document.getElementById('search-tarjetas-input').value;
};

// Estas funciones se definirán más adelante con mejoras

// Sistema de notificaciones
export const showNotification = (message, type = 'info', duration = 5000) => {
    // Crear contenedor de notificaciones si no existe
    if (!notificationContainer) {
        createNotificationContainer();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remover después del tiempo especificado
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }
    
    return notification;
};

function createNotificationContainer() {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    // Agregar estilos CSS
    addNotificationStyles();
}

function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        }

        .notification {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 10px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            border-left: 4px solid #ccc;
            overflow: hidden;
        }

        .notification.show {
            opacity: 1;
            transform: translateX(0);
        }

        .notification-success {
            border-left-color: #28a745;
        }

        .notification-error {
            border-left-color: #dc3545;
        }

        .notification-warning {
            border-left-color: #ffc107;
        }

        .notification-info {
            border-left-color: #17a2b8;
        }

        .notification-content {
            display: flex;
            align-items: center;
            padding: 12px 16px;
        }

        .notification-icon {
            margin-right: 10px;
            font-size: 1.2rem;
        }

        .notification-success .notification-icon {
            color: #28a745;
        }

        .notification-error .notification-icon {
            color: #dc3545;
        }

        .notification-warning .notification-icon {
            color: #ffc107;
        }

        .notification-info .notification-icon {
            color: #17a2b8;
        }

        .notification-message {
            flex: 1;
            font-size: 0.9rem;
            color: #333;
        }

        .notification-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            color: #999;
            cursor: pointer;
            margin-left: 10px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .notification-close:hover {
            color: #666;
        }
    `;
    document.head.appendChild(style);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return '✓';
        case 'error':
            return '✕';
        case 'warning':
            return '⚠';
        case 'info':
        default:
            return 'ℹ';
    }
}

function removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 300);
}

// Función mejorada para mostrar resultados de tarjetas
export const displayTarjetasResults = (results) => {
    try {
        searchTarjetasResults.innerHTML = '';
        
        if (results && results.length > 0) {
            // Crear un contenedor con animación
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'results-container';
            
            results.forEach((r, index) => {
                const item = document.createElement('div');
                item.className = 'search-result-item fade-in';
                const resultId = `tarjeta-result-${index}`;
                item.id = resultId;
                
                item.innerHTML = `
                    <div class="result-header">
                        <p><strong>Placa:</strong> ${r.placa}</p>
                        <p><strong>N° Expediente:</strong> ${r.expediente}</p>
                        <p><strong>N° Tarjeta:</strong> ${r.tarjeta || 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${r.fecha}</p>
                    </div>
                    <div class="result-actions">
                        ${r.actaPdfPath ? `<button class="ver-pdf-btn" onclick="window.api.enviar('abrir-pdf', '${r.actaPdfPath}')">Ver PDF Acta (Externo)</button>` : ''}
                    </div>
                `;
                
                resultsContainer.appendChild(item);
                
                // Solo mostrar PDF de la tarjeta (no del acta) usando el visor simple
                if (r.pdfPath) {
                    setTimeout(() => {
                        simplePdfViewer.createViewer(resultId, r.pdfPath, `PDF Tarjeta - ${r.placa}`);
                    }, index * 100); // Animación escalonada
                }
            });
            
            searchTarjetasResults.appendChild(resultsContainer);
            
            // Agregar información de resultados
            const infoDiv = document.createElement('div');
            infoDiv.className = 'search-info';
            infoDiv.innerHTML = `<p class="text-muted">Se encontraron ${results.length} resultado(s)</p>`;
            searchTarjetasResults.prepend(infoDiv);
            
        } else {
            searchTarjetasResults.innerHTML = `
                <div class="no-results">
                    <p>No se encontraron resultados.</p>
                    <small class="text-muted">Intente con un término diferente</small>
                </div>
            `;
        }
        
        // Agregar estilos si no existen
        addResultsStyles();
        
    } catch (error) {
        console.error('Error al mostrar resultados de tarjetas:', error);
        searchTarjetasResults.innerHTML = `
            <div class="error-message">
                <p>Error al mostrar los resultados.</p>
            </div>
        `;
    }
};

// Función mejorada para mostrar resultados de actas
export const displayActasResults = (results) => {
    try {
        searchActasResults.innerHTML = '';
        
        if (results && results.length > 0) {
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'results-container';
            
            results.forEach((acta, index) => {
                const item = document.createElement('div');
                item.className = 'acta-result-item fade-in';
                const actaId = `acta-result-${index}`;
                item.id = actaId;
                
                item.innerHTML = `
                    <div class="acta-header">
                        <h3>Acta de Resolución</h3>
                        <p><strong>Expediente:</strong> ${acta.expediente}</p>
                        <p><strong>Fecha:</strong> ${acta.fecha}</p>
                    </div>
                `;
                
                // Mostrar tarjetas asociadas como enlaces
                if (acta.tarjetasAsociadas && acta.tarjetasAsociadas.length > 0) {
                    const tarjetasDiv = document.createElement('div');
                    tarjetasDiv.className = 'tarjetas-asociadas';
                    tarjetasDiv.innerHTML = `<h4>Tarjetas Asociadas (${acta.tarjetasAsociadas.length}):</h4>`;
                    
                    acta.tarjetasAsociadas.forEach((tarjeta) => {
                        const tarjetaItem = document.createElement('div');
                        tarjetaItem.className = 'tarjeta-asociada';
                        
                        tarjetaItem.innerHTML = `
                            <div class="tarjeta-info">
                                <span>Placa: ${tarjeta.placa} - Tarjeta: ${tarjeta.tarjeta}</span>
                                ${tarjeta.pdfPath ? `<button class="ver-pdf-tarjeta-btn" onclick="window.api.enviar('abrir-pdf', '${tarjeta.pdfPath}')">Ver PDF Tarjeta (Externo)</button>` : ''}
                            </div>
                        `;
                        
                        tarjetasDiv.appendChild(tarjetaItem);
                    });
                    
                    item.appendChild(tarjetasDiv);
                }
                
                resultsContainer.appendChild(item);
                
                // Solo mostrar PDF del acta (no de las tarjetas) usando el visor simple
                if (acta.pdfPath) {
                    setTimeout(() => {
                        simplePdfViewer.createViewer(actaId, acta.pdfPath, `PDF Acta - ${acta.expediente}`);
                    }, (index * 100) + 100);
                }
            });
            
            searchActasResults.appendChild(resultsContainer);
            
            // Agregar información de resultados
            const infoDiv = document.createElement('div');
            infoDiv.className = 'search-info';
            infoDiv.innerHTML = `<p class="text-muted">Se encontraron ${results.length} acta(s)</p>`;
            searchActasResults.prepend(infoDiv);
            
        } else {
            searchActasResults.innerHTML = `
                <div class="no-results">
                    <p>No se encontraron actas.</p>
                    <small class="text-muted">Intente con un término diferente</small>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error al mostrar resultados de actas:', error);
        searchActasResults.innerHTML = `
            <div class="error-message">
                <p>Error al mostrar los resultados.</p>
            </div>
        `;
    }
};

function addResultsStyles() {
    if (document.getElementById('results-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'results-styles';
    style.textContent = `
        .results-container {
            animation: fadeIn 0.3s ease;
        }

        .fade-in {
            animation: fadeInUp 0.4s ease forwards;
            opacity: 0;
            transform: translateY(20px);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .search-info {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 3px solid #007bff;
        }

        .search-info p {
            margin: 0;
            font-size: 0.9rem;
        }

        .no-results {
            text-align: center;
            padding: 40px 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 2px dashed #ddd;
        }

        .no-results p {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 1.1rem;
        }

        .error-message {
            text-align: center;
            padding: 20px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            color: #721c24;
        }

        .search-result-item, .acta-result-item {
            margin-bottom: 20px;
            transition: transform 0.2s ease;
        }

        .search-result-item:hover, .acta-result-item:hover {
            transform: translateY(-2px);
        }

        .text-muted {
            color: #6c757d !important;
        }
    `;
    document.head.appendChild(style);
}

// Funciones para limpiar resultados
export const clearTarjetasResults = () => {
    if (searchTarjetasResults) {
        searchTarjetasResults.innerHTML = '';
    }
};

export const clearActasResults = () => {
    if (searchActasResults) {
        searchActasResults.innerHTML = '';
    }
};

// Función para mostrar estado de "escribiendo..." en búsqueda
export const showSearchTyping = (type) => {
    const container = type === 'tarjetas' ? searchTarjetasResults : searchActasResults;
    if (container) {
        container.innerHTML = `
            <div class="search-typing">
                <span class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <span class="typing-text">Escribiendo...</span>
            </div>
        `;
    }
};

// Agregar estilos para el indicador de escritura
function addTypingStyles() {
    if (document.getElementById('typing-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'typing-styles';
    style.textContent = `
        .search-typing {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #666;
        }

        .typing-indicator {
            display: flex;
            margin-right: 10px;
        }

        .typing-indicator span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #4A90E2;
            margin: 0 2px;
            animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
            animation-delay: -0.32s;
        }

        .typing-indicator span:nth-child(2) {
            animation-delay: -0.16s;
        }

        @keyframes typing {
            0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }

        .typing-text {
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(style);
}

// Asegúrate de llamar a esta función al cargar la página para tener al menos un campo.
document.addEventListener('DOMContentLoaded', () => {
    addTarjetaInput();
    addTypingStyles();
});