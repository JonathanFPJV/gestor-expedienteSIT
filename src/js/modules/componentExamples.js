// src/js/modules/componentExamples.js
/**
 * Ejemplos de uso de los componentes reutilizables
 * Este archivo demuestra cómo usar cada componente
 */

import { 
    FormBuilder, 
    Table, 
    Modal, 
    notify, 
    ComponentUtils,
    initializeComponentSystem 
} from './components/index.js';

// Inicializar el sistema de componentes cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    initializeComponentSystem({
        notifications: {
            position: 'top-right',
            duration: 4000
        }
    });
});

/**
 * Ejemplo 1: FormBuilder - Formulario de Acta
 */
export function createActaForm(containerId) {
    const formBuilder = new FormBuilder(containerId, {
        submitButtonText: 'Guardar Acta',
        resetButtonText: 'Limpiar Formulario',
        validateOnSubmit: true
    });

    // Configurar campos del formulario
    formBuilder
        .addField({
            type: 'text',
            name: 'expediente',
            label: 'Número de Expediente',
            placeholder: 'Ej: EXP-2024-001',
            validation: {
                required: true,
                minLength: 5,
                pattern: /^EXP-\d{4}-\d{3}$/,
                custom: (value) => {
                    if (!value.startsWith('EXP-')) {
                        return 'El expediente debe comenzar con "EXP-"';
                    }
                    return null;
                }
            },
            helpText: 'Formato: EXP-YYYY-NNN'
        })
        .addField({
            type: 'date',
            name: 'fecha',
            label: 'Fecha del Acta',
            value: new Date().toISOString().split('T')[0],
            validation: {
                required: true,
                custom: (value) => {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    if (selectedDate > today) {
                        return 'La fecha no puede ser futura';
                    }
                    return null;
                }
            }
        })
        .addField({
            type: 'file',
            name: 'pdfFile',
            label: 'PDF del Acta',
            accept: '.pdf',
            buttonText: 'Seleccionar PDF',
            helpText: 'Seleccione el archivo PDF del acta de resolución'
        })
        .addButtons();

    // Configurar eventos
    formBuilder.onSubmit = async (data) => {
        const loadingId = notify.loading('Guardando acta...');
        
        try {
            // Simular guardado
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            notify.hideLoading(loadingId);
            notify.success('Acta guardada correctamente');
            formBuilder.clear();
            
        } catch (error) {
            notify.hideLoading(loadingId);
            notify.error('Error al guardar el acta: ' + error.message);
        }
    };

    formBuilder.onValidationError = (errors) => {
        notify.warning('Por favor, corrija los errores en el formulario');
    };

    return formBuilder;
}

/**
 * Ejemplo 2: Table - Tabla de Tarjetas
 */
export function createTarjetasTable(containerId) {
    const table = new Table(containerId, {
        pagination: true,
        pageSize: 5,
        sortable: true,
        selectable: true,
        multiSelect: true,
        striped: true,
        hover: true,
        actions: [
            {
                text: 'Ver',
                className: 'btn btn-sm btn-info',
                title: 'Ver detalles',
                handler: (row, index) => {
                    showTarjetaDetails(row);
                }
            },
            {
                text: 'Editar',
                className: 'btn btn-sm btn-primary',
                title: 'Editar tarjeta',
                handler: (row, index) => {
                    editTarjeta(row, index);
                }
            },
            {
                text: 'Eliminar',
                className: 'btn btn-sm btn-danger',
                title: 'Eliminar tarjeta',
                handler: (row, index) => {
                    deleteTarjeta(row, index, table);
                }
            }
        ]
    });

    // Configurar columnas
    table.setColumns([
        {
            key: 'placa',
            title: 'Placa',
            sortable: true,
            render: (value) => `<strong>${value}</strong>`
        },
        {
            key: 'tarjeta',
            title: 'N° Tarjeta',
            sortable: true
        },
        {
            key: 'fechaCreacion',
            title: 'Fecha de Creación',
            sortable: true,
            render: (value) => new Date(value).toLocaleDateString('es-ES')
        },
        {
            key: 'estado',
            title: 'Estado',
            render: (value) => {
                const estados = {
                    'activo': '<span class="badge bg-success">Activo</span>',
                    'inactivo': '<span class="badge bg-secondary">Inactivo</span>',
                    'suspendido': '<span class="badge bg-warning">Suspendido</span>'
                };
                return estados[value] || value;
            }
        },
        {
            key: 'pdfPath',
            title: 'PDF',
            align: 'center',
            render: (value) => value ? '📄' : '❌'
        }
    ]);

    // Datos de ejemplo
    const sampleData = [
        {
            placa: 'ABC-123',
            tarjeta: 'T001',
            fechaCreacion: '2024-01-15',
            estado: 'activo',
            pdfPath: 'tarjeta-001.pdf'
        },
        {
            placa: 'DEF-456',
            tarjeta: 'T002',
            fechaCreacion: '2024-02-20',
            estado: 'inactivo',
            pdfPath: null
        },
        {
            placa: 'GHI-789',
            tarjeta: 'T003',
            fechaCreacion: '2024-03-10',
            estado: 'suspendido',
            pdfPath: 'tarjeta-003.pdf'
        }
    ];

    table.setData(sampleData);

    // Configurar eventos
    table.onRowClick = (row, index, event) => {
        notify.info(`Fila seleccionada: ${row.placa}`);
    };

    table.onSelectionChange = (selectedIndexes) => {
        if (selectedIndexes.length > 0) {
            notify.info(`${selectedIndexes.length} filas seleccionadas`);
        }
    };

    return table;
}

/**
 * Ejemplo 3: Modal - Detalles de Tarjeta
 */
function showTarjetaDetails(tarjeta) {
    const modal = new Modal({
        title: `Detalles de Tarjeta - ${tarjeta.placa}`,
        size: 'medium',
        content: `
            <div class="tarjeta-details">
                <div class="detail-row">
                    <strong>Placa:</strong> ${tarjeta.placa}
                </div>
                <div class="detail-row">
                    <strong>Número de Tarjeta:</strong> ${tarjeta.tarjeta}
                </div>
                <div class="detail-row">
                    <strong>Fecha de Creación:</strong> ${new Date(tarjeta.fechaCreacion).toLocaleDateString('es-ES')}
                </div>
                <div class="detail-row">
                    <strong>Estado:</strong> ${tarjeta.estado}
                </div>
                <div class="detail-row">
                    <strong>PDF:</strong> ${tarjeta.pdfPath ? 'Disponible' : 'No disponible'}
                </div>
            </div>
        `,
        buttons: [
            {
                text: 'Cerrar',
                className: 'btn btn-secondary',
                action: (modal) => modal.hide()
            }
        ]
    });

    modal.show();
}

/**
 * Ejemplo 4: Modal con Formulario - Editar Tarjeta
 */
function editTarjeta(tarjeta, index) {
    const formContent = `
        <form id="edit-tarjeta-form">
            <div class="form-field">
                <label class="form-label">Placa</label>
                <input type="text" class="form-input" name="placa" value="${tarjeta.placa}" required>
            </div>
            <div class="form-field">
                <label class="form-label">Número de Tarjeta</label>
                <input type="text" class="form-input" name="tarjeta" value="${tarjeta.tarjeta}" required>
            </div>
            <div class="form-field">
                <label class="form-label">Estado</label>
                <select class="form-select" name="estado" required>
                    <option value="activo" ${tarjeta.estado === 'activo' ? 'selected' : ''}>Activo</option>
                    <option value="inactivo" ${tarjeta.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                    <option value="suspendido" ${tarjeta.estado === 'suspendido' ? 'selected' : ''}>Suspendido</option>
                </select>
            </div>
        </form>
    `;

    const modal = new Modal({
        title: 'Editar Tarjeta',
        size: 'medium',
        content: formContent,
        buttons: [
            {
                text: 'Cancelar',
                className: 'btn btn-secondary',
                action: (modal) => modal.hide()
            },
            {
                text: 'Guardar',
                className: 'btn btn-primary',
                action: async (modal) => {
                    const form = modal.modalBody.querySelector('#edit-tarjeta-form');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    
                    // Simular guardado
                    const loadingId = notify.loading('Guardando cambios...');
                    
                    try {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        notify.hideLoading(loadingId);
                        notify.success('Tarjeta actualizada correctamente');
                        modal.hide();
                        
                    } catch (error) {
                        notify.hideLoading(loadingId);
                        notify.error('Error al actualizar la tarjeta');
                    }
                }
            }
        ]
    });

    modal.show();
}

/**
 * Ejemplo 5: Modal de Confirmación - Eliminar Tarjeta
 */
function deleteTarjeta(tarjeta, index, table) {
    Modal.confirm({
        title: 'Confirmar Eliminación',
        content: `
            <p><strong>¿Está seguro de que desea eliminar esta tarjeta?</strong></p>
            <p>Placa: <strong>${tarjeta.placa}</strong></p>
            <p>Número de Tarjeta: <strong>${tarjeta.tarjeta}</strong></p>
            <div class="alert alert-warning mt-3">
                <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer.
            </div>
        `,
        onConfirm: async () => {
            const loadingId = notify.loading('Eliminando tarjeta...');
            
            try {
                // Simular eliminación
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                table.removeRow(index);
                notify.hideLoading(loadingId);
                notify.success('Tarjeta eliminada correctamente');
                
            } catch (error) {
                notify.hideLoading(loadingId);
                notify.error('Error al eliminar la tarjeta');
            }
        },
        onCancel: () => {
            notify.info('Eliminación cancelada');
        }
    });
}

/**
 * Ejemplo 6: Uso de Notificaciones
 */
export function showNotificationExamples() {
    // Mostrar diferentes tipos de notificaciones
    setTimeout(() => notify.success('¡Operación exitosa!'), 500);
    setTimeout(() => notify.info('Información importante'), 1000);
    setTimeout(() => notify.warning('Atención requerida'), 1500);
    setTimeout(() => notify.error('Error en el sistema'), 2000);
    
    // Notificación con opciones personalizadas
    setTimeout(() => {
        notify.info('Notificación personalizada', {
            title: 'Título Personalizado',
            duration: 8000,
            onClick: (id) => {
                notify.success('¡Notificación clickeada!');
                notify.remove(id);
            }
        });
    }, 2500);
}

/**
 * Función para demostrar todos los componentes
 */
export function initializeExamples() {
    // Solo ejecutar si estamos en modo desarrollo
    if (window.location.hash === '#examples') {
        console.log('Inicializando ejemplos de componentes...');
        
        // Crear contenedores para ejemplos si no existen
        if (!document.getElementById('form-example')) {
            document.body.innerHTML += `
                <div id="examples-container" style="padding: 20px;">
                    <h2>Ejemplos de Componentes</h2>
                    
                    <section style="margin-bottom: 40px;">
                        <h3>FormBuilder</h3>
                        <div id="form-example"></div>
                    </section>
                    
                    <section style="margin-bottom: 40px;">
                        <h3>Table</h3>
                        <div id="table-example"></div>
                    </section>
                    
                    <section style="margin-bottom: 40px;">
                        <h3>Notificaciones</h3>
                        <button id="show-notifications" class="btn btn-primary">
                            Mostrar Ejemplos de Notificaciones
                        </button>
                    </section>
                </div>
            `;
            
            // Inicializar ejemplos
            createActaForm('form-example');
            createTarjetasTable('table-example');
            
            document.getElementById('show-notifications').addEventListener('click', showNotificationExamples);
        }
    }
}

// Auto-inicializar ejemplos si está en modo ejemplo
document.addEventListener('DOMContentLoaded', initializeExamples);