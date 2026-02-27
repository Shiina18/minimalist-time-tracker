import { registerSW } from 'virtual:pwa-register'

const listeners = new Set()

export function onPwaUpdateAvailable(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setupPwaUpdateHandler() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      for (const listener of listeners) {
        listener(updateSW)
      }
    },
  })
}

