import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as repo from '@/db/repo'
import { WORDS } from '@/data/words'
import { IDIOMS } from '@/data/idioms'
import { today } from '@/lib/date'
import type { StudyPlan } from '@/types/models'

interface Props {
  childId: string
  /** 学习完成后通知父组件刷新（积分等） */
  refreshKey?: number
}

/** 首页「学习乐园」双入口卡：仅展示家长已开启的项目 */
export default function StudyEntryCards({ childId, refreshKey }: Props) {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<StudyPlan[]>([])

  useEffect(() => {
    void repo.listStudyPlans(childId).then(setPlans)
  }, [childId, refreshKey])

  const enabled = plans.filter((p) => p.enabled)
  if (enabled.length === 0) return null

  return (
    <div className={`grid gap-3 ${enabled.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {enabled.map((p) => {
        const isEnglish = p.type === 'english'
        const items = isEnglish ? WORDS : IDIOMS
        const done = p.lastCompletedDate === today()
        const next = items[Math.min(p.progressIndex, items.length - 1)]
        const preview = isEnglish ? (next as (typeof WORDS)[number]).word : (next as (typeof IDIOMS)[number]).idiom
        return (
          <button
            key={p.id}
            onClick={() => navigate(`/study/${p.type}`)}
            className={`${isEnglish ? 'card-coral' : 'card-space'} relative overflow-hidden rounded-[28px] p-4 text-left transition-transform active:scale-95`}
          >
            <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
            <p className="relative text-3xl">{isEnglish ? '📖' : '🏮'}</p>
            <p className="relative mt-1.5 font-black text-white">{isEnglish ? '每日英语' : '每日成语'}</p>
            <p className="relative mt-0.5 truncate text-xs font-bold text-white/75">
              {done ? '今天已完成 ✓' : `今天学：${preview}`}
            </p>
          </button>
        )
      })}
    </div>
  )
}
