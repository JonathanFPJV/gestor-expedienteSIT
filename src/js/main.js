// src/js/main.js
import { setupEventListeners } from './modules/handlers.js';
import * as ui from './modules/ui.js';
import { dataService } from './modules/dataService.js';
import { loadingManager } from './modules/loadingManager.js';
import { eventBus, APP_EVENTS } from './modules/eventBus.js';
import { debounceSearch } from './modules/debounce.js';
import { navigationManager } from './modules/navigationManager.js';
import { expedientesCRUD } from './modules/expedientesCRUD.js';
import { tarjetasCRUD } from './modules/tarjetasCRUD.js';
import { actasEntregaCRUD } from './modules/actasEntregaCRUD.js';
import { searchManager } from './modules/searchManager.js';
import { SimplePDFViewer } from './modules/simplePdfViewer.js';
import { tableResponsive } from './modules/tableResponsive.js';
import { ocrProcessor } from './modules/ocrProcessor.js';
import { ocrUI } from './modules/ocrUI.js';
import { ocrParser } from './modules/ocrParser.js';
import { formAutofill } from './modules/formAutofill.js';
import batchOcrProcessor from './modules/batchOcrProcessor.js';
import batchOcrUI from './modules/batchOcrUI.js';
import actaOcrProcessor from './modules/actaOcrProcessor.js';
import { dashboardManager } from './modules/dashboard/index.js';

// Inicializar visualizador de PDFs
const simplePdfViewer = new SimplePDFViewer();

// Estado global para tarjetas detectadas por batch
let batchDetectedCards = [];
let selectedPdfPath = null; // PDF del expediente (acta de resolución)
let selectedPdfBatchPath = null; // PDF batch para OCR de múltiples tarjetas
let selectedActaPdfPath = null; // PDF del acta de entrega
let tarjetas = []; // Array para manejar las tarjetas a guardar
let actaExtractedData = null; // Datos extraídos del Acta de Entrega

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar servicios
    initializeApp();

    // Inicializar UI de OCR
    ocrUI.initialize();
    batchOcrUI.initialize();

    // Inicializar auto-completado de formulario
    formAutofill.initializeFormElements();

    // Inicializar Dashboard
    initializeDashboard();

    // Hacer disponibles globalmente
    window.navigationManager = navigationManager;
    window.expedientesCRUD = expedientesCRUD;
    window.tarjetasCRUD = tarjetasCRUD;
    window.actasEntregaCRUD = actasEntregaCRUD;
    window.ocrProcessor = ocrProcessor; // Exponer OCR globalmente
    window.ocrUI = ocrUI;
    window.ocrParser = ocrParser;
    window.formAutofill = formAutofill;
    window.batchOcrProcessor = batchOcrProcessor; // Exponer Batch OCR
    window.batchOcrUI = batchOcrUI;
    window.searchManager = searchManager;
    window.dataService = dataService;
    window.ui = ui;
    window.simplePdfViewer = simplePdfViewer; // ✅ Visualizador de PDFs
    window.dashboardManager = dashboardManager; // 📊 Dashboard Manager

    // Hacer disponibles las funciones de búsqueda para searchManager
    window.performTarjetasSearch = performTarjetasSearch;
    window.performExpedientesSearch = performExpedientesSearch;

    // Escuchadores para la ventana principal
    const expedienteForm = document.getElementById('expediente-form');
    const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-btn');
    const agregarTarjetaBtn = document.getElementById('agregar-tarjeta-btn');

    // 🆕 Escuchar eventos de cambio de vista desde módulos
    document.addEventListener('cambiar-vista', (e) => {
        if (e.detail) {
            console.log('🔄 Solicitud de cambio de vista recibida:', e.detail);
            navigationManager.showView(e.detail);

            // Actualizar botón activo en el menú
            const buttonId = navigationManager.getButtonIdFromView(e.detail);
            if (buttonId) {
                const button = document.getElementById(buttonId);
                if (button) navigationManager.setActiveButton(button);
            }
        }
    });

    // Botones de búsqueda
    const searchTarjetasBtn = document.getElementById('search-tarjetas-btn');
    const searchExpedientesBtn = document.getElementById('search-expedientes-btn');

    // Tabs de búsqueda
    const tabTarjetas = document.getElementById('tab-tarjetas');
    const tabExpedientes = document.getElementById('tab-expedientes');
    const searchTarjetasSection = document.getElementById('search-tarjetas');
    const searchExpedientesSection = document.getElementById('search-expedientes');

    // Manejar tabs de búsqueda
    tabTarjetas.addEventListener('click', () => {
        tabTarjetas.classList.add('active');
        tabExpedientes.classList.remove('active');
        searchTarjetasSection.style.display = 'block';
        searchExpedientesSection.style.display = 'none';
    });

    tabExpedientes.addEventListener('click', () => {
        tabExpedientes.classList.add('active');
        tabTarjetas.classList.remove('active');
        searchExpedientesSection.style.display = 'block';
        searchTarjetasSection.style.display = 'none';
    });

    // Botón toggle para observaciones
    const toggleObservacionesBtn = document.getElementById('toggle-observaciones');
    const observacionesContainer = document.getElementById('observaciones-container');

    // Toggle para mostrar/ocultar observaciones
    toggleObservacionesBtn.addEventListener('click', () => {
        const isHidden = observacionesContainer.classList.contains('hidden');

        if (isHidden) {
            observacionesContainer.classList.remove('hidden');
            toggleObservacionesBtn.innerHTML = '➖ Ocultar Observaciones';
            toggleObservacionesBtn.classList.add('active');
        } else {
            observacionesContainer.classList.add('hidden');
            toggleObservacionesBtn.innerHTML = '➕ Agregar Observaciones';
            toggleObservacionesBtn.classList.remove('active');
            // Limpiar el campo cuando se oculta
            document.getElementById('observaciones').value = '';
        }
    });

    // Toggle para mostrar/ocultar campos de Acta de Entrega
    const incluirActaEntregaCheckbox = document.getElementById('incluir-acta-entrega');
    const actaEntregaFields = document.getElementById('acta-entrega-fields');
    let selectedActaPdfPath = null;

    incluirActaEntregaCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            actaEntregaFields.style.display = 'block';
        } else {
            actaEntregaFields.style.display = 'none';
            // Limpiar campos cuando se desmarca
            document.getElementById('fechaEntrega').value = '';
            document.getElementById('n_tarjetas_entregadas').value = '';
            document.getElementById('observacionesActa').value = '';
            document.getElementById('pdf-acta-path').value = '';
            selectedActaPdfPath = null;
        }
    });

    // Botón para seleccionar PDF del Acta de Entrega
    const seleccionarPdfActaBtn = document.getElementById('seleccionar-pdf-acta-btn');
    seleccionarPdfActaBtn.addEventListener('click', async () => {
        loadingManager.showButtonLoading(seleccionarPdfActaBtn, 'Seleccionando...');
        try {
            selectedActaPdfPath = await window.api.abrirDialogoPdf();
            if (selectedActaPdfPath) {
                document.getElementById('pdf-acta-path').value = selectedActaPdfPath.split(/[\/\\]/).pop();
            }
        } catch (error) {
            console.error('Error al seleccionar PDF del Acta:', error);
            ui.showNotification('Error al seleccionar el archivo PDF del Acta.', 'error');
        } finally {
            loadingManager.hideButtonLoading(seleccionarPdfActaBtn);
        }
    });

    // Botón para procesar Acta de Entrega con OCR
    const procesarActaOcrBtn = document.getElementById('procesar-acta-ocr-btn');
    const actaOcrProgress = document.getElementById('acta-ocr-progress');
    const actaOcrStatus = document.getElementById('acta-ocr-status');
    const actaOcrProgressBar = document.getElementById('acta-ocr-progress-bar');

    procesarActaOcrBtn.addEventListener('click', async () => {
        const pdfActaPath = document.getElementById('pdf-acta-path').value;

        if (!pdfActaPath || pdfActaPath === 'Ningún archivo seleccionado') {
            ui.showNotification('⚠️ Primero debes seleccionar un PDF de Acta de Entrega', 'warning');
            return;
        }

        try {
            // Mostrar progreso
            actaOcrProgress.style.display = 'block';
            actaOcrStatus.textContent = '🔄 Procesando acta con OCR...';
            actaOcrProgressBar.style.width = '20%';
            actaOcrProgressBar.textContent = '20%';

            loadingManager.showButtonLoading(procesarActaOcrBtn, 'Procesando...');

            console.log('🔍 Iniciando procesamiento OCR del Acta...');
            console.log(`   PDF: ${selectedActaPdfPath}`);

            // Procesar el PDF del Acta
            const resultado = await actaOcrProcessor.procesarActaPdf(selectedActaPdfPath);

            actaOcrProgressBar.style.width = '60%';
            actaOcrProgressBar.textContent = '60%';

            if (resultado.success && resultado.data) {
                console.log('✅ Datos extraídos del Acta:', resultado.data);

                // Guardar datos temporalmente
                actaExtractedData = resultado.data;

                actaOcrProgressBar.style.width = '80%';
                actaOcrProgressBar.textContent = '80%';

                // Llenar formulario con datos extraídos
                if (resultado.data.fechaEntrega) {
                    document.getElementById('fechaEntrega').value = resultado.data.fechaEntrega;
                }

                if (resultado.data.numeroTarjetas > 0) {
                    document.getElementById('n_tarjetas_entregadas').value = resultado.data.numeroTarjetas;
                }

                if (resultado.data.observaciones) {
                    document.getElementById('observacionesActa').value = resultado.data.observaciones;
                }

                actaOcrProgressBar.style.width = '100%';
                actaOcrProgressBar.textContent = '100%';
                actaOcrProgressBar.style.background = '#4CAF50';
                actaOcrStatus.textContent = '✅ Datos extraídos correctamente';

                ui.showNotification('✅ Datos del Acta extraídos exitosamente', 'success');

                // Mostrar resumen en consola
                console.log('\n📋 RESUMEN DE DATOS EXTRAÍDOS:');
                console.log('─────────────────────────────────────────');
                console.log(`Fecha de Entrega: ${resultado.data.fechaEntrega || 'No detectada'}`);
                console.log(`Número de Tarjetas: ${resultado.data.numeroTarjetas || 0}`);
                console.log(`Observaciones: ${resultado.data.observaciones ? resultado.data.observaciones.substring(0, 100) + '...' : 'No detectadas'}`);
                console.log('─────────────────────────────────────────\n');

                // Ocultar progreso después de 3 segundos
                setTimeout(() => {
                    actaOcrProgress.style.display = 'none';
                    actaOcrProgressBar.style.width = '0%';
                    actaOcrProgressBar.style.background = '#9C27B0';
                }, 3000);

            } else {
                throw new Error(resultado.error || 'No se pudieron extraer datos del Acta');
            }

        } catch (error) {
            console.error('❌ Error procesando Acta con OCR:', error);

            actaOcrProgressBar.style.background = '#f44336';
            actaOcrProgressBar.style.width = '100%';
            actaOcrProgressBar.textContent = 'Error';
            actaOcrStatus.textContent = '❌ Error al procesar el Acta';

            ui.showNotification(`❌ Error al procesar Acta: ${error.message}`, 'error');

            setTimeout(() => {
                actaOcrProgress.style.display = 'none';
                actaOcrProgressBar.style.width = '0%';
                actaOcrProgressBar.style.background = '#9C27B0';
            }, 3000);

        } finally {
            loadingManager.hideButtonLoading(procesarActaOcrBtn);
        }
    });

    // -- Lógica para agregar tarjetas dinámicamente --
    agregarTarjetaBtn.addEventListener('click', () => {
        ui.addTarjetaInput();
    });

    // -- Procesamiento por lotes (Batch OCR) --
    const seleccionarPdfBatchBtn = document.getElementById('seleccionar-pdf-batch-btn');
    const pdfBatchPathInput = document.getElementById('pdf-batch-path');
    const aplicarTarjetasBatchBtn = document.getElementById('aplicar-tarjetas-batch-btn');
    const batchResultsContainer = document.getElementById('batch-results-container');

    seleccionarPdfBatchBtn.addEventListener('click', async () => {
        try {
            loadingManager.showButtonLoading(seleccionarPdfBatchBtn, 'Procesando...');

            // Seleccionar PDF
            selectedPdfBatchPath = await window.api.abrirDialogoPdf();
            if (!selectedPdfBatchPath) {
                console.log('Usuario canceló la selección de PDF batch');
                return;
            }

            pdfBatchPathInput.value = selectedPdfBatchPath.split(/[\\\/]/).pop();
            console.log('📄 PDF Batch seleccionado:', selectedPdfBatchPath);

            // Resetear estado
            batchDetectedCards = [];
            batchOcrUI.reset();

            // Mostrar contenedor de progreso
            document.getElementById('batch-progress-container').style.display = 'block';
            batchResultsContainer.style.display = 'none';

            // Configurar callback de progreso
            batchOcrProcessor.setProgressCallback((pageNum, totalPages, pageData) => {
                batchOcrUI.updateProgress(pageNum, totalPages, pageData);
            });

            // Iniciar procesamiento
            batchOcrUI.showProcessingStart(1); // Se actualizará con el total real
            const results = await batchOcrProcessor.processPdfBatch(selectedPdfBatchPath);

            // Guardar resultados temporalmente
            batchDetectedCards = results.filter(r => r.success);

            console.log(`✅ Procesamiento batch completado: ${batchDetectedCards.length} tarjetas detectadas`);

            // Mostrar resultados
            batchOcrUI.showProcessingComplete(results);
            batchResultsContainer.style.display = 'block';

            // Mostrar notificación
            ui.showNotification(
                `✅ ${batchDetectedCards.length} tarjeta(s) detectada(s) correctamente`,
                'success'
            );

        } catch (error) {
            console.error('❌ Error en procesamiento batch:', error);
            batchOcrUI.showError(error.message);
            ui.showNotification('Error al procesar el PDF. Verifica el archivo.', 'error');
        } finally {
            loadingManager.hideButtonLoading(seleccionarPdfBatchBtn);
        }
    });

    // Aplicar todas las tarjetas detectadas al formulario
    aplicarTarjetasBatchBtn.addEventListener('click', () => {
        if (batchDetectedCards.length === 0) {
            ui.showNotification('No hay tarjetas detectadas para aplicar', 'warning');
            return;
        }

        console.log(`🎯 Aplicando ${batchDetectedCards.length} tarjetas al formulario...`);

        // Limpiar tarjetas existentes
        const tarjetasList = document.getElementById('tarjetas-list');
        tarjetasList.innerHTML = '';
        tarjetas = [];

        // Agregar cada tarjeta detectada
        batchDetectedCards.forEach((card, index) => {
            if (card.data && (card.data.placaRodaje || card.data.codigoUnico)) {
                ui.addTarjetaInput();

                // Obtener los inputs de la última tarjeta agregada
                const tarjetaInputs = tarjetasList.querySelectorAll('.tarjeta-item');
                const lastTarjeta = tarjetaInputs[tarjetaInputs.length - 1];

                if (lastTarjeta) {
                    const placaInput = lastTarjeta.querySelector('input[placeholder="Placa"]');
                    const numeroInput = lastTarjeta.querySelector('input[placeholder="N° Tarjeta"]');
                    const pdfInput = lastTarjeta.querySelector('.pdf-tarjeta-path');

                    if (placaInput && card.data.placaRodaje) {
                        placaInput.value = card.data.placaRodaje;
                        placaInput.classList.add('autofilled');
                        setTimeout(() => placaInput.classList.remove('autofilled'), 2000);
                    }

                    if (numeroInput && card.data.codigoUnico) {
                        numeroInput.value = card.data.codigoUnico;
                        numeroInput.classList.add('autofilled');
                        setTimeout(() => numeroInput.classList.remove('autofilled'), 2000);
                    }

                    // Si hay PDF generado, asignar la ruta directamente al input
                    if (card.pdfPath && pdfInput) {
                        // Mostrar solo el nombre del archivo
                        const fileName = card.pdfPath.split(/[\\/]/).pop();
                        pdfInput.value = fileName;
                        // ✅ CRÍTICO: Guardar ruta completa en dataset para que se envíe al backend
                        pdfInput.dataset.pdfPath = card.pdfPath;
                        pdfInput.classList.add('autofilled');
                        setTimeout(() => pdfInput.classList.remove('autofilled'), 2000);

                        console.log(`   📄 PDF asignado: ${card.pdfPath}`);
                        console.log(`   💾 Guardado en dataset.pdfPath: ${pdfInput.dataset.pdfPath}`);
                    }

                    console.log(`✅ Tarjeta ${index + 1} aplicada:`, {
                        placa: card.data.placaRodaje,
                        numero: card.data.codigoUnico,
                        pdfPath: card.pdfPath || 'No generado'
                    });
                }
            }
        });

        ui.showNotification(
            `✨ ${batchDetectedCards.length} tarjeta(s) aplicada(s) al formulario`,
            'success'
        );

        // Scroll suave a la lista de tarjetas
        tarjetasList.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 🧹 Limpiar variables y ocultar resultados después de aplicar
        console.log('🧹 Limpiando variables después de aplicar tarjetas...');
        batchDetectedCards = [];
        selectedPdfBatchPath = null;
        pdfBatchPathInput.value = '';

        // Ocultar tabla de resultados
        batchResultsContainer.style.display = 'none';
        batchOcrUI.reset();

        console.log('✅ Listo para nuevo procesamiento batch');
    });

    // Dividir PDF en páginas individuales con nombre de código único
    const dividirPdfBtn = document.getElementById('dividir-pdf-btn');
    dividirPdfBtn.addEventListener('click', async () => {
        if (batchDetectedCards.length === 0) {
            ui.showNotification('⚠️ Primero debes procesar un PDF con OCR', 'warning');
            return;
        }

        // 📎 Usar la ruta COMPLETA del PDF, no solo el nombre del archivo
        if (!selectedPdfBatchPath) {
            ui.showNotification('⚠️ No hay PDF cargado para dividir', 'warning');
            return;
        }

        try {
            loadingManager.showButtonLoading(dividirPdfBtn, 'Dividiendo PDF...');

            console.log('📁 Iniciando división de PDF...');
            console.log(`   PDF original: ${selectedPdfBatchPath}`);
            console.log(`   Páginas procesadas: ${batchDetectedCards.length}`);

            // Llamar al procesador para dividir el PDF
            const resultado = await batchOcrProcessor.dividirPdfPorCodigos(selectedPdfBatchPath, batchDetectedCards);

            if (resultado.success) {
                const { archivosCreados, errores, carpetaDestino } = resultado;

                console.log('✅ División completada exitosamente');
                console.log(`   Archivos creados: ${archivosCreados.length}`);
                console.log(`   Errores: ${errores.length}`);

                // Actualizar la tabla con las rutas de los PDFs generados
                batchOcrUI.updatePdfPaths(batchDetectedCards);

                // Mostrar resumen
                let mensaje = `✅ PDF dividido exitosamente\n\n`;
                mensaje += `📁 Carpeta: ${carpetaDestino}\n`;
                mensaje += `📄 Archivos creados: ${archivosCreados.length}\n`;

                if (errores.length > 0) {
                    mensaje += `⚠️ Errores: ${errores.length}`;
                }

                // Mostrar detalles en consola
                console.log('\n📊 Archivos creados:');
                archivosCreados.forEach(archivo => {
                    console.log(`   ${archivo.nombreArchivo} (Página ${archivo.pagina})`);
                });

                ui.showNotification(
                    `✅ ${archivosCreados.length} archivo(s) PDF creado(s) exitosamente`,
                    'success'
                );

                // Preguntar si desea abrir la carpeta
                const abrirCarpeta = confirm(mensaje + '\n\n¿Deseas abrir la carpeta donde se generaron los archivos?');

                if (abrirCarpeta) {
                    await window.api.shell.openPath(carpetaDestino);
                    console.log('📂 Carpeta abierta por el usuario');
                } else {
                    console.log('📂 Usuario optó por no abrir la carpeta');
                }

                // 📝 NOTA: NO limpiar batchDetectedCards aquí para permitir
                // que el usuario pueda aplicar las tarjetas después de dividir
                console.log('💡 Tarjetas siguen disponibles para aplicar al formulario');

            } else {
                throw new Error(resultado.message || 'Error desconocido al dividir PDF');
            }

        } catch (error) {
            console.error('❌ Error dividiendo PDF:', error);
            ui.showNotification(`❌ Error al dividir PDF: ${error.message}`, 'error');
        } finally {
            loadingManager.hideButtonLoading(dividirPdfBtn);
        }
    });

    // -- Botón Cancelar Expediente --
    const cancelarExpedienteBtn = document.getElementById('cancelar-expediente-btn');
    cancelarExpedienteBtn?.addEventListener('click', () => {
        // Confirmar antes de cancelar si hay datos en el formulario
        const form = document.getElementById('expediente-form');
        const hasData = form.querySelector('#numeroExpediente')?.value ||
            form.querySelector('#nombreEmpresa')?.value ||
            form.querySelector('#tarjetas-list')?.children.length > 0;

        if (hasData) {
            const confirmar = confirm('¿Estás seguro de cancelar? Se perderán todos los cambios no guardados.');
            if (!confirmar) return;
        }

        // Limpiar variables globales
        selectedPdfPath = null;
        selectedPdfBatchPath = null;
        selectedActaPdfPath = null;
        batchDetectedCards = [];

        // Limpiar inputs de PDFs batch
        if (pdfBatchPathInput) pdfBatchPathInput.value = '';
        if (batchResultsContainer) batchResultsContainer.style.display = 'none';

        // Limpiar formulario
        ui.resetExpedienteForm();

        // Navegar a la vista de gestión
        navigationManager.navigateTo('vista-crud');

        console.log('🔙 Edición/creación cancelada - Regresando a vista de gestión');
    });

    // -- Lógica para guardar un expediente --
    expedienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Deshabilitar el botón de envío para evitar múltiples envíos
        const submitBtn = expedienteForm.querySelector('button[type="submit"]');
        loadingManager.showButtonLoading(submitBtn, 'Guardando...');

        try {
            // Obtener datos del expediente
            const expedienteData = ui.getExpedienteData();

            // Obtener tarjetas asociadas
            expedienteData.tarjetas = ui.getTarjetaData();

            // Validaciones básicas
            if (!expedienteData.numeroExpediente) {
                ui.showNotification('El número de expediente es requerido.', 'warning');
                return;
            }

            if (!expedienteData.fechaExpediente) {
                ui.showNotification('La fecha del expediente es requerida.', 'warning');
                return;
            }

            // Si hay PDF del expediente seleccionado
            if (selectedPdfPath) {
                expedienteData.pdfSourcePath = selectedPdfPath;
                console.log('📄 PDF del expediente incluido:', selectedPdfPath);
            } else {
                console.log('⚠️ No hay PDF del expediente seleccionado');
            }

            // Si se marcó incluir acta de entrega, agregarla
            if (incluirActaEntregaCheckbox.checked) {
                const fechaEntrega = document.getElementById('fechaEntrega').value;

                if (!fechaEntrega) {
                    ui.showNotification('La fecha de entrega del acta es requerida.', 'warning');
                    return;
                }

                expedienteData.actaEntrega = {
                    fechaEntrega: fechaEntrega,
                    n_tarjetas_entregadas: parseInt(document.getElementById('n_tarjetas_entregadas').value) || 0,
                    observaciones: document.getElementById('observacionesActa').value || null,
                    pdfSourcePath: selectedActaPdfPath
                };
                console.log('📋 Acta de entrega incluida:', expedienteData.actaEntrega);
            }

            console.log('📤 Enviando datos al backend:', expedienteData);

            // Verificar si estamos editando o creando
            const editingId = expedienteForm.dataset.editingId;
            let result;

            if (editingId) {
                // MODO EDICIÓN - Actualizar expediente existente
                console.log('✏️ Modo edición - Actualizando expediente ID:', editingId);
                result = await dataService.updateExpediente(parseInt(editingId), expedienteData);

                // 📎 Actualizar PDFs de tarjetas si hay cambios
                if (result.success) {
                    const tarjetasConPdfNuevo = [];

                    // Buscar tarjetas que tengan PDFs nuevos o modificados
                    if (expedienteData.tarjetas && expedienteData.tarjetas.length > 0) {
                        expedienteData.tarjetas.forEach((tarjeta, index) => {
                            const tarjetaDiv = document.querySelector(`[data-tarjeta-index="${index}"]`);
                            if (tarjetaDiv) {
                                const pdfInput = tarjetaDiv.querySelector('.pdf-tarjeta-path');
                                if (pdfInput && pdfInput.dataset.pdfChanged === 'true') {
                                    const tarjetaId = tarjetaDiv.dataset.tarjetaId;
                                    const newPdfPath = pdfInput.dataset.pdfPath;

                                    if (tarjetaId && newPdfPath) {
                                        tarjetasConPdfNuevo.push({
                                            tarjetaId: parseInt(tarjetaId),
                                            pdfPath: newPdfPath,
                                            placa: tarjeta.placa,
                                            numeroTarjeta: tarjeta.numeroTarjeta
                                        });
                                    }
                                }
                            }
                        });
                    }

                    // Actualizar PDFs de tarjetas modificadas
                    if (tarjetasConPdfNuevo.length > 0) {
                        console.log(`📎 Actualizando ${tarjetasConPdfNuevo.length} tarjetas con nuevos PDFs...`);

                        for (const tarjetaInfo of tarjetasConPdfNuevo) {
                            try {
                                const updateResult = await window.api.invoke('tarjeta:actualizar',
                                    tarjetaInfo.tarjetaId,
                                    {
                                        placa: tarjetaInfo.placa,
                                        numeroTarjeta: tarjetaInfo.numeroTarjeta,
                                        estado: 'ACTIVA',
                                        expedienteId: parseInt(editingId),
                                        actaEntregaId: null
                                    },
                                    tarjetaInfo.pdfPath
                                );

                                if (updateResult.success) {
                                    console.log(`✅ PDF de tarjeta ${tarjetaInfo.tarjetaId} actualizado`);
                                } else {
                                    console.warn(`⚠️ No se pudo actualizar PDF de tarjeta ${tarjetaInfo.tarjetaId}`);
                                }
                            } catch (pdfError) {
                                console.error(`❌ Error al actualizar PDF de tarjeta ${tarjetaInfo.tarjetaId}:`, pdfError);
                            }
                        }
                    }
                }
            } else {
                // MODO CREACIÓN - Crear nuevo expediente
                console.log('➕ Modo creación - Creando nuevo expediente');
                result = await dataService.createExpediente(expedienteData);
            }

            console.log('📥 Respuesta del backend:', result);

            if (result.success) {
                const mensaje = editingId ? '✅ Expediente actualizado exitosamente.' : '✅ Expediente guardado exitosamente.';
                ui.showNotification(mensaje, 'success');
                ui.resetExpedienteForm();

                // Limpiar flag de edición
                delete expedienteForm.dataset.editingId;
                delete expedienteForm.dataset.tarjetas;
                delete expedienteForm.dataset.actaEntregaId;

                selectedPdfPath = null;
                selectedPdfBatchPath = null;
                selectedActaPdfPath = null;
                tarjetas = []; // Limpiar array de tarjetas

                // 🔄 Navegar automáticamente a la vista de gestión para ver el nuevo expediente
                setTimeout(() => {
                    navigationManager.navigateTo('vista-crud');
                    // Recargar la tabla de expedientes
                    if (window.expedientesCRUD) {
                        window.expedientesCRUD.loadExpedientes();
                    }
                }, 500);
            } else {
                ui.showNotification('❌ Error: ' + (result.message || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('❌ Error al procesar el formulario:', error);
            ui.showNotification('Error inesperado al guardar el expediente.', 'error');
        } finally {
            loadingManager.hideButtonLoading(submitBtn);
        }
    });

    // -- Lógica para buscar tarjetas --
    // La búsqueda ahora se maneja por searchManager automáticamente

    // Configurar búsqueda mejorada con searchManager
    // searchManager.initializeSearch(); // Ya se inicializa automáticamente

    // -- Lógica para seleccionar PDF (SOLO SELECCIÓN) --
    seleccionarPdfBtn.addEventListener('click', async () => {
        loadingManager.showButtonLoading(seleccionarPdfBtn, 'Seleccionando...');
        try {
            selectedPdfPath = await window.api.abrirDialogoPdf();
            if (selectedPdfPath) {
                // Actualizar UI con nombre del archivo
                ui.updatePdfFilePath(selectedPdfPath);

                // Mostrar botón de extraer OCR
                const extraerOcrBtn = document.getElementById('extraer-ocr-btn');
                if (extraerOcrBtn) {
                    extraerOcrBtn.style.display = 'inline-block';
                }
                console.log('📄PDF seleccionado:', selectedPdfPath);
                ui.showNotification('📄 PDF seleccionado. Ahora puedes extraer el texto OCR.', 'success');

            }
        } catch (error) {
            console.error('Error al seleccionar PDF:', error);
            ui.showNotification('Error al seleccionar el archivo PDF.', 'error');
        } finally {
            loadingManager.hideButtonLoading(seleccionarPdfBtn);
        }
    });

    // -- Lógica para extraer OCR (SOLO EXTRACCIÓN) --
    const extraerOcrBtn = document.getElementById('extraer-ocr-btn');
    if (extraerOcrBtn) {
        extraerOcrBtn.addEventListener('click', async () => {
            if (!selectedPdfPath) {
                ui.showNotification('⚠️ Primero debes seleccionar un PDF', 'warning');
                return;
            }

            loadingManager.showButtonLoading(extraerOcrBtn, 'Extrayendo...');

            try {
                // 🤖 Iniciar proceso completo: OCR → Parser → Auto-completado
                console.log('🚀 Iniciando proceso completo OCR → Parser → Auto-completado...');
                ocrUI.showProcessing('Extrayendo texto de la primera página...');

                // Paso 1: Extraer texto de la primera página
                const extractedText = await ocrProcessor.extractTextFromFirstPage(selectedPdfPath);

                if (extractedText && extractedText.trim().length > 0) {
                    ocrUI.updateMessage('Analizando datos del expediente...');

                    // Paso 2: Parsear el texto y extraer campos
                    const parsedData = ocrParser.parseExpedienteData(extractedText);

                    if (parsedData) {
                        ocrUI.updateMessage('Auto-completando formulario...');

                        // Paso 3: Auto-completar el formulario
                        const stats = formAutofill.autofillForm(parsedData);

                        // Mostrar resultado
                        if (stats.filled > 0) {
                            ocrUI.showSuccess(`✅ ${stats.filled} campos auto-completados`);
                            ui.showNotification(`✨ Formulario auto-completado: ${stats.filled}/${stats.total} campos`, 'success');
                        } else {
                            ocrUI.showError('⚠️ No se detectaron datos');
                            ui.showNotification('No se pudieron extraer datos del PDF', 'warning');
                        }
                    } else {
                        ocrUI.showError('⚠️ No se detectaron datos');
                        ui.showNotification('No se pudieron parsear los datos', 'warning');
                    }
                } else {
                    ocrUI.showError('⚠️ No se pudo extraer texto');
                    ui.showNotification('No se detectó texto en el documento', 'warning');
                }
            } catch (ocrError) {
                console.error('❌ Error en OCR:', ocrError);
                ocrUI.showError('❌ Error al procesar el documento');
                ui.showNotification('Error al procesar el PDF con OCR', 'error');
            } finally {
                loadingManager.hideButtonLoading(extraerOcrBtn);
            }
        });
    }
});

// Funciones auxiliares para búsquedas
async function performTarjetasSearch(forceRefresh = false, searchTerm = null) {
    const searchInput = document.getElementById('search-tarjetas-input');
    const searchBtn = document.getElementById('search-tarjetas-btn');
    const term = searchTerm || searchInput?.value.trim();

    console.log('performTarjetasSearch llamada con:', { forceRefresh, searchTerm, term });

    if (!term) {
        if (!searchTerm) { // Solo mostrar warning si es búsqueda manual
            ui.showNotification('Ingrese un término de búsqueda.', 'warning');
        }
        return;
    }

    if (searchBtn) loadingManager.showButtonLoading(searchBtn, 'Buscando...');
    if (searchInput) loadingManager.showSearchLoading(searchInput);

    try {
        console.log('Iniciando búsqueda de tarjetas con término:', term);
        const result = await dataService.searchTarjetas(term, forceRefresh);
        console.log('Resultado de búsqueda de tarjetas:', result);

        if (result.success) {
            ui.displayTarjetasResults(result.data);
            if (result.data.length === 0) {
                ui.showNotification('No se encontraron tarjetas con ese término.', 'info');
            }
        } else {
            ui.showNotification('Error en la búsqueda: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error en búsqueda de tarjetas:', error);
        ui.showNotification('Error inesperado en la búsqueda.', 'error');
    } finally {
        if (searchBtn) loadingManager.hideButtonLoading(searchBtn);
        if (searchInput) loadingManager.hideSearchLoading(searchInput);
    }
}

async function performExpedientesSearch(forceRefresh = false, searchTerm = null) {
    const searchInput = document.getElementById('search-expedientes-input');
    const searchBtn = document.getElementById('search-expedientes-btn');
    const term = searchTerm || searchInput?.value.trim();

    console.log('performExpedientesSearch llamada con:', { forceRefresh, searchTerm, term });

    if (!term) {
        if (!searchTerm) { // Solo mostrar warning si es búsqueda manual
            ui.showNotification('Ingrese un término de búsqueda.', 'warning');
        }
        return;
    }

    if (searchBtn) loadingManager.showButtonLoading(searchBtn, 'Buscando...');
    if (searchInput) loadingManager.showSearchLoading(searchInput);

    try {
        console.log('Iniciando búsqueda de expedientes con término:', term);
        const result = await dataService.searchExpedientes(term, forceRefresh);
        console.log('Resultado de búsqueda de expedientes:', result);

        if (result.success) {
            ui.displayExpedientesResults(result.data);
            if (result.data.length === 0) {
                ui.showNotification('No se encontraron expedientes con ese término.', 'info');
            }
        } else {
            ui.showNotification('Error en la búsqueda: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error en búsqueda de expedientes:', error);
        ui.showNotification('Error inesperado en la búsqueda.', 'error');
    } finally {
        if (searchBtn) loadingManager.hideButtonLoading(searchBtn);
        if (searchInput) loadingManager.hideSearchLoading(searchInput);
    }
}

// Inicializar la aplicación
function initializeApp() {
    // Configurar event listeners reactivos
    setupReactiveListeners();

    // Configurar listeners de IPC para comunicación entre ventanas
    setupIPCListeners();

    // Inicializar sistema de tablas responsive
    tableResponsive.init();

    // Inicializar módulo de tarjetas (expedientes se inicializa en su constructor)
    tarjetasCRUD.init();

    // Inicializar módulo de actas de entrega
    actasEntregaCRUD.init();

    console.log('Módulos CRUD disponibles e inicializados (Expedientes, Tarjetas, Actas)');

    // Limpiar cualquier estado de carga residual
    loadingManager.clearAll();

    console.log('Aplicación inicializada con sistema reactivo y responsive');
}

// 🔔 Configurar listeners de IPC para comunicación entre ventanas
function setupIPCListeners() {
    // Escuchar cuando se actualiza un expediente desde el editor (otra ventana)
    if (window.api && window.api.on) {
        window.api.on('expediente-actualizado', (payload) => {
            console.log('📡 IPC: expediente-actualizado recibido:', payload);

            // Emitir evento local para que la tabla se actualice
            if (payload && payload.expediente) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_UPDATED, {
                    expediente: payload.expediente
                });
                console.log('✅ Evento EXPEDIENTE_UPDATED emitido desde IPC');
            }
        });

        // Escuchar cuando se elimina un expediente
        window.api.on('expediente-eliminado', (payload) => {
            console.log('📡 IPC: expediente-eliminado recibido:', payload);

            if (payload && payload.expedienteId) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_DELETED, {
                    expedienteId: payload.expedienteId
                });
                console.log('✅ Evento EXPEDIENTE_DELETED emitido desde IPC');
            }
        });

        // Escuchar cuando se crea un expediente
        window.api.on('expediente-guardado', (payload) => {
            console.log('📡 IPC: expediente-guardado recibido:', payload);

            if (payload && payload.expediente) {
                eventBus.emit(APP_EVENTS.EXPEDIENTE_CREATED, {
                    expediente: payload.expediente
                });
                console.log('✅ Evento EXPEDIENTE_CREATED emitido desde IPC');
            }
        });

        // ========== LISTENERS PARA ACTAS DE ENTREGA ==========

        // Escuchar cuando se crea un acta de entrega
        window.api.on('acta-entrega-creada', (payload) => {
            console.log('📡 IPC: acta-entrega-creada recibido:', payload);

            if (payload && payload.acta) {
                eventBus.emit(APP_EVENTS.ACTA_CREATED, {
                    acta: payload.acta
                });
                console.log('✅ Evento ACTA_CREATED emitido desde IPC');
            }
        });

        // Escuchar cuando se actualiza un acta de entrega
        window.api.on('acta-entrega-actualizada', (payload) => {
            console.log('📡 IPC: acta-entrega-actualizada recibido:', payload);

            if (payload && payload.acta) {
                eventBus.emit(APP_EVENTS.ACTA_UPDATED, {
                    acta: payload.acta
                });
                console.log('✅ Evento ACTA_UPDATED emitido desde IPC');
            }
        });

        // Escuchar cuando se elimina un acta de entrega
        window.api.on('acta-entrega-eliminada', (payload) => {
            console.log('📡 IPC: acta-entrega-eliminada recibido:', payload);

            if (payload && payload.actaId) {
                eventBus.emit(APP_EVENTS.ACTA_DELETED, {
                    actaId: payload.actaId,
                    summary: payload.summary
                });
                console.log('✅ Evento ACTA_DELETED emitido desde IPC');
            }
        });

        console.log('✅ Listeners de IPC configurados (Expedientes + Actas)');
    } else {
        console.warn('⚠️ window.api no está disponible');
    }
}

function setupReactiveListeners() {
    // Escuchar cuando se crea un expediente para actualizar automáticamente las búsquedas
    eventBus.on(APP_EVENTS.DATA_REFRESHED, (data) => {
        if (data.type === 'expediente') {
            console.log('Expediente creado, datos actualizados:', data);
            // Actualizar automáticamente las búsquedas activas si hay términos
            refreshActiveSearches();
        }
    });

    // Escuchar eventos de error para mostrar notificaciones
    eventBus.on(APP_EVENTS.UI_ERROR, (data) => {
        ui.showNotification(data.message, 'error');
    });

    // Escuchar eventos de búsqueda completada
    eventBus.on(APP_EVENTS.SEARCH_COMPLETED, (data) => {
        if (data.fromCache) {
            console.log(`Búsqueda de ${data.type} servida desde cache`);
        }
    });
}

// Las funciones de búsqueda ahora están manejadas por searchManager.js

// Actualizar búsquedas activas cuando hay nuevos datos
function refreshActiveSearches() {
    const tarjetasInput = document.getElementById('search-tarjetas-input');
    const expedientesInput = document.getElementById('search-expedientes-input');

    // Si hay un término de búsqueda de tarjetas, actualizar
    if (tarjetasInput && tarjetasInput.value.trim()) {
        setTimeout(() => {
            performTarjetasSearch(true, tarjetasInput.value.trim()); // Forzar refresh
        }, 500);
    }

    // Si hay un término de búsqueda de expedientes, actualizar
    if (expedientesInput && expedientesInput.value.trim()) {
        setTimeout(() => {
            performExpedientesSearch(true, expedientesInput.value.trim()); // Forzar refresh
        }, 500);
    }
}

// ===== DASHBOARD INITIALIZATION =====
function initializeDashboard() {
    console.log('📊 Configurando Dashboard...');

    // Inicializar el Dashboard Manager
    dashboardManager.initialize();

    // Botón de actualizar
    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            dashboardManager.refreshDashboard();
        });
    }

    // Botón de exportar
    const exportBtn = document.getElementById('btn-export-dashboard');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            dashboardManager.exportDashboard('json');
        });
    }

    // Toggle de filtros del dashboard
    const toggleFilters = document.getElementById('toggle-dashboard-filters');
    if (toggleFilters) {
        toggleFilters.addEventListener('click', () => {
            dashboardManager.toggleFiltersPanel();
        });
    }

    // Botón aplicar filtros del dashboard
    const applyFiltersBtn = document.getElementById('btn-apply-dashboard-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            dashboardManager.applyFilters();
        });
    }

    // Botón limpiar filtros del dashboard
    const clearFiltersBtn = document.getElementById('btn-clear-dashboard-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            dashboardManager.clearFilters();
        });
    }

    // Cambio en rango predefinido del dashboard
    const rangoSelect = document.getElementById('dashboard-filter-rango');
    if (rangoSelect) {
        rangoSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                // Aplicar rango predefinido automáticamente
                const fechaDesde = document.getElementById('dashboard-filter-fecha-desde');
                const fechaHasta = document.getElementById('dashboard-filter-fecha-hasta');

                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();

                switch (e.target.value) {
                    case 'este-mes':
                        if (fechaDesde) fechaDesde.value = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                        if (fechaHasta) fechaHasta.value = now.toISOString().split('T')[0];
                        break;
                    case 'mes-anterior':
                        const prevMonth = month === 0 ? 11 : month - 1;
                        const prevYear = month === 0 ? year - 1 : year;
                        const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
                        if (fechaDesde) fechaDesde.value = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
                        if (fechaHasta) fechaHasta.value = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${lastDay}`;
                        break;
                    case 'este-anio':
                        if (fechaDesde) fechaDesde.value = `${year}-01-01`;
                        if (fechaHasta) fechaHasta.value = now.toISOString().split('T')[0];
                        break;
                    case 'anio-anterior':
                        if (fechaDesde) fechaDesde.value = `${year - 1}-01-01`;
                        if (fechaHasta) fechaHasta.value = `${year - 1}-12-31`;
                        break;
                    case 'ultimos-30-dias':
                        const hace30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        if (fechaDesde) fechaDesde.value = hace30.toISOString().split('T')[0];
                        if (fechaHasta) fechaHasta.value = now.toISOString().split('T')[0];
                        break;
                    case 'ultimos-90-dias':
                        const hace90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        if (fechaDesde) fechaDesde.value = hace90.toISOString().split('T')[0];
                        if (fechaHasta) fechaHasta.value = now.toISOString().split('T')[0];
                        break;
                }
            }
        });
    }

    console.log('✅ Dashboard configurado');
}