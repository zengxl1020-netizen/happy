import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
  BadgeUnlock,
  Child,
  LaborRecord,
  PointsRule,
  StudyPlan,
  TaskTemplate,
} from '@/types/models'

/**
 * IndexedDB 数据库定义。
 * 所有页面与状态层不直接访问本模块，统一走 src/db/repo.ts。
 */
export class HappyLaborDB extends Dexie {
  children!: Table<Child, string>
  taskTemplates!: Table<TaskTemplate, string>
  laborRecords!: Table<LaborRecord, string>
  pointsRules!: Table<PointsRule, string>
  studyPlans!: Table<StudyPlan, string>
  badgeUnlocks!: Table<BadgeUnlock, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('happy-labor')
    this.version(1).stores({
      // 索引声明：仅索引字段，非索引字段照常存储
      children: 'id, name, deleted',
      taskTemplates: 'id, category, isCustom, deleted',
      laborRecords: 'id, childId, date, source, completedAt, deleted, [childId+date], [childId+source]',
      pointsRules: 'id, deleted',
      studyPlans: 'id, childId, type, deleted, [childId+type]',
      badgeUnlocks: 'id, childId, badgeKey, deleted',
      settings: 'id',
    })

    // v2：系统默认任务模板初始积分统一调整为 1
    this.version(2).upgrade(async (tx) => {
      await tx
        .table('taskTemplates')
        .filter((t: { isCustom?: boolean }) => !t.isCustom)
        .modify({ defaultPoints: 1 })
    })
  }
}

export const db = new HappyLaborDB()

export const SYNC_DEFAULTS = { deleted: false } as const

export function touch() {
  return { updatedAt: Date.now() }
}
