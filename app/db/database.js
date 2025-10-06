// app/db/database.js
const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron');

// Define la ruta del directorio de datos de la aplicación
const dbDir = path.join(app.getPath('userData'), 'database');


// Inicializa las bases de datos para expedientes y tarjetas
const expedientesDb = new Datastore({ filename: path.join(dbDir, 'expedientes.db'), autoload: true });
const tarjetasDb = new Datastore({ filename: path.join(dbDir, 'tarjetas.db'), autoload: true });

module.exports = {
    expedientes: {
    // CRUD para Expedientes
        insert: (doc) => new Promise((resolve, reject) => {
            expedientesDb.insert(doc, (err, newDoc) => {
                if (err) return reject(err);
                resolve(newDoc);
            });
        }),
        find: (query) => new Promise((resolve, reject) => {
            expedientesDb.find(query).exec((err, docs) => {
                if (err) return reject(err);
                resolve(docs);
            });
        }),
        update: (query, update) => new Promise((resolve, reject) => {
            expedientesDb.update(query, update, {}, (err, numUpdated) => {
                if (err) return reject(err);
                resolve(numUpdated);
            });
        }),
        remove: (query) => new Promise((resolve, reject) => {
            expedientesDb.remove(query, {}, (err, numRemoved) => {
                if (err) return reject(err);
                resolve(numRemoved);
            });
        }),
        // Nuevo método para encontrar con paginación
        findWithPagination: (query, skip, limit) => new Promise((resolve, reject) => {
            expedientesDb.find(query).sort({ _id: 1 }).skip(skip).limit(limit).exec((err, docs) => {
                if (err) return reject(err);
                resolve(docs);
            });
        }),
        // Método para encontrar un solo documento
        findOne: (query) => new Promise((resolve, reject) => {
            expedientesDb.findOne(query, (err, doc) => {
                if (err) return reject(err);
                resolve(doc);
            });
        })
    },
    tarjetas: {
        // CRUD para Tarjetas
        insert: (doc) => new Promise((resolve, reject) => {
            tarjetasDb.insert(doc, (err, newDoc) => {
                if (err) return reject(err);
                resolve(newDoc);
            });
        }),
        find: (query) => new Promise((resolve, reject) => {
            tarjetasDb.find(query).exec((err, docs) => {
                if (err) return reject(err);
                resolve(docs);
            });
        }),
        update: (query, update) => new Promise((resolve, reject) => {
            tarjetasDb.update(query, update, {}, (err, numUpdated) => {
                if (err) return reject(err);
                resolve(numUpdated);
            });
        }),
        remove: (query) => new Promise((resolve, reject) => {
            tarjetasDb.remove(query, {}, (err, numRemoved) => {
                if (err) return reject(err);
                resolve(numRemoved);
            });
        })
    }
};