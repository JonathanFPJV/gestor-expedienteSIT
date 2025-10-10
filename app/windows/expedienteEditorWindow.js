const { BrowserWindow } = require('electron');
const path = require('path');

function createExpedienteEditorWindow(appInstance, expedienteId) {
    const editorWindow = new BrowserWindow({
        width: 900,
        height: 700,
        parent: BrowserWindow.getFocusedWindow() || null,
        modal: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '../../preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    editorWindow.removeMenu();

    editorWindow.loadFile(path.join(__dirname, '../../src/expediente-editor.html'), {
        query: { id: expedienteId }
    });

    editorWindow.once('ready-to-show', () => {
        editorWindow.show();
    });

    editorWindow.on('closed', () => {
        if (appInstance && typeof appInstance.emit === 'function') {
            appInstance.emit('expediente-editor-closed', expedienteId);
        }
    });

    return editorWindow;
}

module.exports = {
    createExpedienteEditorWindow
};
