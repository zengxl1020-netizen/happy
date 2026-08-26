import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, dayOfMonth, today, weekOf, weekdayLabel } from '@/lib/date'
import { cn } from '@/lib/utils'

interface Props {
  selectedDate: string
  onSelect: (date: string) => void
}

/** 横向一周日期条：选中日为明黄胶囊，今天加珊瑚粉小点 */
export default function WeekStrip({ selectedDate, onSelect }: Props) {
  const week = weekOf(selectedDate)
  const todayStr = today()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onSelect(addDays(selectedDate, -7))}
        className="card-soft shrink-0 rounded-full p-2 text-[#9aa0b8] transition-transform active:scale-90"
        aria-label="上一周"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="grid flex-1 grid-cols-7 gap-1">
        {week.map((d) => {
          const isToday = d === todayStr
          const isSelected = d === selectedDate
          const isFuture = d > todayStr
          return (
            <button
              key={d}
              disabled={isFuture}
              onClick={() => onSelect(d)}
              className={cn(
                'flex flex-col items-center rounded-[20px] py-2 transition-all',
                isSelected ? 'pill-sun shadow-lg shadow-yellow-200' : 'card-soft',
                isFuture && 'opacity-35',
              )}
            >
              <span
                className={cn(
                  'text-base font-black leading-tight',
                  isSelected ? 'text-[#2a2d5e]' : 'text-[#2a2d5e]/70',
                )}
              >
                {dayOfMonth(d)}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold',
                  isSelected ? 'text-[#2a2d5e]/60' : 'text-[#9aa0b8]',
                )}
              >
                {isToday ? '今天' : weekdayLabel(d)}
              </span>
              {isToday && !isSelected && (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#ff416c]" />
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => {
          const next = addDays(selectedDate, 7)
          onSelect(next <= todayStr ? next : todayStr)
        }}
        className="card-soft shrink-0 rounded-full p-2 text-[#9aa0b8] transition-transform active:scale-90"
        aria-label="下一周"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
