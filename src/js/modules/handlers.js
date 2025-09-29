// src/js/modules/handlers.js
import * as ui from './ui.js';

let selectedPdfPath = null;

export const setupEventListeners = () => {
    const form = document.getElementById('registro-form');
    const seleccionarPdfBtn = document.getElementById('seleccionar-pdf-btn');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const listaRegistros = document.getElementById('lista-registros');

    // Manejo del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoRegistro = ui.getFormData();
        
        if (selectedPdfPath) {
            const fileName = `expediente-${Date.now()}.pdf`;
            nuevoRegistro.pdfPath = fileName;
            nuevoRegistro.pdfSourcePath = selectedPdfPath;
        }
        
        window.api.enviar('guardar-registro', nuevoRegistro);
        ui.resetForm();
        selectedPdfPath = null;
    });

    // Manejo del diálogo de PDF
    seleccionarPdfBtn.addEventListener('click', async () => {
        console.log('Botón seleccionar PDF clickeado');
        
        // Verificar que window.api existe
        if (!window.api) {
            console.error('window.api no está disponible');
            alert('Error: La conexión con el backend no está disponible');
            return;
        }
        
        // Verificar que la función existe
        if (!window.api.abrirDialogoPdf) {
            console.error('window.api.abrirDialogoPdf no está disponible');
            alert('Error: La función de diálogo no está disponible');
            return;
        }
        
        try {
            console.log('Llamando a window.api.abrirDialogoPdf()...');
            selectedPdfPath = await window.api.abrirDialogoPdf();
            console.log('Ruta seleccionada:', selectedPdfPath);
            
            if (selectedPdfPath) {
                ui.updatePdfFilePath(selectedPdfPath);
                console.log('Archivo PDF seleccionado:', selectedPdfPath);
            } else {
                console.log('No se seleccionó ningún archivo');
            }
        } catch (error) {
            console.error('Error al abrir diálogo de PDF:', error);
            alert('Error al abrir el diálogo de selección de archivos');
        }
    });

    // Manejo de la búsqueda
    const handleSearch = () => {
        const searchTerm = ui.getSearchTerm();
        window.api.enviar('buscar-registros', searchTerm);
    };

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Abrir PDF al hacer clic en el botón
    listaRegistros.addEventListener('click', (e) => {
        if (e.target.classList.contains('abrir-pdf-btn')) {
            const pdfPath = e.target.dataset.pdfPath;
            if (pdfPath) {
                window.api.enviar('abrir-pdf', pdfPath);
            }
        }
    });

    // Escuchar actualizaciones del backend
    window.api.recibir('registros-actualizados', (registros) => {
        ui.mostrarRegistros(registros);
    });
};