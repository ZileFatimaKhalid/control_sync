import robot from 'robotjs';
import keycode from 'keycode';
import electron from 'electron';
import Messages from './messages';
import log from './log';

const possibleModifiers = {
  18: 'alt',
  91: 'command',
  17: 'control',
  16: 'shift',
};

const mouseButtons = {
  0: 'left',
  2: 'right'
}

electron.app.commandLine.appendSwitch('disable-renderer-backgrounding');
electron.powerSaveBlocker.start('prevent-app-suspension');

export const setup = (settings) => {
  if (!settings.ip) {
    log('IP_MISSING', 'Please provide an IP address to connect to with the --ip flag', true);
  }
  
  const client = new Messages(settings.port);
  
  client.on('CONNECTED', data => {
    log('REQUEST_NICKNAME', `attempting to set nickname to ${settings.nickname}`);
    client.send(data.id, 'REQUEST_NICKNAME', { nickname: settings.nickname });
  });
  
  client.connect(settings.ip, settings.port);
  
  client.on('coord', data => {
    console.log(data);
    robot.moveMouse(data.x, data.y);
  });
  
  client.on('md', event => {
    robot.mouseToggle('down', mouseButtons[event.button]);
  });
  
  client.on('mu', event => {
    robot.mouseToggle('up', mouseButtons[event.button]);
  });
  
  client.on('kd', data => {
    const modifiers = data.m && data.m.map(key => possibleModifiers[key]);
    robot.keyToggle(keycode(data.c), 'down', modifiers || []);
  });

  client.on('ku', data => {
    const modifiers = data.m && data.m.map(key => possibleModifiers[key]);
    robot.keyToggle(keycode(data.c), 'up');
  });
  
  client.on('wh', data => {
    robot.scrollMouse(data.x || 0, data.y || 0);
  });
}
