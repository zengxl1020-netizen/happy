import { AVATAR_URLS, isAvatarKey } from '@/lib/avatars'
import { cn } from '@/lib/utils'

interface Props {
  avatar: string
  className?: string
}

/** 统一头像渲染：公主插画 key 用图片，历史 emoji 数据直接显示 */
export default function Avatar({ avatar, className }: Props) {
  if (isAvatarKey(avatar)) {
    return (
      <img
        src={AVATAR_URLS[avatar]}
        alt="头像"
        className={cn('h-full w-full rounded-full bg-white object-cover', className)}
      />
    )
  }
  return <span className={className}>{avatar}</span>
}
