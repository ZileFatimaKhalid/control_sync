require('import-export');

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const child_process = require('child_process');
const settings = require('./settings');

let server;
let client;

const loadMainWindow = () => {
    const mainWindow = new BrowserWindow({
        width : 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            contextIsolation: false,
        }
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true,
    }));
    mainWindow.center();

    // Uncomment to open devtools
    // mainWindow.webContents.openDevTools()
}
app.on("ready", loadMainWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

ipcMain.on('startClient', (e, ip) => {
    if (!client) {
        console.log('Starting client with ip:', ip)
        client = true;
        settings.type = 'client';
        settings.nickname = 'macbook';
        settings.ip = ip;
        require('./client').setup(settings);
        require('./share-clipboard').startClient(ip);
    }
})

ipcMain.on('startServer', () => {
    console.log('Starting server')
    if (!server) {
        server = true;
        settings.type = 'server';
        settings.nickname = 'imac';
        require('./server').setup(settings);
        require('./share-clipboard');
    }
})

