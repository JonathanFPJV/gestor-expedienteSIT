// Script temporal para agregar el método completo
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'js', 'modules', 'expedientesCRUD.js');
let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar el método loadExpedienteIntoForm
const oldMethod = /loadExpedienteIntoForm\(expediente\)\s*\{[\s\S]*?}\s*async confirmDelete/;

const newMethod = `async loadExpedienteIntoForm(expediente) {
        try {
            console.log('📝 Cargando expediente completo en formulario:', expediente);
            
            // 1️⃣ Cargar datos básicos del expediente
            document.getElementById('numeroExpediente').value = expediente.numeroExpediente || '';
            document.getElementById('anioExpediente').value = expediente.anioExpediente || new Date().getFullYear();
            document.getElementById('numeroResolucion').value = expediente.numeroResolucion || '';
            document.getElementById('fecha').value = expediente.fechaExpediente || expediente.fecha || '';
            document.getElementById('informeTecnico').value = expediente.informeTecnico || '';
            document.getElementById('numeroFichero').value = expediente.numeroFichero || '';
            document.getElementById('nombreEmpresa').value = expediente.nombreEmpresa || '';
            document.getElementById('unidadNegocio').value = expediente.unidadNegocio || '';
            document.getElementById('observaciones').value = expediente.observaciones || '';
            
            // Si hay observaciones, mostrar el contenedor
            if (expediente.observaciones) {
                const observacionesContainer = document.getElementById('observaciones-container');
                if (observacionesContainer) {
                    observacionesContainer.classList.remove('hidden');
                }
            }
            
            // 2️⃣ Cargar TARJETAS ASOCIADAS
            if (expediente.tarjetasAsociadas && expediente.tarjetasAsociadas.length > 0) {
                console.log(\`📋 Cargando \${expediente.tarjetasAsociadas.length} tarjetas asociadas\`);
                const tarjetasList = document.getElementById('tarjetas-list');
                if (tarjetasList) {
                    tarjetasList.innerHTML = ''; // Limpiar lista
                    
                    expediente.tarjetasAsociadas.forEach((tarjeta, index) => {
                        const tarjetaDiv = document.createElement('div');
                        tarjetaDiv.className = 'tarjeta-item';
                        tarjetaDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f0f0f0; border-radius: 5px; margin-bottom: 10px;';
                        tarjetaDiv.innerHTML = \`
                            <div class="tarjeta-info" style="flex: 1;">
                                <div style="font-weight: bold; margin-bottom: 5px;">🎫 Tarjeta: \${tarjeta.numero || 'Sin número'}</div>
                                <div>🚗 Placa: \${tarjeta.placa || 'Sin placa'}</div>
                            </div>
                            <button type="button" class="btn-danger btn-small" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;" onclick="window.expedientesCRUD.removeTarjetaFromForm(\${index})">
                                🗑️ Eliminar
                            </button>
                        \`;
                        tarjetasList.appendChild(tarjetaDiv);
                    });
                }
            }
            
            // 3️⃣ Cargar ACTA DE ENTREGA si existe
            if (expediente.actaEntrega) {
                console.log('📄 Cargando acta de entrega asociada');
                const incluirActaCheckbox = document.getElementById('incluir-acta-entrega');
                const actaFields = document.getElementById('acta-entrega-fields');
                
                if (incluirActaCheckbox) {
                    incluirActaCheckbox.checked = true;
                }
                
                if (actaFields) {
                    actaFields.style.display = 'block';
                    
                    // Cargar datos del acta
                    const acta = expediente.actaEntrega;
                    const numeroActaInput = document.getElementById('acta-numero');
                    const fechaActaInput = document.getElementById('acta-fecha');
                    const lugarActaInput = document.getElementById('acta-lugar');
                    const receptorActaInput = document.getElementById('acta-receptor');
                    const documentoReceptorInput = document.getElementById('acta-documento-receptor');
                    
                    if (numeroActaInput) numeroActaInput.value = acta.numeroActa || '';
                    if (fechaActaInput) fechaActaInput.value = acta.fecha || '';
                    if (lugarActaInput) lugarActaInput.value = acta.lugarEntrega || '';
                    if (receptorActaInput) receptorActaInput.value = acta.nombreReceptor || '';
                    if (documentoReceptorInput) documentoReceptorInput.value = acta.documentoReceptor || '';
                }
            }
            
            // 4️⃣ Cargar ruta de PDF si existe
            if (expediente.pdfPath) {
                console.log('📎 Cargando ruta de PDF:', expediente.pdfPath);
                const pdfFilePathInput = document.getElementById('pdf-file-path');
                if (pdfFilePathInput) {
                    pdfFilePathInput.value = expediente.pdfPath;
                }
            }
            
            // 5️⃣ Cambiar título del formulario a "Editar Expediente"
            const formTitle = document.querySelector('#vista-registro h2');
            if (formTitle) {
                formTitle.textContent = \`✏️ Editar Expediente \${expediente.numeroExpediente}-\${expediente.anioExpediente}\`;
            }
            
            // 6️⃣ Cambiar texto del botón de guardar
            const guardarBtn = document.getElementById('guardar-expediente-btn');
            if (guardarBtn) {
                guardarBtn.textContent = '💾 Actualizar Expediente';
            }
            
            // 7️⃣ Guardar el ID del expediente para actualización
            const form = document.getElementById('expediente-form');
            if (form) {
                form.dataset.editingId = expediente._id;
                
                // Guardar tarjetas en formato JSON para el submit
                if (expediente.tarjetasAsociadas) {
                    form.dataset.tarjetas = JSON.stringify(expediente.tarjetasAsociadas);
                }
            }
            
            console.log('✅ Expediente cargado completamente en formulario');
        } catch (error) {
            console.error('❌ Error al cargar expediente en formulario:', error);
            this.showError('Error al cargar datos en el formulario');
        }
    }
    
    // 🗑️ Método para eliminar tarjeta del formulario durante edición
    removeTarjetaFromForm(index) {
        try {
            const form = document.getElementById('expediente-form');
            if (!form || !form.dataset.tarjetas) return;
            
            const tarjetas = JSON.parse(form.dataset.tarjetas);
            tarjetas.splice(index, 1);
            form.dataset.tarjetas = JSON.stringify(tarjetas);
            
            // Re-renderizar la lista
            const tarjetasList = document.getElementById('tarjetas-list');
            if (tarjetasList) {
                tarjetasList.innerHTML = '';
                tarjetas.forEach((tarjeta, idx) => {
                    const tarjetaDiv = document.createElement('div');
                    tarjetaDiv.className = 'tarjeta-item';
                    tarjetaDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f0f0f0; border-radius: 5px; margin-bottom: 10px;';
                    tarjetaDiv.innerHTML = \`
                        <div class="tarjeta-info" style="flex: 1;">
                            <div style="font-weight: bold; margin-bottom: 5px;">🎫 Tarjeta: \${tarjeta.numero || 'Sin número'}</div>
                            <div>🚗 Placa: \${tarjeta.placa || 'Sin placa'}</div>
                        </div>
                        <button type="button" class="btn-danger btn-small" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;" onclick="window.expedientesCRUD.removeTarjetaFromForm(\${idx})">
                            🗑️ Eliminar
                        </button>
                    \`;
                    tarjetasList.appendChild(tarjetaDiv);
                });
            }
            
            console.log('✅ Tarjeta eliminada del formulario');
        } catch (error) {
            console.error('❌ Error al eliminar tarjeta:', error);
        }
    }

    async confirmDelete`;

content = content.replace(oldMethod, newMethod);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Método loadExpedienteIntoForm actualizado correctamente');
