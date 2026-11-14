/** The only bridge between her page and the companion: click-through, focus, tray commands, DSH's status, and questions for DSH. */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('whaleDesktop', {
  setInteractive: interactive => ipcRenderer.send('whale-desktop:interactive', Boolean(interactive)),
  setFocus: wanted => ipcRenderer.send('whale-desktop:focus', Boolean(wanted)),
  onCommand: handler => { ipcRenderer.on('whale-desktop:command', (_event, command) => handler(String(command))) },
  // Data only: { type: 'snapshot', snapshot }, { type: 'state', connected } or { type: 'ack', id, result }.
  onLink: handler => { ipcRenderer.on('whale-desktop:link', (_event, message) => handler(message)) },
  // A question typed in her theatre: DSH sends it through its own composer and answers with an ack.
  sendToDsh: (id, text) => ipcRenderer.send('whale-desktop:send', { id: String(id), text: String(text) }),
})
