const { app, BrowserWindow, ipcMain  } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
function createWindow(options = {}) {
    if (options.width == null) {
        options.width = 1900;
    }
    if (options.height == null) {
        options.height = 1200;
    }
    if (options.htmlFile == null || options.preloadFile == null) {
        throw new Error("Window Opening: one or more of the required options is missing: 'htmlFile', 'prelodFile'");
    }
    if (options.show == null) {
        options.show = true;
    }
    const mainWindow = new BrowserWindow({
        width: options.width,
        height: options.height,
        show: options.show,
        icon: __dirname + "/icon.ico",
        webPreferences: {
            preload: path.join(__dirname, "public", options.preloadFile)
        }
    });
    if (options.maximize) {
        mainWindow.maximize();
    }
    mainWindow.setTitle("Loading...");
    mainWindow.loadFile(path.join(__dirname, "public", options.htmlFile));
    mainWindow.setMenuBarVisibility(false);
    return mainWindow;
}
function load() {
    const mainWindow = createWindow({
        htmlFile: "index.html",
        preloadFile: "preload.js",
        maximize: true,
        show: false
    });
    mainWindow.webContents.on("did-finish-load", function() {
        mainWindow.webContents.setZoomFactor(1);
        mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    });
    mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });
}
app.on("ready", () => {
    load();
    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow({
                htmlFile: "index.html",
                preloadFile: "preload.js"
            });
        }
    });
});
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', { version: app.getVersion() });
});

autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    dialog.showMessageBox({
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    }).then((returnValue) => {
        if (returnValue.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});