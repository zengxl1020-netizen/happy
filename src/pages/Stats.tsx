import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useCurrentChild } from '@/stores/appStore'
import Avatar from '@/components/Avatar'
import onboardingImg from '@/assets/illustrations/onboarding.png'
import * as repo from '@/db/repo'
import { BADGES } from '@/lib/badges'
import { levelOf } from '@/lib/levels'
import { addDays, parseDate, today } from '@/lib/date'
import type { BadgeUnlock, LaborRecord } from '@/types/models'
import { cn } from '@/lib/utils'

type Period = 'week' | 'month'

const SOURCE_META: Record<LaborRecord['source'], { label: string; color: string }> = {
  labor: { label: '劳动', color: '#10b981' },
  english: { label: '英语', color: '#ff416c' },
  idiom: { label: '成语', color: '#4b6bfb' },
  bonus: { label: '奖励', color: '#ffc531' },
}

export default function Stats() {
  const child = useCurrentChild()
  const [period, setPeriod] = useState<Period>('week')
  const [records, setRecords] = useState<LaborRecord[]>([])
  const [badges, setBadges] = useState<BadgeUnlock[]>([])
  const [streak, setStreak] = useState(0)

  const childId = child?.id ?? null
  useEffect(() => {
    if (!childId) return
    void (async () => {
      const [rs, bs, rl] = await Promise.all([
        repo.listRecordsByChild(childId),
        repo.listBadges(childId),
        repo.getRule(childId),
      ])
      setRecords(rs)
      setBadges(bs)
      if (rl) setStreak(await repo.currentStreak(childId, today(), rl.streakMinPoints))
    })()
  }, [childId])

  const total = useMemo(() => records.reduce((s, r) => s + r.points, 0), [records])
  const { current: level, next: nextLevel } = levelOf(total)

  /** 柱状图数据：周=近7天，月=近30天 */
  const barData = useMemo(() => {
    const days = period === 'week' ? 7 : 30
    const end = today()
    const map = new Map<string, number>()
    for (const r of records) map.set(r.date, (map.get(r.date) ?? 0) + r.points)
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(end, -(days - 1 - i))
      const d = parseDate(date)
      return {
        date,
        label: period === 'week' ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getDate()}`,
        points: map.get(date) ?? 0,
      }
    })
  }, [records, period])

  /** 分类占比 */
  const pieData = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) map.set(r.source, (map.get(r.source) ?? 0) + r.points)
    return [...map.entries()].map(([source, value]) => ({
      name: SOURCE_META[source as LaborRecord['source']].label,
      value,
      color: SOURCE_META[source as LaborRecord['source']].color,
    }))
  }, [records])

  const ownedKeys = useMemo(() => new Set(badges.map((b) => b.badgeKey)), [badges])

  if (!child) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center p-8 text-center">
        <img src={onboardingImg} alt="" className="h-44 w-44 object-contain" />
        <p className="mt-4 text-lg font-black text-[#2a2d5e]">先在首页添加一位小朋友吧</p>
      </div>
    )
  }

  const weekTotal = barData.slice(-7).reduce((s, d) => s + d.points, 0)

  return (
    <div className="space-y-5 p-5">
      <h1 className="flex items-center gap-2 text-2xl font-black text-[#2a2d5e]"><Avatar avatar={child.avatar} className="h-9 w-9" />{child.name}的统计</h1>

      {/* 等级 + 汇总 */}
      <div className="card-coral relative overflow-hidden rounded-[28px] p-5">
        <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white/75">当前称号</p>
            <p className="mt-1 text-2xl font-black text-white">
              {level.emoji} {level.title}
            </p>
            <p className="mt-1 text-xs font-bold text-white/70">
              {nextLevel ? `再得 ${nextLevel.min - total} 分晋升「${nextLevel.title}」` : '已是最高称号 🎉'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-[#ffe89a]">{total}</p>
            <p className="text-xs font-bold text-white/70">累计积分</p>
          </div>
        </div>
        <div className="relative mt-4 flex gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">
            🔥 连续 {streak} 天
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">
            📅 近 7 天 +{weekTotal}
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">
            🏅 徽章 {ownedKeys.size}/{BADGES.length}
          </span>
        </div>
      </div>

      {/* 积分趋势 */}
      <div className="card-soft rounded-[28px] p-5">
        <div className="flex items-center justify-between">
          <p className="font-black text-[#2a2d5e]">积分趋势</p>
          <div className="flex gap-1 rounded-full bg-[#f6f7fb] p-1">
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-black transition-all',
                  period === p ? 'pill-sun' : 'text-[#9aa0b8]',
                )}
              >
                {p === 'week' ? '近 7 天' : '近 30 天'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9aa0b8', fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                interval={period === 'month' ? 4 : 0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#9aa0b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Bar dataKey="points" radius={[6, 6, 6, 6]} fill="#4b6bfb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 分类占比 */}
      <div className="card-soft rounded-[28px] p-5">
        <p className="font-black text-[#2a2d5e]">积分来源</p>
        {pieData.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[#9aa0b8]">还没有数据，快去记一笔吧</p>
        ) : (
          <div className="mt-2 flex items-center">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={38} outerRadius={64} paddingAngle={4} stroke="none">
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 pl-4">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm font-bold text-[#2a2d5e]">{d.name}</span>
                  <span className="ml-auto text-sm font-black text-[#9aa0b8]">{d.value} 分</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 徽章墙 */}
      <div className="card-soft rounded-[28px] p-5">
        <p className="font-black text-[#2a2d5e]">🏅 徽章墙</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {BADGES.map((b) => {
            const owned = ownedKeys.has(b.key)
            return (
              <div
                key={b.key}
                className={cn(
                  'flex flex-col items-center rounded-[20px] p-3 text-center',
                  owned ? 'bg-[#ffc531]/15' : 'bg-[#f6f7fb]',
                )}
              >
                <span className={cn('text-3xl', !owned && 'grayscale opacity-40')}>{b.emoji}</span>
                <p className={cn('mt-1 text-xs font-black', owned ? 'text-[#2a2d5e]' : 'text-[#9aa0b8]')}>
                  {b.name}
                </p>
                <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#9aa0b8]">{b.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
