import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-whale-pet'

export function apply(ctx: Context): void {
  // Host-side plugin entry point.
  // The Web client half is automatically registered via package.json dsh.client manifest.
  ctx.effect(() => {
    console.log('[dsh-whale-pet] Whale Pet plugin loaded in Cordis host.')
    return () => {
      console.log('[dsh-whale-pet] Whale Pet plugin unloaded.')
    }
  })
}
