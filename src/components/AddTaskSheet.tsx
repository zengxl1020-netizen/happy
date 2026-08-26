import { useMemo, useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { CATEGORY_META } from '@/db/templates'
import { useAppStore } from '@/stores/appStore'
import type { TaskCategory, TaskTemplate } from '@/types/models'
import { cn } from '@/lib/utils'

const CATEGORIES = Object.keys(CATEGORY_META) as TaskCategory[]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: TaskTemplate[]
  onPick: (input: { taskName: string; icon: string; points: number; publisher: string }) => Promise<void>
}

/**
 * 添加劳动：选模板 → 选发布人 → 完成。
 * 积分由模板固定（在「我的 → 任务管理」中调整），此处不可修改。
 */
export default function AddTaskSheet({ open, onOpenChange, templates, onPick }: Props) {
  const publishers = useAppStore((s) => s.settings?.publishers ?? ['妈妈'])
  const [step, setStep] = useState<'pick' | 'confirm'>('pick')
  const [category, setCategory] = useState<TaskCategory>('independent')
  const [tpl, setTpl] = useState<TaskTemplate | null>(null)
  const [publisher, setPublisher] = useState<string>(publishers[0] ?? '妈妈')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => templates.filter((t) => t.category === category), [templates, category])

  function reset() {
    setStep('pick')
    setTpl(null)
  }

  async function confirm() {
    if (!tpl || saving) return
    setSaving(true)
    try {
      await onPick({ taskName: tpl.name, icon: tpl.icon, points: tpl.defaultPoints, publisher })
      onOpenChange(false)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[32px] bg-white">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="text-center text-lg font-black text-[#2a2d5e]">
            {step === 'pick' ? '✨ 选择任务' : `${tpl?.icon} ${tpl?.name}`}
          </DrawerTitle>
        </DrawerHeader>

        <div className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-3">
          {step === 'pick' && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'shrink-0 rounded-full px-4 py-1.5 text-sm font-black transition-all',
                      category === c ? 'pill-sun shadow-lg shadow-yellow-200' : 'card-soft text-[#9aa0b8]',
                    )}
                  >
                    {CATEGORY_META[c].label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTpl(t); setStep('confirm') }}
                    className="card-soft flex flex-col items-center gap-1.5 rounded-[24px] p-3.5 transition-transform active:scale-95"
                  >
                    <span className="text-4xl">{t.icon}</span>
                    <span className="text-center text-xs font-black leading-tight text-[#2a2d5e]">{t.name}</span>
                    <span className="rounded-full bg-[#ff416c]/10 px-2 py-0.5 text-[10px] font-black text-[#ff416c]">
                      🌸 +{t.defaultPoints}
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-center text-xs font-bold text-[#9aa0b8]">
                想添加新任务或调整积分？去「我的 → 任务管理」
              </p>
            </>
          )}

          {step === 'confirm' && tpl && (
            <div className="space-y-5">
              <div className="text-center">
                <span className="inline-block rounded-full bg-[#ff416c]/10 px-4 py-1.5 text-sm font-black text-[#ff416c]">
                  🌸 完成后得 {tpl.defaultPoints} 分
                </span>
              </div>

              <div>
                <p className="mb-2 text-center text-sm font-bold text-[#9aa0b8]">谁发布的任务？</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {publishers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPublisher(p)}
                      className={cn(
                        'rounded-full px-5 py-2 font-black transition-all',
                        publisher === p ? 'pill-sun shadow-lg shadow-yellow-200' : 'card-soft text-[#9aa0b8]',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('pick')}
                  className="h-12 flex-1 rounded-full border-none bg-[#f6f7fb] font-black text-[#9aa0b8]"
                >
                  返回
                </Button>
                <Button onClick={confirm} disabled={saving} className="btn-sun h-12 flex-[2] border-none text-lg">
                  {saving ? '记录中…' : '完成啦 🎉'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
