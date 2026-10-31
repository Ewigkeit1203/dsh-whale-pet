import { messageText } from './experience.js'
import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { PetStateMachine } from './state-machine.js'
import { PetOverlay } from './PetOverlay.js'
import { AccountBalancePoller, ACCOUNT_CLIENT_VERSION } from './account-balance.js'
import './galgame.css'

export const name = 'dsh-whale-pet-client'
export const inject = ['slots']

/**
 * Extracts pure assistant response text, completely excluding reasoning blocks,
 * thoughts, and summaries so thinking never leaks into dialogue.
 */
function extractResponseText(container: Element): string {
  return messageText(container)
}

/**
 * Extracts live Chain-of-Thought reasoning text from the active reasoning element
 * or its React fiber if the element is collapsed.
 */
function extractReasoningText(container: Element | null): string {
  if (!container) return ''
  const thinkNodes = Array.from(
    container.querySelectorAll('[data-variant="think"], details.think, [class*="reasoning"], [class*="thinkBody"]')
  )
  if (thinkNodes.length === 0) return ''
  const lastNode = thinkNodes[thinkNodes.length - 1]

  // 1. Try React Fiber memoizedProps if collapsed
  try {
    const fiberKey = Object.keys(lastNode).find(
      k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    )
    if (fiberKey) {
      let curr = (lastNode as any)[fiberKey]
      for (let i = 0; i < 8 && curr; i++) {
        if (curr.memoizedProps?.text && typeof curr.memoizedProps.text === 'string') {
          return curr.memoizedProps.text.trim()
        }
        if (curr.memoizedProps?.content && typeof curr.memoizedProps.content === 'string') {
          return curr.memoizedProps.content.trim()
        }
        if (curr.memoizedProps?.reasoning && typeof curr.memoizedProps.reasoning === 'string') {
          return curr.memoizedProps.reasoning.trim()
        }
        curr = curr.return || curr.child
      }
    }
  } catch {}

  // 2. Query inner body or full textContent
  const bodyEl = lastNode.querySelector('.thinkBody, [class*="body"], [class*="content"]')
  if (bodyEl && bodyEl.textContent?.trim()) {
    return bodyEl.textContent.trim()
  }

  return lastNode.textContent?.trim() || ''
}

/**
 * Fallback: read the DSH account settings card while it is mounted.
 * Only used when the host account service is unavailable. Missing fields stay
 * empty (never padded with ¥0.00), there is no page-wide amount guessing, and
 * the plugin's own DOM is excluded.
 */
function queryAccountBalances(): { toppedUp: string; granted: string } | null {
  let toppedUp = ''
  let granted = ''
  const rows = Array.from(document.querySelectorAll('[class*="balanceCard"] [class*="row"]'))
    .filter(row => !row.closest('[data-whale-pet]'))
  for (const row of rows) {
    const label = row.firstElementChild?.textContent || row.textContent || ''
    const amount = row.querySelector('[class*="amount"]')?.textContent?.trim() || ''
    if (!amount) continue
    if (/赠金|granted|bonus/i.test(label)) granted = amount
    else if (/余额|充值|balance|topped/i.test(label)) toppedUp = amount
  }
  return toppedUp || granted ? { toppedUp, granted } : null
}

/**
 * Find the latest assistant message node in the DSH conversation flow
 */
function findLatestAssistantNode(): Element | null {
  const prompts = document.querySelectorAll('[data-chat-flow-kind="user-prompt"]')
  const latestPrompt = prompts[prompts.length - 1]
  const currentTurn = (nodes: Element[]) => nodes.filter(node => !latestPrompt || !(node.compareDocumentPosition(latestPrompt) & Node.DOCUMENT_POSITION_FOLLOWING))
  // 1. Primary: exact assistant-step items
  const assistantSeats = currentTurn(Array.from(document.querySelectorAll('[data-chat-flow-kind="assistant-step"]')))
  if (assistantSeats.length > 0) {
    return assistantSeats[assistantSeats.length - 1]
  }

  // 2. Secondary: chat nodes that are not user-prompts
  const candidateNodes = currentTurn(Array.from(
    document.querySelectorAll('[data-chat-node-key]:not([data-chat-flow-kind="user-prompt"])')
  ))
  if (candidateNodes.length > 0) {
    return candidateNodes[candidateNodes.length - 1]
  }

  // 3. Fallback: assistant markdown roots
  const mdRoots = currentTurn(Array.from(
    document.querySelectorAll('div[class*="AssistantMarkdown_root"], div[class*="AssistantMarkdown"]')
  ))
  if (mdRoots.length > 0) {
    return mdRoots[mdRoots.length - 1]
  }

  return null
}

export function apply(ctx: Context): void {
  const stateMachine = new PetStateMachine()

  // 1. Mount PetOverlay into the global frame-wide floating slot ('shell.overlay')
  ctx.slots.inject('shell.overlay', () => {
    return ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'dsh-whale-pet',
      },
      () => React.createElement(PetOverlay, { stateMachine })
    )
  })

  // 1b. Balance through DSH's own account service, in a sub-scope that waits
  // for the services without delaying the companion. Older hosts without them
  // simply never run this block and keep the DOM fallback.
  if (typeof (ctx as any).inject === 'function') {
    (ctx as any).inject(['remote', 'remote.account', 'remoteAccess'], (scoped: any) => {
      const remote = scoped.remote
      const access = scoped.remoteAccess
      if (typeof remote?.account?.getBalance !== 'function' || typeof access?.whenAccess !== 'function') return
      const locale = (): string => {
        try { const active = scoped.get?.('locale')?.getSnapshot?.()?.active; if (typeof active === 'string' && active) return active } catch { /* optional */ }
        return document.documentElement.lang || navigator.language || 'zh'
      }
      const client = () => ({ version: ACCOUNT_CLIENT_VERSION, locale: locale(), timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60 })
      try {
        access.whenAccess('account/watch', () => {
          const poller = new AccountBalancePoller({
            getBalance: () => remote.account.getBalance(client()),
            publish: snapshot => stateMachine.setHostBalance(snapshot),
            isHidden: () => document.hidden,
          })
          poller.start()
          const visible = () => { if (!document.hidden) void poller.refresh() }
          let streaming = stateMachine.getStatus().isStreaming
          const unsubscribe = stateMachine.subscribe(status => {
            if (streaming && !status.isStreaming) void poller.refresh()
            streaming = status.isStreaming
          })
          document.addEventListener('visibilitychange', visible)
          window.addEventListener('focus', visible)
          return () => {
            document.removeEventListener('visibilitychange', visible)
            window.removeEventListener('focus', visible)
            unsubscribe()
            poller.stop()
          }
        })
      } catch (error) {
        console.warn('[dsh-whale-pet] account balance unavailable:', error instanceof Error ? error.message : 'unknown')
      }
    })
  }

  // 2. User Input & Composer Interaction Listener
  ctx.effect(() => {
    const isComposerElement = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement) || el.closest('[data-whale-pet]')) return false
      return (
        el.tagName === 'TEXTAREA' ||
        el.hasAttribute('data-composer-input') ||
        el.isContentEditable ||
        el.closest('[data-composer-seat]') !== null
      )
    }

    const handleFocusIn = (e: FocusEvent) => {
      if (isComposerElement(e.target)) {
        stateMachine.resetActivity()
        stateMachine.setInputFocus(true)
      }
    }

    const handleFocusOut = (e: FocusEvent) => {
      if (isComposerElement(e.target)) {
        stateMachine.setInputFocus(false)
      }
    }

    const handleInput = (e: Event) => {
      if (isComposerElement(e.target)) {
        stateMachine.resetActivity()
        stateMachine.setInputFocus(true)
      }
    }

    // Only enter GalGame dialogue mode when user explicitly clicks into the composer area
    const handleComposerClick = (e: MouseEvent) => {
      if (!e.isTrusted) return

      stateMachine.resetActivity()
      const status = stateMachine.getStatus()
      if (!status.autoGalGameOnChat) return
      const target = e.target as HTMLElement | null
      if (!target || target.closest('[data-whale-pet]')) return
      if (
        (target.closest && (
          target.closest('[data-composer-card]') ||
          target.closest('[data-composer-seat]') ||
          target.closest('[data-composer-input]') ||
          target.closest('[data-slot="conversation.composer.bar"]')
        )) ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (!status.isGalGameMode) {
          stateMachine.setGalGameMode(true)
        }
      }
    }

    const handleActivity = () => stateMachine.resetActivity()
    window.addEventListener('pointerdown', handleActivity, true)
    window.addEventListener('focusin', handleFocusIn, true)
    window.addEventListener('focusout', handleFocusOut, true)
    window.addEventListener('input', handleInput, true)
    window.addEventListener('click', handleComposerClick, true)

    return () => {
      window.removeEventListener('pointerdown', handleActivity, true)
      window.removeEventListener('focusin', handleFocusIn, true)
      window.removeEventListener('focusout', handleFocusOut, true)
      window.removeEventListener('input', handleInput, true)
      window.removeEventListener('click', handleComposerClick, true)
    }
  })

  // 3. Model Reasoning & Streaming Detection via MutationObserver & Polling
  ctx.effect(() => {
    let lastSessionId: string | null | undefined = undefined
    let wasRunning = false
    let scheduled: ReturnType<typeof setTimeout> | null = null
    let lastBalanceCheck = 0

    const inspectDomState = () => {
      // ---- 0. Conversation identity & turn-start detection ----
      const sessionEl = document.querySelector('[data-conversation-session]')
      const sessionId = sessionEl ? sessionEl.getAttribute('data-conversation-session') : null
      if (lastSessionId !== undefined && sessionId !== lastSessionId) {
        stateMachine.clearReasoningText()
        stateMachine.setLatestDialogue('')
      }
      lastSessionId = sessionId

      // Check for running status indicator [data-chat-running]
      const runningElement = document.querySelector('[data-chat-running]')
      const isRunning = runningElement !== null && !runningElement.hasAttribute('data-holding')

      // Turn start: clear previous turn's thought bubble
      if (isRunning && !wasRunning) {
        stateMachine.clearReasoningText()
      }
      wasRunning = isRunning

      // Query balances if available
      if (Date.now() - lastBalanceCheck >= 2000) {
        lastBalanceCheck = Date.now()
        const balances = queryAccountBalances()
        if (balances) stateMachine.setBalances(balances.toppedUp, balances.granted)
      }

      // 1. Extract live Chain-of-Thought reasoning
      const latestAssistantNode = findLatestAssistantNode()
      const reasoningContent = extractReasoningText(latestAssistantNode)
      if (reasoningContent) {
        stateMachine.setReasoningText(reasoningContent)
      }

      // 2. Locate latest assistant message container
      if (isRunning) {
        let cleanResponse = ''
        if (latestAssistantNode) {
          cleanResponse = extractResponseText(latestAssistantNode)
        }

        if (cleanResponse) {
          // Model has begun streaming the actual response!
          // Dedicated answering pose; rice eating only follows completed output.
          stateMachine.setStreaming(true)
          stateMachine.setReasoning(false)
          stateMachine.setLatestDialogue(cleanResponse)
        } else {
          // Still in thinking phase: CoT text remains strictly in thought bubble
          stateMachine.setStreaming(false)
          stateMachine.setReasoning(true)
        }
      } else {
        // Idle / Finished
        stateMachine.setStreaming(false)
        stateMachine.setReasoning(false)

        if (latestAssistantNode) {
          const cleanResponse = extractResponseText(latestAssistantNode)
          if (cleanResponse) {
            stateMachine.setLatestDialogue(cleanResponse)
          }
        }
      }
    }

    const observer = new MutationObserver(records => {
      const hostChanged = records.some(record => {
        const el = record.target instanceof Element ? record.target : record.target.parentElement
        return !el?.closest('[data-whale-pet]')
      })
      if (!hostChanged || scheduled !== null) return
      scheduled = setTimeout(() => {
        scheduled = null
        inspectDomState()
      }, 100)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-streaming', 'data-chat-running', 'data-holding', 'data-conversation-session'],
    })

    inspectDomState()
    const interval = setInterval(inspectDomState, 1000)

    return () => {
      observer.disconnect()
      if (scheduled !== null) clearTimeout(scheduled)
      clearInterval(interval)
      stateMachine.dispose()
    }
  })
}
