import type { Role } from '../types'

export type ProtectedArea = 'team' | 'reports' | 'configuration'

export function hasPermission(role: Role, area: ProtectedArea) {
  if (area === 'configuration') return role === 'crm_manager'
  return role === 'team_lead' || role === 'crm_manager'
}
