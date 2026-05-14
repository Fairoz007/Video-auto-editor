"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  selectFile: () => electron.ipcRenderer.invoke("select-file"),
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  osStats: () => electron.ipcRenderer.invoke("os-stats")
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
