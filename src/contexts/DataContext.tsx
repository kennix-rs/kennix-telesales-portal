import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { crmService } from '../services/crmService'
import type { CrmState, User } from '../types'
import { useAuth } from './AuthContext'

interface DataValue { state: CrmState | null; users: User[]; refresh: () => Promise<void>; run: <T>(mutation: () => Promise<T>) => Promise<T> }
const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<CrmState | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const refresh = useCallback(async () => {
    const [snapshot, accounts] = await Promise.all([crmService.getSnapshot(), crmService.listUsers()])
    setState(snapshot); setUsers(accounts)
  }, [])
  useEffect(() => { if (user) void refresh() }, [user, refresh])
  const run = useCallback(async <T,>(mutation: () => Promise<T>) => { const result = await mutation(); await refresh(); return result }, [refresh])
  const value = useMemo(() => ({ state, users, refresh, run }), [state, users, refresh, run])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData must be used within DataProvider')
  return value
}
