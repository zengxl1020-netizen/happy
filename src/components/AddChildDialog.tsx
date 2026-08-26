import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AVATARS } from '@/db/templates'
import Avatar from '@/components/Avatar'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { name: string; avatar: string; birthday?: string }) => Promise<unknown>
}

/** 添加小孩弹窗：名字 + 卡通头像 + 生日（选填） */
export default function AddChildDialog({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATARS[0] as string)
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = name.trim().length > 0 && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), avatar, birthday: birthday || undefined })
      setName('')
      setAvatar(AVATARS[0] as string)
      setBirthday('')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-[32px] border-none">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-black text-[#2a2d5e]">
            👶 添加小朋友
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <p className="mb-2 text-sm font-bold text-[#9aa0b8]">名字或昵称</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="比如：快快"
              maxLength={10}
              className="h-12 rounded-full border-none bg-[#f6f7fb] text-center text-lg font-bold text-[#2a2d5e] focus-visible:ring-[#ffc531]"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-[#9aa0b8]">选一个头像</p>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-[20px] transition-all',
                    avatar === a
                      ? 'scale-110 bg-[#ffc531]/30'
                      : 'bg-[#f6f7fb]',
                  )}
                >
                  <Avatar avatar={a} className="h-11 w-11 text-3xl" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-[#9aa0b8]">生日（选填）</p>
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="h-12 rounded-full border-none bg-[#f6f7fb] font-bold text-[#2a2d5e] focus-visible:ring-[#ffc531]"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-sun h-12 w-full text-lg"
          >
            {saving ? '保存中…' : '确定添加 🎉'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
