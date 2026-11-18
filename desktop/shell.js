/**
 * Stands in for the part of DSH the pet bundle needs: the module loader that hands it React, and the
 * 'shell.overlay' slot it mounts into. Loaded before lib/client.js.
 */
(function () {
  'use strict'
  var desktop = window.__whaleDesktopShell = { plugin: null, render: null, disposers: [], shown: true }
  var vendor = window.__WhaleDesktopReact, bridge = window.whaleDesktop

  // ---- "in front" means "on the desktop" ----------------------------------------------------------
  // Inside DSH, the pet treats "DSH window not focused" as background: CSS animations pause, wandering
  // and idle play stop, Live2D drops to 10-15 fps. The companion window is shown without ever taking
  // focus (it must not steal it), so in DSH's terms she would be in the background forever and look
  // frozen and choppy. Here she is in front whenever her window is shown, and hidden (all frames
  // stopped) when it is hidden from the tray or the shortcut.
  try {
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: function () { return desktop.shown } })
    Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return !desktop.shown } })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return desktop.shown ? 'visible' : 'hidden' } })
  } catch (error) { console.warn('[dsh-whale-pet][desktop] cannot redefine page focus', error) }
  desktop.setShown = function (shown) {
    shown = Boolean(shown)
    if (shown === desktop.shown) return
    desktop.shown = shown
    document.dispatchEvent(new Event('visibilitychange'))
  }
  var arrivalTimer = null
  if (bridge) bridge.onCommand(function (command) {
    if (command === 'shown') desktop.setShown(true)
    else if (command === 'hidden') desktop.setShown(false)
    else if (command === 'arrive') {
      document.documentElement.dataset.whaleDesktopArrival = 'true'
      if (arrivalTimer !== null) clearTimeout(arrivalTimer)
      arrivalTimer = setTimeout(function () {
        delete document.documentElement.dataset.whaleDesktopArrival
        arrivalTimer = null
      }, 650)
    }
  })

  // ---- desktop defaults ------------------------------------------------------------------------
  // Power saving (Live2D ≤ 30 fps, 20 while idle) is on by default on the desktop: she is on screen all
  // day, over everything. Only a missing choice is filled in; the user's own setting always wins.
  try {
    var key = 'dsh-whale-pet.preferences.v1', saved = JSON.parse(localStorage.getItem(key) || '{}')
    if (saved && typeof saved === 'object' && typeof saved.powerSave !== 'boolean') {
      saved.powerSave = true
      localStorage.setItem(key, JSON.stringify(saved))
    }
  } catch (error) { /* Storage may be unavailable; DSH's defaults apply. */ }

  window.__ModuleLoader__ = {
    load: function (module) {
      if (!vendor || !module || module.id !== 'dsh-whale-pet') return
      desktop.plugin = module.factory(function (id) {
        if (id === 'react') return vendor.React
        throw new Error('dsh-whale-pet desktop: unknown module ' + id)
      })
    },
  }
  /** The Cordis client context, reduced to what src/client/index.ts uses. */
  desktop.context = {
    slots: {
      inject: function (_name, callback) { callback() },
      register: function (_config, render) { desktop.render = render; return function () { desktop.render = null } },
    },
    effect: function (callback) { var dispose = callback(); if (typeof dispose === 'function') desktop.disposers.push(dispose) },
    // No DSH services on the desktop (balance, sessions): scopes that wait for them never run.
    inject: function () {},
  }
  // ---- questions asked in her theatre ---------------------------------------------------------------
  // DSH sends them through its own composer and reports back: sent, no-composer, no-button or failed.
  var pending = {}, nextId = 1
  function settle(id, result) {
    var entry = pending[id]
    if (!entry) return
    delete pending[id]
    clearTimeout(entry.timer)
    entry.done(result === 'sent' || result === 'no-composer' || result === 'no-button' ? result : 'failed')
  }
  desktop.sendToDsh = function (text, done) {
    var id = 'q' + Date.now().toString(36) + '-' + nextId++
    pending[id] = { done: typeof done === 'function' ? done : function () {}, timer: setTimeout(function () { settle(id, 'failed') }, 20000) }
    if (bridge && typeof bridge.sendToDsh === 'function') bridge.sendToDsh(id, String(text))
    else settle(id, 'failed')
  }
  /** Her settings: go back into DSH (hides this window; DSH shows her again). */
  desktop.hide = function () { if (bridge && typeof bridge.hide === 'function') bridge.hide() }
  if (bridge && typeof bridge.onLink === 'function') bridge.onLink(function (message) {
    if (message && message.type === 'ack') settle(String(message.id), String(message.result))
  })

  // ---- her theatre's Log: DSH's current conversation, read only when asked -----------------------
  // There is no DSH page here to read. Each snapshot names DSH's page and its open conversation
  // (snapshot.conversation: { source, session }); a Log request is answered only with that same
  // conversation's messages. A newer request, a conversation change or a lost link drops the request,
  // so a late answer can never bring back another conversation's messages. Nothing is kept: the Log
  // asks again every time it opens.
  var linked = false, conversation = null, historyAsk = null, nextHistory = 1
  function readContext(value) {
    if (!value || typeof value !== 'object') return null
    var source = value.source, session = value.session
    if (typeof source !== 'string' || !source || source.length > 128) return null
    if (session !== null && (typeof session !== 'string' || !session || session.length > 512)) return null
    return { source: source, session: session }
  }
  function sameContext(a, b) { return Boolean(a && b && a.source === b.source && a.session === b.session) }
  /** Ends the request in flight; done(result) only when it is answered, never for a dropped one. */
  function endHistory(result) {
    var ask = historyAsk
    if (!ask) return
    historyAsk = null
    clearTimeout(ask.timer)
    if (result) ask.done(result)
  }
  function conversationChanged() { window.dispatchEvent(new CustomEvent('dsh-whale-pet:desktop-conversation')) }
  /**
   * done gets { status: 'ready', entries, truncated } or { status: 'unavailable' | 'disconnected' |
   * 'outdated' | 'failed' }, at most once; returns a function that cancels the request.
   */
  desktop.readHistory = function (done) {
    done = typeof done === 'function' ? done : function () {}
    endHistory(null)
    if (!bridge || typeof bridge.readHistory !== 'function' || !linked) { done({ status: 'disconnected' }); return function () {} }
    // Connected, but DSH's plugin does not name its conversation: it is older than this companion.
    // (Limits match CONVERSATION_LOG_LIMITS in conversation-log.ts: source ≤128, session ≤512.)
    if (!conversation) { done({ status: 'outdated' }); return function () {} }
    var ask = { id: 'h' + Date.now().toString(36) + '-' + nextHistory++, context: conversation, done: done, timer: null }
    ask.timer = setTimeout(function () { if (historyAsk === ask) endHistory({ status: 'failed' }) }, 20000)
    historyAsk = ask
    bridge.readHistory(ask.id)
    return function () { if (historyAsk === ask) endHistory(null) }
  }
  if (bridge && typeof bridge.onLink === 'function') bridge.onLink(function (message) {
    if (!message || typeof message !== 'object') return
    if (message.type === 'state') {
      linked = Boolean(message.connected)
      if (!linked) {
        var had = conversation
        conversation = null
        endHistory({ status: 'disconnected' })
        if (had) conversationChanged()
      }
    } else if (message.type === 'snapshot') {
      linked = true
      var next = message.snapshot && typeof message.snapshot === 'object' ? readContext(message.snapshot.conversation) : null
      if (!sameContext(next, conversation) && (next || conversation)) {
        conversation = next
        endHistory(null)
        conversationChanged()
      }
    } else if (message.type === 'history') {
      var ask = historyAsk
      if (!ask || String(message.id) !== ask.id) return
      var log = message.log === null || typeof desktop.readLog !== 'function' ? null : desktop.readLog(message.log)
      if (!log) { endHistory({ status: 'failed' }); return }
      // Only the conversation it was asked for, and still the one DSH has open.
      if (!sameContext(log.context, ask.context) || !sameContext(log.context, conversation)) { endHistory({ status: 'failed' }); return }
      if (log.status !== 'ready') { endHistory({ status: 'unavailable' }); return }
      endHistory({ status: 'ready', entries: log.entries, truncated: Boolean(log.truncated) })
    }
  })

  /**
   * src/client/index.ts hands her state machine over; DSH's page drives it through the link. Found on
   * window.__whaleDesktopShell, never on ctx (Cordis throws for unknown ctx properties).
   */
  desktop.host = function (machine, link) {
    // The bundle's checker for DSH's conversation log (conversation-log.ts), used by readHistory above.
    if (link && typeof link.readLog === 'function') desktop.readLog = link.readLog
    if (!bridge || typeof bridge.onLink !== 'function') return
    var connected = false
    function announce() {
      document.documentElement.dataset.whaleDshLink = connected ? 'on' : 'off'
      window.dispatchEvent(new CustomEvent('dsh-whale-pet:desktop-link', { detail: { status: connected ? 'connected' : 'searching', side: 'desktop' } }))
    }
    announce()
    bridge.onLink(function (message) {
      if (!message || typeof message !== 'object') return
      if (message.type === 'snapshot') {
        if (link.apply(machine, message.snapshot) && !connected) { connected = true; announce() }
      } else if (message.type === 'state' && Boolean(message.connected) !== connected) {
        connected = Boolean(message.connected)
        if (!connected) link.lost(machine)
        announce()
      }
    })
  }
})()
