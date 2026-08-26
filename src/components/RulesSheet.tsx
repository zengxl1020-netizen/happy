import { useEffect, useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Minus, Plus } from 'lucide-react'
import * as repo from '@/db/repo'
import type { PointsRule } from '@/types/models'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  childId: string
  childName: string
  onSaved: () => void
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="card-soft flex items-center justify-between rounded-[24px] p-4">
      <div>
        <p className="font-black text-[#2a2d5e]">{label}</p>
        {hint && <p className="mt-0.5 text-xs font-bold text-[#9aa0b8]">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="card-soft flex h-10 w-10 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
          aria-label={`减少${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <p className="w-16 text-center text-xl font-black text-[#ff416c]">
          {value}
          <span className="ml-0.5 text-xs font-bold text-[#9aa0b8]">{unit}</span>
        </p>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="card-soft flex h-10 w-10 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
          aria-label={`增加${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** 积分规则设置：每日上限（0=不限）、是否允许破例、连续奖励参数 */
export default function RulesSheet({ open, onOpenChange, childId, childName, onSaved }: Props) {
  const [rule, setRule] = useState<PointsRule | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) void repo.getRule(childId).then((r) => setRule(r ?? null))
  }, [open, childId])

  if (!rule) return null

  const streakOn = rule.streakBonus > 0

  async function save() {
    if (!rule) return
    setSaving(true)
    try {
      await repo.upsertRule(childId, {
        dailyCap: rule.dailyCap,
        allowOverCap: rule.allowOverCap,
        streakDays: rule.streakDays,
        streakMinPoints: rule.streakMinPoints,
        streakBonus: rule.streakBonus,
      })
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[32px] bg-white">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="text-center text-lg font-black text-[#2a2d5e]">
            ⚙️ {childName}的积分规则
          </DrawerTitle>
        </DrawerHeader>

        <div className="max-h-[72dvh] space-y-3 overflow-y-auto px-5 pb-6 pt-4">
          <Stepper
            label="每日积分上限"
            hint="0 表示不限制"
            value={rule.dailyCap}
            min={0}
            max={200}
            unit="分"
            onChange={(v) => setRule({ ...rule, dailyCap: v })}
          />

          <div className="card-soft flex items-center justify-between rounded-[24px] p-4">
            <div>
              <p className="font-black text-[#2a2d5e]">允许破例</p>
              <p className="mt-0.5 text-xs font-bold text-[#9aa0b8]">超过上限仍可记录，并标注「破例」</p>
            </div>
            <Switch
              checked={rule.allowOverCap}
              onCheckedChange={(v) => setRule({ ...rule, allowOverCap: v })}
            />
          </div>

          <div className="card-soft flex items-center justify-between rounded-[24px] p-4">
            <div>
              <p className="font-black text-[#2a2d5e]">连续达标奖励</p>
              <p className="mt-0.5 text-xs font-bold text-[#9aa0b8]">连续多天每天达标，额外送积分</p>
            </div>
            <Switch
              checked={streakOn}
              onCheckedChange={(v) => setRule({ ...rule, streakBonus: v ? 20 : 0 })}
            />
          </div>

          {streakOn && (
            <div className="space-y-3 rounded-[24px] bg-[#f6f7fb] p-3">
              <Stepper
                label="连续天数"
                value={rule.streakDays}
                min={2}
                max={30}
                unit="天"
                onChange={(v) => setRule({ ...rule, streakDays: v })}
              />
              <Stepper
                label="每天至少"
                value={rule.streakMinPoints}
                min={1}
                max={100}
                unit="分"
                onChange={(v) => setRule({ ...rule, streakMinPoints: v })}
              />
              <Stepper
                label="额外奖励"
                value={rule.streakBonus}
                min={1}
                max={200}
                unit="分"
                onChange={(v) => setRule({ ...rule, streakBonus: v })}
              />
              <p className="px-2 pb-1 text-center text-xs font-bold text-[#9aa0b8]">
                连续 {rule.streakDays} 天每天 ≥ {rule.streakMinPoints} 分，送 {rule.streakBonus} 分 🎁
              </p>
            </div>
          )}

          <Button onClick={save} disabled={saving} className="btn-sun h-12 w-full border-none text-lg">
            {saving ? '保存中…' : '保存规则'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
