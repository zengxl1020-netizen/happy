import { create } from 'zustand'
import * as repo from '@/db/repo'
import { today } from '@/lib/date'
import type { LaborRecord, PointsRule, TaskTemplate } from '@/types/models'

interface HomeState {
  selectedDate: string
  records: LaborRecord[]
  rule: PointsRule | null
  dayTotal: number
  totalPoints: number
  /** 连续达标天数（按当前规则的 streakMinPoints 计算，仅看今天往前） */
  streak: number
  templates: TaskTemplate[]

  /** 当前小孩或日期变化后刷新首页数据 */
  load: (childId: string) => Promise<void>
  selectDate: (childId: string, date: string) => Promise<void>
  addLabor: (
    childId: string,
    input: { taskName: string; icon: string; points: number; publisher: string },
  ) => Promise<repo.AddRecordResult>
  removeRecord: (childId: string, recordId: string) => Promise<void>
  refreshTemplates: () => Promise<void>
  refreshRule: (childId: string) => Promise<void>
}

async function loadStreak(childId: string, rule: PointsRule | null) {
  if (!rule || rule.streakMinPoints <= 0) return 0
  return repo.currentStreak(childId, today(), rule.streakMinPoints)
}

export const useHomeStore = create<HomeState>((set, get) => ({
  selectedDate: today(),
  records: [],
  rule: null,
  dayTotal: 0,
  totalPoints: 0,
  streak: 0,
  templates: [],

  load: async (childId) => {
    const { selectedDate } = get()
    const [records, rule, dayTotal, totalPoints, templates] = await Promise.all([
      repo.listRecordsByDate(childId, selectedDate),
      repo.getRule(childId).then((r) => r ?? null),
      repo.dayPoints(childId, selectedDate),
      repo.totalPoints(childId),
      repo.listTemplates(),
    ])
    const streak = await loadStreak(childId, rule)
    set({ records, rule, dayTotal, totalPoints, templates, streak })
  },

  selectDate: async (childId, date) => {
    set({ selectedDate: date })
    const [records, dayTotal] = await Promise.all([
      repo.listRecordsByDate(childId, date),
      repo.dayPoints(childId, date),
    ])
    set({ records, dayTotal })
  },

  addLabor: async (childId, input) => {
    const result = await repo.addRecord({ childId, source: 'labor', ...input })
    const { selectedDate, rule } = get()
    const [records, dayTotal, totalPoints, streak] = await Promise.all([
      repo.listRecordsByDate(childId, selectedDate),
      repo.dayPoints(childId, selectedDate),
      repo.totalPoints(childId),
      loadStreak(childId, rule),
    ])
    set({ records, dayTotal, totalPoints, streak })
    return result
  },

  removeRecord: async (childId, recordId) => {
    await repo.softDeleteRecord(recordId)
    const { selectedDate, rule } = get()
    const [records, dayTotal, totalPoints, streak] = await Promise.all([
      repo.listRecordsByDate(childId, selectedDate),
      repo.dayPoints(childId, selectedDate),
      repo.totalPoints(childId),
      loadStreak(childId, rule),
    ])
    set({ records, dayTotal, totalPoints, streak })
  },

  refreshTemplates: async () => {
    set({ templates: await repo.listTemplates() })
  },

  refreshRule: async (childId) => {
    const rule = await repo.getRule(childId)
    const streak = await loadStreak(childId, rule ?? null)
    set({ rule: rule ?? null, streak })
  },
}))
