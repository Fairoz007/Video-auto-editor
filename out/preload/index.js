"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  selectFile: () => electron.ipcRenderer.invoke("select-file"),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  osStats: () => electron.ipcRenderer.invoke("os-stats"),
  runUpload: () => electron.ipcRenderer.invoke("run-upload"),
  runPython: (script, args) => electron.ipcRenderer.invoke("run-python", { script, args }),
  scanAssets: () => electron.ipcRenderer.invoke("scan-assets")
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
