import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

/** PWA「添加到主屏幕」：捕获浏览器安装提示 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setCanInstall(!!deferred)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    const onInstalled = () => {
      deferred = null
      setCanInstall(false)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    deferred = null
    setCanInstall(false)
  }

  /** 是否为 iOS（需要手动指引） */
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return { canInstall, installed, install, isIOS }
}
