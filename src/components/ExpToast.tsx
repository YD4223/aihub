'use client'

import { useState, createContext, useContext, ReactNode } from 'react'

interface ExpToast {
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
    setToasts(prev => [...prev, { message: message || `+${amount} EXP`, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2000)
  }

  return (
    <ExpToastContext.Provider value={{ showExpToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-neon-green text-cyber-background px-4 py-2 rounded-lg font-mono font-bold text-sm shadow-lg animate-slide-in-right"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ExpToastContext.Provider>
  )
}
