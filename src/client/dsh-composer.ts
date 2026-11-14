/**
 * Sends a message through DSH's own chat composer: the theatre's input in DSH, and questions asked from the
 * desktop companion (which reach DSH's page over the link). One path, so both behave exactly alike.
 * The text is put into the composer and DSH's send button is clicked; nothing else on the page is touched.
 */
export type ComposerResult = 'sent' | 'no-composer' | 'no-button'

/** Waits, then runs; the overlay passes its own timer so pending sends are dropped when it unmounts. */
export type ComposerWait = (callback: () => void, ms: number) => void

const COMPOSER_SELECTORS = [
  '[data-composer-input]',
  '[data-composer-card] [contenteditable="true"]',
  '[data-composer-card] [role="textbox"]',
  '[data-composer-seat] [contenteditable="true"]',
  '[data-composer-seat] textarea',
  'textarea',
]

/**
 * Fills DSH's composer with `text` and clicks its send button. `done` is called synchronously when there is
 * no composer, otherwise once the send button was (or could not be) clicked.
 */
export function submitToDshComposer(text: string, done: (result: ComposerResult) => void, wait: ComposerWait = (callback, ms) => { setTimeout(callback, ms) }): void {
  let composer: HTMLElement | null = null
  for (const selector of COMPOSER_SELECTORS) { composer = document.querySelector(selector) as HTMLElement | null; if (composer) break }
  if (!composer) { done('no-composer'); return }
  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    composer.focus()
    const proto = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(composer, text)
    composer.dispatchEvent(new Event('input', { bubbles: true }))
    composer.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    composer.focus()
    const selection = window.getSelection()
    if (selection) { const range = document.createRange(); range.selectNodeContents(composer); selection.removeAllRanges(); selection.addRange(range) }
    let inserted = false
    try { inserted = document.execCommand('insertText', false, text) } catch { inserted = false }
    if (!inserted) {
      try { composer.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text })) } catch { /* ignore */ }
      composer.textContent = text
      composer.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
  wait(() => {
    const card = document.querySelector('[data-composer-card]') || document.querySelector('[data-composer-seat]')
    const button = card ? Array.from(card.querySelectorAll('button')).find(b => /send|发送|steer|queue/i.test(b.getAttribute('aria-label') || b.textContent || '') && !b.disabled && b.getAttribute('aria-disabled') !== 'true') || null : null
    if (button && !button.hasAttribute('disabled')) { button.click(); done('sent') }
    else done('no-button')
  }, 80)
}
