'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

interface ExpToast {
  amount: number
  message: string
  id: number
}

interface ExpToastContextType {
  showExpToast: (amount: number, message?: string) => void
}

const ExpToastContext = createContext<ExpToastContextType>({ showExpToast: () => {} })
export const useExpToast = () => useContext(ExpToastContext)

let toastId = 0

export function ExpToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ExpToast[]>([])

  const showExpToast = (amount: number, message?: string) => {
    const id = ++toastId
    setToasts(prev => [...prev, { amount, message: message || `+${amount} EXP`, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }

  return (
    <ExpToastContext.Provider value={{ showExpToast }}>
      {children}
      {/* 浮动提示容器 - 居中放大弹窗 */}
      {toasts.map(toast => (
        <div key={toast.id} className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="animate-exp-toast relative bg-cyber-card border-2 border-neon-green/60 backdrop-blur-xl px-8 py-6 rounded-xl shadow-[0_0_60px_rgba(0,255,136,0.5)]">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="w-8 h-8 text-neon-green animate-pulse" />
              <span className="text-lg font-mono font-bold text-neon-green">{toast.message}</span>
            </div>
          </div>
        </div>
      ))}
    </ExpToastContext.Provider>
  )
}
