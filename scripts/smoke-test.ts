/**
 * M1 数据层冒烟测试（Node + fake-indexeddb）
 * 运行：npm run smoke
 */
import 'fake-indexeddb/auto'
import * as repo from '../src/db/repo'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`断言失败: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

async function main() {
  console.log('M1 数据层冒烟测试开始')

  await repo.ensureSeeded()
  const templates = await repo.listTemplates()
  assert(templates.length >= 30, `种子模板已写入（${templates.length} 条）`)

  const settings = await repo.getSettings()
  assert(settings.publishers.includes('妈妈'), '默认发布人包含「妈妈」')

  // 小孩
  const a = await repo.createChild({ name: '快快', avatar: '🐰' })
  const b = await repo.createChild({ name: '乐乐', avatar: '🐻' })
  assert((await repo.listChildren()).length === 2, '两个小孩创建成功且数据独立')

  // 积分规则默认值
  const rule = await repo.getRule(a.id)
  assert(rule?.allowOverCap === true, '积分规则默认允许破例')

  // 设置每日上限 10 分，添加 6 + 6 两条
  await repo.upsertRule(a.id, { dailyCap: 10 })
  const r1 = await repo.addRecord({ childId: a.id, source: 'labor', taskName: '收拾玩具', icon: '🧸', points: 6, publisher: '妈妈' })
  assert(r1.overCap === false && r1.dayTotal === 6, '第一条 6 分未超限')
  const r2 = await repo.addRecord({ childId: a.id, source: 'labor', taskName: '扫地', icon: '✨', points: 6, publisher: '爸爸' })
  assert(r2.overCap === true && r2.dayTotal === 12, '第二条破例超限并标注 overCap')
  assert(r2.record.publisher === '爸爸' && r2.record.completedAt > 0, '自动记录发布人与完成时间')

  // b 的数据不受 a 影响
  assert((await repo.dayPoints(b.id, r2.record.date)) === 0, '小孩之间积分互不影响')

  // 学习计划
  await repo.updateStudyPlan(a.id, 'english', { enabled: true })
  const s1 = await repo.completeStudy(a.id, 'english', 'apple', '🍎')
  assert(s1.finishedIndex === 0, '英语完成第 1 个单词，进度推进')
  let blocked = false
  try {
    await repo.completeStudy(a.id, 'english', 'book', '📖')
  } catch {
    blocked = true
  }
  assert(blocked, '同一天同学科不可重复学习')

  // 徽章
  assert((await repo.unlockBadge(a.id, 'first_labor')) === true, '徽章首次点亮')
  assert((await repo.unlockBadge(a.id, 'first_labor')) === false, '徽章不重复点亮')

  // 连续奖励逻辑（minPoints=5, streakDays=1 便于当日触发）
  await repo.upsertRule(b.id, { streakDays: 1, streakMinPoints: 5, streakBonus: 20 })
  const r3 = await repo.addRecord({ childId: b.id, source: 'labor', taskName: '浇花', icon: '🌻', points: 5, publisher: '妈妈' })
  assert(r3.bonus !== null && r3.bonus.points === 20, '连续奖励触发并发放 20 分')
  const r4 = await repo.addRecord({ childId: b.id, source: 'labor', taskName: '倒垃圾', icon: '🗑️', points: 5, publisher: '妈妈' })
  assert(r4.bonus === null, '同一连续段不重复发放奖励')

  // 软删除
  await repo.softDeleteRecord(r4.record.id)
  const after = await repo.listRecordsByChild(b.id)
  assert(after.length === 2, '软删除后记录不可见但未物理清除')

  // 导出 / 导入
  const backup = await repo.exportBackup()
  assert(backup.app === 'happy-labor' && backup.data.children.length === 2, '备份导出结构完整')
  await repo.importBackup(backup)
  assert((await repo.listChildren()).length === 2, '备份导入后数据一致')

  console.log('全部通过 ✅')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
