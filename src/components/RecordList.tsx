import { Trash2 } from 'lucide-react'
import emptyDayImg from '@/assets/illustrations/empty-day.png'
import { timeLabel } from '@/lib/date'
import type { LaborRecord } from '@/types/models'
import { cn } from '@/lib/utils'

const SOURCE_STYLE: Record<LaborRecord['source'], { tag: string; className: string }> = {
  labor: { tag: '劳动', className: 'bg-emerald-50 text-emerald-500' },
  english: { tag: '英语', className: 'bg-sky-50 text-sky-500' },
  idiom: { tag: '成语', className: 'bg-violet-50 text-violet-500' },
  bonus: { tag: '奖励', className: 'bg-amber-50 text-amber-500' },
}

interface Props {
  records: LaborRecord[]
  onDelete: (id: string) => void
}

/** 某日记录列表：大圆角白卡 + 绘本风空状态插画 */
export default function RecordList({ records, onDelete }: Props) {
  if (records.length === 0) {
    return (
      <div className="card-soft rounded-[28px] p-8 text-center">
        <img
          src={emptyDayImg}
          alt="还没有记录"
          className="mx-auto h-36 w-36 object-contain"
        />
        <p className="mt-3 font-black text-[#2a2d5e]">这一天还没有记录</p>
        <p className="mt-1 text-xs font-bold text-[#9aa0b8]">点下面的「添加劳动」记一笔吧</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {[...records].reverse().map((r) => {
        const style = SOURCE_STYLE[r.source]
        return (
          <div key={r.id} className="card-soft flex items-center gap-3.5 rounded-[24px] p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#f6f7fb] text-3xl">
              {r.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-black text-[#2a2d5e]">{r.taskName}</p>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black', style.className)}>
                  {style.tag}
                </span>
                {r.overCap && (
                  <span className="shrink-0 rounded-full bg-[#ffc531]/20 px-2 py-0.5 text-[10px] font-black text-[#d99e00]">
                    破例
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-bold text-[#9aa0b8]">
                {timeLabel(r.completedAt)} · {r.publisher}发布
              </p>
            </div>
            <p className="shrink-0 text-xl font-black text-[#ff416c]">+{r.points}</p>
            <button
              onClick={() => onDelete(r.id)}
              className="shrink-0 rounded-full p-2 text-[#c6cadb] transition-colors hover:text-[#ff416c] active:scale-90"
              aria-label="删除记录"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
