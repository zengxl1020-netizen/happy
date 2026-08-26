/** 日期工具：统一本地时区的 YYYY-MM-DD 处理 */

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function today(): string {
  return formatDate(new Date())
}

export function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayLabel(s: string): string {
  return WEEKDAYS[parseDate(s).getDay()]
}

/** 以某天为中心返回一周（周一～周日） */
export function weekOf(s: string): string[] {
  const d = parseDate(s)
  const day = d.getDay() === 0 ? 7 : d.getDay() // 周一为 1
  const monday = addDays(s, -(day - 1))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function dayOfMonth(s: string): number {
  return parseDate(s).getDate()
}

/** HH:mm */
export function timeLabel(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
