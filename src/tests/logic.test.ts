import { beforeEach, describe, expect, it } from 'vitest'
import { generateJourneyId, normalizeEmail, normalizePhone, qualificationMissing } from '../lib/utils'
import { hasPermission } from '../lib/permissions'
import { crmService, PREVIEW_PASSWORD } from '../services/crmService'

beforeEach(() => {
  localStorage.clear()
})

describe('journey identity and qualification rules', () => {
  it('generates the next permanent 2026 Journey ID', () => {
    expect(generateJourneyId([{ journeyId: 'KX-2026-000241' }, { journeyId: 'KX-2026-000310' }])).toBe('KX-2026-000311')
  })

  it('normalizes duplicate matching fields', () => {
    expect(normalizeEmail('  Rahul.Sharma@Gmail.com ')).toBe('rahul.sharma@gmail.com')
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210')
  })

  it('requires group-specific qualification fields', () => {
    const missing = qualificationMissing({
      verifiedContact: true,
      interestConfirmed: true,
      customerType: 'Group / Community',
      propertyRequirement: 'Low-rise housing community',
      budget: '₹12 crore',
      timeline: 'Within 6 months',
      location: 'New Chandigarh',
      landStatus: 'Land identified',
      source: 'Referral',
      consent: true,
    })
    expect(missing).toEqual(expect.arrayContaining(['Group coordinator', 'Approximate families', 'Shared requirement', 'Combined budget', 'Common location']))
  })
})

describe('role permissions', () => {
  it('restricts management routes to team leads and CRM managers', () => {
    expect(hasPermission('executive', 'team')).toBe(false)
    expect(hasPermission('senior_executive', 'reports')).toBe(false)
    expect(hasPermission('team_lead', 'reports')).toBe(true)
    expect(hasPermission('crm_manager', 'configuration')).toBe(true)
  })
})

describe('local CRM service', () => {
  it('authenticates preview accounts only with the shared password', async () => {
    expect(await crmService.login('priya.singh@kennix.in', PREVIEW_PASSWORD)).toMatchObject({ name: 'Priya Singh', role: 'executive' })
    expect(await crmService.login('priya.singh@kennix.in', 'wrong')).toBeNull()
  })

  it('creates a persistent journey and flags normalized duplicates', async () => {
    const manager = await crmService.login('ritesh.malhotra@kennix.in', PREVIEW_PASSWORD)
    expect(manager).not.toBeNull()
    const lead = await crmService.createLead({
      name: 'Rahul Sharma', email: ' RAHUL.SHARMA@gmail.com ', phone: '+91 99999 12345', city: 'Mohali', type: 'Individual', source: 'Phone', requirement: 'Second home journey', budget: '₹1.1 crore', timeline: 'Within 6 months', landStatus: 'Own land', priority: 'High',
    }, manager!)
    expect(lead.journeyId).toMatch(/^KX-2026-\d{6}$/)
    expect(lead.duplicateOf).toBe('KX-2026-000241')
    expect(lead.ownerId).toMatch(/^usr-(priya|arjun)$/)
    expect((await crmService.getSnapshot()).leads.some(item => item.journeyId === lead.journeyId)).toBe(true)
  })

  it('allows only Team Leads and CRM Managers to create leads', async () => {
    const executive = await crmService.login('priya.singh@kennix.in', PREVIEW_PASSWORD)
    await expect(crmService.createLead({
      name: 'Aman Khanna', email: 'aman.khanna@example.in', phone: '9876500000', city: 'Mohali', type: 'Individual', source: 'Phone', requirement: '3 BHK home', budget: '₹90 lakh', timeline: 'Within 3 months', landStatus: 'Own land', priority: 'Medium',
    }, executive!)).rejects.toThrow('Only a Team Lead or CRM Manager can create leads')
  })

  it('records a visible Sales handoff while retaining the Journey ID', async () => {
    await crmService.changeStage('KX-2026-000241', 'qualify')
    const lead = await crmService.getJourney('KX-2026-000241')
    expect(lead?.stage).toBe('Qualified')
    expect(lead?.handoffReference).toBe('KX-SH-000241')
    expect(lead?.activities[0].type).toBe('Sales handoff')
  })

  it('keeps sent-to-Sales journeys visible but read-only in Telesales', async () => {
    await crmService.changeStage('KX-2026-000241', 'qualify')
    const lead = await crmService.getJourney('KX-2026-000241')
    expect(lead?.name).toBe('Rahul Sharma')
    expect(lead?.contacts.length).toBeGreaterThan(0)
    await expect(crmService.addNote('KX-2026-000241', 'Attempted edit after handoff', 'Priya Singh')).rejects.toThrow('read-only in Telesales')
  })
})
