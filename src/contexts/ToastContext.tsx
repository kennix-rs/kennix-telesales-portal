import * as ToastPrimitive from '@radix-ui/react-toast'
import { CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastItem { id: number; title: string; description?: string }
const ToastContext = createContext<{ toast: (title: string, description?: string) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toast = useCallback((title: string, description?: string) => setItems(current => [...current, { id: Date.now(), title, description }]), [])
  return <ToastContext.Provider value={{ toast }}><ToastPrimitive.Provider swipeDirection="right">{children}{items.map(item => (
    <ToastPrimitive.Root key={item.id} defaultOpen duration={3500} onOpenChange={open => !open && setItems(current => current.filter(entry => entry.id !== item.id))} className="toast-root">
      <CheckCircle2 className="text-teal-600" size={20}/><div><ToastPrimitive.Title className="font-semibold text-slate-900">{item.title}</ToastPrimitive.Title>{item.description && <ToastPrimitive.Description className="text-sm text-slate-600">{item.description}</ToastPrimitive.Description>}</div><ToastPrimitive.Close className="ml-auto text-slate-400" aria-label="Close"><X size={16}/></ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))}<ToastPrimitive.Viewport className="fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"/></ToastPrimitive.Provider></ToastContext.Provider>
}
export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('useToast must be used within ToastProvider'); return value }
