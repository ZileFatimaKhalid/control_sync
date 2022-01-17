import robot from 'robotjs';
import Messages from './messages';
import log from './log';
import eventCapture from './event-capture';

export const setup = (settings) => {
  const screenConfig = require(settings.screenConfig);

  if (!screenConfig) {
    log(
        'MISSING_CONFIG',
        'Please provide a screen configuration using the flag --screenConfig filename.json',
        true // fatal, will exit when true
    );
  }

  const serverScreenConfig = screenConfig[settings.nickname];

  if (!serverScreenConfig) {
    log(
        'MISSING_CONFIG_NICKNAME',
        `
     Please make sure your screen configuration file contains an entry for the server's screen.
     Alternatively, make sure your server was launched with the proper nickname (currently set
     to ${settings.nickname}) which you can change using the flag --nickname NICKNAME_HERE
    `,
        true
    );
  }
  const right = serverScreenConfig.right;


  /**
   * Use these modes to track if we're currently on the server's screen (ONSCREEN) or
   * on another screen (OFFSCREEN)
   **/

  const MODES = {
    ONSCREEN: 1,
    OFFSCREEN: 2,
  };

  /* Track the current mode we're on */

  let mode = MODES.ONSCREEN;

  /* the id for the screen we're currently on right now */

  let otherScreenId = -1;

  /* the object inside the config that maps to the screen we're currently on (for performance) */

  let otherScreenConfig = null;

  /* the objects inside the config for the screen we're on representing left/right/up/down rules  */

  let otherScreenLeft = null;

  /* the current x and y position for the other screen we're currently on */

  let deltaX = 0;
  let deltaY = 0;

  /* the communication channel for the server to speak to the clients over */

  const server = new Messages(settings.port);

  const nicknames = {};
  server.on('REQUEST_NICKNAME', data => {
    log('SET_NICKNAME', `set nickname for id ${data.id} to ${data.nickname}`);
    nicknames[data.nickname] = data.id;
  });

  /**
   * Detect mouse movements and delegate them off to the correct handlers
   **/

  let oldPos = { x: -1, y: -1 };
  setInterval(() => {
    const pos = robot.getMousePos();
    if (pos.x === oldPos.x && pos.y === oldPos.y) {
      // the mouse didnt move, do nothing
      return;
    }
    oldPos = pos;
    // either handle the mouse movement as an on screen mouse movement or off screen
    if (mode === MODES.OFFSCREEN) {
      handleOffscreenMouseMovement(pos);
    } else {
      handleOnScreenMouseMovement(pos);
    }
  }, 0);

  function handleOnScreenMouseMovement(pos) {
    const isRight = (right && pos.x >= right.right && pos.y >= right.top && pos.y <= right.bottom);
    const newMode = isRight ? MODES.OFFSCREEN : MODES.ONSCREEN;
    if (mode !== newMode && newMode === MODES.OFFSCREEN) {
      mode = newMode;
      setupOffScreen({ isRight, pos });
    }
  }

  function handleOffscreenMouseMovement(pos) {
    deltaX += pos.x - 500;
    deltaY += pos.y - 500;
    server.send(otherScreenId, 'coord', { x: deltaX, y: deltaY });
    robot.moveMouse(500, 500);
    const isLeft = otherScreenLeft && deltaX < otherScreenLeft.left && deltaY >= otherScreenLeft.top
        && deltaY <= otherScreenLeft.bottom;
    const newMode = isLeft ? MODES.ONSCREEN : MODES.OFFSCREEN;
    if (mode !== newMode && newMode === MODES.ONSCREEN) {
      mode = newMode;
      setupOnScreen({ isLeft, pos });
    }
  }

  function setOffScreenPropertiesForNickname(nickname) {
    if (!screenConfig[nickname]) {
      return log(
          'MISSING_CONFIG_OTHER_SCREEN',
          `
          detected that we were supposed to visit screen ${nickname} but it has no entry in
          config file
        `
      );
    }
    otherScreenConfig = screenConfig[nickname];
    otherScreenLeft = otherScreenConfig.left;
    otherScreenId = nicknames[nickname];
  }

  function setupOffScreen(location) {
    if (location.isRight) {
      setOffScreenPropertiesForNickname(right.name);
      const percentY = (location.pos.y - right.top) / (right.bottom - right.top);
      deltaY = otherScreenLeft.top + percentY * (otherScreenLeft.bottom - otherScreenLeft.top);
      deltaX = 0;
    }
    robot.moveMouse(500, 500);
    eventCapture.start();
  }

  function setupOnScreen(location) {
    let x = 0, y = 0;
    if (location.isLeft) {
      const percentY = (location.pos.y - otherScreenLeft.top) / (otherScreenLeft.bottom - otherScreenLeft.top);
      y = right.top + percentY * (right.bottom - right.top);
      x = right.right - 1;
    }
    robot.moveMouse(x, y);
    eventCapture.stop();
    otherScreenId = null;
  }

  const possibleModifiers = {
    18: 'alt',
    91: 'command',
    17: 'control',
    16: 'shift',
  };

  const modifiers = {};

  eventCapture.on('mousedown', (button) => {
    console.log('mouse Clicked:', button)
    if (otherScreenId) {
      server.send(otherScreenId, 'md', {
        button,
      });
    }
  });

  eventCapture.on('mouseup', (button) => {
    if (otherScreenId) {
      server.send(otherScreenId, 'mu', {
        button,
      });
    }
  });

  const keySwap = {
    65: 83,
    83: 65,
  };

  eventCapture.on('keydown', (code) => {
    if (possibleModifiers[code]) {
      modifiers[code] = 1;
      return;
    }
    if (otherScreenId) {
      console.log('kd: ', code);
      server.send(otherScreenId, 'kd', {
        c: keySwap[code] ? keySwap[code] : code,
        m: Object.keys(modifiers),
      });
    }
  });

  eventCapture.on('keyup', (code) => {
    if (possibleModifiers[code]) {
      delete modifiers[code];
      return;
    }
    if (otherScreenId) {
      console.log('ku: ', code);
      server.send(otherScreenId, 'ku', { c: keySwap[code] ? keySwap[code] : code });
    }
  });

  eventCapture.on('scroll', (data) => {
    if (otherScreenId) {
      server.send(otherScreenId, 'wh', { y: data.deltaY });
    }
  });
}