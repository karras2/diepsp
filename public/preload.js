const { ipcRenderer } = require('electron');

ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
  ipcRenderer.removeAllListeners('app_version');
  console.log(arg.version);
});