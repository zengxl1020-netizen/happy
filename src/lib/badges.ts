import * as repo from '@/db/repo'
import { today } from '@/lib/date'

export interface BadgeDef {
  key: string
  emoji: string
  name: string
  desc: string
}

/** 徽章定义（静态配置，点亮记录存数据库） */
export const BADGES: BadgeDef[] = [
  { key: 'first_labor', emoji: '🥇', name: '第一次劳动', desc: '完成第一条劳动记录' },
  { key: 'streak_3', emoji: '🔥', name: '小火苗', desc: '连续 3 天达标' },
  { key: 'streak_7', emoji: '🌈', name: '坚持一周', desc: '连续 7 天达标' },
  { key: 'streak_30', emoji: '👑', name: '毅力之王', desc: '连续 30 天达标' },
  { key: 'total_100', emoji: '🌟', name: '百分小达人', desc: '累计获得 100 分' },
  { key: 'total_500', emoji: '💎', name: '积分小富翁', desc: '累计获得 500 分' },
  { key: 'labor_20', emoji: '🧹', name: '劳动小蜜蜂', desc: '完成 20 次劳动' },
  { key: 'words_10', emoji: '📖', name: '单词小新手', desc: '学会 10 个英语单词' },
  { key: 'words_50', emoji: '🎓', name: '单词小达人', desc: '学会 50 个英语单词' },
  { key: 'words_100', emoji: '🏆', name: '英语小学霸', desc: '学会全部 100 个单词' },
  { key: 'idioms_10', emoji: '🏮', name: '成语小新手', desc: '学会 10 个成语' },
  { key: 'idioms_50', emoji: '📜', name: '成语小达人', desc: '学会 50 个成语' },
  { key: 'idioms_100', emoji: '🐉', name: '成语大王', desc: '学会全部 100 个成语' },
]

/** 评估并点亮徽章，返回本次新点亮的徽章 */
export async function evaluateBadges(childId: string): Promise<BadgeDef[]> {
  const [records, rule, plans, unlocked] = await Promise.all([
    repo.listRecordsByChild(childId),
    repo.getRule(childId),
    repo.listStudyPlans(childId),
    repo.listBadges(childId),
  ])
  const owned = new Set(unlocked.map((b) => b.badgeKey))

  const total = records.reduce((s, r) => s + r.points, 0)
  const laborCount = records.filter((r) => r.source === 'labor').length
  const streak = rule ? await repo.currentStreak(childId, today(), rule.streakMinPoints) : 0
  const wordsDone = plans.find((p) => p.type === 'english')?.progressIndex ?? 0
  const idiomsDone = plans.find((p) => p.type === 'idiom')?.progressIndex ?? 0

  const checks: Record<string, boolean> = {
    first_labor: laborCount >= 1,
    streak_3: streak >= 3,
    streak_7: streak >= 7,
    streak_30: streak >= 30,
    total_100: total >= 100,
    total_500: total >= 500,
    labor_20: laborCount >= 20,
    words_10: wordsDone >= 10,
    words_50: wordsDone >= 50,
    words_100: wordsDone >= 100,
    idioms_10: idiomsDone >= 10,
    idioms_50: idiomsDone >= 50,
    idioms_100: idiomsDone >= 100,
  }

  const fresh: BadgeDef[] = []
  for (const badge of BADGES) {
    if (!owned.has(badge.key) && checks[badge.key]) {
      if (await repo.unlockBadge(childId, badge.key)) fresh.push(badge)
    }
  }
  return fresh
}
