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
  if (bridge) bridge.onCommand(function (command) {
    if (command === 'shown') desktop.setShown(true)
    else if (command === 'hidden') desktop.setShown(false)
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
  /**
   * src/client/index.ts hands her state machine over; DSH's page drives it through the link. Found on
   * window.__whaleDesktopShell, never on ctx (Cordis throws for unknown ctx properties).
   */
  desktop.host = function (machine, link) {
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
