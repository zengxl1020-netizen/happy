// 将 assets-b64/ 下的 base64 文本还原为真实二进制资源。
// 仓库以文本形式保存二进制资源（png/mp3），克隆后执行 npm install / npm run dev / npm run build 时会自动解码（predev / prebuild 钩子）。
// 也可以手动运行：node scripts/decode-assets.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'assets-b64')

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(p)
    } else if (entry.name.endsWith('.b64')) {
      const rel = path.relative(src, p).replace(/\.b64$/, '')
      const out = path.join(root, rel)
      if (fs.existsSync(out)) continue
      fs.mkdirSync(path.dirname(out), { recursive: true })
      const b64 = fs.readFileSync(p, 'utf8').replace(/\s+/g, '')
      fs.writeFileSync(out, Buffer.from(b64, 'base64'))
      console.log('[decode-assets]', rel)
    }
  }
}

if (fs.existsSync(src)) walk(src)
console.log('[decode-assets] done')
