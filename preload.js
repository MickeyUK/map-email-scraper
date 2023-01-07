// Import the necessary Electron modules
const { ipcRenderer, contextBridge } = require('electron')

// Exposed protected methods in the render process
contextBridge.exposeInMainWorld('api', {


  getData: () => ipcRenderer.invoke('getData'),
  saveData: (data) => ipcRenderer.invoke('saveData', data),
  saveCSV: () => ipcRenderer.invoke('saveCSV'),
  saveJSON: () => ipcRenderer.invoke('saveJSON'),

  messageMain: (channel, message) => {
    let validChannels = ['send-alert', 'send-confirm'];
    if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, message);
    }
  },

});