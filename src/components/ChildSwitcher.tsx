import { Plus } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

interface Props {
  onAddChild: () => void
}
import Avatar from '@/components/Avatar'

/** 小孩头像横滑切换器：激活态明黄底 + 藏蓝名字 */
export default function ChildSwitcher({ onAddChild }: Props) {
  const children = useAppStore((s) => s.children)
  const currentChildId = useAppStore((s) => s.currentChildId)
  const setCurrentChild = useAppStore((s) => s.setCurrentChild)

  return (
    <div className="flex gap-3 overflow-x-auto px-1 py-2">
      {children.map((c) => {
        const active = c.id === currentChildId
        return (
          <button
            key={c.id}
            onClick={() => void setCurrentChild(c.id)}
            className={cn(
              'flex shrink-0 flex-col items-center gap-1.5 rounded-[24px] px-3.5 py-2.5 transition-all',
              active ? 'pill-sun shadow-lg shadow-yellow-200' : 'card-soft',
            )}
          >
            <Avatar avatar={c.avatar} className="h-9 w-9 text-3xl" />
            <span
              className={cn(
                'max-w-16 truncate text-xs font-black',
                active ? 'text-[#2a2d5e]' : 'text-[#9aa0b8]',
              )}
            >
              {c.name}
            </span>
          </button>
        )
      })}

      <button
        onClick={onAddChild}
        className="card-soft flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-[24px] px-4 py-2.5 text-[#9aa0b8] transition-all active:scale-95"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f7fb]">
          <Plus className="h-5 w-5" />
        </span>
        <span className="text-xs font-black">添加</span>
      </button>
    </div>
  )
}
