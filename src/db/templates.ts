import type { TaskCategory, TaskTemplate } from '@/types/models'

/** 分类元信息（展示名 + 主题色） */
export const CATEGORY_META: Record<TaskCategory, { label: string; color: string }> = {
  independent: { label: '独立', color: '#F59E0B' },
  labor: { label: '劳动', color: '#10B981' },
  study: { label: '学习', color: '#3B82F6' },
  life: { label: '生活', color: '#EC4899' },
  hobby: { label: '兴趣', color: '#8B5CF6' },
}

type Seed = [TaskCategory, string, string, number] // [分类, 名称, 图标, 默认积分]

/** 系统默认任务模板（参考常见儿童家务清单） */
const SEEDS: Seed[] = [
  // 独立
  ['independent', '自己穿衣服', '👕', 1],
  ['independent', '自己穿袜子', '🧦', 1],
  ['independent', '自己穿鞋', '👟', 1],
  ['independent', '自己系鞋带', '🎀', 1],
  ['independent', '自己叠被子', '🛏️', 1],
  ['independent', '自己整理书包', '🎒', 1],
  ['independent', '自己洗澡', '🛁', 1],
  ['independent', '自己刷牙', '🪥', 1],
  ['independent', '自己洗手', '🙌', 1],
  ['independent', '自己睡觉', '😴', 1],
  // 劳动
  ['labor', '打扫卫生', '🧹', 1],
  ['labor', '擦桌子', '🧽', 1],
  ['labor', '倒垃圾', '🗑️', 1],
  ['labor', '收拾玩具', '🧸', 1],
  ['labor', '整理书桌', '📚', 1],
  ['labor', '帮忙洗碗', '🍽️', 1],
  ['labor', '帮忙晾衣服', '👗', 1],
  ['labor', '浇花', '🌻', 1],
  ['labor', '整理宠物窝', '🐾', 1],
  ['labor', '扫地', '✨', 1],
  // 学习
  ['study', '读绘本 20 分钟', '📖', 1],
  ['study', '练字一页', '✏️', 1],
  ['study', '完成家庭作业', '📝', 1],
  ['study', '口算练习', '🔢', 1],
  ['study', '背诵一首古诗', '🏮', 1],
  // 生活
  ['life', '饭前摆碗筷', '🥢', 1],
  ['life', '自己吃饭不挑食', '🍚', 1],
  ['life', '多喝水', '🥛', 1],
  ['life', '按时睡觉', '🌙', 1],
  ['life', '整理自己的水杯', '🥤', 1],
  // 兴趣
  ['hobby', '画画一幅', '🎨', 1],
  ['hobby', '练琴 20 分钟', '🎹', 1],
  ['hobby', '运动 30 分钟', '⚽', 1],
  ['hobby', '跳绳 100 个', '🤸', 1],
  ['hobby', '唱一首歌', '🎤', 1],
]

export function buildDefaultTemplates(now: number): TaskTemplate[] {
  return SEEDS.map(([category, name, icon, defaultPoints], i) => ({
    id: `tpl_${String(i + 1).padStart(3, '0')}`,
    category,
    name,
    icon,
    defaultPoints,
    isCustom: false,
    updatedAt: now,
    deleted: false,
  }))
}

/** 内置卡通公主头像 key 列表（资源见 src/lib/avatars.ts） */
export const AVATARS = [
  'princess_1', 'princess_2', 'princess_3', 'princess_4',
  'princess_5', 'princess_6', 'princess_7', 'princess_8',
] as const

/** 自定义任务可选图标 */
export const TEMPLATE_ICONS = ['⭐', '💪', '🧹', '🍽️', '📚', '🧸', '🌻', '🛏️', '🎨', '⚽', '🎹', '🐾'] as const
