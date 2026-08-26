import sproutImg from '@/assets/illustrations/sprout.png'

/** 成长树：太空蓝渐变核心卡 + 绘本风小苗插画 + 明黄进度条 */

const STAGES = [
  { min: 0, emoji: '🌰', label: '小种子', next: 50 },
  { min: 50, emoji: '🌱', label: '发芽啦', next: 150 },
  { min: 150, emoji: '🌿', label: '小树苗', next: 300 },
  { min: 300, emoji: '🌸', label: '开花啦', next: 600 },
  { min: 600, emoji: '🌳', label: '大树结果', next: Infinity },
]

export function treeStage(totalPoints: number) {
  let stage = STAGES[0]
  for (const s of STAGES) {
    if (totalPoints >= s.min) stage = s
    else break
  }
  return stage
}

export default function GrowthTree({ totalPoints }: { totalPoints: number }) {
  const stage = treeStage(totalPoints)
  const progress =
    stage.next === Infinity
      ? 1
      : Math.min(1, (totalPoints - stage.min) / (stage.next - stage.min))

  return (
    <div className="card-space relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5">
      {/* 装饰圆斑 */}
      <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-white/10" />

      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
        <img
          src={sproutImg}
          alt="成长小苗"
          className="h-24 w-24 object-contain drop-shadow-lg"
        />
        <span className="absolute -right-1 -top-1 rounded-full bg-white px-2 py-0.5 text-lg shadow-md">
          {stage.emoji}
        </span>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-black text-white">{stage.label}</p>
          <p className="text-xs font-bold text-white/70">累计 {totalPoints} 分</p>
        </div>
        <div className="mt-2.5 h-3.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-[#ffc531] transition-all duration-700"
            style={{ width: `${Math.max(6, progress * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs font-bold text-white/70">
          {stage.next === Infinity
            ? '已经是最棒的大树啦 🎉'
            : `再得 ${stage.next - totalPoints} 分进入下一阶段`}
        </p>
      </div>
    </div>
  )
}
