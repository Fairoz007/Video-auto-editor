import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import os from 'os'
import icon from '../../resources/icon.png?asset'

let backendProcess: ChildProcess | null = null

function startBackend(): void {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
  const backendPath = join(app.getAppPath(), 'app/backend/main.py')
  
  console.log(`Starting backend at: ${backendPath}`)
  
  backendProcess = spawn(pythonPath, [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  })

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err)
  })

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`)
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.fairoz.videoeditor')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  startBackend()

  // IPC Handlers
  ipcMain.handle('select-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }]
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('os-stats', () => {
    return {
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      cpus: os.cpus()
    }
  })

  ipcMain.handle('run-upload', async () => {
    return new Promise((resolve) => {
      const uploadProcess = spawn('node', ['upload.js'], {
        cwd: app.getAppPath()
      })
      
      let output = ''
      uploadProcess.stdout.on('data', (data) => output += data.toString())
      uploadProcess.stderr.on('data', (data) => output += data.toString())
      
      uploadProcess.on('close', (code) => {
        if (code === 0) resolve({ success: true, output })
        else resolve({ success: false, output })
      })
    })
  })

  ipcMain.handle('run-python', async (_, { script, args }) => {
    return new Promise((resolve) => {
      const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
      console.log(`Executing: ${pythonPath} ${script} ${args.join(' ')}`)
      
      const processObj = spawn(pythonPath, [script, ...args], {
        cwd: app.getAppPath(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      })
      
      let output = ''
      processObj.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log(`[Python ${script}] ${text.trim()}`)
      })
      processObj.stderr.on('data', (data) => {
        const text = data.toString()
        output += text
        console.error(`[Python ${script}] ${text.trim()}`)
      })
      
      processObj.on('close', (code) => {
        console.log(`[Python ${script}] Exited with code ${code}`)
        if (code === 0) resolve({ success: true, output })
        else resolve({ success: false, output })
      })
      
      processObj.on('error', (err) => {
        console.error(`[Python ${script}] Failed to start:`, err)
        resolve({ success: false, output: err.message })
      })
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill()
})
