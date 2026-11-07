import { createInitialState, previewUsers } from '../data/fixtures'
import { canManage, generateJourneyId, normalizeEmail, normalizePhone, qualificationMissing } from '../lib/utils'
import type { ContactAttempt, CrmState, FollowUp, Lead, LeadDisposition, LeadFilters, Qualification, User } from '../types'

const STORAGE_KEY = 'kennix.crm.state.v1'
export const PREVIEW_PASSWORD = 'Preview@123'

function clone<T>(value: T): T { return structuredClone(value) }
function now() { return new Date().toISOString() }
function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
function assertTelesalesEditable(lead: Lead) {
  if (lead.stage === 'Qualified') throw new Error('This journey has been sent to Sales and is read-only in Telesales')
  if (lead.stage === 'Lost') throw new Error('This journey is a Dead Lead and is read-only in Telesales')
  if (lead.landSourcingHandoff?.status === 'Submitted') throw new Error('This journey is with Land Sourcing and is read-only in Telesales')
}

export class LocalCrmService {
  private read(): CrmState {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) {
      const state = createInitialState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      return state
    }
    try {
      const state = JSON.parse(value) as CrmState
      state.leads.forEach(lead => {
        const qualification = lead.qualification
        qualification.propertyType ??= ''
        qualification.size ??= ''
        qualification.locations ??= (qualification.location ? qualification.location.split('/').map(name => ({ name: name.trim(), pincode: '' })) : [{ name: lead.city, pincode: '' }])
        if (!['Below ₹1 Cr','₹1–1.5 Cr','₹1.5–2 Cr','₹2–3 Cr','₹3–4 Cr','₹4 Cr+'].includes(qualification.budget)) qualification.budget = qualification.budget.includes('crore') || qualification.budget.includes('Cr') ? '₹1–1.5 Cr' : 'Below ₹1 Cr'
        if (!['Immediate','1–3 months','3–6 months','6+ months'].includes(qualification.timeline)) qualification.timeline = qualification.timeline.toLowerCase().includes('immediate') ? 'Immediate' : qualification.timeline.toLowerCase().includes('3 month') ? '1–3 months' : qualification.timeline.toLowerCase().includes('6 month') ? '3–6 months' : '6+ months'
        if (!['Own Land','Need to Source Land'].includes(qualification.landStatus)) qualification.landStatus = qualification.landStatus.toLowerCase().includes('own') || qualification.landStatus.toLowerCase().includes('identified') || qualification.landStatus.toLowerCase().includes('family') ? 'Own Land' : 'Need to Source Land'
        if (lead.qualification.interestConfirmed === undefined) {
          lead.qualification.interestConfirmed = Boolean(lead.qualification.verifiedContact && lead.qualification.propertyRequirement)
        }
        lead.lastDisposition ??= ({
          Attempted: 'RNR',
          Contacted: 'Interested',
          Qualification: 'Interested',
          Qualified: 'Interested',
          Nurture: 'Interested',
          Lost: 'Not Interested',
        } as Partial<Record<Lead['stage'], LeadDisposition>>)[lead.stage]
        qualification.salesMeetingDate ??= ''
        qualification.salesMeetingTime ??= ''
        if (lead.stage === 'Contacted' && qualificationMissing(lead.qualification).length === 0) {
          lead.stage = 'Qualification'
          lead.nextAction = 'Review qualification and send to Sales'
        }
      })
      this.write(state)
      return state
    } catch { const state = createInitialState(); this.write(state); return state }
  }
  private write(state: CrmState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
  async getSnapshot() { return clone(this.read()) }
  async listUsers() { return clone(previewUsers) }
  async login(email: string, password: string): Promise<User | null> {
    if (password !== PREVIEW_PASSWORD) return null
    return clone(previewUsers.find(user => user.email.toLowerCase() === email.trim().toLowerCase()) ?? null)
  }
  async listLeads(filters: LeadFilters = {}, user?: User) {
    let leads = this.read().leads
    if (user && (user.role === 'executive' || user.role === 'senior_executive')) leads = leads.filter(lead => lead.ownerId === user.id)
    if (filters.search) {
      const search = filters.search.toLowerCase()
      leads = leads.filter(lead => [lead.journeyId, lead.name, lead.email, lead.phone, lead.city, lead.requirement].some(value => value.toLowerCase().includes(search)))
    }
    if (filters.stage && filters.stage !== 'All') leads = leads.filter(lead => lead.stage === filters.stage)
    if (filters.source && filters.source !== 'All') leads = leads.filter(lead => lead.source === filters.source)
    if (filters.ownerId && filters.ownerId !== 'All') leads = leads.filter(lead => lead.ownerId === filters.ownerId)
    if (filters.type && filters.type !== 'All') leads = leads.filter(lead => lead.type === filters.type)
    return clone(leads)
  }
  async getJourney(journeyId: string) { return clone(this.read().leads.find(lead => lead.journeyId === journeyId) ?? null) }
  async createLead(input: Pick<Lead, 'name'|'email'|'phone'|'city'|'type'|'source'|'requirement'|'budget'|'timeline'|'landStatus'|'priority'>, actor: User) {
    if (!canManage(actor.role)) throw new Error('Only a Team Lead or CRM Manager can create leads')
    const state = this.read()
    const journeyId = generateJourneyId(state.leads)
    const ownerPool = ['usr-priya', 'usr-arjun']
    const ownerId = ownerPool[state.assignmentCursor % ownerPool.length]
    const normalizedEmail = normalizeEmail(input.email)
    const normalizedPhone = normalizePhone(input.phone)
    const duplicate = state.leads.find(lead => normalizeEmail(lead.email) === normalizedEmail || normalizePhone(lead.phone) === normalizedPhone)
    const customerId = duplicate?.customerId ?? `CUS-${String(1100 + state.customers.length).padStart(5, '0')}`
    const lead: Lead = {
      ...input, journeyId, customerId, ownerId, stage: 'New', createdAt: now(), nextAction: 'Make first contact', nextActionAt: '2026-11-02T10:00:00+05:30',
      duplicateOf: duplicate?.journeyId, duplicateStatus: duplicate ? 'Pending review' : undefined,
      qualification: { verifiedContact: false, interestConfirmed: false, customerType: input.type, propertyRequirement: input.requirement, propertyType: '', budget: '', size: '', timeline: '', locations: [{ name: input.city, pincode: '' }], landStatus: '', source: input.source, consent: false },
      contacts: [], notes: [], documents: [], activities: [
        { id: uid('ACT'), type: 'Lead created', description: `${input.source} lead captured and ${journeyId} created.`, actor: actor.name, createdAt: now() },
        { id: uid('ACT'), type: 'Assignment', description: `Assigned to ${previewUsers.find(user => user.id === ownerId)?.name} through round-robin.`, actor: 'System', createdAt: now() },
      ],
    }
    state.leads.unshift(lead)
    state.assignmentCursor += 1
    state.followUps.unshift({ id: uid('FU'), journeyId, title: 'Make first contact', type: 'Call', dueAt: lead.nextActionAt!, priority: input.priority, status: 'Open', ownerId, reminderChannels: ['In-app'], history: [] })
    const customer = state.customers.find(item => item.id === customerId)
    if (customer) customer.journeyIds.push(journeyId)
    else state.customers.unshift({ id: customerId, name: input.name, email: input.email, phone: input.phone, city: input.city, consent: false, journeyIds: [journeyId], since: lead.createdAt })
    this.write(state)
    return clone(lead)
  }
  async saveQualification(journeyId: string, qualification: Qualification) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    lead.qualification = qualification
    lead.requirement = qualification.propertyRequirement
    lead.budget = qualification.budget
    lead.timeline = qualification.timeline
    lead.landStatus = qualification.landStatus
    lead.city = qualification.locations.map(location => location.name).join(', ')
    if (lead.lastDisposition === 'Interested') lead.stage = 'Qualification'
    lead.activities.unshift({ id: uid('ACT'), type: 'Qualification updated', description: 'Structured requirement draft saved.', actor: 'Current user', createdAt: now() })
    this.write(state)
  }
  async updateQualificationChecklist(journeyId: string, field: 'verifiedContact'|'interestConfirmed'|'consent', checked: boolean) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    lead.qualification[field] = checked
    lead.activities.unshift({ id: uid('ACT'), type: 'Qualification checklist', description: `${field} ${checked ? 'confirmed' : 'cleared'}.`, actor: 'Current user', createdAt: now() })
    this.write(state)
  }
  async submitToLandSourcing(journeyId: string) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    if (lead.qualification.landStatus !== 'Need to Source Land') throw new Error('Land Sourcing is only required when the customer needs land')
    if (!lead.qualification.propertyType || !lead.qualification.locations.length || lead.qualification.locations.some(location => !location.name || !location.pincode)) throw new Error('Property type, locations, and pincodes are required for Land Sourcing')
    lead.landSourcingHandoff = {
      reference: `KX-LS-${journeyId.slice(-6)}`,
      status: 'Submitted',
      submittedAt: now(),
      customerName: lead.name,
      mobileNumber: lead.phone,
      locations: clone(lead.qualification.locations),
      propertyType: lead.qualification.propertyType,
    }
    lead.nextAction = 'Await Land Sourcing update'
    lead.nextActionAt = undefined
    lead.activities.unshift({ id: uid('ACT'), type: 'Land Sourcing handoff', description: `${lead.landSourcingHandoff.reference} submitted with customer name, mobile number, locations, and property type.`, actor: 'Current user', createdAt: now() })
    this.write(state)
  }
  async markLandIdentified(journeyId: string) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead?.landSourcingHandoff) throw new Error('Land Sourcing handoff not found')
    lead.landSourcingHandoff.status = 'Land Identified'
    lead.landSourcingHandoff.completedAt = now()
    lead.nextAction = 'Review qualification and send to Sales'
    lead.activities.unshift({ id: uid('ACT'), type: 'Land identified', description: 'Land Sourcing completed. Journey returned to Telesales for Sales handoff.', actor: 'Land Sourcing', createdAt: now() })
    this.write(state)
  }
  async logContactAttempt(journeyId: string, input: Omit<ContactAttempt, 'id'|'date'|'employee'|'followUpId'> & { employee: string; followUpAt?: string }) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    const followUpDispositions: LeadDisposition[] = ['RNR', 'Call Back Later', 'Switch Off']
    if (followUpDispositions.includes(input.disposition) && !input.followUpAt) throw new Error('Next call date and time are required for this disposition')
    state.followUps.filter(item => item.journeyId === journeyId && item.status === 'Open').forEach(item => {
      item.status = 'Completed'
      item.history.unshift(`Completed by contact disposition ${now()}`)
    })
    let followUpId: string | undefined
    if (followUpDispositions.includes(input.disposition) && input.followUpAt) {
      const title = input.disposition === 'RNR' ? 'Retry RNR lead' : input.disposition === 'Switch Off' ? 'Retry switched-off number' : 'Customer callback'
      followUpId = uid('FU')
      state.followUps.unshift({ id: followUpId, journeyId, title, type: 'Call', dueAt: input.followUpAt, priority: lead.priority, status: 'Open', ownerId: lead.ownerId, reminderChannels: ['In-app'], history: [] })
      lead.stage = 'Attempted'
      lead.nextActionAt = input.followUpAt
      lead.nextAction = title
    } else if (input.disposition === 'Interested') {
      lead.stage = 'Qualification'
      lead.qualification.verifiedContact = true
      lead.qualification.interestConfirmed = true
      lead.nextAction = 'Complete requirements and schedule Sales meeting'
      lead.nextActionAt = undefined
    } else {
      lead.stage = 'Lost'
      lead.lostReason = 'Not Interested'
      lead.nextAction = 'Dead lead'
      lead.nextActionAt = undefined
    }
    lead.contacts.unshift({ id: uid('CA'), date: now(), followUpId, ...input })
    lead.lastDisposition = input.disposition
    lead.activities.unshift({ id: uid('ACT'), type: 'Contact attempt', description: `${input.direction} contact logged: ${input.disposition}.`, actor: input.employee, createdAt: now() }); this.write(state)
  }
  async scheduleFollowUp(journeyId: string, input: Omit<FollowUp, 'id'|'journeyId'|'status'|'history'>) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    const followUp: FollowUp = { ...input, id: uid('FU'), journeyId, status: 'Open', history: [] }; state.followUps.unshift(followUp); lead.nextAction = input.title; lead.nextActionAt = input.dueAt; lead.activities.unshift({ id: uid('ACT'), type: 'Follow-up scheduled', description: `${input.title} scheduled.`, actor: 'Current user', createdAt: now() }); this.write(state)
  }
  async updateFollowUp(id: string, action: 'complete'|'reschedule', dueAt?: string) {
    const state = this.read(); const followUp = state.followUps.find(item => item.id === id); if (!followUp) throw new Error('Follow-up not found')
    if (action === 'complete') { followUp.status = 'Completed'; followUp.history.unshift(`Completed ${now()}`) }
    else if (dueAt) { followUp.status = 'Open'; followUp.history.unshift(`Rescheduled from ${followUp.dueAt}`); followUp.dueAt = dueAt }
    const lead = state.leads.find(item => item.journeyId === followUp.journeyId); if (lead) { assertTelesalesEditable(lead); lead.activities.unshift({ id: uid('ACT'), type: action === 'complete' ? 'Follow-up completed' : 'Follow-up rescheduled', description: followUp.title, actor: 'Current user', createdAt: now() }) } this.write(state)
  }
  async changeStage(journeyId: string, action: 'nurture'|'lost'|'qualify', reason?: string) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    if (action === 'qualify') {
      if (lead.lastDisposition !== 'Interested') throw new Error('Only an Interested lead can be moved to Sales')
      if (qualificationMissing(lead.qualification).length) throw new Error('Complete the qualification before sending this journey to Sales')
      if (!lead.qualification.salesMeetingDate || !lead.qualification.salesMeetingTime) throw new Error('Sales meeting date and time are required before handoff')
      if (lead.qualification.landStatus === 'Need to Source Land' && lead.landSourcingHandoff?.status !== 'Land Identified') throw new Error('Complete the Land Sourcing handoff before sending this journey to Sales')
      lead.stage = 'Qualified'; lead.handoffReference = `KX-SH-${journeyId.slice(-6)}`; lead.nextAction = 'Sales handoff completed'; lead.nextActionAt = undefined; lead.activities.unshift({ id: uid('ACT'), type: 'Sales handoff', description: `Qualified journey sent to Sales as ${lead.handoffReference}.`, actor: 'Current user', createdAt: now() })
    }
    if (action === 'nurture') { lead.stage = 'Nurture'; lead.nurtureReason = reason; lead.nextAction = 'Nurture check-in'; lead.activities.unshift({ id: uid('ACT'), type: 'Moved to Nurture', description: reason || 'Journey placed in nurture.', actor: 'Current user', createdAt: now() }) }
    if (action === 'lost') { lead.stage = 'Lost'; lead.lostReason = reason; lead.nextAction = 'Journey closed'; lead.nextActionAt = undefined; lead.activities.unshift({ id: uid('ACT'), type: 'Marked Lost', description: reason || 'Journey closed.', actor: 'Current user', createdAt: now() }) }
    this.write(state)
  }
  async reassign(journeyId: string, ownerId: string, reason: string, actor: User) {
    if (!canManage(actor.role)) throw new Error('Only a Team Lead or CRM Manager can reassign leads')
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    const oldOwner = lead.ownerId; lead.ownerId = ownerId; state.followUps.filter(item => item.journeyId === journeyId && item.status === 'Open').forEach(item => { item.ownerId = ownerId }); lead.activities.unshift({ id: uid('ACT'), type: 'Reassigned', description: `Sole ownership changed from ${previewUsers.find(user => user.id === oldOwner)?.name} to ${previewUsers.find(user => user.id === ownerId)?.name}. Reason: ${reason}`, actor: actor.name, createdAt: now() }); this.write(state)
  }
  async resolveDuplicate(journeyId: string, resolution: 'link'|'no-duplicate') {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    if (resolution === 'link' && lead.duplicateOf) { const original = state.leads.find(item => item.journeyId === lead.duplicateOf); if (original) { lead.customerId = original.customerId; const customer = state.customers.find(item => item.id === original.customerId); if (customer && !customer.journeyIds.includes(journeyId)) customer.journeyIds.push(journeyId) } lead.duplicateStatus = 'Linked' }
    else lead.duplicateStatus = 'No duplicate'
    lead.activities.unshift({ id: uid('ACT'), type: 'Duplicate review', description: resolution === 'link' ? 'Linked as a separate journey under the existing customer.' : 'Reviewed and marked as no duplicate.', actor: 'Current user', createdAt: now() }); this.write(state)
  }
  async addNote(journeyId: string, text: string, author: string, pinned = false) {
    const state = this.read(); const lead = state.leads.find(item => item.journeyId === journeyId); if (!lead) throw new Error('Journey not found')
    assertTelesalesEditable(lead)
    lead.notes.unshift({ id: uid('N'), text, author, createdAt: now(), pinned }); lead.activities.unshift({ id: uid('ACT'), type: 'Note added', description: pinned ? 'Pinned internal note added.' : 'Internal note added.', actor: author, createdAt: now() }); this.write(state)
  }
  reset() { localStorage.removeItem(STORAGE_KEY) }
}

export const crmService = new LocalCrmService()
