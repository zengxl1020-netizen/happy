import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { Toaster } from '@/components/ui/sonner'
import TabBar from '@/components/TabBar'
import Home from '@/pages/Home'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
import Study from '@/pages/Study'

export default function App() {
  const ready = useAppStore((s) => s.ready)
  const init = useAppStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce">🍭</div>
          <p className="mt-3 font-black text-violet-500">快乐劳动加载中…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
      <main className="flex-1 overflow-y-auto pb-28">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/study/:type" element={<Study />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <TabBar />
      <Toaster position="top-center" richColors />
    </div>
  )
}
