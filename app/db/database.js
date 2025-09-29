// app/db/database.js
const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron');

// Define la ruta del directorio de datos de la aplicación
const dbDir = path.join(app.getPath('userData'), 'database');


// Inicializa las bases de datos para actas y tarjetas
const actasDb = new Datastore({ filename: path.join(dbDir, 'actas.db'), autoload: true });
const tarjetasDb = new Datastore({ filename: path.join(dbDir, 'tarjetas.db'), autoload: true });

module.exports = {
    actas: {
    // CRUD para Actas
        insert: (doc) => new Promise((resolve, reject) => {
            actasDb.insert(doc, (err, newDoc) => {
                if (err) return reject(err);
                resolve(newDoc);
            });
        }),
        find: (query) => new Promise((resolve, reject) => {
            actasDb.find(query).exec((err, docs) => {
                if (err) return reject(err);
                resolve(docs);
            });
        }),
        update: (query, update) => new Promise((resolve, reject) => {
            actasDb.update(query, update, {}, (err, numUpdated) => {
                if (err) return reject(err);
                resolve(numUpdated);
            });
        }),
        remove: (query) => new Promise((resolve, reject) => {
            actasDb.remove(query, {}, (err, numRemoved) => {
                if (err) return reject(err);
                resolve(numRemoved);
            });
        }),
        // Nuevo método para encontrar con paginación
        findWithPagination: (query, skip, limit) => new Promise((resolve, reject) => {
            actasDb.find(query).sort({ _id: 1 }).skip(skip).limit(limit).exec((err, docs) => {
                if (err) return reject(err);
                resolve(docs);
            });
        }),
        // Método para encontrar un solo documento
        findOne: (query) => new Promise((resolve, reject) => {
            actasDb.findOne(query, (err, doc) => {
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