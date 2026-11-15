/**
 * ApiCrmService: the same methods as LocalCrmService, backed by the KENNIX backend
 * (kennix-rs/kennix-backend). Screens don't change: they still get the portal's `Lead`,
 * `FollowUp` and `User` shapes, and errors carry the same messages.
 *
 * The API returns enums as `{code, label}`; labels are the strings these screens already use, and
 * the API accepts labels on writes, so mapping is mostly `.label`.
 */
import { previewUsers } from '../data/fixtures'
import type {
  ContactAttempt, CrmState, Customer, DocumentRecord, FeedbackComment, FeedbackTeam, FollowUp, Lead,
  LeadDisposition, LeadFilters, Qualification, Role, User,
} from '../types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000/api/v1'
const TOKEN_KEY = 'kennix.crm.tokens.v1'
const AUTH_KEY = 'kennix.crm.auth.v1'
const SHOW_PREVIEW_LOGINS = import.meta.env.VITE_PREVIEW_LOGINS !== 'false'

interface Tokens { access: string; refresh: string }
interface EnumValue { code: string; label: string }

// --- Wire types (camelCase JSON from the API) ---------------------------------------------

interface ApiPerson { id: string; name: string; initials: string }
interface ApiLocation { name: string; pincode: string }
interface ApiQualification {
  verifiedContact: boolean; interestConfirmed: boolean; consent: boolean
  customerType: EnumValue | null; propertyRequirement: string; propertyType: EnumValue | null
  budget: EnumValue | null; size: EnumValue | null; timeline: EnumValue | null
  landStatus: EnumValue | null; source: EnumValue | null; locations: ApiLocation[]
  coordinator: string; approximateFamilies: number | null; sharedRequirement: string
  combinedBudget: string; commonLocation: string
  salesMeetingDate: string | null; salesMeetingTime: string | null
}
interface ApiFollowUp {
  id: string; journeyId: string; title: string; type: EnumValue; dueAt: string; priority: EnumValue
  status: EnumValue; owner: ApiPerson; reminderChannels: string[]; history: string[]
}
interface ApiLead {
  journeyId: string; customerId: string; name: string; email: string; phone: string; city: string
  type: EnumValue; stage: EnumValue; priority: EnumValue; source: EnumValue; owner: ApiPerson
  createdAt: string; requirement: string; budget: string; timeline: string; landStatus: string
  nextAction: string; nextActionAt: string | null; lastDisposition: EnumValue | null
  salesQueue: EnumValue | null; duplicateStatus: EnumValue | null; duplicateOf: string | null
  lostReason: string | null; handoffReference: string | null
  salesRejection?: { at: string; by: string; reason: string; attempts: number } | null
  landSourcingHandoff: {
    reference: string; status: EnumValue; submittedAt: string; completedAt: string | null
    customerName: string; maskedMobile: string; locations: ApiLocation[]; propertyType: EnumValue
    size: EnumValue | null; budget: EnumValue | null; city: string; state: string
  } | null
  qualification: ApiQualification
  contacts: { id: string; direction: EnumValue; duration: number; disposition: EnumValue; notes: string; date: string; employee: string; followUpId: string | null }[]
  feedback: { id: string; text: string; author: string; team: EnumValue; createdAt: string; disposition: EnumValue | null; contactId: string | null }[]
  followUps: ApiFollowUp[]
  notes: { id: string; text: string; author: string; createdAt: string; pinned: boolean }[]
  documents: { id: string; name: string; category: string; uploadedAt: string; visibility: EnumValue; status: EnumValue }[]
  activities: { id: string; type: string; description: string; actor: string; createdAt: string }[]
}
interface ApiMembership {
  department: EnumValue; role: EnumValue; title: string; teamName: string
  manager: { userId: string; name: string } | null
  user?: { id: string; name: string; email: string; initials: string }
}
interface ApiSession { user: { id: string; email: string; name: string; initials: string }; memberships: ApiMembership[] }

// --- Mapping -----------------------------------------------------------------------------

const label = <T extends string>(value: EnumValue | null | undefined): T | '' => (value?.label ?? '') as T | ''
const optional = <T extends string>(value: EnumValue | null | undefined): T | undefined => (value?.label as T | undefined) ?? undefined
const REMINDER_LABELS: Record<string, string> = { in_app: 'In-app', email: 'Email' }
const REMINDER_CODES: Record<string, string> = { 'In-app': 'in_app', Email: 'email' }

/** Backend role → the portal's role strings (BACKEND_PLAN.md §5.2). */
function portalRole(role: string): Role {
  if (role === 'manager' || role === 'admin') return 'crm_manager'
  return role as Role
}

function toUser(membership: ApiMembership, person: { id: string; name: string; email: string; initials: string }): User {
  return {
    id: person.id, name: person.name, email: person.email, initials: person.initials,
    role: portalRole(membership.role.code), title: membership.title, team: membership.teamName,
    ...(membership.manager ? { managerId: membership.manager.userId } : {}),
  }
}

function toQualification(q: ApiQualification): Qualification {
  return {
    verifiedContact: q.verifiedContact, interestConfirmed: q.interestConfirmed, consent: q.consent,
    customerType: label(q.customerType), propertyRequirement: q.propertyRequirement,
    propertyType: label(q.propertyType), budget: label(q.budget), size: label(q.size),
    timeline: label(q.timeline), landStatus: label(q.landStatus), source: label(q.source),
    locations: q.locations.map(item => ({ name: item.name, pincode: item.pincode })),
    coordinator: q.coordinator || undefined, approximateFamilies: q.approximateFamilies ?? undefined,
    sharedRequirement: q.sharedRequirement || undefined, combinedBudget: q.combinedBudget || undefined,
    commonLocation: q.commonLocation || undefined,
    salesMeetingDate: q.salesMeetingDate ?? '', salesMeetingTime: q.salesMeetingTime ?? '',
  }
}

function toFollowUp(item: ApiFollowUp): FollowUp {
  return {
    id: item.id, journeyId: item.journeyId, title: item.title, type: label(item.type) as FollowUp['type'],
    dueAt: item.dueAt, priority: label(item.priority) as FollowUp['priority'],
    status: label(item.status) as FollowUp['status'], ownerId: item.owner.id,
    reminderChannels: item.reminderChannels.map(code => REMINDER_LABELS[code] ?? code), history: item.history,
  }
}

function toLead(lead: ApiLead): Lead {
  return {
    journeyId: lead.journeyId, customerId: lead.customerId, name: lead.name, email: lead.email,
    phone: lead.phone, city: lead.city, type: label(lead.type) as Lead['type'],
    stage: label(lead.stage) as Lead['stage'], priority: label(lead.priority) as Lead['priority'],
    source: label(lead.source) as Lead['source'], ownerId: lead.owner.id, createdAt: lead.createdAt,
    requirement: lead.requirement, budget: lead.budget, timeline: lead.timeline, landStatus: lead.landStatus,
    nextAction: lead.nextAction, nextActionAt: lead.nextActionAt ?? undefined,
    lastDisposition: optional<LeadDisposition>(lead.lastDisposition),
    duplicateOf: lead.duplicateOf ?? undefined, duplicateStatus: optional(lead.duplicateStatus),
    qualification: toQualification(lead.qualification),
    contacts: lead.contacts.map((item): ContactAttempt => ({
      id: item.id, direction: label(item.direction) as ContactAttempt['direction'], date: item.date,
      duration: item.duration, disposition: label(item.disposition) as LeadDisposition,
      notes: item.notes, employee: item.employee, ...(item.followUpId ? { followUpId: item.followUpId } : {}),
    })),
    feedback: lead.feedback.map((item): FeedbackComment => ({
      id: item.id, text: item.text, author: item.author, team: label(item.team) as FeedbackTeam,
      createdAt: item.createdAt, disposition: optional<LeadDisposition>(item.disposition),
      ...(item.contactId ? { contactId: item.contactId } : {}),
    })),
    notes: lead.notes.map(item => ({ ...item })),
    documents: lead.documents.map((item): DocumentRecord => ({
      id: item.id, name: item.name, category: item.category, uploadedAt: item.uploadedAt,
      visibility: label(item.visibility) as DocumentRecord['visibility'], status: label(item.status),
    })),
    activities: lead.activities.map(item => ({ ...item })),
    lostReason: lead.lostReason ?? undefined,
    ...(lead.salesRejection ? { salesRejection: { ...lead.salesRejection } } : {}),
    handoffReference: lead.handoffReference ?? undefined,
    salesQueue: optional(lead.salesQueue),
    ...(lead.landSourcingHandoff ? {
      landSourcingHandoff: {
        reference: lead.landSourcingHandoff.reference,
        status: label(lead.landSourcingHandoff.status) as 'Submitted' | 'Land Identified',
        submittedAt: lead.landSourcingHandoff.submittedAt,
        completedAt: lead.landSourcingHandoff.completedAt ?? undefined,
        customerName: lead.landSourcingHandoff.customerName,
        maskedMobile: lead.landSourcingHandoff.maskedMobile,
        size: label(lead.landSourcingHandoff.size) as Lead['qualification']['size'] & string,
        budget: label(lead.landSourcingHandoff.budget) as Lead['qualification']['budget'] & string,
        city: lead.landSourcingHandoff.city, state: lead.landSourcingHandoff.state,
        locations: lead.landSourcingHandoff.locations,
        propertyType: label(lead.landSourcingHandoff.propertyType) as Lead['qualification']['propertyType'] & string,
      },
    } : {}),
  } as Lead
}

function toCustomers(leads: Lead[]): Customer[] {
  const customers = new Map<string, Customer>()
  for (const lead of [...leads].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const existing = customers.get(lead.customerId)
    if (existing) existing.journeyIds.push(lead.journeyId)
    else customers.set(lead.customerId, {
      id: lead.customerId, name: lead.name, email: lead.email, phone: lead.phone, city: lead.city,
      consent: lead.qualification.consent, journeyIds: [lead.journeyId], since: lead.createdAt,
    })
  }
  return [...customers.values()]
}

/** Portal form values → API body. Empty answers are sent as null ("not captured yet"). */
function qualificationBody(q: Qualification) {
  const blank = (value: string | undefined) => value ? value : null
  return {
    verifiedContact: q.verifiedContact, interestConfirmed: q.interestConfirmed, consent: q.consent,
    customerType: blank(q.customerType), propertyRequirement: q.propertyRequirement,
    propertyType: blank(q.propertyType), budget: blank(q.budget), size: blank(q.size),
    timeline: blank(q.timeline), landStatus: blank(q.landStatus), source: blank(q.source),
    locations: q.locations.map(item => ({ name: item.name, pincode: item.pincode })),
    coordinator: q.coordinator ?? '', approximateFamilies: q.approximateFamilies || null,
    sharedRequirement: q.sharedRequirement ?? '', combinedBudget: q.combinedBudget ?? '',
    commonLocation: q.commonLocation ?? '',
    salesMeetingDate: blank(q.salesMeetingDate), salesMeetingTime: blank(q.salesMeetingTime),
  }
}

// --- HTTP ----------------------------------------------------------------------------------

export class ApiError extends Error {
  status: number; code: string; missing?: string[]
  constructor(status: number, code: string, message: string, missing?: string[]) {
    super(message); this.status = status; this.code = code; this.missing = missing
  }
}

function readTokens(): Tokens | null {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null') as Tokens | null } catch { return null }
}
function writeTokens(tokens: Tokens | null) {
  if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
  else localStorage.removeItem(TOKEN_KEY)
}

function endSession() {
  writeTokens(null)
  localStorage.removeItem(AUTH_KEY)
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.assign('/login')
}

async function refreshTokens(): Promise<boolean> {
  const tokens = readTokens()
  if (!tokens) return false
  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: tokens.refresh }),
  })
  if (!response.ok) return false
  const body = await response.json() as { access: string; refresh?: string }
  writeTokens({ access: body.access, refresh: body.refresh ?? tokens.refresh })
  return true
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const tokens = readTokens()
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(tokens ? { Authorization: `Bearer ${tokens.access}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 401) {
    if (retry && tokens && await refreshTokens()) return request<T>(method, path, body, false)
    // No session (for example one saved by the local preview mode) or it can't be refreshed.
    endSession()
    throw new ApiError(401, 'session_ended', 'Your session has ended. Sign in again.')
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    throw new ApiError(response.status, String(data.code ?? 'error'), String(data.message ?? 'Something went wrong. Try again.'), data.missing as string[] | undefined)
  }
  return data as T
}

async function listAll<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let next: string | null = path
  while (next) {
    const page: { results: T[]; next: string | null } = await request('GET', next)
    items.push(...page.results)
    next = page.next ? page.next.slice(page.next.indexOf('/api/v1') + '/api/v1'.length) : null
  }
  return items
}

// --- Service --------------------------------------------------------------------------------

export class ApiCrmService {
  async getSnapshot(): Promise<CrmState> {
    const [leads, followUps] = await Promise.all([
      listAll<ApiLead>('/telesales/leads/?view=detail&page_size=200'),
      request<ApiFollowUp[]>('GET', '/follow-ups/'),
    ])
    const mapped = leads.map(toLead)
    return { leads: mapped, followUps: followUps.map(toFollowUp), customers: toCustomers(mapped), assignmentCursor: 0 }
  }

  async listUsers(): Promise<User[]> {
    // The sign-in page lists the demo accounts before anyone is signed in.
    if (!readTokens()) return SHOW_PREVIEW_LOGINS ? structuredClone(previewUsers) : []
    const members = await request<(ApiMembership & { user: NonNullable<ApiMembership['user']> })[]>('GET', '/telesales/members/')
    return members.map(member => toUser(member, member.user))
  }

  async login(email: string, password: string): Promise<User | null> {
    const response = await fetch(`${API_URL}/auth/token/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }),
    })
    if (!response.ok) return null
    const body = await response.json() as Tokens & ApiSession
    const membership = body.memberships.find(item => item.department.code === 'telesales')
    if (!membership) return null
    writeTokens({ access: body.access, refresh: body.refresh })
    return toUser(membership, body.user)
  }

  async logout() {
    const tokens = readTokens()
    if (tokens) await request('POST', '/auth/logout/', { refresh: tokens.refresh }, false).catch(() => undefined)
    writeTokens(null)
  }

  async listLeads(filters: LeadFilters = {}, user?: User) {
    void user // the API already scopes leads to the signed-in user
    const leads = (await this.getSnapshot()).leads
    return leads.filter(lead =>
      (!filters.search || [lead.journeyId, lead.name, lead.email, lead.phone, lead.city, lead.requirement].some(value => value.toLowerCase().includes(filters.search!.toLowerCase())))
      && (!filters.stage || filters.stage === 'All' || lead.stage === filters.stage)
      && (!filters.source || filters.source === 'All' || lead.source === filters.source)
      && (!filters.ownerId || filters.ownerId === 'All' || lead.ownerId === filters.ownerId)
      && (!filters.type || filters.type === 'All' || lead.type === filters.type))
  }

  async getJourney(journeyId: string) {
    try { return toLead(await request<ApiLead>('GET', `/telesales/leads/${journeyId}/`)) }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error }
  }

  async createLead(input: Pick<Lead, 'name'|'email'|'phone'|'city'|'type'|'source'|'requirement'|'budget'|'timeline'|'landStatus'|'priority'>, actor: User) {
    void actor // the API checks the signed-in user's role
    return toLead(await request<ApiLead>('POST', '/telesales/leads/', input))
  }

  async saveQualification(journeyId: string, qualification: Qualification) {
    await request('PUT', `/journeys/${journeyId}/qualification/`, qualificationBody(qualification))
  }

  async updateQualificationChecklist(journeyId: string, field: 'verifiedContact'|'interestConfirmed'|'consent', checked: boolean) {
    await request('PATCH', `/journeys/${journeyId}/qualification/checklist/`, { field, checked })
  }

  async markLandIdentified(journeyId: string): Promise<void> {
    void journeyId
    throw new Error('Land Sourcing updates this status from its own portal')
  }

  async addFeedback(journeyId: string, text: string, author: string, team: FeedbackTeam = 'Telesales') {
    void author; void team // the API records the signed-in user and their team
    await request('POST', `/journeys/${journeyId}/feedback/`, { text })
  }

  async logContactAttempt(journeyId: string, input: Omit<ContactAttempt, 'id'|'date'|'employee'|'followUpId'> & { employee: string; followUpAt?: string }) {
    await request('POST', `/telesales/leads/${journeyId}/calls/`, {
      direction: input.direction, duration: input.duration, disposition: input.disposition,
      notes: input.notes, followUpAt: input.followUpAt || null,
    })
  }

  async scheduleFollowUp(journeyId: string, input: Omit<FollowUp, 'id'|'journeyId'|'status'|'history'>) {
    await request('POST', `/journeys/${journeyId}/follow-ups/`, {
      title: input.title, type: input.type, dueAt: input.dueAt, priority: input.priority,
      reminderChannels: input.reminderChannels.map(item => REMINDER_CODES[item] ?? item),
    })
  }

  async updateFollowUp(id: string, action: 'complete'|'reschedule', dueAt?: string) {
    if (action === 'complete') await request('POST', `/follow-ups/${id}/complete/`)
    else await request('POST', `/follow-ups/${id}/reschedule/`, { dueAt })
  }

  async changeStage(journeyId: string, action: 'nurture'|'lost'|'qualify', reason?: string) {
    void reason
    if (action !== 'qualify') throw new Error('Nurture and Lost are retired; record a call disposition instead')
    await request('POST', `/telesales/leads/${journeyId}/send-to-sales/`)
  }

  async reassign(journeyId: string, ownerId: string, reason: string, actor: User) {
    void actor
    await request('POST', `/telesales/leads/${journeyId}/reassign/`, { ownerId, reason })
  }

  async resolveDuplicate(journeyId: string, resolution: 'link'|'no-duplicate') {
    await request('POST', `/journeys/${journeyId}/duplicate-review/`, { resolution })
  }

  async addNote(journeyId: string, text: string, author: string, pinned = false) {
    void author
    await request('POST', `/journeys/${journeyId}/notes/`, { text, pinned })
  }

  reset() { writeTokens(null) }
}
