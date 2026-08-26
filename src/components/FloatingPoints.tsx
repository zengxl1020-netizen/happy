import { useEffect, useState } from 'react'

export interface FloatItem {
  id: number
  points: number
  bonus?: boolean
}

interface Props {
  items: FloatItem[]
  onDone: (id: number) => void
}

/** 积分飘字：+N 从底部飘向顶部并淡出 */
export default function FloatingPoints({ items, onDone }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {items.map((item, i) => (
        <Float key={item.id} item={item} index={i} onDone={onDone} />
      ))}
    </div>
  )
}

function Float({ item, index, onDone }: { item: FloatItem; index: number; onDone: (id: number) => void }) {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 50)
    const t2 = setTimeout(() => onDone(item.id), 1400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [item.id, onDone])

  return (
    <div
      className="absolute left-1/2 text-center font-black transition-all duration-[1300ms] ease-out"
      style={{
        bottom: gone ? '72%' : '30%',
        opacity: gone ? 0 : 1,
        transform: `translateX(calc(-50% + ${(index % 3 - 1) * 56}px)) scale(${gone ? 1.4 : 1})`,
      }}
    >
      <span
        className={
          item.bonus
            ? 'text-4xl text-[#ff416c] drop-shadow-[0_4px_12px_rgba(255,65,108,0.5)]'
            : 'text-3xl text-[#ff416c] drop-shadow-[0_4px_12px_rgba(255,65,108,0.4)]'
        }
      >
        {item.bonus ? '🎁' : '🌸'} +{item.points}
      </span>
    </div>
  )
}
