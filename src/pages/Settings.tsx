import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Download, Minus, Plus, Share, Trash2 } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import * as repo from '@/db/repo'
import { AVATARS, CATEGORY_META, TEMPLATE_ICONS } from '@/db/templates'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import Avatar from '@/components/Avatar'
import RulesSheet from '@/components/RulesSheet'
import type { Child, PointsRule, StudyPlan, TaskCategory, TaskTemplate } from '@/types/models'
import { cn } from '@/lib/utils'

const CATEGORIES = Object.keys(CATEGORY_META) as TaskCategory[]

function ageOf(birthday?: string): string | null {
  if (!birthday) return null
  const years = (Date.now() - new Date(birthday + 'T00:00:00').getTime()) / (365.25 * 86400000)
  return years >= 0 && years < 30 ? `${Math.floor(years)} 岁` : null
}

/* ================= 家长锁门 ================= */

function ParentGate() {
  const settings = useAppStore((s) => s.settings)
  const unlockParent = useAppStore((s) => s.unlockParent)
  const [pin, setPin] = useState('')

  function tryUnlock(value: string) {
    setPin(value)
    if (value.length === 4) {
      if (value === settings?.parentLockPin) {
        unlockParent()
      } else {
        toast.error('密码不对，再试一次')
        setPin('')
      }
    }
  }

  return (
    <div className="flex min-h-[75dvh] flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl">🔐</div>
      <h1 className="mt-4 text-xl font-black text-[#2a2d5e]">家长专属区域</h1>
      <p className="mt-1 text-sm font-bold text-[#9aa0b8]">请输入 4 位家长密码</p>
      <Input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => tryUnlock(e.target.value.replace(/\D/g, ''))}
        className="mt-6 h-14 w-48 rounded-full border-none bg-white text-center text-3xl font-black tracking-[0.6em] text-[#2a2d5e] shadow-md focus-visible:ring-[#ffc531]"
        autoFocus
      />
    </div>
  )
}

/* ================= 主页面 ================= */

export default function Settings() {
  const { children, settings, parentUnlocked, refreshChildren, refreshSettings, setCurrentChild, addChild } =
    useAppStore()
  const { canInstall, installed, install, isIOS } = useInstallPrompt()

  const [childDialogOpen, setChildDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Child | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null)
  const [studyChildId, setStudyChildId] = useState<string | null>(null)
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [newPublisher, setNewPublisher] = useState('')
  const [pinInput, setPinInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 任务模板管理
  const [tplCategory, setTplCategory] = useState<TaskCategory>('independent')
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [cName, setCName] = useState('')
  const [cIcon, setCIcon] = useState<string>(TEMPLATE_ICONS[0])
  const [cPoints, setCPoints] = useState(5)

  // 积分规则
  const [ruleChildId, setRuleChildId] = useState<string | null>(null)
  const [ruleSummary, setRuleSummary] = useState<PointsRule | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const effectiveStudyChildId = studyChildId ?? children[0]?.id ?? null
  useEffect(() => {
    if (effectiveStudyChildId) void repo.listStudyPlans(effectiveStudyChildId).then(setPlans)
  }, [effectiveStudyChildId])

  const effectiveRuleChildId = ruleChildId ?? children[0]?.id ?? null
  useEffect(() => {
    if (effectiveRuleChildId) void repo.getRule(effectiveRuleChildId).then((r) => setRuleSummary(r ?? null))
  }, [effectiveRuleChildId])

  const reloadTemplates = () => void repo.listTemplates().then(setTemplates)
  useEffect(reloadTemplates, [])

  if (settings?.parentLockPin && !parentUnlocked) return <ParentGate />

  /* ---------- 学习计划 ---------- */
  async function togglePlan(plan: StudyPlan) {
    const enabled = !plan.enabled
    await repo.updateStudyPlan(plan.childId, plan.type, { enabled })
    setPlans(await repo.listStudyPlans(plan.childId))
    toast.success(
      enabled ? `已开启${plan.type === 'english' ? '每日英语 📖' : '每日成语 🏮'}` : '已关闭，首页将不再显示',
    )
  }

  async function changePlanPoints(plan: StudyPlan, delta: number) {
    const points = Math.min(50, Math.max(1, plan.points + delta))
    await repo.updateStudyPlan(plan.childId, plan.type, { points })
    setPlans(await repo.listStudyPlans(plan.childId))
  }

  /* ---------- 任务模板 ---------- */
  async function changeTplPoints(tpl: TaskTemplate, delta: number) {
    const defaultPoints = Math.min(99, Math.max(1, tpl.defaultPoints + delta))
    await repo.updateTemplate(tpl.id, { defaultPoints })
    reloadTemplates()
  }

  async function deleteTpl(tpl: TaskTemplate) {
    await repo.softDeleteTemplate(tpl.id)
    reloadTemplates()
    toast('已删除自定义任务', { icon: '🗑️' })
  }

  async function addCustomTpl() {
    if (!cName.trim()) return
    await repo.createCustomTemplate({ category: tplCategory, name: cName.trim(), icon: cIcon, defaultPoints: cPoints })
    reloadTemplates()
    setCName('')
    setCIcon(TEMPLATE_ICONS[0])
    setCPoints(5)
    setShowCustomForm(false)
    toast.success('自定义任务已添加 🎨')
  }

  /* ---------- 其他 ---------- */
  async function handleDeleteChild() {
    if (!deleteTarget) return
    await repo.softDeleteChild(deleteTarget.id)
    await refreshChildren()
    setDeleteTarget(null)
    toast('已删除小朋友', { icon: '👋' })
  }

  async function addPublisher() {
    const name = newPublisher.trim()
    if (!name || !settings) return
    if (settings.publishers.includes(name)) {
      toast.error('已经有这个发布人啦')
      return
    }
    await repo.saveSettings({ publishers: [...settings.publishers, name] })
    await refreshSettings()
    setNewPublisher('')
  }

  async function removePublisher(name: string) {
    if (!settings || settings.publishers.length <= 1) {
      toast.error('至少保留一位发布人')
      return
    }
    await repo.saveSettings({ publishers: settings.publishers.filter((p) => p !== name) })
    await refreshSettings()
  }

  async function savePin() {
    if (!/^\d{4}$/.test(pinInput)) {
      toast.error('请输入 4 位数字密码')
      return
    }
    await repo.saveSettings({ parentLockPin: pinInput })
    await refreshSettings()
    setPinInput('')
    toast.success('家长锁已开启 🔐')
  }

  async function clearPin() {
    await repo.saveSettings({ parentLockPin: null })
    await refreshSettings()
    toast('家长锁已关闭')
  }

  async function doExport() {
    const backup = await repo.exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `快乐劳动备份_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('备份文件已下载 📦')
  }

  async function doImport(file: File) {
    try {
      const text = await file.text()
      await repo.importBackup(JSON.parse(text))
      await refreshChildren()
      await refreshSettings()
      reloadTemplates()
      toast.success('数据恢复成功 🎉')
    } catch {
      toast.error('备份文件格式不正确')
    }
  }

  const cardCls = 'card-soft rounded-[28px] p-5'
  const titleCls = 'font-black text-[#2a2d5e]'
  const filteredTpls = templates.filter((t) => t.category === tplCategory)

  return (
    <div className="space-y-5 p-5">
      <h1 className="text-2xl font-black text-[#2a2d5e]">我的</h1>

      {/* 添加到主屏幕 */}
      <section className="card-space relative overflow-hidden rounded-[28px] p-5">
        <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="text-4xl">📲</span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-white">放到手机桌面上</p>
            <p className="mt-0.5 text-xs font-bold text-white/75">
              {installed ? '已安装，去桌面找「快乐劳动」吧' : '像普通 App 一样，点图标一键打开'}
            </p>
          </div>
          {canInstall && !installed && (
            <button onClick={() => void install()} className="btn-sun shrink-0 px-5 py-2.5 text-sm">
              立即添加
            </button>
          )}
        </div>
        {!canInstall && !installed && (
          <p className="relative mt-3 rounded-[16px] bg-white/15 p-3 text-xs font-bold leading-relaxed text-white">
            {isIOS
              ? 'iPhone/iPad：点 Safari 底部的「分享」按钮，选择「添加到主屏幕」'
              : '安卓：点浏览器菜单（右上角 ⋮），选择「安装应用」或「添加到主屏幕」'}
          </p>
        )}
      </section>

      {/* 小孩管理 */}
      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <p className={titleCls}>👶 小朋友管理</p>
          <button onClick={() => setChildDialogOpen(true)} className="pill-sun rounded-full px-4 py-1.5 text-xs font-black">
            ＋ 添加
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {children.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-[20px] bg-[#f6f7fb] p-3">
              <Avatar avatar={c.avatar} className="h-11 w-11 text-3xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-[#2a2d5e]">{c.name}</p>
                <p className="text-xs font-bold text-[#9aa0b8]">{ageOf(c.birthday) ?? '未填生日'}</p>
              </div>
              <button
                onClick={() => void setCurrentChild(c.id).then(() => toast.success(`已切换到 ${c.name}`))}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#4b6bfb]"
              >
                切换
              </button>
              <button
                onClick={() => setEditTarget(c)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#2a2d5e]"
              >
                编辑
              </button>
              <button
                onClick={() => setDeleteTarget(c)}
                className="rounded-full bg-white p-2 text-[#c6cadb] hover:text-[#ff416c]"
                aria-label={`删除${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {children.length === 0 && (
            <p className="py-4 text-center text-sm font-bold text-[#9aa0b8]">还没有小朋友，点右上角添加</p>
          )}
        </div>
      </section>

      {/* 学习计划（大开关卡） */}
      {children.length > 0 && (
        <section>
          <div className="flex items-center justify-between px-1">
            <p className={titleCls}>📚 学习计划</p>
            <div className="flex gap-2">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setStudyChildId(c.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition-all',
                    effectiveStudyChildId === c.id ? 'pill-sun' : 'card-soft text-[#9aa0b8]',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'relative overflow-hidden rounded-[28px] p-5 transition-opacity',
                  p.type === 'english' ? 'card-coral' : 'card-space',
                  !p.enabled && 'opacity-60',
                )}
              >
                <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
                <div className="relative flex items-center gap-3">
                  <span className="text-4xl">{p.type === 'english' ? '📖' : '🏮'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-white">
                      {p.type === 'english' ? '每日英语' : '每日成语'}
                    </p>
                    <p className="text-xs font-bold text-white/75">
                      每天 1 个 · 共 100 个 · 已学 {Math.min(p.progressIndex, 100)}
                    </p>
                  </div>
                  <button
                    onClick={() => void togglePlan(p)}
                    className={cn(
                      'shrink-0 rounded-full px-5 py-2.5 text-sm font-black transition-all active:scale-95',
                      p.enabled ? 'bg-white/90 text-[#2a2d5e]' : 'btn-sun',
                    )}
                  >
                    {p.enabled ? '已开启 ✓' : '点击开启'}
                  </button>
                </div>
                {p.enabled && (
                  <div className="relative mt-4 flex items-center justify-between rounded-[20px] bg-white/15 p-3">
                    <p className="text-xs font-bold text-white/85">每次完成得</p>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => void changePlanPoints(p, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#2a2d5e] active:scale-90"
                        aria-label="减少积分"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-lg font-black text-white">{p.points}</span>
                      <button
                        onClick={() => void changePlanPoints(p, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#2a2d5e] active:scale-90"
                        aria-label="增加积分"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <p className="px-1 text-xs font-bold text-[#9aa0b8]">
              学习积分与劳动积分共享每日上限（见下方「积分规则」）
            </p>
          </div>
        </section>
      )}

      {/* 积分规则 */}
      {children.length > 0 && (
        <section className={cardCls}>
          <div className="flex items-center justify-between">
            <p className={titleCls}>🎯 积分规则</p>
            <div className="flex gap-2">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setRuleChildId(c.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition-all',
                    effectiveRuleChildId === c.id ? 'pill-sun' : 'bg-[#f6f7fb] text-[#9aa0b8]',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {ruleSummary && (
            <div className="mt-3 space-y-2 rounded-[24px] bg-[#f6f7fb] p-4 text-sm font-bold text-[#2a2d5e]">
              <p>🌸 每日上限：{ruleSummary.dailyCap > 0 ? `${ruleSummary.dailyCap} 分` : '不限'}</p>
              <p>🎈 {ruleSummary.allowOverCap ? '允许破例（超限仍记录并标注）' : '不允许破例（超限会被拦截）'}</p>
              <p>
                🎁 连续奖励：
                {ruleSummary.streakBonus > 0
                  ? `连续 ${ruleSummary.streakDays} 天每天 ≥ ${ruleSummary.streakMinPoints} 分，送 ${ruleSummary.streakBonus} 分`
                  : '已关闭'}
              </p>
            </div>
          )}

          <button
            onClick={() => setRulesOpen(true)}
            className="btn-sun mt-4 w-full py-3 text-base"
            disabled={!effectiveRuleChildId}
          >
            编辑积分规则
          </button>
        </section>
      )}

      {/* 任务管理 */}
      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <p className={titleCls}>🧩 任务管理</p>
          <button
            onClick={() => setShowCustomForm((v) => !v)}
            className="pill-sun rounded-full px-4 py-1.5 text-xs font-black"
          >
            ＋ 自定义任务
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setTplCategory(c)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-black transition-all',
                tplCategory === c ? 'pill-sun' : 'bg-[#f6f7fb] text-[#9aa0b8]',
              )}
            >
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>

        {/* 自定义任务表单 */}
        {showCustomForm && (
          <div className="mt-3 space-y-3 rounded-[24px] bg-[#f6f7fb] p-4">
            <Input
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="任务名称，比如：给爷爷捶背"
              maxLength={12}
              className="h-11 rounded-full border-none bg-white text-center font-bold text-[#2a2d5e] focus-visible:ring-[#ffc531]"
            />
            <div className="grid grid-cols-6 gap-2">
              {TEMPLATE_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setCIcon(ic)}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-[16px] text-2xl transition-all',
                    cIcon === ic ? 'scale-110 bg-[#ffc531]/40' : 'bg-white',
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#9aa0b8]">默认积分</p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setCPoints((v) => Math.max(1, v - 1))}
                  className="card-soft flex h-8 w-8 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
                  aria-label="减少积分"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-lg font-black text-[#ff416c]">{cPoints}</span>
                <button
                  onClick={() => setCPoints((v) => Math.min(99, v + 1))}
                  className="card-soft flex h-8 w-8 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
                  aria-label="增加积分"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <Button onClick={() => void addCustomTpl()} disabled={!cName.trim()} className="btn-sun h-11 w-full border-none">
              保存到「{CATEGORY_META[tplCategory].label}」分类
            </Button>
          </div>
        )}

        {/* 模板列表 */}
        <div className="mt-3 space-y-2">
          {filteredTpls.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-[20px] bg-[#f6f7fb] p-3">
              <span className="text-2xl">{t.icon}</span>
              <p className="min-w-0 flex-1 truncate text-sm font-black text-[#2a2d5e]">
                {t.name}
                {t.isCustom && (
                  <span className="ml-1.5 rounded-full bg-[#4b6bfb]/10 px-1.5 py-0.5 text-[10px] font-black text-[#4b6bfb]">
                    自定义
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => void changeTplPoints(t, -1)}
                  className="card-soft flex h-7 w-7 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
                  aria-label="减少积分"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-7 text-center text-sm font-black text-[#ff416c]">{t.defaultPoints}</span>
                <button
                  onClick={() => void changeTplPoints(t, 1)}
                  className="card-soft flex h-7 w-7 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
                  aria-label="增加积分"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {t.isCustom && (
                <button
                  onClick={() => void deleteTpl(t)}
                  className="rounded-full bg-white p-1.5 text-[#c6cadb] hover:text-[#ff416c]"
                  aria-label={`删除${t.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {filteredTpls.length === 0 && (
            <p className="py-4 text-center text-sm font-bold text-[#9aa0b8]">这个分类还没有任务</p>
          )}
        </div>
      </section>

      {/* 发布人管理 */}
      <section className={cardCls}>
        <p className={titleCls}>🙋 任务发布人</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings?.publishers.map((p) => (
            <span key={p} className="flex items-center gap-1.5 rounded-full bg-[#f6f7fb] py-1.5 pl-4 pr-2 text-sm font-black text-[#2a2d5e]">
              {p}
              <button
                onClick={() => void removePublisher(p)}
                className="rounded-full bg-white p-1 text-[#c6cadb] hover:text-[#ff416c]"
                aria-label={`删除${p}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={newPublisher}
            onChange={(e) => setNewPublisher(e.target.value)}
            placeholder="比如：奶奶"
            maxLength={6}
            className="h-11 flex-1 rounded-full border-none bg-[#f6f7fb] font-bold text-[#2a2d5e] focus-visible:ring-[#ffc531]"
          />
          <Button onClick={() => void addPublisher()} className="btn-sun h-11 rounded-full border-none px-5">
            添加
          </Button>
        </div>
      </section>

      {/* 通用 */}
      <section className={cardCls}>
        <p className={titleCls}>🔔 通用</p>
        <div className="mt-3 flex items-center justify-between rounded-[20px] bg-[#f6f7fb] p-4">
          <div>
            <p className="font-black text-[#2a2d5e]">音效</p>
            <p className="text-xs font-bold text-[#9aa0b8]">完成任务时的叮咚声</p>
          </div>
          <Switch
            checked={settings?.soundEnabled ?? true}
            onCheckedChange={async (v) => {
              await repo.saveSettings({ soundEnabled: v })
              await refreshSettings()
            }}
          />
        </div>

        <div className="mt-3 rounded-[20px] bg-[#f6f7fb] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-[#2a2d5e]">家长锁</p>
              <p className="text-xs font-bold text-[#9aa0b8]">
                {settings?.parentLockPin ? '已开启：进入本页需要密码' : '开启后，进入本页需要 4 位数字密码'}
              </p>
            </div>
            {settings?.parentLockPin && (
              <button onClick={() => void clearPin()} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#ff416c]">
                关闭
              </button>
            )}
          </div>
          {!settings?.parentLockPin && (
            <div className="mt-3 flex gap-2">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="4 位数字"
                className="h-11 flex-1 rounded-full border-none bg-white text-center font-black tracking-[0.4em] text-[#2a2d5e] focus-visible:ring-[#ffc531]"
              />
              <Button onClick={() => void savePin()} className="btn-sun h-11 rounded-full border-none px-5">
                开启
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 数据备份 */}
      <section className={cardCls}>
        <p className={titleCls}>📦 数据备份</p>
        <p className="mt-1 text-xs font-bold text-[#9aa0b8]">数据保存在本设备浏览器中，换设备前记得导出备份</p>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => void doExport()} className="card-space h-11 flex-1 rounded-full border-none font-black text-white">
            <Download className="mr-1.5 h-4 w-4" /> 导出备份
          </Button>
          <Button
            onClick={() => fileRef.current?.click()}
            className="card-coral h-11 flex-1 rounded-full border-none font-black text-white"
          >
            <Share className="mr-1.5 h-4 w-4" /> 导入恢复
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>

      <p className="pb-2 text-center text-xs font-bold text-[#c6cadb]">快乐劳动 · 数据保存在本设备 🌻</p>

      {/* 积分规则编辑抽屉 */}
      {effectiveRuleChildId && (
        <RulesSheet
          open={rulesOpen}
          onOpenChange={setRulesOpen}
          childId={effectiveRuleChildId}
          childName={children.find((c) => c.id === effectiveRuleChildId)?.name ?? ''}
          onSaved={() => {
            if (effectiveRuleChildId) {
              void repo.getRule(effectiveRuleChildId).then((r) => setRuleSummary(r ?? null))
            }
          }}
        />
      )}

      {/* 添加小孩 */}
      <AddChildDialogLazy open={childDialogOpen} onOpenChange={setChildDialogOpen} onSubmit={addChild} />

      {/* 编辑小孩 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-[360px] rounded-[32px] border-none">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-[#2a2d5e]">编辑小朋友</DialogTitle>
          </DialogHeader>
          {editTarget && <EditChildForm child={editTarget} onDone={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[340px] rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-[#2a2d5e]">删除 {deleteTarget?.name}？</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-[#9aa0b8]">
              将同时隐藏 TA 的全部记录与进度。如需彻底清空，请先导出备份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-none bg-[#f6f7fb] font-black">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteChild()}
              className="rounded-full bg-[#ff416c] font-black text-white hover:bg-[#ff416c]/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* 懒引入避免循环依赖 */
import AddChildDialog from '@/components/AddChildDialog'
function AddChildDialogLazy(props: Parameters<typeof AddChildDialog>[0]) {
  return <AddChildDialog {...props} />
}

/** 编辑小孩表单（内嵌在 Dialog 中） */
function EditChildForm({ child, onDone }: { child: Child; onDone: () => void }) {
  const refreshChildren = useAppStore((s) => s.refreshChildren)
  const [name, setName] = useState(child.name)
  const [avatar, setAvatar] = useState(child.avatar)
  const [birthday, setBirthday] = useState(child.birthday ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-4 pt-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={10}
        className="h-12 rounded-full border-none bg-[#f6f7fb] text-center text-lg font-bold text-[#2a2d5e] focus-visible:ring-[#ffc531]"
      />
      <div className="grid grid-cols-4 gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-[20px] transition-all',
              avatar === a ? 'scale-110 bg-[#ffc531]/30' : 'bg-[#f6f7fb]',
            )}
          >
            <Avatar avatar={a} className="h-12 w-12" />
          </button>
        ))}
      </div>
      <Input
        type="date"
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
        className="h-12 rounded-full border-none bg-[#f6f7fb] font-bold text-[#2a2d5e] focus-visible:ring-[#ffc531]"
      />
      <Button
        disabled={!name.trim() || saving}
        onClick={async () => {
          setSaving(true)
          try {
            await repo.updateChild(child.id, { name: name.trim(), avatar, birthday: birthday || undefined })
            await refreshChildren()
            toast.success('已保存 ✏️')
            onDone()
          } finally {
            setSaving(false)
          }
        }}
        className="btn-sun h-12 w-full border-none text-lg"
      >
        保存
      </Button>
    </div>
  )
}
