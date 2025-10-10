// app/services/expedienteService.js
class ExpedienteService {
    constructor(db, fileHandlers) {
        this.db = db;
        this.fileHandlers = fileHandlers;
    }

    async createExpediente(rawData = {}) {
        const expedienteData = { ...rawData };
        const tarjetas = Array.isArray(expedienteData.tarjetas) ? expedienteData.tarjetas : [];
        delete expedienteData.tarjetas;

        if (expedienteData.pdfSourcePath) {
            const fileName = expedienteData.pdfPath || `resolucion-${Date.now()}.pdf`;
            const saveResult = await this.fileHandlers.savePdf(
                expedienteData.pdfSourcePath,
                fileName,
                {
                    resolutionNumber: expedienteData.numeroResolucion,
                    expedienteNumero: expedienteData.numeroExpediente
                }
            );
            expedienteData.pdfPath = saveResult.path;
            delete expedienteData.pdfSourcePath;
        }

        const fechaActual = new Date().toISOString();
        expedienteData.expediente = expedienteData.expediente || this.buildExpedienteLabel(expedienteData);
        expedienteData.fechaCreacion = fechaActual;
        expedienteData.fechaActualizacion = fechaActual;

        const newExpediente = await this.db.expedientes.insert(expedienteData);

        const tarjetasGuardadas = await this.saveTarjetasParaExpediente(newExpediente, tarjetas);

        return {
            success: true,
            message: 'Expediente y tarjetas guardados exitosamente.',
            expediente: newExpediente,
            tarjetas: tarjetasGuardadas
        };
    }

    async updateExpediente(expedienteId, rawData = {}) {
        const expedienteExistente = await this.db.expedientes.findOne({ _id: expedienteId });
        if (!expedienteExistente) {
            throw new Error('Expediente no encontrado');
        }

        const expedienteData = { ...rawData };
        const tarjetasProvided = Object.prototype.hasOwnProperty.call(expedienteData, 'tarjetas');
        const tarjetas = tarjetasProvided && Array.isArray(expedienteData.tarjetas) ? expedienteData.tarjetas : [];
        if (tarjetasProvided) {
            delete expedienteData.tarjetas;
        }

        const numeroResolucion = expedienteData.numeroResolucion || expedienteExistente.numeroResolucion;
        const numeroExpediente = expedienteData.numeroExpediente || expedienteExistente.numeroExpediente;

        if (expedienteData.pdfSourcePath) {
            const fileName = expedienteData.pdfPath || `resolucion-${Date.now()}.pdf`;
            const saveResult = await this.fileHandlers.savePdf(
                expedienteData.pdfSourcePath,
                fileName,
                {
                    resolutionNumber: numeroResolucion,
                    expedienteNumero: numeroExpediente
                }
            );
            expedienteData.pdfPath = saveResult.path;
            delete expedienteData.pdfSourcePath;
        }

        expedienteData.expediente = expedienteData.expediente || this.buildExpedienteLabel({
            numeroExpediente,
            anioExpediente: expedienteData.anioExpediente || expedienteExistente.anioExpediente
        });
        expedienteData.fechaActualizacion = new Date().toISOString();

        await this.db.expedientes.update({ _id: expedienteId }, { $set: expedienteData });
        const expedienteActualizado = await this.db.expedientes.findOne({ _id: expedienteId });

        let tarjetasGuardadas = [];
        if (tarjetasProvided) {
            await this.db.tarjetas.remove({ expedienteId }, { multi: true });
            if (tarjetas.length > 0) {
                tarjetasGuardadas = await this.saveTarjetasParaExpediente(expedienteActualizado, tarjetas);
            }
        }

        return {
            success: true,
            message: 'Expediente actualizado exitosamente.',
            expediente: expedienteActualizado,
            tarjetas: tarjetasGuardadas
        };
    }

    async getExpedienteDetalle(expedienteId) {
        const expediente = await this.db.expedientes.findOne({ _id: expedienteId });
        if (!expediente) {
            throw new Error('Expediente no encontrado');
        }

        const tarjetas = await this.db.tarjetas.find({ expedienteId });

        return {
            success: true,
            expediente,
            tarjetas
        };
    }

    buildExpedienteLabel({ numeroExpediente, anioExpediente }) {
        if (!numeroExpediente && !anioExpediente) return null;
        const numero = numeroExpediente || 'sin-numero';
        const anio = anioExpediente || new Date().getFullYear();
        return `${numero}-${anio}`;
    }

    async saveTarjetasParaExpediente(expediente, tarjetas, options = {}) {
        if (!Array.isArray(tarjetas) || tarjetas.length === 0) {
            return [];
        }

        const { replaceExisting = false } = options;
        const expedienteId = expediente._id;

        if (replaceExisting) {
            await this.db.tarjetas.remove({ expedienteId }, { multi: true });
        }

        const tarjetasGuardadas = [];
        for (const tarjeta of tarjetas) {
            const tarjetaData = { ...tarjeta };
            delete tarjetaData.selectedPdfPath;

            if (tarjetaData.pdfSourcePath) {
                const fileName = tarjetaData.pdfPath || this.buildTarjetaFileName(tarjetaData);
                const saveResult = await this.fileHandlers.savePdf(
                    tarjetaData.pdfSourcePath,
                    fileName,
                    {
                        resolutionNumber: expediente.numeroResolucion,
                        expedienteNumero: expediente.numeroExpediente
                    }
                );
                tarjetaData.pdfPath = saveResult.path;
                delete tarjetaData.pdfSourcePath;
            }

            tarjetaData.expedienteId = expedienteId;
            const savedTarjeta = await this.db.tarjetas.insert(tarjetaData);
            tarjetasGuardadas.push(savedTarjeta);
        }

        return tarjetasGuardadas;
    }

    buildTarjetaFileName(tarjetaData = {}) {
        const placa = (tarjetaData.placa || 'sin-placa').replace(/\s+/g, '-');
        const tarjetaNumero = (tarjetaData.tarjeta || 'sin-numero').replace(/\s+/g, '-');
        return `tarjeta-${placa}-${tarjetaNumero}-${Date.now()}.pdf`;
    }
}

module.exports = ExpedienteService;
