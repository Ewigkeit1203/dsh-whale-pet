/** The only bridge between her page and the companion: click-through, focus, tray commands, and DSH's status. */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('whaleDesktop', {
  setInteractive: interactive => ipcRenderer.send('whale-desktop:interactive', Boolean(interactive)),
  setFocus: wanted => ipcRenderer.send('whale-desktop:focus', Boolean(wanted)),
  onCommand: handler => { ipcRenderer.on('whale-desktop:command', (_event, command) => handler(String(command))) },
  // Data only: { type: 'snapshot', snapshot } or { type: 'state', connected }. Nothing here reaches DSH.
  onLink: handler => { ipcRenderer.on('whale-desktop:link', (_event, message) => handler(message)) },
})
