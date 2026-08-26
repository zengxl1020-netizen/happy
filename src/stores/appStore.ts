import { create } from 'zustand'
import * as repo from '@/db/repo'
import type { AppSettings, Child } from '@/types/models'

interface AppState {
  ready: boolean
  children: Child[]
  currentChildId: string | null
  settings: AppSettings | null
  /** 家长锁：本次会话是否已验证（不持久化） */
  parentUnlocked: boolean

  /** 应用启动：种子数据 + 加载小孩与设置 */
  init: () => Promise<void>
  refreshChildren: () => Promise<void>
  setCurrentChild: (id: string) => Promise<void>
  addChild: (input: Pick<Child, 'name' | 'avatar' | 'birthday'>) => Promise<Child>
  unlockParent: () => void
  refreshSettings: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  children: [],
  currentChildId: null,
  settings: null,
  parentUnlocked: false,

  init: async () => {
    await repo.ensureSeeded()
    const [children, settings] = await Promise.all([repo.listChildren(), repo.getSettings()])
    set({
      ready: true,
      children,
      settings,
      currentChildId:
        settings.currentChildId && children.some((c) => c.id === settings.currentChildId)
          ? settings.currentChildId
          : (children[0]?.id ?? null),
    })
  },

  refreshChildren: async () => {
    const children = await repo.listChildren()
    const { currentChildId } = get()
    set({
      children,
      currentChildId:
        currentChildId && children.some((c) => c.id === currentChildId)
          ? currentChildId
          : (children[0]?.id ?? null),
    })
  },

  setCurrentChild: async (id) => {
    set({ currentChildId: id })
    await repo.saveSettings({ currentChildId: id })
  },

  addChild: async (input) => {
    const child = await repo.createChild(input)
    await get().refreshChildren()
    await get().setCurrentChild(child.id)
    return child
  },

  unlockParent: () => set({ parentUnlocked: true }),

  refreshSettings: async () => {
    set({ settings: await repo.getSettings() })
  },
}))

/** 当前选中小孩（派生选择器） */
export const useCurrentChild = () =>
  useAppStore((s) => s.children.find((c) => c.id === s.currentChildId) ?? null)
