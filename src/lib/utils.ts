import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Qualification, Role, Stage } from '../types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const REFERENCE_NOW = new Date('2026-11-07T18:00:00+05:30')

export function formatINR(value: string) {
  return value.replace(/lakh/gi, 'L').replace(/crore/gi, 'Cr')
}

export function formatDate(value?: string, includeTime = true) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

export function roleLabel(role: Role) {
  return ({ executive: 'Telesales Executive', senior_executive: 'Senior Telesales Executive', team_lead: 'Telesales Team Lead', crm_manager: 'CRM Manager' })[role]
}

export function canManage(role: Role) { return role === 'team_lead' || role === 'crm_manager' }
export function canViewReports(role: Role) { return role === 'team_lead' || role === 'crm_manager' }
export function qualificationMissing(q: Qualification) {
  const missing: string[] = []
  if (!q.verifiedContact) missing.push('Verified contact')
  if (!q.interestConfirmed) missing.push('Genuine interest confirmed')
  if (!q.customerType) missing.push('Customer type')
  if (!q.propertyRequirement) missing.push('Property requirement')
  if (!q.propertyType) missing.push('Property type')
  if (!q.budget) missing.push('Budget')
  if (!q.size) missing.push('Size')
  if (!q.timeline) missing.push('Urgency / timeline')
  if (!q.locations?.length || q.locations.some(location => !location.name || !location.pincode)) missing.push('Preferred location and pincode')
  if (!q.landStatus) missing.push('Land status')
  if (!q.source) missing.push('Lead source')
  if (!q.consent) missing.push('Communication consent')
  if (q.customerType === 'Group / Community') {
    if (!q.coordinator) missing.push('Group coordinator')
    if (!q.approximateFamilies) missing.push('Approximate families')
    if (!q.sharedRequirement) missing.push('Shared requirement')
    if (!q.combinedBudget) missing.push('Combined budget')
    if (!q.commonLocation) missing.push('Common location')
  }
  return missing
}

export function stageTone(stage: Stage) {
  return ({ New: 'blue', Attempted: 'amber', Contacted: 'teal', Qualification: 'violet', Qualified: 'green', Nurture: 'orange', Lost: 'slate', 'Sales Rejected': 'red' } as const)[stage]
}

export function normalizePhone(value: string) { return value.replace(/\D/g, '').slice(-10) }
/**
 * What Land Sourcing sees instead of the customer's number (decided 2026-11-11): enough to match a
 * customer, not enough to call them, so the lead can't leak to agents. +91 98101 21737 → +91 98XXX XX737.
 */
export function maskMobile(value: string) { const digits = normalizePhone(value); return digits.length === 10 ? `+91 ${digits.slice(0, 2)}XXX XX${digits.slice(-3)}` : 'XXXXX' }
/** State for the cities the demo uses; Land Sourcing gets the main city and state. */
const CITY_STATES: Record<string, string> = {
  Chandigarh: 'Chandigarh', Mohali: 'Punjab', Zirakpur: 'Punjab', Kharar: 'Punjab', 'New Chandigarh': 'Punjab', Ludhiana: 'Punjab',
  Panchkula: 'Haryana', Gurugram: 'Haryana', 'Delhi NCR': 'Delhi', Delhi: 'Delhi', Noida: 'Uttar Pradesh',
}
export function stateFor(city: string) { return CITY_STATES[city] ?? '' }
export function normalizeEmail(value: string) { return value.trim().toLowerCase() }
/** Team reference for a journey: the journey ID with the team code inserted, e.g. KX-2026-000241 → KX-LS-2026-000241. */
export function teamReference(teamCode: 'LS' | 'SH', journeyId: string) { return journeyId.replace(/^KX-/, `KX-${teamCode}-`) }
export function generateJourneyId(leads: { journeyId: string }[]) {
  const max = leads.reduce((value, lead) => Math.max(value, Number(lead.journeyId.split('-')[2]) || 0), 0)
  return `KX-2026-${String(max + 1).padStart(6, '0')}`
}
