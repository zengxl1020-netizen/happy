import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Home as HomeIcon, Volume2 } from 'lucide-react'
import { useCurrentChild } from '@/stores/appStore'
import * as repo from '@/db/repo'
import { WORDS } from '@/data/words'
import { IDIOMS } from '@/data/idioms'
import { today } from '@/lib/date'
import { confettiBurst, confettiGrand, playSfx } from '@/lib/celebrate'
import { evaluateBadges } from '@/lib/badges'
import FloatingPoints, { type FloatItem } from '@/components/FloatingPoints'
import onboardingImg from '@/assets/illustrations/onboarding.png'
import emptyDayImg from '@/assets/illustrations/empty-day.png'
import type { StudyPlan } from '@/types/models'
import { cn } from '@/lib/utils'

const META = {
  english: { title: '每日英语', icon: '📖', cardClass: 'card-coral' },
  idiom: { title: '每日成语', icon: '🏮', cardClass: 'card-space' },
} as const

type Phase = 'learn' | 'quiz' | 'done'

/** 英语单词朗读（浏览器内置语音） */
function speak(word: string) {
  try {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    u.rate = 0.8
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch {
    /* 不支持则静默 */
  }
}

export default function Study() {
  const { type } = useParams<{ type: 'english' | 'idiom' }>()
  const navigate = useNavigate()
  const child = useCurrentChild()

  const [plan, setPlan] = useState<StudyPlan | null | undefined>(undefined)
  const [phase, setPhase] = useState<Phase>('learn')
  const [saving, setSaving] = useState(false)
  const [wrongKey, setWrongKey] = useState<string | null>(null)
  const [floats, setFloats] = useState<FloatItem[]>([])
  const floatSeq = useRef(0)

  const meta = type === 'english' || type === 'idiom' ? META[type] : null
  const childId = child?.id ?? null

  useEffect(() => {
    if (!childId || !type) return
    void repo.listStudyPlans(childId).then((plans) => {
      const p = plans.find((x) => x.type === type) ?? null
      setPlan(p)
      if (p?.lastCompletedDate === today()) setPhase('done')
    })
  }, [childId, type])

  const dropFloat = useCallback((id: number) => {
    setFloats((l) => l.filter((f) => f.id !== id))
  }, [])

  const isEnglish = type === 'english'
  const items = useMemo(
    () => (isEnglish ? WORDS : IDIOMS) as unknown as ReadonlyArray<Record<string, string>>,
    [isEnglish],
  )
  const total = items.length
  const idx = plan ? Math.min(plan.progressIndex, total - 1) : 0
  const round = plan ? Math.floor(plan.progressIndex / total) : 0
  const item = items[idx]

  /** 选择题：正确释义 + 3 个随机干扰项 */
  const quiz = useMemo(() => {
    if (!item) return null
    const answerKey = isEnglish ? 'meaning' : 'meaning'
    const correct = item[answerKey]
    const pool = items.filter((_, i) => i !== idx).map((x) => x[answerKey])
    const distractors: string[] = []
    const seedBase = idx * 7 + 3
    for (let i = 0; distractors.length < 3 && i < pool.length * 2; i++) {
      const candidate = pool[(seedBase + i * 13) % pool.length]
      if (candidate && candidate !== correct && !distractors.includes(candidate)) {
        distractors.push(candidate)
      }
    }
    const options = [correct, ...distractors].sort(() => 0.5 - ((seedBase * 31 + distractors.length) % 2))
    // 简单洗牌（每次进入考试重排）
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[options[i], options[j]] = [options[j], options[i]]
    }
    const question = isEnglish ? `「${item.word}」是什么意思？` : `「${item.idiom}」是什么意思？`
    return { question, options, correct }
  }, [item, items, idx, isEnglish])

  if (!meta) {
    navigate('/', { replace: true })
    return null
  }
  if (plan === undefined) return null

  async function answer(option: string) {
    if (!quiz || saving || !childId || !plan || !type) return
    if (option !== quiz.correct) {
      setWrongKey(option)
      setTimeout(() => setWrongKey(null), 600)
      toast('再想想，你一定可以的 💪', { icon: '🤔' })
      return
    }
    // 答对了：完成学习
    setSaving(true)
    try {
      const name = isEnglish ? `英语单词 ${item.word}` : `成语 ${item.idiom}`
      const { record } = await repo.completeStudy(childId, type, name, isEnglish ? '📖' : '🏮')
      floatSeq.current += 1
      setFloats((l) => [...l, { id: floatSeq.current, points: record.record.points }])
      confettiBurst()
      playSfx('success')
      setPlan({ ...plan, progressIndex: plan.progressIndex + 1, lastCompletedDate: today() })
      setPhase('done')

      const fresh = await evaluateBadges(childId)
      for (const b of fresh) {
        toast.success(`🏅 点亮徽章「${b.name}」！`, { duration: 4000 })
      }
      if (record.bonus) {
        setTimeout(() => {
          confettiGrand()
          playSfx('bonus')
          toast.success(`🎁 连续达标奖励 +${record.bonus!.points} 分！`, { duration: 4000 })
        }, 700)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '出了点小问题')
    } finally {
      setSaving(false)
    }
  }

  const backBtn = (
    <button
      onClick={() => navigate('/')}
      className="card-soft flex h-10 w-10 items-center justify-center rounded-full text-[#2a2d5e] active:scale-90"
      aria-label="返回首页"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  )

  return (
    <div className="flex min-h-[85dvh] flex-col p-5">
      {/* 顶栏 */}
      <div className="flex items-center justify-between">
        {backBtn}
        <h1 className="text-lg font-black text-[#2a2d5e]">
          {meta.icon} {meta.title}
        </h1>
        <div className="w-10" />
      </div>

      {/* 未开启 */}
      {plan === null || !plan.enabled ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <img src={emptyDayImg} alt="未开启" className="h-44 w-44 object-contain" />
          <p className="mt-4 text-lg font-black text-[#2a2d5e]">还没有开启这项学习</p>
          <p className="mt-1 text-sm font-bold text-[#9aa0b8]">请爸爸妈妈在「我的 → 学习计划」里开启</p>
          <button onClick={() => navigate('/')} className="btn-sun mt-8 flex items-center gap-2 px-8 py-3.5 text-base">
            <HomeIcon className="h-5 w-5" /> 返回首页
          </button>
        </div>
      ) : phase === 'done' ? (
        /* 完成态：插画 + 明显的返回首页按钮 */
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <img src={onboardingImg} alt="完成啦" className="h-52 w-52 object-contain drop-shadow-xl" />
          <p className="mt-5 text-2xl font-black text-[#2a2d5e]">今天已经完成啦 🎉</p>
          <p className="mt-2 text-sm font-bold text-[#9aa0b8]">
            {isEnglish
              ? `已学会 ${Math.min(plan.progressIndex, total)} 个单词`
              : `已学会 ${Math.min(plan.progressIndex, total)} 个成语`}
            ，明天再来吧
          </p>
          <button onClick={() => navigate('/')} className="btn-sun mt-8 flex items-center gap-2 px-10 py-4 text-lg">
            <HomeIcon className="h-5 w-5" /> 返回首页
          </button>
        </div>
      ) : phase === 'learn' ? (
        /* 学习卡片 */
        <div className="flex flex-1 flex-col justify-center">
          <div className={`${meta.cardClass} relative overflow-hidden rounded-[32px] p-8 text-center`}>
            <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10" />

            <p className="relative text-xs font-bold text-white/70">
              第 {idx + 1} / {total} {round > 0 ? `· 第 ${round + 1} 轮复习` : ''}
            </p>

            {isEnglish ? (
              <div className="relative mt-4">
                <div className="flex items-center justify-center gap-3">
                  <p className="text-5xl font-black tracking-wide text-white">{item.word}</p>
                  <button
                    onClick={() => speak(String(item.word))}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#ff416c] shadow-lg transition-transform active:scale-90"
                    aria-label="播放发音"
                  >
                    <Volume2 className="h-6 w-6" />
                  </button>
                </div>
                <p className="mt-2 text-lg font-bold text-white/80">{item.phonetic}</p>
                <p className="mt-4 text-2xl font-black text-[#ffe89a]">{item.meaning}</p>
                <p className="mt-4 rounded-[20px] bg-white/15 p-3 text-sm font-bold leading-relaxed text-white">
                  {item.example}
                </p>
              </div>
            ) : (
              <div className="relative mt-4">
                <p className="text-4xl font-black tracking-[0.2em] text-white">{item.idiom}</p>
                <p className="mt-2 text-base font-bold text-white/80">{item.pinyin}</p>
                <p className="mt-4 rounded-[20px] bg-white/15 p-3 text-base font-bold leading-relaxed text-[#ffe89a]">
                  {item.meaning}
                </p>
                <p className="mt-3 rounded-[20px] bg-white/15 p-3 text-sm font-bold leading-relaxed text-white">
                  {item.story}
                </p>
              </div>
            )}
          </div>

          <button onClick={() => setPhase('quiz')} className="btn-sun mx-auto mt-8 w-64 py-4 text-lg">
            我学会了，开始考试 ✏️
          </button>
          <p className="mt-3 text-center text-xs font-bold text-[#9aa0b8]">答对一道选择题才算完成哦</p>
        </div>
      ) : (
        /* 选择题考试 */
        quiz && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="card-soft rounded-[32px] p-6 text-center">
              <p className="text-xs font-bold text-[#9aa0b8]">小考试 · 选出正确答案</p>
              <p className="mt-3 text-2xl font-black leading-snug text-[#2a2d5e]">{quiz.question}</p>
            </div>

            <div className="mt-5 space-y-3">
              {quiz.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => void answer(opt)}
                  disabled={saving}
                  className={cn(
                    'card-soft w-full rounded-[24px] p-4 text-left text-base font-black text-[#2a2d5e] transition-all active:scale-95',
                    wrongKey === opt && 'animate-shake bg-[#ff416c]/10 text-[#ff416c]',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPhase('learn')}
              className="mx-auto mt-6 rounded-full bg-[#f6f7fb] px-6 py-2.5 text-sm font-black text-[#9aa0b8]"
            >
              返回再看一看
            </button>
          </div>
        )
      )}

      <FloatingPoints items={floats} onDone={dropFloat} />
    </div>
  )
}
