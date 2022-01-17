import punt from 'punt';
import Observable from '../observable';
import interfaces from './interfaces';
import log from '../log';

class Messages extends Observable {
  constructor(port, bind_interface = '0.0.0.0') {
    super();

    this.port = port;           // port to bind to
    this.peers = {};            // peer id to connection object
    this.peersByInterface = {}; // peer ipv4 to connection object
    this.peerCount = 0;         // count of total number of peers ever seen

    // bind on the UDP port and trigger events on all incoming messages
    log('LISTENING', `bound to port ${port}`);
    this.server = punt.bind(`${bind_interface}:${port}`);
    this.server.on('message', (message) => {
      this.trigger(message.type, message);
    });

    // bind the handshake handlers to their corresponding event names
    this.on(this, 'introduce', this._handleIntroduction.bind(this));
    this.on(this, 'connectionProbe', this._handleConnectionProbe.bind(this));
    this.on(this, 'probeReply', this._handleProbeReply.bind(this));
    this.on(this, 'assignId', this._handleAssignId.bind(this));
  }

  send(client_id, type, message = {}) {
    const connection = this.peers[client_id];
    if (!connection) {
      return;
    }
    message.type = type;
    message.id = connection.inId;
    connection.send(message);
  }

  connect(ip, port) {
    const connection = punt.connect(`${ip}:${port}`);
    this.peerCount++;
    const peer = this.peerCount;
    this.peers[peer] = connection;
    this.peersByInterface[ip] = connection;
    connection.outId = peer;
    connection.send({
      type: 'introduce',
      id: peer,
      interfaces,
      port: this.port,
    });
    log('ATTEMPT_CONNETION', `attempting connection to ${ip}:${port} assigned ID ${peer}`);
    return peer;
  }

  _handleIntroduction(message) {
    log('GOT_HANDSHAKE', `introduced to ${message.interfaces.join(',')}:${message.port} who assigned me id ${message.id}`);
    message.interfaces.forEach(current_interface => {
      const connection = punt.connect(`${current_interface}:${message.port}`);
      connection.send({
        type: 'connectionProbe',
        interface: current_interface,
        id: message.id,
        port: message.port,
      });
    });
  }

  _handleConnectionProbe(message) {
    const connection = this.peers[message.id];
    if (!connection || connection.resolved) {
      return;
    }
    log('RESOLVED_IP', `resolved my ip for ID ${message.id}`);
    connection.resolved = true;
    connection.send({
      type: 'probeReply',
      id: message.id,
      interface: message.interface,
      port: message.port,
    });
  }

  _handleProbeReply(message) {
    log('CONNETED', `resolved ip for ${message.interface}:${message.port} who assigned me ID ${message.id}`);
    const connection = punt.connect(`${message.interface}:${message.port}`);
    let myId;
    if (this.peersByInterface[message.interface]) {
      const old_connection = this.peersByInterface[message.interface];
      connection.outId = old_connection.outId;
      this.peers[connection.outId] = connection;
      this.peersByInterface[message.interface] = connection;
      myId = connection.outId;
    } else {
      this.peerCount++;
      const peer = myId = this.peerCount;
      this.peers[peer] = connection;
      this.peersByInterface[message.interface] = connection;
      connection.outId = peer;
    }
    connection.inId = message.id;
    connection.send({
      type: 'assignId',
      myId: myId,
      id: message.id,
    });
    this.trigger('INCOMING_CONNECTION', { id: myId });
  }

  _handleAssignId(message) {
    const connection = this.peers[message.id];
    if (!connection) {
      return;
    }
    log('CONNETED', `user I gave ID ${message.id} assigned me ID ${message.myId}`);
    connection.inId = message.myId;
    this.trigger('CONNECTED', { id: message.id });
  }

};

export default Messages;
