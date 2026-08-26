import p1 from '@/assets/avatars/princess_1.png'
import p2 from '@/assets/avatars/princess_2.png'
import p3 from '@/assets/avatars/princess_3.png'
import p4 from '@/assets/avatars/princess_4.png'
import p5 from '@/assets/avatars/princess_5.png'
import p6 from '@/assets/avatars/princess_6.png'
import p7 from '@/assets/avatars/princess_7.png'
import p8 from '@/assets/avatars/princess_8.png'

/** 公主头像 key → 资源 URL（数据库中存 key） */
export const AVATAR_URLS: Record<string, string> = {
  princess_1: p1,
  princess_2: p2,
  princess_3: p3,
  princess_4: p4,
  princess_5: p5,
  princess_6: p6,
  princess_7: p7,
  princess_8: p8,
}

export const AVATAR_KEYS = Object.keys(AVATAR_URLS)

export function isAvatarKey(avatar: string): boolean {
  return avatar in AVATAR_URLS
}
