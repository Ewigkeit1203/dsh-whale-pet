import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { PetStateMachine } from './state-machine.js'
import { PetOverlay } from './PetOverlay.js'
import './galgame.css'

export const name = 'dsh-whale-pet-client'
export const inject = ['slots']

/**
 * Extracts pure assistant response text, completely excluding reasoning blocks,
 * thoughts, and summaries so thinking never leaks into dialogue.
 */
function extractResponseText(container: Element): string {
  if (!container) return ''

  // 1. Direct MarkdownText query inside assistant container (excluding any think/reasoning blocks)
  const mdElements = Array.from(
    container.querySelectorAll('[class*="markdown"], [data-markdown-variant]')
  ).filter(el => !el.closest('[data-variant="think"]') && !el.closest('[data-turn-process-inline]'))

  if (mdElements.length > 0) {
    const text = mdElements.map(el => el.textContent || '').join('\n').trim()
    if (text) return text
  }

  // 2. Clone and strip think blocks fallback
  const clone = container.cloneNode(true) as HTMLElement
  const thinkElements = clone.querySelectorAll(
    '[data-variant="think"], [data-turn-process-inline], details.think, [class*="reasoning"], [class*="thought"], .summary, .thinkBody'
  )
  thinkElements.forEach(el => el.remove())
  return (clone.textContent || '').trim()
}

/**
 * Extracts live Chain-of-Thought reasoning text from the active reasoning element
 * or its React fiber if the element is collapsed.
 */
function extractReasoningText(): string {
  const thinkNodes = Array.from(
    document.querySelectorAll('[data-variant="think"], details.think, [class*="reasoning"], [class*="thinkBody"]')
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
 * Query account balances (Topped-up and Granted) from DSH DOM elements
 */
function queryAccountBalances(): { toppedUp: string; granted: string } | null {
  let toppedUp = ''
  let granted = ''

  const rows = Array.from(
    document.querySelectorAll('[class*="balanceCard"] [class*="row"], [class*="balance"] [class*="row"]')
  )
  for (const row of rows) {
    const text = row.textContent || ''
    const amountEl = row.querySelector('[class*="amount"]')
    const amount = amountEl?.textContent?.trim() || ''
    if (amount) {
      if (/充值|topped-up|balance/i.test(text) && !/赠金|granted|bonus/i.test(text)) {
        toppedUp = amount
      } else if (/赠金|granted|bonus/i.test(text)) {
        granted = amount
      }
    }
  }

  if (!toppedUp && !granted) {
    const amountEls = Array.from(document.querySelectorAll('[class*="amount"]'))
    if (amountEls.length >= 2) {
      toppedUp = amountEls[0].textContent?.trim() || ''
      granted = amountEls[1].textContent?.trim() || ''
    } else if (amountEls.length === 1) {
      toppedUp = amountEls[0].textContent?.trim() || ''
    }
  }

  if (toppedUp || granted) {
    return {
      toppedUp: toppedUp || '¥0.00',
      granted: granted || '¥0.00',
    }
  }

  return null
}

/**
 * Find the latest assistant message node in the DSH conversation flow
 */
function findLatestAssistantNode(): Element | null {
  // 1. Primary: exact assistant-step items
  const assistantSeats = Array.from(document.querySelectorAll('[data-chat-flow-kind="assistant-step"]'))
  if (assistantSeats.length > 0) {
    return assistantSeats[assistantSeats.length - 1]
  }

  // 2. Secondary: chat nodes that are not user-prompts
  const candidateNodes = Array.from(
    document.querySelectorAll('[data-chat-node-key]:not([data-chat-flow-kind="user-prompt"])')
  )
  if (candidateNodes.length > 0) {
    return candidateNodes[candidateNodes.length - 1]
  }

  // 3. Fallback: assistant markdown roots
  const mdRoots = Array.from(
    document.querySelectorAll('div[class*="AssistantMarkdown_root"], div[class*="AssistantMarkdown"]')
  )
  if (mdRoots.length > 0) {
    return mdRoots[mdRoots.length - 1]
  }

  return null
}

export function apply(ctx: Context): void {
  const stateMachine = new PetStateMachine()
  const loadTime = Date.now()

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

  // 2. User Input & Composer Interaction Listener
  ctx.effect(() => {
    const isComposerElement = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false
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
      // Guard against initial autofocus or startup events within the first 1.8s
      if (Date.now() - loadTime < 1800) return

      stateMachine.resetActivity()
      const status = stateMachine.getStatus()
      if (!status.autoGalGameOnChat) return
      const target = e.target as HTMLElement | null
      if (!target) return
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

    window.addEventListener('focusin', handleFocusIn, true)
    window.addEventListener('focusout', handleFocusOut, true)
    window.addEventListener('input', handleInput, true)
    window.addEventListener('click', handleComposerClick, true)

    return () => {
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

    const inspectDomState = () => {
      // ---- 0. Conversation identity & turn-start detection ----
      const sessionEl = document.querySelector('[data-conversation-session]')
      const sessionId = sessionEl ? sessionEl.getAttribute('data-conversation-session') : null
      if (lastSessionId !== undefined && sessionId !== lastSessionId) {
        stateMachine.clearReasoningText()
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
      const balances = queryAccountBalances()
      if (balances) {
        stateMachine.setBalances(balances.toppedUp, balances.granted)
      }

      // 1. Extract live Chain-of-Thought reasoning
      const reasoningContent = extractReasoningText()
      if (reasoningContent) {
        stateMachine.setReasoningText(reasoningContent)
      }

      // 2. Locate latest assistant message container
      const latestAssistantNode = findLatestAssistantNode()

      if (isRunning) {
        let cleanResponse = ''
        if (latestAssistantNode) {
          cleanResponse = extractResponseText(latestAssistantNode)
        }

        if (cleanResponse) {
          // Model has begun streaming the actual response!
          // Transitions state to EATING (switches character to baifan2.png!)
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

    const observer = new MutationObserver(() => {
      inspectDomState()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-streaming', 'data-chat-running', 'data-holding'],
    })

    const interval = setInterval(inspectDomState, 200)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      stateMachine.dispose()
    }
  })
}
