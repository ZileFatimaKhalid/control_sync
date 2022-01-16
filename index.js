require('import-export');

const { app, BrowserWindow, ipcMain, Notification, Menu } = require("electron");

const path = require("path");
const url = require("url");
const electron = require('electron');
const shell = require('electron').shell;
const child_process = require('child_process');
const dialog = electron.dialog;
// let spawn = require("child_process").spawn;
console.log('hello from server/index')

var run_command = true;
let server;
let client;

const loadMainWindow = () => {
    // var command = 'cd';
    // var args = ["C:\Users\awais\Documents\c_sync"];
    // var callback = null;
    // var child = child_process.spawn(command, args, {
    //     encoding: 'utf8',
    //     shell: true
    // });
    // child.stdout.setEncoding('utf8');
    // child.stdout.on('data', (data) => {
    //     //Here is the output
    //     data=data.toString();
    //     console.log(data);
    // });
    const mainWindow = new BrowserWindow({
        width : 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            contextIsolation: false,
        }
    });

    // mainWindow.loadFile(path.join(__dirname, "index.html"));
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true,
    }));
    mainWindow.center();
    console.log(mainWindow.webContents.openDevTools());


    const template = [
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { role: 'close' }
            ]
        },
        {
            role: 'Help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        const { shell } = require('electron')
                        await shell.openExternal('https://electronjs.org')
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);



}
app.on("ready", loadMainWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }

    if (server) {
        console.log('kill ' + server.pid);
        server.stdin.pause();
        process.kill(server.pid)
        // server.kill();
    }

});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

function run_script2(command, args, callback) {
    var child = child_process.spawn(command, args, {
        encoding: 'utf8',
        shell: true
    });
    // You can also use a variable to save the output for when the script closes later
    child.on('error', (error) => {
        dialog.showMessageBox({
            title: 'Title',
            type: 'warning',
            message: 'Error occured.\r\n' + error
        });
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
        //Here is the output
        data=data.toString();
        console.log(data);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
        // Return some data to the renderer process with the mainprocess-response ID
        mainWindow.webContents.send('mainprocess-response', data);
        //Here is the output from the command
        console.log(data);
    });

    child.on('close', (code) => {
        //Here you can get the exit code of the script
        switch (code) {
            case 0:
                dialog.showMessageBox({
                    title: 'Title',
                    type: 'info',
                    message: 'End process.\r\n'
                });
                break;
        }

    });
    if (typeof callback === 'function')
        callback();
}


// This function will output the lines from the script
// and will return the full combined output
// as well as exit code when it's done (using the callback).
function run_script1(command, args, callback) {
    var child = child_process.spawn(command, args, {
        encoding: 'utf8',
        shell: true
    });
    // You can also use a variable to save the output for when the script closes later
    child.on('error', (error) => {
        dialog.showMessageBox({
            title: 'Title',
            type: 'warning',
            message: 'Error occured.\r\n' + error
        });
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
        //Here is the output
        data=data.toString();
        console.log(data);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
        // Return some data to the renderer process with the mainprocess-response ID
        mainWindow.webContents.send('mainprocess-response', data);
        //Here is the output from the command
        console.log(data);
    });

    child.on('close', (code) => {
        //Here you can get the exit code of the script
        switch (code) {
            case 0:
                dialog.showMessageBox({
                    title: 'Title',
                    type: 'info',
                    message: 'End process.\r\n'
                });
                break;
        }

    });
    if (typeof callback === 'function')
        callback();

    run_script2("dir", [""], null);
}




ipcMain.on('show-notification', (event, ...args) => {
    const notification = {
        title: 'New Task',
        body: `Added: ${args[0]}`
    }

    new Notification(notification).show()
});

// var cmd = require('node-cmd');
// const null
const spawn = require('child_process').spawn;

//Windows multiline commands are not guaranteed to work try condensing to a single line.

const settings = require('./settings');


ipcMain.on('startClient', (e, ip) => {
    // str = "cd ../Project && npm start -- --type client --nickname mac --ip 192.168.18.150";
    // str += ip;
    // syncDir=cmd.runSync(str);
    if (!client) {
        console.log('Starting client with ip:', ip)
        client = true;
        settings.type = 'client';
        settings.nickname = 'macbook';
        settings.ip = ip;
        require('./client').setup(settings);
    }
    
})

ipcMain.on('startServer', () => {
    console.log('Starting server')
    // const syncDir = cmd.run('cd ../Project && npm start -- --type server --nickname imac', function(err, data, stderr){
    //     console.log('[SERVER_SPAWN_PROCESS]::data', data)
    //     console.log('[SERVER_SPAWN_PROCESS]::err', err)
    //     console.log('[SERVER_SPAWN_PROCESS]::stderr', stderr)
    // });
    if (!server) {

        server = true;
        settings.type = 'server';
        settings.nickname = 'imac';
        require(settings.type === 'server' ? './server' : './client').setup(settings);

        // server = spawn('node', ['start-server.js']);
        // server = spawn('npm', ['run', 'start-server']);
        //
        // server.stdout.on('data', (data) => {
        //     console.log(`stdout: ${data}`);
        // });
        //
        // server.stderr.on('data', (data) => {
        //     console.error(`stderr: ${data}`);
        // });
        //
        // server.on('close', (code) => {
        //     console.log(`child process exited with code ${code}`);
        // });
    }
})

// shell.openPath("C:\\Users\\awais\\Documents\\c_sync");
// run_script1("dir", [""], null);

