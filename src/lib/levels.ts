/** 等级称号：按累计积分晋升 */

export interface Level {
  min: number
  title: string
  emoji: string
}

export const LEVELS: Level[] = [
  { min: 0, title: '劳动小新星', emoji: '⭐' },
  { min: 100, title: '劳动小能手', emoji: '🌟' },
  { min: 300, title: '劳动小达人', emoji: '🏅' },
  { min: 600, title: '劳动小冠军', emoji: '🏆' },
  { min: 1000, title: '劳动小超人', emoji: '🦸' },
]

export function levelOf(totalPoints: number): { current: Level; next: Level | null } {
  let current = LEVELS[0]
  let next: Level | null = null
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalPoints >= LEVELS[i].min) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? null
    } else break
  }
  return { current, next }
}
