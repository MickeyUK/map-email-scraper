// Modules to control application life and create native browser window
const { ipcMain, app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const Store = require('electron-store');
//const contextMenu = require('electron-context-menu');

let mainWindow;

/**
 * Create the main application window.
 */
function createWindow() {
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true
    },
    icon: path.join(__dirname, 'app/img/icon.png')
  })

  // and load the index.html of the app.
  mainWindow.loadFile('app/index.html')

  // No menu bar
  mainWindow.setMenuBarVisibility(false)

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Show dev tools
  //mainWindow.webContents.openDevTools()
  //contextMenu();

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

/**
 * ----------------------------------------------------------
 * Map E-Mail Scraper functions
 * 
 * These functions are called from the renderer process.
 * ----------------------------------------------------------
 */
const store = new Store();

/**
 * Gets the saved user data.
 * 
 * @returns {Promise}
 */
ipcMain.handle('getData', async (event, arg) => {
  
  var data = store.get('data');

  // If there is no data, return an empty object
  if (data == undefined) {
    data = {
      googleAPIKey: "",
      hunterAPIKey: "",
      collections: []
    };
  }

  return data;

});

/**
* Saves the user data.
* 
* @returns {Promise}
*/
ipcMain.handle('saveData', async (event, arg) => {

  var data = {
    googleAPIKey: arg.googleAPIKey,
    hunterAPIKey: arg.hunterAPIKey,
    collections: arg.collections
  };

  // Save the data with electron store
  store.set('data', data);

  return true;

});

/**
* Export the data to a CSV file.
* 
* @returns {Promise}
*/
ipcMain.handle('saveCSV', async (event, arg) => {
  
  var toLocalPath = path.resolve(app.getPath("desktop"), "map-email-scraper.csv");
  dialog.showSaveDialog({
    defaultPath: toLocalPath,
    filters: [
      { name: 'CSV', extensions: ['csv'] }
    ]
  }).then((result) => {
    
    // If the user cancelled the save dialog, return
    if (result.canceled) {
      return;
    }

    // Get the file path
    var filePath = result.filePath;

    // Get all collections
    var data = store.get('data');
    var collections = data.collections;

    // Put all collections into one array
    var allCollections = [];
    for (var i = 0; i < collections.length; i++) {
      for (var j = 0; j < collections[i].results.length; j++) {
        allCollections.push(collections[i].results[j]);
      }
    }

    // Create header from object keys of first collection
    var header = Object.keys(allCollections[0]).join(",") + "\r";

    // Create CSV string
    var csv = header;
    for (var i = 0; i < allCollections.length; i++) {
      var row = "";
      for (var key in allCollections[i]) {
        if (row != "") {
          row += ",";
        }

        // If the value is an array, join it with a semicolon
        if (Array.isArray(allCollections[i][key])) {
          allCollections[i][key] = allCollections[i][key].join(";");
        }

        row += allCollections[i][key];

      }
      csv += row + "\r";
    }

    // Write CSV to file
    fs.writeFileSync(filePath, csv);

  });

})

/**
* Export the data to a JSON file.
* 
* @returns {Promise}
*/
ipcMain.handle('saveJSON', async (event, arg) => {
  
  var toLocalPath = path.resolve(app.getPath("desktop"), "map-email-scraper.json");
  dialog.showSaveDialog({
    defaultPath: toLocalPath,
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  }).then((result) => {
    
    // If the user cancelled the save dialog, return
    if (result.canceled) {
      return;
    }

    // Get the file path
    var filePath = result.filePath;

    // Get all collections
    var data = store.get('data');
    var json = JSON.stringify(data.collections);

    // Write CSV to file
    fs.writeFileSync(filePath, json);

  });

});

/**
* Show an alert message.
*/
ipcMain.on("send-alert", (event, incomingMessage) => {
  const options = {
    type: "none",
    buttons: ["Okay"],
    title: "Alert",
    message: incomingMessage
  }
  dialog.showMessageBox(mainWindow, options);
});