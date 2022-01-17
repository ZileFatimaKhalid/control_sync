const net = require('net');
const clipboard = require("copy-paste");

const port = 7582;
const peers = [];
let lastClipboardText = '';

// check and push clipboard text to other peers
function checkAndPushText() {
    const clipboardText = clipboard.paste();
    if (clipboardText === lastClipboardText
        || clipboardText.length === 0
        || peers.length === 0) {
        return;
    }
    // create message
    const messageLength = Buffer.byteLength(clipboardText, 'utf8') + 8;
    const messageData = new Buffer(messageLength);
    // message length
    messageData.writeInt32BE(messageLength, 0);
    // clipboard type
    messageData.write("\x00\x00\x00\x01", 4);
    messageData.write(clipboardText, 8);

    for (let i = 0; i < peers.length; i++) {
        const socket = peers[i];
        socket.write(messageData);
    }
    lastClipboardText = clipboardText;
}

// checks every 1 second
setInterval(checkAndPushText, 1000);

// connect to a server
export const startClient = (host) => {
    const client = net.connect({port: port, host: host},
        function () {
            // add client to the list
            peers.push(client);
            checkAndPushText();
        });
    client.on('data', function (data) {
        writeToClipboard(data);
    });
    client.on('end', function () {
        const index = peers.indexOf(client);
        if (index > -1) {
            peers.splice(index, 1);
        }
    });
    client.on('error', function () {
        const index = peers.indexOf(client);
        if (index > -1) {
            peers.splice(index, 1);
        }
    });
}

function writeToClipboard(data) {
    if (data.length <= 8)
        return;
    // skip the 8 bytes header
    const text = data.toString('utf8', 8);
    clipboard.copy(text);
}

const server = net.createServer(function (socket) {
    // add client to the list
    peers.push(socket);

    // broadcast the data
    socket.on('data', function (chunk) {
        for (let i = 0; i < peers.length; i++) {
            const client = peers[i];
            if (client !== socket) {
                client.write(chunk);
            } else {
                writeToClipboard(chunk);
            }
        }
    });

    socket.on('end', function () {
        const index = peers.indexOf(socket);
        if (index > -1) {
            peers.splice(index, 1);
        }
    });

    // error handling
    socket.on('error', function (err) {
        const index = peers.indexOf(socket);
        if (index > -1) {
            peers.splice(index, 1);
        }
    });
});

// port 7582 is used by Share Clipboard
server.listen(port, function () {
    console.log("server started");
});