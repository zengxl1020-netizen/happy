interface Props {
  recordCount: number
  dayTotal: number
  dailyCap: number // 0 = 不限
  isToday: boolean
}

/** 今日概览卡：珊瑚粉渐变核心卡，大白数字 + 明黄进度 */
export default function DayOverview({ recordCount, dayTotal, dailyCap, isToday }: Props) {
  const hasCap = dailyCap > 0
  const progress = hasCap ? Math.min(1, dayTotal / dailyCap) : 0
  const over = hasCap && dayTotal > dailyCap

  return (
    <div className="card-coral relative overflow-hidden rounded-[28px] p-5">
      <span className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-12 right-6 h-28 w-28 rounded-full bg-white/10" />

      <div className="relative flex items-end justify-between">
        <div>
          <p className="text-sm font-bold text-white/75">{isToday ? '今日完成' : '当天完成'}</p>
          <p className="mt-1 text-4xl font-black text-white">
            {recordCount}
            <span className="ml-1 text-base font-bold text-white/70">条</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white/75">{isToday ? '今日获得' : '当天获得'}</p>
          <p className="mt-1 text-4xl font-black text-[#ffe89a]">
            +{dayTotal}
            <span className="ml-1 text-base font-bold text-white/70">🌸</span>
          </p>
        </div>
      </div>

      {hasCap && (
        <div className="relative mt-4">
          <div className="h-3.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-[#ffc531] transition-all duration-500"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs font-bold text-white/70">
            {over ? '已超额完成，太厉害了 🎉' : `每日上限 ${dailyCap} 分`}
          </p>
        </div>
      )}
    </div>
  )
}
