/**
 * Visualizador de detalles de expediente
 * Responsabilidad: Mostrar información detallada de un expediente (modo lectura)
 */
export class ExpedienteViewer {
    /**
     * Mostrar detalles de un expediente en un modal/alert
     * @param {Object} expediente - Datos del expediente
     */
    showExpedienteDetails(expediente) {
        if (!expediente) return;

        console.log('👁️ Visualizando expediente:', expediente.numeroExpediente);

        const tarjetasCount = expediente.tarjetasAsociadas ? expediente.tarjetasAsociadas.length : 0;
        const tienePdf = expediente.pdfPath ? 'Sí' : 'No';

        // Formatear información para lectura fácil
        const info = `
DETALLES DEL EXPEDIENTE
========================================
Expediente: ${expediente.numeroExpediente}-${expediente.anioExpediente || ''}
Fecha: ${expediente.fecha || 'N/A'}
Resolución: ${expediente.numeroResolucion || 'N/A'}
Empresa: ${expediente.nombreEmpresa || 'N/A'}
Unidad: ${expediente.unidadNegocio || 'N/A'}
Informe Técnico: ${expediente.informeTecnico || 'N/A'}
Fichero: ${expediente.numeroFichero || 'N/A'}
Tarjetas: ${tarjetasCount}
PDF Asociado: ${tienePdf}
========================================
Observaciones:
${expediente.observaciones || 'Ninguna'}
`;

        // TODO: En el futuro, reemplazar alert con un modal HTML real
        alert(info);
    }
}

export const expedienteViewer = new ExpedienteViewer();
