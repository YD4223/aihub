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
      {/* 浮动提示容器 */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="animate-exp-toast bg-neon-green/10 border border-neon-green/50 backdrop-blur-md px-4 py-3 rounded-lg shadow-[0_0_20px_rgba(0,255,136,0.3)]"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neon-green animate-pulse" />
              <span className="text-sm font-mono font-bold text-neon-green">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ExpToastContext.Provider>
  )
}
