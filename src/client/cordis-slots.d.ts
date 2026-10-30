import type { Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: {
      inject(name: string, callback: () => unknown): () => void
      register(
        options: { name: string; id: string; locale?: string },
        component: unknown
      ): () => void
    }
  }
}
