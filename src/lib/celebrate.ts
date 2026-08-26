import confetti from 'canvas-confetti'
import { useAppStore } from '@/stores/appStore'

/** 品牌色撒花粒子 */
const COLORS = ['#FF416C', '#4B6BFB', '#FFC531', '#2dd4bf', '#ffffff']

/** 普通完成：两侧小撒花 */
export function confettiBurst() {
  const opts = { colors: COLORS, ticks: 160, gravity: 0.9, scalar: 0.9, disableForReducedMotion: true }
  confetti({ ...opts, particleCount: 60, spread: 70, origin: { x: 0.15, y: 0.75 }, angle: 60 })
  confetti({ ...opts, particleCount: 60, spread: 70, origin: { x: 0.85, y: 0.75 }, angle: 120 })
}

/** 连续奖励彩蛋：满天星 + 连续喷射 */
export function confettiGrand() {
  const end = Date.now() + 900
  const frame = () => {
    confetti({ colors: COLORS, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, disableForReducedMotion: true })
    confetti({ colors: COLORS, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, disableForReducedMotion: true })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
  confetti({ colors: COLORS, particleCount: 120, spread: 100, origin: { y: 0.4 }, scalar: 1.1, disableForReducedMotion: true })
}

/** 播放音效（尊重全局音效开关） */
export function playSfx(kind: 'success' | 'bonus') {
  const enabled = useAppStore.getState().settings?.soundEnabled ?? true
  if (!enabled) return
  const audio = new Audio(`sfx/${kind}.mp3`)
  audio.volume = kind === 'bonus' ? 0.9 : 0.7
  void audio.play().catch(() => {
    /* 浏览器自动播放限制：忽略 */
  })
}
