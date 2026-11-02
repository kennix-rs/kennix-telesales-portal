import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { previewUsers } from '../data/fixtures'
import { crmService } from '../services/crmService'
import type { User } from '../types'

const AUTH_KEY = 'kennix.crm.auth.v1'
interface AuthValue { user: User | null; login: (email: string, password: string) => Promise<boolean>; logout: () => void }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null') as User | null
      return stored ? previewUsers.find(account => account.id === stored.id) ?? stored : null
    } catch { return null }
  })
  const value = useMemo<AuthValue>(() => ({
    user,
    login: async (email, password) => {
      const account = await crmService.login(email, password)
      if (!account) return false
      localStorage.setItem(AUTH_KEY, JSON.stringify(account)); setUser(account); return true
    },
    logout: () => { localStorage.removeItem(AUTH_KEY); setUser(null) },
  }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
