import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiCrmService } from '../services/apiCrmService'

const API = 'http://localhost:8000/api/v1'
const e = (code: string, label: string) => ({ code, label })

const apiLead = {
  journeyId: 'KX-2026-000248', customerId: 'CUS-01088', name: 'Rohan Khanna', email: 'rohan@example.com',
  phone: '+91 98100 22048', city: 'Delhi NCR', type: e('individual', 'Individual'),
  stage: e('sent_to_sales', 'Qualified'), priority: e('low', 'Low'), source: e('phone', 'Phone'),
  owner: { id: 'u-arjun', name: 'Arjun Nair', initials: 'AN' }, createdAt: '2026-10-25T03:45:00Z',
  requirement: '4 BHK villa', budget: '₹1–1.5 Cr', timeline: '6+ months', landStatus: 'Need to Source Land',
  nextAction: 'Sales handoff completed', nextActionAt: null, lastDisposition: e('interested', 'Interested'),
  salesQueue: e('new_lead_for_land_sourcing', 'New Lead for Land Sourcing'), duplicateStatus: null,
  duplicateOf: null, lostReason: null, handoffReference: 'KX-SH-2026-000248',
  landSourcingHandoff: {
    reference: 'KX-LS-2026-000248', status: e('submitted', 'Submitted'), submittedAt: '2026-10-31T10:30:00Z',
    completedAt: null, customerName: 'Rohan Khanna', maskedMobile: '+91 98XXX XX048',
    locations: [{ name: 'Delhi NCR', pincode: '110001' }], propertyType: e('individual_house', 'Individual House (1 Floor / Villa)'),
    size: e('1500_2000', '1,500–2,000 sq ft'), budget: e('1_1_5cr', '₹1–1.5 Cr'), city: 'Delhi NCR', state: 'Delhi',
  },
  qualification: {
    verifiedContact: true, interestConfirmed: true, consent: true, customerType: e('individual', 'Individual'),
    propertyRequirement: '4 BHK villa', propertyType: e('individual_house', 'Individual House (1 Floor / Villa)'),
    budget: e('1_1_5cr', '₹1–1.5 Cr'), size: null, timeline: e('6m_plus', '6+ months'),
    landStatus: e('need_to_source_land', 'Need to Source Land'), source: e('phone', 'Phone'),
    locations: [{ name: 'Delhi NCR', pincode: '110001' }], coordinator: '', approximateFamilies: null,
    sharedRequirement: '', combinedBudget: '', commonLocation: '', salesMeetingDate: '2026-11-24', salesMeetingTime: '11:30',
  },
  contacts: [{ id: 'c1', direction: e('outbound', 'Outbound'), duration: 240, disposition: e('interested', 'Interested'), notes: 'Interested.', date: '2026-10-26T05:00:00Z', employee: 'Arjun Nair', followUpId: null }],
  feedback: [{ id: 'f1', text: 'Interested.', author: 'Arjun Nair', team: e('telesales', 'Telesales'), createdAt: '2026-10-26T05:00:00Z', disposition: e('interested', 'Interested'), contactId: 'c1' }],
  followUps: [], notes: [], documents: [{ id: 'd1', name: 'Brief.pdf', category: 'Land reference', uploadedAt: '2026-10-27T09:00:00Z', visibility: e('internal', 'Internal'), status: e('reviewed', 'Reviewed') }],
  activities: [{ id: 'a1', type: 'Sales handoff', description: 'Sent.', actor: 'Arjun Nair', createdAt: '2026-10-31T10:30:00Z' }],
}

const followUp = {
  id: 'fu1', journeyId: 'KX-2026-000243', title: 'Retry RNR lead', type: e('call', 'Call'), dueAt: '2026-11-08T04:30:00Z',
  priority: e('high', 'High'), status: e('open', 'Open'), owner: { id: 'u-priya', name: 'Priya Singh', initials: 'PS' },
  reminderChannels: ['in_app', 'email'], history: ['Created from RNR disposition'],
}

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown }
let handler: Handler
const calls: { url: string; init: RequestInit }[] = []

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  localStorage.clear()
  calls.length = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    const { status, body } = handler(url, init)
    return json(status, body)
  }))
})
afterEach(() => vi.unstubAllGlobals())

const service = new ApiCrmService()
const signIn = () => localStorage.setItem('kennix.crm.tokens.v1', JSON.stringify({ access: 'old-access', refresh: 'refresh-1' }))

describe('ApiCrmService', () => {
  it('signs in and maps the Telesales membership to a portal user', async () => {
    handler = () => ({ status: 200, body: {
      access: 'a', refresh: 'r', user: { id: 'u-ritesh', email: 'ritesh.malhotra@kennix.in', name: 'Ritesh Malhotra', initials: 'RM' },
      memberships: [{ department: e('telesales', 'Telesales'), role: e('manager', 'Manager'), title: 'CRM Manager', teamName: 'Customer Acquisition', manager: null }],
    } })
    const user = await service.login('ritesh.malhotra@kennix.in', 'Preview@123')
    expect(user).toEqual({ id: 'u-ritesh', name: 'Ritesh Malhotra', email: 'ritesh.malhotra@kennix.in', initials: 'RM', role: 'crm_manager', title: 'CRM Manager', team: 'Customer Acquisition' })
    expect(JSON.parse(localStorage.getItem('kennix.crm.tokens.v1')!)).toEqual({ access: 'a', refresh: 'r' })
  })

  it('refuses a wrong password and people outside Telesales', async () => {
    handler = () => ({ status: 401, body: { code: 'invalid_credentials', message: 'Email or password is incorrect.' } })
    expect(await service.login('priya.singh@kennix.in', 'wrong')).toBeNull()
    handler = () => ({ status: 200, body: { access: 'a', refresh: 'r', user: { id: 'u', email: 'n@kennix.in', name: 'Neha', initials: 'NS' },
      memberships: [{ department: e('land_sourcing', 'Land Sourcing'), role: e('executive', 'Executive'), title: 'LS', teamName: '', manager: null }] } })
    expect(await service.login('neha.sharma@kennix.in', 'Preview@123')).toBeNull()
    expect(localStorage.getItem('kennix.crm.tokens.v1')).toBeNull()
  })

  it('builds the portal snapshot from API labels', async () => {
    signIn()
    handler = url => url.includes('/telesales/leads/')
      ? { status: 200, body: { next: null, previous: null, results: [apiLead] } }
      : { status: 200, body: [followUp] }
    const snapshot = await service.getSnapshot()
    const lead = snapshot.leads[0]
    expect(lead).toMatchObject({
      stage: 'Qualified', type: 'Individual', priority: 'Low', source: 'Phone', ownerId: 'u-arjun',
      lastDisposition: 'Interested', salesQueue: 'New Lead for Land Sourcing', handoffReference: 'KX-SH-2026-000248',
      landSourcingHandoff: { reference: 'KX-LS-2026-000248', status: 'Submitted', propertyType: 'Individual House (1 Floor / Villa)', maskedMobile: '+91 98XXX XX048', size: '1,500–2,000 sq ft', budget: '₹1–1.5 Cr', state: 'Delhi' },
    })
    expect(lead.qualification).toMatchObject({ budget: '₹1–1.5 Cr', size: '', landStatus: 'Need to Source Land', salesMeetingTime: '11:30' })
    expect(lead.contacts[0]).toMatchObject({ direction: 'Outbound', disposition: 'Interested' })
    expect(lead.feedback[0]).toMatchObject({ team: 'Telesales', contactId: 'c1' })
    expect(lead.documents[0]).toMatchObject({ visibility: 'Internal', status: 'Reviewed' })
    expect(snapshot.followUps[0]).toMatchObject({ type: 'Call', status: 'Open', priority: 'High', ownerId: 'u-priya', reminderChannels: ['In-app', 'Email'] })
    expect(snapshot.customers).toEqual([expect.objectContaining({ id: 'CUS-01088', journeyIds: ['KX-2026-000248'] })])
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer old-access' })
  })

  it('sends empty qualification answers as null and channels as codes', async () => {
    signIn()
    handler = () => ({ status: 200, body: {} })
    await service.saveQualification('KX-2026-000241', {
      verifiedContact: true, interestConfirmed: true, consent: false, customerType: 'Individual', propertyRequirement: '3 BHK',
      propertyType: '', budget: '₹1–1.5 Cr', size: '', timeline: '', locations: [{ name: 'Mohali', pincode: '160055' }],
      landStatus: '', source: 'Website', salesMeetingDate: '', salesMeetingTime: '',
    })
    const body = JSON.parse(String(calls[0].init.body))
    expect(calls[0].url).toBe(`${API}/journeys/KX-2026-000241/qualification/`)
    expect(body).toMatchObject({ propertyType: null, budget: '₹1–1.5 Cr', salesMeetingDate: null, locations: [{ name: 'Mohali', pincode: '160055' }] })

    await service.scheduleFollowUp('KX-2026-000241', { title: 'Call', type: 'Call', dueAt: '2026-11-20T10:00', priority: 'High', ownerId: 'x', reminderChannels: ['In-app', 'Email'] })
    expect(JSON.parse(String(calls[1].init.body)).reminderChannels).toEqual(['in_app', 'email'])
  })

  it('surfaces the API message so toasts read the same as the preview', async () => {
    signIn()
    handler = () => ({ status: 409, body: { code: 'read_only_in_department', message: 'This journey has been sent to Sales and is read-only in Telesales' } })
    await expect(service.addNote('KX-2026-000241', 'Edit', 'Priya Singh')).rejects.toThrow('read-only in Telesales')
  })

  it('refreshes an expired access token once and retries', async () => {
    signIn()
    handler = (url, init) => {
      if (url.endsWith('/auth/token/refresh/')) return { status: 200, body: { access: 'new-access', refresh: 'refresh-2' } }
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer new-access' ? { status: 200, body: [] } : { status: 401, body: { code: 'token_not_valid', message: 'expired' } }
    }
    await service.updateFollowUp('fu1', 'complete')
    expect(calls.map(item => item.url.replace(API, ''))).toEqual(['/follow-ups/fu1/complete/', '/auth/token/refresh/', '/follow-ups/fu1/complete/'])
    expect(JSON.parse(localStorage.getItem('kennix.crm.tokens.v1')!)).toEqual({ access: 'new-access', refresh: 'refresh-2' })
  })

  it('ends the session when the refresh token is no longer valid', async () => {
    signIn()
    localStorage.setItem('kennix.crm.auth.v1', '{"id":"u"}')
    handler = () => ({ status: 401, body: { code: 'token_not_valid', message: 'expired' } })
    await expect(service.addFeedback('KX-2026-000241', 'Hi there', 'Priya')).rejects.toThrow('Your session has ended')
    expect(localStorage.getItem('kennix.crm.tokens.v1')).toBeNull()
    expect(localStorage.getItem('kennix.crm.auth.v1')).toBeNull()
  })

  it('lists preview accounts on the sign-in page and members once signed in', async () => {
    expect((await service.listUsers()).map(user => user.email)).toContain('kavya.sethi@kennix.in')
    signIn()
    handler = () => ({ status: 200, body: [{ department: e('telesales', 'Telesales'), role: e('executive', 'Executive'), title: 'Telesales Executive',
      teamName: 'North Growth', manager: { userId: 'u-kavya', name: 'Kavya Sethi' }, user: { id: 'u-priya', name: 'Priya Singh', email: 'priya.singh@kennix.in', initials: 'PS' } }] })
    expect(await service.listUsers()).toEqual([{ id: 'u-priya', name: 'Priya Singh', email: 'priya.singh@kennix.in', initials: 'PS', role: 'executive', title: 'Telesales Executive', team: 'North Growth', managerId: 'u-kavya' }])
  })
})
