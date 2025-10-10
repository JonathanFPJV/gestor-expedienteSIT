const state = {
    expedienteId: null,
    expediente: null,
    pdfPath: null,
    pdfSourcePath: null,
    tarjetas: []
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    attachEventListeners();
    initialize();
});

function cacheElements() {
    elements.title = document.getElementById('editor-title');
    elements.subtitle = document.getElementById('editor-subtitle');
    elements.form = document.getElementById('editor-form');
    elements.btnGuardar = document.getElementById('btn-guardar');
    elements.btnCancelar = document.getElementById('btn-cancelar');
    elements.btnSeleccionarExpediente = document.getElementById('btn-seleccionar-expediente');
    elements.pdfInput = document.getElementById('editor-expediente-pdf');
    elements.tarjetasContainer = document.getElementById('tarjetas-container');
    elements.tarjetasEmptyState = document.getElementById('tarjetas-empty-state');
    elements.btnAgregarTarjeta = document.getElementById('btn-agregar-tarjeta');
    elements.tarjetaTemplate = document.getElementById('tarjeta-row-template');

    elements.numeroExpediente = document.getElementById('editor-numeroExpediente');
    elements.anioExpediente = document.getElementById('editor-anioExpediente');
    elements.numeroResolucion = document.getElementById('editor-numeroResolucion');
    elements.fecha = document.getElementById('editor-fecha');
    elements.informeTecnico = document.getElementById('editor-informeTecnico');
    elements.numeroFichero = document.getElementById('editor-numeroFichero');
    elements.nombreEmpresa = document.getElementById('editor-nombreEmpresa');
    elements.unidadNegocio = document.getElementById('editor-unidadNegocio');
    elements.observaciones = document.getElementById('editor-observaciones');
}

function attachEventListeners() {
    elements.btnCancelar?.addEventListener('click', () => window.close());
    elements.btnGuardar?.addEventListener('click', handleSave);
    elements.btnSeleccionarExpediente?.addEventListener('click', handleSelectExpedientePdf);
    elements.btnAgregarTarjeta?.addEventListener('click', handleAddTarjeta);
}

async function initialize() {
    const params = new URLSearchParams(window.location.search);
    const expedienteId = params.get('id');
    if (!expedienteId) {
        alert('No se proporcionó el ID del expediente a editar.');
        window.close();
        return;
    }

    state.expedienteId = expedienteId;

    try {
            setLoading(true, 'Cargando expediente...', 'Cargando...');
        const result = await window.api.invoke('obtener-expediente-detalle', expedienteId);
        if (!result || result.success === false) {
            throw new Error(result?.message || 'No se pudo cargar el expediente.');
        }

        state.expediente = result.expediente;
        state.pdfPath = result.expediente.pdfPath || null;
        state.pdfSourcePath = null;
        state.tarjetas = (result.tarjetas || []).map(t => ({
            uid: generateUid(),
            placa: t.placa || '',
            numero: t.tarjeta || '',
            pdfPath: t.pdfPath || '',
            pdfSourcePath: null
        }));

        populateForm();
        renderTarjetas();
        setLoading(false, `${state.expediente.numeroExpediente}-${state.expediente.anioExpediente}`);
    } catch (error) {
        console.error('Error al cargar expediente:', error);
        alert(`Error al cargar el expediente: ${error.message}`);
        window.close();
    }
}

function setLoading(isLoading, subtitleText, buttonLabel) {
    if (elements.btnGuardar) {
        elements.btnGuardar.disabled = isLoading;
        elements.btnGuardar.textContent = buttonLabel
            ? buttonLabel
            : (isLoading ? 'Guardando...' : 'Guardar cambios');
    }
    if (elements.subtitle) {
        elements.subtitle.textContent = subtitleText || '';
    }
}

function populateForm() {
    if (!state.expediente) return;

    elements.title.textContent = `Editar expediente ${state.expediente.numeroExpediente}-${state.expediente.anioExpediente}`;
    elements.subtitle.textContent = `Última actualización: ${formatDate(state.expediente.fechaActualizacion || state.expediente.fechaCreacion)}`;

    elements.numeroExpediente.value = state.expediente.numeroExpediente || '';
    elements.anioExpediente.value = state.expediente.anioExpediente || new Date().getFullYear();
    elements.numeroResolucion.value = state.expediente.numeroResolucion || '';
    elements.fecha.value = toInputDate(state.expediente.fecha) || toInputDate(new Date());
    elements.informeTecnico.value = state.expediente.informeTecnico || '';
    elements.numeroFichero.value = state.expediente.numeroFichero || '';
    elements.nombreEmpresa.value = state.expediente.nombreEmpresa || '';
    elements.unidadNegocio.value = state.expediente.unidadNegocio || '';
    elements.observaciones.value = state.expediente.observaciones || '';

    if (state.pdfPath) {
        elements.pdfInput.value = resumirRuta(state.pdfPath);
        elements.pdfInput.title = state.pdfPath;
    } else {
        elements.pdfInput.value = 'Sin archivo';
        elements.pdfInput.title = '';
    }
}

function renderTarjetas() {
    elements.tarjetasContainer.innerHTML = '';

    if (!state.tarjetas.length) {
        elements.tarjetasEmptyState.style.display = 'block';
        return;
    }

    elements.tarjetasEmptyState.style.display = 'none';

    state.tarjetas.forEach(tarjeta => {
        const fragment = elements.tarjetaTemplate.content.cloneNode(true);
        const row = fragment.querySelector('.tarjeta-row');
        const placaInput = row.querySelector('.tarjeta-placa');
        const numeroInput = row.querySelector('.tarjeta-numero');
        const pdfInput = row.querySelector('.tarjeta-pdf');
        const btnPdf = row.querySelector('.btn-tarjeta-pdf');
        const btnEliminar = row.querySelector('.btn-tarjeta-eliminar');

        placaInput.value = tarjeta.placa;
        numeroInput.value = tarjeta.numero;
        if (tarjeta.pdfSourcePath) {
            pdfInput.value = resumirRuta(tarjeta.pdfSourcePath);
            pdfInput.title = tarjeta.pdfSourcePath;
        } else if (tarjeta.pdfPath) {
            pdfInput.value = resumirRuta(tarjeta.pdfPath);
            pdfInput.title = tarjeta.pdfPath;
        } else {
            pdfInput.value = 'Sin archivo';
            pdfInput.title = '';
        }

        placaInput.addEventListener('input', (e) => {
            tarjeta.placa = e.target.value;
        });
        numeroInput.addEventListener('input', (e) => {
            tarjeta.numero = e.target.value;
        });
        btnPdf.addEventListener('click', async () => {
            const selected = await window.api.abrirDialogoPdf();
            if (selected) {
                tarjeta.pdfSourcePath = selected;
                pdfInput.value = resumirRuta(selected);
                pdfInput.title = selected;
            }
        });
        btnEliminar.addEventListener('click', () => {
            state.tarjetas = state.tarjetas.filter(t => t.uid !== tarjeta.uid);
            renderTarjetas();
        });

        elements.tarjetasContainer.appendChild(fragment);
    });
}

async function handleSelectExpedientePdf() {
    const selected = await window.api.abrirDialogoPdf();
    if (selected) {
        state.pdfSourcePath = selected;
        elements.pdfInput.value = resumirRuta(selected);
        elements.pdfInput.title = selected;
    }
}

function handleAddTarjeta() {
    state.tarjetas.push({
        uid: generateUid(),
        placa: '',
        numero: '',
        pdfPath: '',
        pdfSourcePath: null
    });
    renderTarjetas();
}

async function handleSave(event) {
    event.preventDefault();

    if (!elements.form.reportValidity()) {
        return;
    }

    // Validar tarjetas manualmente porque los inputs están en plantillas
    for (const tarjeta of state.tarjetas) {
        if (!tarjeta.placa?.trim() || !tarjeta.numero?.trim()) {
            alert('Todas las tarjetas deben tener placa y número.');
            return;
        }
    }

    const payload = {
        numeroExpediente: elements.numeroExpediente.value.trim(),
        anioExpediente: parseInt(elements.anioExpediente.value, 10) || new Date().getFullYear(),
        fecha: elements.fecha.value,
        numeroResolucion: emptyToNull(elements.numeroResolucion.value),
        informeTecnico: emptyToNull(elements.informeTecnico.value),
        numeroFichero: emptyToNull(elements.numeroFichero.value),
        nombreEmpresa: emptyToNull(elements.nombreEmpresa.value),
        unidadNegocio: emptyToNull(elements.unidadNegocio.value),
        observaciones: emptyToNull(elements.observaciones.value)
    };

    if (state.pdfSourcePath) {
        payload.pdfSourcePath = state.pdfSourcePath;
    } else if (state.pdfPath) {
        payload.pdfPath = state.pdfPath;
    }

    payload.tarjetas = state.tarjetas.map(t => {
        const tarjetaPayload = {
            placa: t.placa.trim(),
            tarjeta: t.numero.trim()
        };

        if (t.pdfSourcePath) {
            tarjetaPayload.pdfSourcePath = t.pdfSourcePath;
        } else if (t.pdfPath) {
            tarjetaPayload.pdfPath = t.pdfPath;
        }
        return tarjetaPayload;
    });

    try {
        setLoading(true, 'Guardando cambios...');
        const result = await window.api.invoke('actualizar-expediente', state.expedienteId, payload);
        if (!result || result.success === false) {
            throw new Error(result?.message || 'No se pudo guardar el expediente');
        }

        alert('Expediente actualizado correctamente.');
        window.close();
    } catch (error) {
        console.error('Error al guardar expediente:', error);
        alert(`Error al guardar el expediente: ${error.message}`);
        setLoading(false, 'Ocurrió un error');
    }
}

function emptyToNull(value) {
    return value && value.trim() !== '' ? value.trim() : null;
}

function toInputDate(dateLike) {
    if (!dateLike) return '';
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(dateLike) {
    if (!dateLike) return 'Sin datos';
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return 'Sin datos';
    return date.toLocaleString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function resumirRuta(ruta) {
    if (!ruta) return 'Sin archivo';
    const partes = ruta.split(/[/\\]/);
    return partes[partes.length - 1] || ruta;
}

function generateUid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
