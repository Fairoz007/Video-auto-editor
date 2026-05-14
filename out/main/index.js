"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const child_process = require("child_process");
const os = require("os");
const icon = path.join(__dirname, "../../resources/icon.png");
let backendProcess = null;
function startBackend() {
  const pythonPath = process.platform === "win32" ? "python" : "python3";
  const backendPath = path.join(electron.app.getAppPath(), "app/backend/main.py");
  console.log(`Starting backend at: ${backendPath}`);
  backendProcess = child_process.spawn(pythonPath, [backendPath], {
    stdio: "inherit",
    env: { ...process.env, PYTHONUNBUFFERED: "1" }
  });
  backendProcess.on("error", (err) => {
    console.error("Failed to start backend process:", err);
  });
  backendProcess.on("exit", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.fairoz.videoeditor");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  startBackend();
  electron.ipcMain.handle("select-file", async () => {
    const { canceled, filePaths } = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Videos", extensions: ["mp4", "mov", "avi", "mkv"] }]
    });
    return canceled ? null : filePaths[0];
  });
  electron.ipcMain.handle("select-folder", async () => {
    const { canceled, filePaths } = await electron.dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    return canceled ? null : filePaths[0];
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  electron.ipcMain.handle("os-stats", () => {
    return {
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      cpus: os.cpus()
    };
  });
  electron.ipcMain.handle("run-upload", async () => {
    return new Promise((resolve) => {
      const uploadProcess = child_process.spawn("node", ["upload.js"], {
        cwd: electron.app.getAppPath()
      });
      let output = "";
      uploadProcess.stdout.on("data", (data) => output += data.toString());
      uploadProcess.stderr.on("data", (data) => output += data.toString());
      uploadProcess.on("close", (code) => {
        if (code === 0) resolve({ success: true, output });
        else resolve({ success: false, output });
      });
    });
  });
  electron.ipcMain.handle("run-python", async (_, { script, args }) => {
    return new Promise((resolve) => {
      const pythonPath = process.platform === "win32" ? "python" : "python3";
      console.log(`Executing: ${pythonPath} ${script} ${args.join(" ")}`);
      const processObj = child_process.spawn(pythonPath, [script, ...args], {
        cwd: electron.app.getAppPath(),
        env: { ...process.env, PYTHONIOENCODING: "utf-8" }
      });
      let output = "";
      processObj.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log(`[Python ${script}] ${text.trim()}`);
      });
      processObj.stderr.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.error(`[Python ${script}] ${text.trim()}`);
      });
      processObj.on("close", (code) => {
        console.log(`[Python ${script}] Exited with code ${code}`);
        if (code === 0) resolve({ success: true, output });
        else resolve({ success: false, output });
      });
      processObj.on("error", (err) => {
        console.error(`[Python ${script}] Failed to start:`, err);
        resolve({ success: false, output: err.message });
      });
    });
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("before-quit", () => {
  if (backendProcess) backendProcess.kill();
});
