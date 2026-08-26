/**
 * 「快乐劳动」数据模型定稿（M1）
 * 所有表统一携带 updatedAt / deleted 软删除字段，为将来增量云同步预留。
 */

/** 任务分类 */
export type TaskCategory = 'independent' | 'labor' | 'study' | 'life' | 'hobby'

/** 记录来源：劳动 / 学英语 / 学成语 / 连续奖励 */
export type RecordSource = 'labor' | 'english' | 'idiom' | 'bonus'

/** 同步预留字段（所有表通用） */
export interface SyncMeta {
  updatedAt: number  // 最后修改时间（unix 毫秒）
  deleted: boolean   // 软删除标记，true 表示已删除（不物理清除）
}

/** 小孩 */
export interface Child extends SyncMeta {
  id: string          // uuid
  name: string
  avatar: string      // 内置卡通头像 key
  birthday?: string   // YYYY-MM-DD，用于显示年龄
  createdAt: number
}

/** 任务模板（系统默认 + 自定义） */
export interface TaskTemplate extends SyncMeta {
  id: string
  category: TaskCategory
  name: string        // 如「自己穿衣服」
  icon: string        // 图标 key（emoji 或内置插画 key）
  defaultPoints: number
  isCustom: boolean
}

/** 劳动/学习记录（核心流水表） */
export interface LaborRecord extends SyncMeta {
  id: string
  childId: string
  source: RecordSource
  taskName: string
  icon: string
  points: number
  publisher: string    // 任务发布人；学习类记录固定为「自主学习」
  completedAt: number  // 完成时间（自动记录）
  date: string         // YYYY-MM-DD，按天聚合用
  overCap: boolean     // 是否破例超出当日上限
}

/** 积分规则（每个小孩单独一份） */
export interface PointsRule extends SyncMeta {
  id: string           // 与 childId 相同，一对一
  dailyCap: number     // 每日积分上限，0 = 不限
  allowOverCap: boolean // 允许破例（方案已确认：默认 true）
  streakDays: number   // 连续 N 天
  streakMinPoints: number // 每天至少 M 分
  streakBonus: number  // 额外奖励 X 分；0 = 关闭连续奖励
  lastBonusStreakEnd: string | null // 最近一次发放奖励的连续段结束日，防重复发放
}

/** 学习计划（英语/成语，每个小孩独立开关与进度） */
export interface StudyPlan extends SyncMeta {
  id: string           // `${childId}_${type}`
  childId: string
  type: 'english' | 'idiom'
  enabled: boolean     // 家长开关，可单选可双开
  points: number       // 每次完成获得的积分，默认 5
  progressIndex: number // 下一个要学的序号（0 起）
  lastCompletedDate: string | null // 防止一天重复刷分
}

/** 徽章点亮记录 */
export interface BadgeUnlock extends SyncMeta {
  id: string           // `${childId}_${badgeKey}`
  childId: string
  badgeKey: string     // 徽章定义见内置静态配置
  unlockedAt: number
}

/** 全局设置（单行表，id 固定 'global'） */
export interface AppSettings extends SyncMeta {
  id: string
  publishers: string[]    // 常用任务发布人，如 ['妈妈', '爸爸']
  currentChildId: string | null
  parentLockPin: string | null // 家长锁 4 位数字，null = 未开启
  soundEnabled: boolean
}

/** 每日英语词库条目（内置静态 JSON，不进数据库） */
export interface WordItem {
  word: string
  phonetic: string
  meaning: string
  example: string
}

/** 每日成语条目（内置静态 JSON，不进数据库） */
export interface IdiomItem {
  idiom: string
  pinyin: string
  meaning: string
  story: string
}

/** 备份文件格式（导出/导入用） */
export interface BackupFile {
  app: 'happy-labor'
  version: 1
  exportedAt: number
  data: {
    children: Child[]
    taskTemplates: TaskTemplate[]
    laborRecords: LaborRecord[]
    pointsRules: PointsRule[]
    studyPlans: StudyPlan[]
    badgeUnlocks: BadgeUnlock[]
    settings: AppSettings | null
  }
}
