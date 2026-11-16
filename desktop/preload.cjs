/** The only bridge between her page and the companion: click-through, focus, tray commands, DSH's status, and questions for DSH. */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('whaleDesktop', {
  setInteractive: interactive => ipcRenderer.send('whale-desktop:interactive', Boolean(interactive)),
  setFocus: wanted => ipcRenderer.send('whale-desktop:focus', Boolean(wanted)),
  onCommand: handler => { ipcRenderer.on('whale-desktop:command', (_event, command) => handler(String(command))) },
  // Data only: { type: 'snapshot', snapshot }, { type: 'state', connected }, { type: 'ack', id, result }
  // or { type: 'history', id, log } (log null when DSH could not answer).
  onLink: handler => { ipcRenderer.on('whale-desktop:link', (_event, message) => handler(message)) },
  // A question typed in her theatre: DSH sends it through its own composer and answers with an ack.
  sendToDsh: (id, text) => ipcRenderer.send('whale-desktop:send', { id: String(id), text: String(text) }),
  // Her theatre's Log: ask DSH for the messages loaded in its current conversation (answered with type 'history').
  readHistory: id => ipcRenderer.send('whale-desktop:history', { id: String(id) }),
  // Her settings: "back to DSH" hides her window (the tray and Alt+Shift+H bring her back).
  hide: () => ipcRenderer.send('whale-desktop:hide'),
})
