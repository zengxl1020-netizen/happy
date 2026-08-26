import { db } from './database'
import { buildDefaultTemplates } from './templates'
import type {
  AppSettings,
  BackupFile,
  BadgeUnlock,
  Child,
  LaborRecord,
  PointsRule,
  RecordSource,
  StudyPlan,
  TaskCategory,
} from '@/types/models'

/** uuid 生成 */
const uid = () => crypto.randomUUID()

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ================= 初始化与种子数据 ================= */

/** 应用启动时调用：写入默认任务模板与全局设置（仅首次） */
export async function ensureSeeded() {
  await db.transaction('rw', [db.taskTemplates, db.settings], async () => {
    const now = Date.now()
    if ((await db.taskTemplates.count()) === 0) {
      await db.taskTemplates.bulkAdd(buildDefaultTemplates(now))
    }
    if ((await db.settings.get('global')) === undefined) {
      await db.settings.add({
        id: 'global',
        publishers: ['妈妈', '爸爸'],
        currentChildId: null,
        parentLockPin: null,
        soundEnabled: true,
        updatedAt: now,
        deleted: false,
      })
    }
  })
}

/* ================= 小孩 ================= */

export async function listChildren(): Promise<Child[]> {
  return db.children.filter((c) => !c.deleted).sortBy('createdAt')
}

export async function createChild(input: Pick<Child, 'name' | 'avatar' | 'birthday'>): Promise<Child> {
  const now = Date.now()
  const child: Child = { id: uid(), ...input, createdAt: now, updatedAt: now, deleted: false }
  const rule: PointsRule = {
    id: child.id,
    dailyCap: 0,
    allowOverCap: true,
    streakDays: 7,
    streakMinPoints: 10,
    streakBonus: 20,
    lastBonusStreakEnd: null,
    updatedAt: now,
    deleted: false,
  }
  const plans: StudyPlan[] = (['english', 'idiom'] as const).map((type) => ({
    id: `${child.id}_${type}`,
    childId: child.id,
    type,
    enabled: false,
    points: 5,
    progressIndex: 0,
    lastCompletedDate: null,
    updatedAt: now,
    deleted: false,
  }))
  await db.transaction('rw', [db.children, db.pointsRules, db.studyPlans, db.settings], async () => {
    await db.children.add(child)
    await db.pointsRules.add(rule)
    await db.studyPlans.bulkAdd(plans)
    const s = await db.settings.get('global')
    if (s && !s.currentChildId) {
      await db.settings.update('global', { currentChildId: child.id, updatedAt: now })
    }
  })
  return child
}

export async function updateChild(id: string, patch: Partial<Pick<Child, 'name' | 'avatar' | 'birthday'>>) {
  await db.children.update(id, { ...patch, updatedAt: Date.now() })
}

export async function softDeleteChild(id: string) {
  const now = Date.now()
  await db.transaction(
    'rw',
    [db.children, db.pointsRules, db.studyPlans, db.laborRecords, db.settings],
    async () => {
      await db.children.update(id, { deleted: true, updatedAt: now })
      await db.pointsRules.update(id, { deleted: true, updatedAt: now })
      await db.studyPlans.where('childId').equals(id).modify({ deleted: true, updatedAt: now })
      await db.laborRecords.where('childId').equals(id).modify({ deleted: true, updatedAt: now })
      const s = await db.settings.get('global')
      if (s?.currentChildId === id) {
        await db.settings.update('global', { currentChildId: null, updatedAt: now })
      }
    },
  )
}

/* ================= 任务模板 ================= */

export async function listTemplates(category?: TaskCategory): Promise<import('@/types/models').TaskTemplate[]> {
  let q = db.taskTemplates.filter((t) => !t.deleted)
  const all = await q.sortBy('id')
  return category ? all.filter((t) => t.category === category) : all
}

export async function createCustomTemplate(input: {
  category: TaskCategory
  name: string
  icon: string
  defaultPoints: number
}) {
  const now = Date.now()
  await db.taskTemplates.add({ id: uid(), ...input, isCustom: true, updatedAt: now, deleted: false })
}

export async function updateTemplate(id: string, patch: Partial<Pick<import('@/types/models').TaskTemplate, 'name' | 'icon' | 'defaultPoints' | 'category'>>) {
  await db.taskTemplates.update(id, { ...patch, updatedAt: Date.now() })
}

export async function softDeleteTemplate(id: string) {
  await db.taskTemplates.update(id, { deleted: true, updatedAt: Date.now() })
}

/* ================= 积分规则 ================= */

export async function getRule(childId: string): Promise<PointsRule | undefined> {
  const r = await db.pointsRules.get(childId)
  return r && !r.deleted ? r : undefined
}

export async function upsertRule(childId: string, patch: Partial<Omit<PointsRule, 'id' | 'deleted' | 'updatedAt'>>) {
  await db.pointsRules.update(childId, { ...patch, updatedAt: Date.now() })
}

/* ================= 记录（核心） ================= */

export interface AddRecordInput {
  childId: string
  source: RecordSource
  taskName: string
  icon: string
  points: number
  publisher: string
}

export interface AddRecordResult {
  record: LaborRecord
  /** 当日累计（含本条） */
  dayTotal: number
  /** 是否超出每日上限 */
  overCap: boolean
  /** 本次触发的连续奖励记录（无则 null） */
  bonus: LaborRecord | null
}

/** 查询小孩某日积分合计（不含软删除） */
export async function dayPoints(childId: string, date: string): Promise<number> {
  const rows = await db.laborRecords
    .where('[childId+date]')
    .equals([childId, date])
    .filter((r) => !r.deleted)
    .toArray()
  return rows.reduce((s, r) => s + r.points, 0)
}

/** 新增一条记录：自动记录时间/发布人，处理每日上限与连续奖励 */
export async function addRecord(input: AddRecordInput): Promise<AddRecordResult> {
  const now = Date.now()
  const date = todayStr()
  return db.transaction('rw', [db.laborRecords, db.pointsRules], async () => {
    const rule = await db.pointsRules.get(input.childId)
    const before = await dayPoints(input.childId, date)
    const cap = rule?.dailyCap ?? 0
    const overCap = cap > 0 && before + input.points > cap

    if (overCap && rule && !rule.allowOverCap) {
      throw new Error(`今日积分已达上限（${cap} 分），可在设置中允许破例`)
    }

    const record: LaborRecord = {
      id: uid(),
      ...input,
      completedAt: now,
      date,
      overCap,
      updatedAt: now,
      deleted: false,
    }
    await db.laborRecords.add(record)

    const bonus = await tryAwardStreakBonus(input.childId, date, rule ?? null)

    return { record, dayTotal: before + input.points, overCap, bonus }
  })
}

/** 连续奖励：连续 streakDays 天每天 ≥ streakMinPoints，每达成一段发一次 streakBonus */
async function tryAwardStreakBonus(
  childId: string,
  date: string,
  rule: PointsRule | null,
): Promise<LaborRecord | null> {
  if (!rule || rule.streakDays <= 0 || rule.streakBonus <= 0) return null
  if (rule.lastBonusStreakEnd === date) return null

  const streak = await currentStreak(childId, date, rule.streakMinPoints)
  if (streak <= 0 || streak % rule.streakDays !== 0) return null

  const now = Date.now()
  const bonus: LaborRecord = {
    id: uid(),
    childId,
    source: 'bonus',
    taskName: `连续 ${rule.streakDays} 天达标奖励`,
    icon: '🎁',
    points: rule.streakBonus,
    publisher: '系统奖励',
    completedAt: now,
    date,
    overCap: false,
    updatedAt: now,
    deleted: false,
  }
  await db.laborRecords.add(bonus)
  await db.pointsRules.update(childId, { lastBonusStreakEnd: date, updatedAt: now })
  return bonus
}

/** 从 date 往前回溯，计算每天 ≥ minPoints 的连续天数 */
export async function currentStreak(childId: string, fromDate: string, minPoints: number): Promise<number> {
  if (minPoints <= 0) return 0
  const rows = await db.laborRecords
    .where('childId')
    .equals(childId)
    .filter((r) => !r.deleted && r.date <= fromDate)
    .toArray()
  const byDate = new Map<string, number>()
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.points)

  let streak = 0
  const cursor = new Date(fromDate + 'T00:00:00')
  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if ((byDate.get(key) ?? 0) >= minPoints) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return streak
}

export async function listRecordsByDate(childId: string, date: string): Promise<LaborRecord[]> {
  return db.laborRecords
    .where('[childId+date]')
    .equals([childId, date])
    .filter((r) => !r.deleted)
    .sortBy('completedAt')
}

export async function listRecordsByChild(childId: string): Promise<LaborRecord[]> {
  return db.laborRecords.where('childId').equals(childId).filter((r) => !r.deleted).sortBy('completedAt')
}

export async function softDeleteRecord(id: string) {
  await db.laborRecords.update(id, { deleted: true, updatedAt: Date.now() })
}

/** 累计总积分 */
export async function totalPoints(childId: string): Promise<number> {
  const rows = await db.laborRecords.where('childId').equals(childId).filter((r) => !r.deleted).toArray()
  return rows.reduce((s, r) => s + r.points, 0)
}

/* ================= 学习计划（英语/成语） ================= */

export async function listStudyPlans(childId: string): Promise<StudyPlan[]> {
  return db.studyPlans.where('childId').equals(childId).filter((p) => !p.deleted).toArray()
}

export async function updateStudyPlan(
  childId: string,
  type: 'english' | 'idiom',
  patch: Partial<Pick<StudyPlan, 'enabled' | 'points'>>,
) {
  await db.studyPlans.update(`${childId}_${type}`, { ...patch, updatedAt: Date.now() })
}

export interface StudyCompleteResult {
  record: AddRecordResult
  /** 刚学完的内容序号（0 起） */
  finishedIndex: number
}

/**
 * 完成一次学习：生成积分记录（共享每日上限）并推进进度。
 * 同一天同一科目只能完成一次；词库学完后从头循环但不再给新序号。
 */
export async function completeStudy(
  childId: string,
  type: 'english' | 'idiom',
  itemName: string,
  itemIcon: string,
): Promise<StudyCompleteResult> {
  const id = `${childId}_${type}`
  const plan = await db.studyPlans.get(id)
  if (!plan || plan.deleted) throw new Error('学习计划不存在')
  if (!plan.enabled) throw new Error('该学习项目未开启，请家长在设置中开启')
  const date = todayStr()
  if (plan.lastCompletedDate === date) throw new Error('今天已经完成啦，明天再来吧')

  const record = await addRecord({
    childId,
    source: type,
    taskName: itemName,
    icon: itemIcon,
    points: plan.points,
    publisher: '自主学习',
  })
  const finishedIndex = plan.progressIndex
  await db.studyPlans.update(id, {
    progressIndex: plan.progressIndex + 1,
    lastCompletedDate: date,
    updatedAt: Date.now(),
  })
  return { record, finishedIndex }
}

/* ================= 徽章 ================= */

export async function listBadges(childId: string): Promise<BadgeUnlock[]> {
  return db.badgeUnlocks.where('childId').equals(childId).filter((b) => !b.deleted).toArray()
}

export async function unlockBadge(childId: string, badgeKey: string): Promise<boolean> {
  const id = `${childId}_${badgeKey}`
  const existing = await db.badgeUnlocks.get(id)
  if (existing) return false
  const now = Date.now()
  await db.badgeUnlocks.add({ id, childId, badgeKey, unlockedAt: now, updatedAt: now, deleted: false })
  return true
}

/* ================= 全局设置 ================= */

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get('global')
  if (!s) throw new Error('设置未初始化，请先调用 ensureSeeded()')
  return s
}

export async function saveSettings(
  patch: Partial<Pick<AppSettings, 'publishers' | 'currentChildId' | 'parentLockPin' | 'soundEnabled'>>,
) {
  await db.settings.update('global', { ...patch, updatedAt: Date.now() })
}

/* ================= 备份（导出/导入） ================= */

export async function exportBackup(): Promise<BackupFile> {
  const [children, taskTemplates, laborRecords, pointsRules, studyPlans, badgeUnlocks, settings] =
    await Promise.all([
      db.children.toArray(),
      db.taskTemplates.toArray(),
      db.laborRecords.toArray(),
      db.pointsRules.toArray(),
      db.studyPlans.toArray(),
      db.badgeUnlocks.toArray(),
      db.settings.get('global'),
    ])
  return {
    app: 'happy-labor',
    version: 1,
    exportedAt: Date.now(),
    data: { children, taskTemplates, laborRecords, pointsRules, studyPlans, badgeUnlocks, settings: settings ?? null },
  }
}

export async function importBackup(backup: BackupFile) {
  if (backup.app !== 'happy-labor') throw new Error('备份文件格式不正确')
  await db.transaction(
    'rw',
    [db.children, db.taskTemplates, db.laborRecords, db.pointsRules, db.studyPlans, db.badgeUnlocks, db.settings],
    async () => {
      await Promise.all([
        db.children.clear(),
        db.taskTemplates.clear(),
        db.laborRecords.clear(),
        db.pointsRules.clear(),
        db.studyPlans.clear(),
        db.badgeUnlocks.clear(),
        db.settings.clear(),
      ])
      const d = backup.data
      await db.children.bulkAdd(d.children)
      await db.taskTemplates.bulkAdd(d.taskTemplates)
      await db.laborRecords.bulkAdd(d.laborRecords)
      await db.pointsRules.bulkAdd(d.pointsRules)
      await db.studyPlans.bulkAdd(d.studyPlans)
      await db.badgeUnlocks.bulkAdd(d.badgeUnlocks)
      if (d.settings) await db.settings.add(d.settings)
    },
  )
}
