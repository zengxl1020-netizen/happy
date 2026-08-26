import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore, useCurrentChild } from '@/stores/appStore'
import { useHomeStore } from '@/stores/homeStore'
import { today } from '@/lib/date'
import { confettiBurst, confettiGrand, playSfx } from '@/lib/celebrate'
import ChildSwitcher from '@/components/ChildSwitcher'
import AddChildDialog from '@/components/AddChildDialog'
import WeekStrip from '@/components/WeekStrip'
import GrowthTree from '@/components/GrowthTree'
import DayOverview from '@/components/DayOverview'
import RecordList from '@/components/RecordList'
import AddTaskSheet from '@/components/AddTaskSheet'
import StudyEntryCards from '@/components/StudyEntryCards'
import { evaluateBadges } from '@/lib/badges'
import { levelOf } from '@/lib/levels'
import onboardingImg from '@/assets/illustrations/onboarding.png'
import FloatingPoints, { type FloatItem } from '@/components/FloatingPoints'

export default function Home() {
  const child = useCurrentChild()
  const addChild = useAppStore((s) => s.addChild)
  const {
    selectedDate, records, rule, dayTotal, totalPoints, streak, templates,
    load, selectDate, addLabor, removeRecord,
  } = useHomeStore()

  const [childDialogOpen, setChildDialogOpen] = useState(false)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [floats, setFloats] = useState<FloatItem[]>([])
  const floatSeq = useRef(0)

  const childId = child?.id ?? null
  useEffect(() => {
    if (childId) void load(childId)
  }, [childId, load])

  const dropFloat = useCallback((id: number) => {
    setFloats((list) => list.filter((f) => f.id !== id))
  }, [])

  const pushFloat = useCallback((points: number, bonus = false) => {
    floatSeq.current += 1
    setFloats((list) => [...list, { id: floatSeq.current, points, bonus }])
  }, [])

  /* ---------- 空状态：还没有小朋友 ---------- */
  if (!child) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center p-8 text-center">
        <img
          src={onboardingImg}
          alt="小宇航员"
          className="h-56 w-56 object-contain drop-shadow-xl"
        />
        <h1 className="mt-6 text-2xl font-black text-[#2a2d5e]">欢迎来到快乐劳动</h1>
        <p className="mt-2 text-sm font-bold text-[#9aa0b8]">
          先添加一位小朋友
          <br />
          一起开始劳动积分之旅吧
        </p>
        <button onClick={() => setChildDialogOpen(true)} className="btn-sun mt-8 px-10 py-4 text-lg">
          ＋ 添加小朋友
        </button>
        <AddChildDialog open={childDialogOpen} onOpenChange={setChildDialogOpen} onSubmit={addChild} />
      </div>
    )
  }

  const isToday = selectedDate === today()

  async function handlePick(input: { taskName: string; icon: string; points: number; publisher: string }) {
    if (!childId) return
    const levelBefore = levelOf(totalPoints).current.title
    const result = await addLabor(childId, input)

    // 满足感动效：积分飘字 + 撒花 + 音效
    pushFloat(result.record.points)
    confettiBurst()
    playSfx('success')

    if (result.bonus) {
      // 连续奖励彩蛋：更隆重的满天星 + 礼盒飘字 + 号角
      setTimeout(() => {
        pushFloat(result.bonus!.points, true)
        confettiGrand()
        playSfx('bonus')
        toast.success(`🎁 连续达标奖励 +${result.bonus!.points} 分！`, { duration: 4000 })
      }, 700)
    } else if (result.overCap) {
      toast(`今日已超出上限，破例记录 +${result.record.points} 分`, { icon: '🎉' })
    }

    // 徽章评估：新点亮逐个贺报
    const fresh = await evaluateBadges(childId)
    for (const b of fresh) {
      toast.success(`🏅 点亮徽章「${b.name}」！`, { duration: 4000 })
    }

    // 升级庆祝：称号晋升时满天星
    const levelAfter = levelOf(useHomeStore.getState().totalPoints).current.title
    if (levelAfter !== levelBefore) {
      setTimeout(() => {
        confettiGrand()
        playSfx('bonus')
        toast.success(`🎊 恭喜晋升为「${levelAfter}」！`, { duration: 5000 })
      }, 1200)
    }
  }

  return (
    <div className="space-y-5 p-5">
      {/* 顶部：小孩切换 + 总积分 + 连续火焰 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ChildSwitcher onAddChild={() => setChildDialogOpen(true)} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="card-soft rounded-[24px] px-4 py-2.5 text-center">
            <p className="text-xl font-black leading-tight text-[#ff416c]">🌸 {totalPoints}</p>
            <p className="text-[10px] font-bold text-[#9aa0b8]">总积分</p>
          </div>
          {streak > 0 && (
            <div className="rounded-full bg-[#ff416c]/10 px-3 py-1 text-xs font-black text-[#ff416c]">
              🔥 连续 {streak} 天
            </div>
          )}
        </div>
      </div>

      <GrowthTree totalPoints={totalPoints} />

      <WeekStrip selectedDate={selectedDate} onSelect={(d) => childId && void selectDate(childId, d)} />

      <DayOverview
        recordCount={records.length}
        dayTotal={dayTotal}
        dailyCap={rule?.dailyCap ?? 0}
        isToday={isToday}
      />

      {isToday && (
        <div>
          <p className="mb-3 text-lg font-black text-[#2a2d5e]">学习乐园</p>
          <StudyEntryCards childId={child.id} refreshKey={records.length} />
        </div>
      )}

      <div>
        <p className="mb-3 text-lg font-black text-[#2a2d5e]">{isToday ? '今日任务' : '当天记录'}</p>
        <RecordList
          records={records}
          onDelete={(id) => {
            if (childId) {
              void removeRecord(childId, id)
              toast('记录已删除', { icon: '🗑️' })
            }
          }}
        />
      </div>

      {isToday && (
        <button onClick={() => setTaskSheetOpen(true)} className="btn-sun sticky bottom-4 w-full py-4 text-lg">
          ＋ 添加劳动
        </button>
      )}

      <FloatingPoints items={floats} onDone={dropFloat} />
      <AddChildDialog open={childDialogOpen} onOpenChange={setChildDialogOpen} onSubmit={addChild} />
      <AddTaskSheet
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        templates={templates}
        onPick={handlePick}
      />
    </div>
  )
}
