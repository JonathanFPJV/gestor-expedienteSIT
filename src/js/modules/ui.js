// src/js/modules/ui.js
import { simplePdfViewer } from './simplePdfViewer.js';

const expedienteForm = document.getElementById('expediente-form');
const pdfFilePathInput = document.getElementById('pdf-file-path');
const tarjetasList = document.getElementById('tarjetas-list');
const searchTarjetasResults = document.getElementById('search-tarjetas-results');
const searchExpedientesResults = document.getElementById('search-expedientes-results');

// Sistema de notificaciones
let notificationContainer = null;

export const getExpedienteData = () => {
    // Campos principales
    const numeroExpediente = document.getElementById('numeroExpediente').value.trim();
    const anioExpediente = parseInt(document.getElementById('anioExpediente').value) || new Date().getFullYear();
    const fechaExpediente = document.getElementById('fecha').value;

    // Campos adicionales
    const numeroResolucion = document.getElementById('numeroResolucion').value.trim() || null;
    const informeTecnico = document.getElementById('informeTecnico').value.trim() || null;
    const unidadNegocio = document.getElementById('unidadNegocio').value || null;
    const nombreEmpresa = document.getElementById('nombreEmpresa').value.trim() || null;
    const numeroFichero = document.getElementById('numeroFichero').value.trim() || null;

    // Observaciones - solo incluir si el contenedor está visible
    const observacionesContainer = document.getElementById('observaciones-container');
    const observaciones = observacionesContainer.classList.contains('hidden') ?
        null : (document.getElementById('observaciones').value.trim() || null);

    // Generar expediente completo para compatibilidad y visualización
    const expedienteCompleto = `${numeroExpediente}-${anioExpediente}`;

    // Actualizar campo oculto para compatibilidad
    document.getElementById('expediente').value = expedienteCompleto;

    // Retornar datos en formato SQLite3 (campos nuevos)
    return {
        numeroExpediente,
        anioExpediente,
        fechaExpediente,  // Cambio de 'fecha' a 'fechaExpediente'
        numeroResolucion,
        informeTecnico,
        unidadNegocio,
        nombreEmpresa,
        numeroFichero,
        observaciones
    };
};

// Función para cargar estados disponibles desde el backend
export const cargarEstadosEnSelector = async (selectElement, estadoSeleccionado = 'ACTIVA') => {
    if (!selectElement) return;

    try {
        const resultado = await window.api.invoke('tarjeta:obtener-estados-disponibles');

        if (resultado && resultado.success && Array.isArray(resultado.estados)) {
            selectElement.innerHTML = '';

            resultado.estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado.valor;
                option.textContent = estado.valor;

                if (estado.valor === estadoSeleccionado) {
                    option.selected = true;
                }

                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar estados:', error);
        // Mantener valor por defecto si hay error
        selectElement.innerHTML = '<option value="ACTIVA">ACTIVA</option>';
    }
};

export const getTarjetaData = () => {
    const tarjetas = [];
    const tarjetaItems = tarjetasList.querySelectorAll('.tarjeta-item');

    tarjetaItems.forEach(item => {
        const placa = item.querySelector('.placa-input').value.trim();
        const numeroTarjeta = item.querySelector('.tarjeta-input').value.trim();
        const estadoSelect = item.querySelector('.estado-input');
        const estado = estadoSelect ? estadoSelect.value : 'ACTIVA';
        const pdfInput = item.querySelector('.pdf-tarjeta-path');

        // Obtener la ruta del PDF desde dataset
        const pdfPath = pdfInput && pdfInput.dataset.pdfPath ? pdfInput.dataset.pdfPath : '';

        // Obtener el ID de la tarjeta si existe (para modo edición)
        const tarjetaId = item.dataset.tarjetaId || null;

        // Verificar si el PDF fue cambiado (tiene marca de cambio)
        const pdfChanged = pdfInput && pdfInput.dataset.pdfChanged === 'true';

        if (placa) {
            const tarjetaData = {
                placa,
                numeroTarjeta: numeroTarjeta || null,
                estado: estado || 'ACTIVA'
            };

            // Distinguir entre PDF nuevo y PDF existente
            if (pdfPath) {
                // Si el PDF fue cambiado O es una ruta absoluta (nuevo archivo)
                if (pdfChanged || pdfPath.match(/^[A-Z]:\\/i) || pdfPath.startsWith('/')) {
                    // Es un archivo nuevo del sistema -> enviar como pdfSourcePath
                    tarjetaData.pdfSourcePath = pdfPath;
                    console.log(`Tarjeta ${placa}: PDF NUEVO [${pdfPath}]`);
                } else {
                    // Es una ruta relativa de BD -> mantener como pdfPath
                    tarjetaData.pdfPath = pdfPath;
                    console.log(`Tarjeta ${placa}: PDF EXISTENTE [${pdfPath}]`);
                }
            } else {
                tarjetaData.pdfPath = null;
                console.log(`Tarjeta ${placa}: Sin PDF`);
            }

            // Incluir ID si existe (modo edición)
            if (tarjetaId) {
                tarjetaData._id = parseInt(tarjetaId);
            }

            tarjetas.push(tarjetaData);
        }
    });

    return tarjetas;
};

export const addTarjetaInput = () => {
    const div = document.createElement('div');
    div.className = 'tarjeta-item';
    div.innerHTML = `
        <div class="tarjeta-datos">
            <input type="text" class="placa-input" placeholder="Placa" required>
            <input type="text" class="tarjeta-input" placeholder="N° Tarjeta" required>
            <select class="estado-input" title="Estado de la tarjeta">
                <option value="ACTIVA">ACTIVA</option>
            </select>
        </div>
        <div class="tarjeta-pdf-section">
            <input type="text" class="pdf-tarjeta-path" placeholder="PDF de tarjeta" readonly data-pdf-path="">
            <button type="button" class="btn-seleccionar-pdf-tarjeta">Agregar PDF</button>
        </div>
        <button type="button" class="eliminar-tarjeta-btn">Eliminar</button>
    `;
    tarjetasList.appendChild(div);

    // Cargar estados disponibles en el selector
    cargarEstadosEnSelector(div.querySelector('.estado-input'));

    div.querySelector('.eliminar-tarjeta-btn').addEventListener('click', () => {
        div.remove();
    });
    div.querySelector('.btn-seleccionar-pdf-tarjeta').addEventListener('click', async () => {
        if (window.api && window.api.abrirDialogoPdf) {
            const pdfPath = await window.api.abrirDialogoPdf();
            if (pdfPath) {
                const pdfInput = div.querySelector('.pdf-tarjeta-path');
                // Mostrar solo el nombre del archivo
                const fileName = pdfPath.split(/[\\/]/).pop();
                pdfInput.value = fileName;
                // Guardar la ruta completa en dataset
                pdfInput.dataset.pdfPath = pdfPath;
                // Marcar que el PDF fue cambiado (archivo NUEVO del sistema)
                pdfInput.dataset.pdfChanged = 'true';
                console.log('PDF seleccionado para nueva tarjeta:', pdfPath);
            }
        }
    });
};

export const resetExpedienteForm = () => {
    const expedienteForm = document.getElementById('expediente-form');
    expedienteForm.reset();

    // Limpiar flags de edición
    delete expedienteForm.dataset.editingId;
    delete expedienteForm.dataset.expedienteId; // Por compatibilidad
    delete expedienteForm.dataset.isEditing;
    delete expedienteForm.dataset.tarjetas;
    delete expedienteForm.dataset.actaEntregaId;

    // Restaurar título del formulario
    const formTitle = document.querySelector('#vista-registro h2');
    if (formTitle) {
        formTitle.textContent = 'Registrar Nuevo Expediente';
    }

    // Restaurar texto del botón de guardar
    const guardarBtn = document.getElementById('guardar-expediente-btn');
    if (guardarBtn) {
        guardarBtn.textContent = 'Guardar Expediente';
    }

    // Restaurar valores por defecto
    document.getElementById('anioExpediente').value = new Date().getFullYear();
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];

    // Ocultar observaciones al resetear
    const observacionesContainer = document.getElementById('observaciones-container');
    const toggleObservacionesBtn = document.getElementById('toggle-observaciones');
    observacionesContainer.classList.add('hidden');
    toggleObservacionesBtn.innerHTML = 'Agregar Observaciones';
    toggleObservacionesBtn.classList.remove('active');

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
            return '';
        case 'error':
            return '';
        case 'warning':
            return '';
        case 'info':
        default:
            return '';
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

// Función mejorada para mostrar resultados de tarjetas con PDF dual
export const displayTarjetasResults = (results) => {
    try {
        searchTarjetasResults.innerHTML = '';

        if (results && results.length > 0) {
            // Crear un contenedor con animación
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'results-container';

            results.forEach((r, index) => {
                const item = document.createElement('div');
                item.className = 'search-result-item-dual fade-in';
                const resultId = `tarjeta-result-${index}`;
                item.id = resultId;

                // Agregar atributo data-estado para estilos dinámicos
                const estado = r.estado || 'ACTIVA';
                item.setAttribute('data-estado', estado);

                // Iconos para cada estado
                const estadoIconos = {
                    'ACTIVA': '',
                    'CANCELADA': '',
                    'SUSPENDIDA': '',
                    'VENCIDA': '',
                    'EN_TRAMITE': '',
                    'EN-TRAMITE': ''
                };

                const estadoNormalizado = estado.toUpperCase().replace(/ /g, '_');
                const iconoEstado = estadoIconos[estadoNormalizado] || '';

                // Crear estructura de dos columnas para información y PDFs
                item.innerHTML = `
                    <div class="result-info-section">
                        <div class="result-header-compact">
                            <h3>Tarjeta - ${r.placa}</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">N° Tarjeta:</span>
                                    <span class="info-value">${r.numeroTarjeta || r.tarjeta || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Estado:</span>
                                    <span class="estado-badge estado-${estado.toLowerCase().replace(/ /g, '-').replace(/_/g, '-')}">
                                        <span class="estado-icon">${iconoEstado}</span>
                                        ${estado}
                                    </span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Expediente:</span>
                                    <span class="info-value">${r.expediente}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Fecha:</span>
                                    <span class="info-value">${r.fecha}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pdf-viewers-dual">
                            <div class="pdf-viewer-column" id="${resultId}-tarjeta">
                                <div class="pdf-column-header">
                                    <span>Tarjeta de Propiedad</span>
                                </div>
                            </div>
                            <div class="pdf-viewer-column" id="${resultId}-expediente">
                                <div class="pdf-column-header">
                                    <span>Resolución</span>
                                </div>
                            </div>
                        </div>
                        
                        ${r.actaPdfPath ? `
                        <div class="additional-actions">
                            <button class="ver-pdf-acta-btn" onclick="window.api.enviar('abrir-pdf', '${r.actaPdfPath}')">
                                Ver Acta de Entrega
                            </button>
                        </div>
                        ` : ''}
                    </div>
                `;

                resultsContainer.appendChild(item);

                // Mostrar ambos PDFs con delay escalonado
                setTimeout(() => {
                    // PDF de la tarjeta (izquierda)
                    if (r.pdfPath) {
                        simplePdfViewer.createViewer(
                            `${resultId}-tarjeta`,
                            r.pdfPath,
                            `${r.placa}`
                        );
                    } else {
                        document.getElementById(`${resultId}-tarjeta`).innerHTML +=
                            '<div class="no-pdf-message">Sin PDF</div>';
                    }

                    // PDF del expediente (derecha)
                    if (r.expedientePdfPath) {
                        simplePdfViewer.createViewer(
                            `${resultId}-expediente`,
                            r.expedientePdfPath,
                            `Exp. ${r.expediente}`
                        );
                    } else {
                        document.getElementById(`${resultId}-expediente`).innerHTML +=
                            '<div class="no-pdf-message">Sin PDF</div>';
                    }
                }, index * 150); // Animación escalonada
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

// Función mejorada para mostrar resultados de expedientes
export const displayExpedientesResults = (results) => {
    try {
        searchExpedientesResults.innerHTML = '';

        if (results && results.length > 0) {
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'results-container';

            results.forEach((expediente, index) => {
                const item = document.createElement('div');
                item.className = 'expediente-result-item fade-in';
                const expedienteId = `expediente-result-${index}`;
                item.id = expedienteId;

                item.innerHTML = `
                    <div class="expediente-header">
                        <h3>Expediente de Resolución</h3>
                        <div class="expediente-details">
                            <p><strong>N° Expediente:</strong> ${expediente.numeroExpediente || 'N/A'}-${expediente.anioExpediente || 'N/A'}</p>
                            <p><strong>Fecha:</strong> ${expediente.fecha}</p>
                            ${expediente.numeroResolucion ? `<p><strong>N° Resolución:</strong> ${expediente.numeroResolucion}</p>` : ''}
                            ${expediente.informeTecnico ? `<p><strong>Informe Técnico:</strong> ${expediente.informeTecnico}</p>` : ''}
                            ${expediente.unidadNegocio ? `<p><strong>Unidad de Negocio:</strong> ${expediente.unidadNegocio}</p>` : ''}
                            ${expediente.nombreEmpresa ? `<p><strong>Empresa:</strong> ${expediente.nombreEmpresa}</p>` : ''}
                            ${expediente.numeroFichero ? `<p><strong>N° Fichero:</strong> ${expediente.numeroFichero}</p>` : ''}
                            ${expediente.observaciones ? `<p><strong>Observaciones:</strong> ${expediente.observaciones}</p>` : ''}
                        </div>
                    </div>
                `;

                // Mostrar tarjetas asociadas con visualización dinámica
                if (expediente.tarjetasAsociadas && expediente.tarjetasAsociadas.length > 0) {
                    const tarjetasDiv = document.createElement('div');
                    tarjetasDiv.className = 'tarjetas-asociadas';

                    const cantidadTarjetas = expediente.tarjetasAsociadas.length;
                    const mostrarColapsable = cantidadTarjetas > 3; // Colapsable si hay más de 3
                    const maxTarjetasVisibles = 2; // Mostrar solo 2 cuando está colapsado

                    // Encabezado con contador
                    const header = document.createElement('div');
                    header.className = 'tarjetas-header';
                    header.innerHTML = `
                        <h4>Tarjetas Asociadas (${cantidadTarjetas}):</h4>
                        ${mostrarColapsable ? `<button class="toggle-tarjetas-btn" onclick="this.closest('.tarjetas-asociadas').querySelector('.tarjetas-list').classList.toggle('expanded'); this.textContent = this.closest('.tarjetas-asociadas').querySelector('.tarjetas-list').classList.contains('expanded') ? 'Ver menos' : 'Ver todas'">Ver todas</button>` : ''}
                    `;
                    tarjetasDiv.appendChild(header);

                    // Contenedor de la lista de tarjetas
                    const tarjetasList = document.createElement('div');
                    tarjetasList.className = mostrarColapsable ? 'tarjetas-list collapsed' : 'tarjetas-list expanded';

                    expediente.tarjetasAsociadas.forEach((tarjeta, index) => {
                        const tarjetaItem = document.createElement('div');
                        tarjetaItem.className = 'tarjeta-asociada';

                        // Ocultar tarjetas después de las primeras 2 si está colapsado
                        if (mostrarColapsable && index >= maxTarjetasVisibles) {
                            tarjetaItem.classList.add('tarjeta-hidden');
                        }

                        // Manejar diferentes nombres de campo para el número de tarjeta
                        const numeroTarjeta = tarjeta.numeroTarjeta || tarjeta.tarjeta || tarjeta.numero || 'N/A';

                        tarjetaItem.innerHTML = `
                            <div class="tarjeta-info">
                                <span class="tarjeta-badge">${index + 1}</span>
                                <span class="tarjeta-datos">Placa: <strong>${tarjeta.placa}</strong> - Tarjeta: <strong>${numeroTarjeta}</strong></span>
                                ${tarjeta.pdfPath ? `<button class="ver-pdf-tarjeta-btn" data-pdf-path="${tarjeta.pdfPath.replace(/"/g, '&quot;')}">Ver PDF</button>` : ''}
                            </div>
                        `;

                        // Agregar event listener al botón de PDF si existe
                        if (tarjeta.pdfPath) {
                            const pdfBtn = tarjetaItem.querySelector('.ver-pdf-tarjeta-btn');
                            if (pdfBtn) {
                                pdfBtn.addEventListener('click', () => {
                                    const pdfPath = pdfBtn.getAttribute('data-pdf-path');
                                    console.log('Abriendo PDF de tarjeta:', pdfPath);
                                    window.api.enviar('abrir-pdf', pdfPath);
                                });
                            }
                        }

                        tarjetasList.appendChild(tarjetaItem);
                    });

                    tarjetasDiv.appendChild(tarjetasList);
                    item.appendChild(tarjetasDiv);
                }

                resultsContainer.appendChild(item);

                // Solo mostrar PDF del expediente (no de las tarjetas) usando el visor simple
                if (expediente.pdfPath) {
                    setTimeout(() => {
                        simplePdfViewer.createViewer(expedienteId, expediente.pdfPath, `PDF Expediente - ${expediente.expediente}`);
                    }, (index * 100) + 100);
                }
            });

            searchExpedientesResults.appendChild(resultsContainer);

            // Agregar información de resultados
            const infoDiv = document.createElement('div');
            infoDiv.className = 'search-info';
            infoDiv.innerHTML = `<p class="text-muted">Se encontraron ${results.length} expediente(s)</p>`;
            searchExpedientesResults.prepend(infoDiv);

        } else {
            searchExpedientesResults.innerHTML = `
                <div class="no-results">
                    <p>No se encontraron expedientes.</p>
                    <small class="text-muted">Intente con un término diferente</small>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error al mostrar resultados de expedientes:', error);
        searchExpedientesResults.innerHTML = `
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

export const clearExpedientesResults = () => {
    if (searchExpedientesResults) {
        searchExpedientesResults.innerHTML = '';
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