import { beforeEach, describe, expect, it } from 'vitest'
import { generateJourneyId, normalizeEmail, normalizePhone, qualificationMissing, teamReference } from '../lib/utils'
import { hasPermission } from '../lib/permissions'
import { crmService, PREVIEW_PASSWORD } from '../services/crmService'
import { createInitialState } from '../data/fixtures'

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
      propertyType: 'Individual House (1 Floor / Villa)',
      budget: '₹4 Cr+',
      size: '3,500+ sq ft',
      timeline: '3–6 months',
      locations: [{ name: 'New Chandigarh', pincode: '140901' }],
      landStatus: 'Own Land',
      source: 'Referral',
      consent: true,
    })
    expect(missing).toEqual(expect.arrayContaining(['Group coordinator', 'Approximate families', 'Shared requirement', 'Combined budget', 'Common location']))
  })

  it('does not require group fields for an individual requirement', () => {
    const missing = qualificationMissing({
      verifiedContact: true,
      interestConfirmed: true,
      customerType: 'Individual',
      propertyRequirement: '3 BHK family home',
      propertyType: 'Individual House (1 Floor / Villa)',
      budget: '₹1–1.5 Cr',
      size: '2,000–2,500 sq ft',
      timeline: '1–3 months',
      locations: [{ name: 'Mohali', pincode: '160055' }],
      landStatus: 'Own Land',
      source: 'Website',
      consent: true,
    })
    expect(missing).not.toEqual(expect.arrayContaining(['Group coordinator', 'Approximate families', 'Shared requirement', 'Combined budget', 'Common location']))
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

describe('preview fixture integrity', () => {
  const state = createInitialState()
  const followUpDispositions = ['RNR', 'Call Back Later', 'Switch Off']

  it('uses only Telecaller owners and preserves unique customer identities', () => {
    expect(state.leads.every(lead => ['usr-priya', 'usr-arjun'].includes(lead.ownerId))).toBe(true)
    expect(new Set(state.leads.map(lead => lead.customerId)).size).toBe(state.leads.length)
    expect(state.customers).toHaveLength(state.leads.length)
  })

  it('aligns every lead bucket with its disposition and call history', () => {
    for (const lead of state.leads) {
      if (lead.stage === 'New') {
        expect(lead.lastDisposition).toBeUndefined()
        expect(lead.contacts).toHaveLength(0)
      } else {
        expect(lead.contacts.length).toBeGreaterThan(0)
        expect(lead.contacts[0].disposition).toBe(lead.lastDisposition)
      }
      if (lead.stage === 'Attempted') expect(followUpDispositions).toContain(lead.lastDisposition)
      if (lead.stage === 'Qualification' || lead.stage === 'Qualified') expect(lead.lastDisposition).toBe('Interested')
      if (lead.stage === 'Lost') expect(lead.lastDisposition).toBe('Not Interested')
    }
  })

  it('links every follow-up disposition to exactly one open next-call task', () => {
    for (const lead of state.leads.filter(item => followUpDispositions.includes(item.lastDisposition ?? ''))) {
      const open = state.followUps.filter(item => item.journeyId === lead.journeyId && item.status === 'Open')
      expect(open).toHaveLength(1)
      expect(lead.contacts[0].followUpId).toBe(open[0].id)
      expect(open[0].dueAt).toBe(lead.nextActionAt)
    }
  })

  it('keeps Interested and Sales records aligned with qualification and meeting rules', () => {
    const meetingSlots = new Set<string>()
    for (const lead of state.leads.filter(item => item.stage === 'Qualified')) {
      expect(qualificationMissing(lead.qualification)).toEqual([])
      expect(lead.qualification.salesMeetingDate).toBeTruthy()
      expect(lead.qualification.salesMeetingTime).toBeTruthy()
      expect(lead.handoffReference).toBe(lead.journeyId.replace('KX-', 'KX-SH-'))
      meetingSlots.add(`${lead.qualification.salesMeetingDate} ${lead.qualification.salesMeetingTime}`)
    }
    const scheduledMeetings = state.leads.filter(lead => lead.qualification.salesMeetingDate)
    expect(meetingSlots.size).toBe(state.leads.filter(lead => lead.stage === 'Qualified').length)
    expect(new Set(scheduledMeetings.map(lead => `${lead.qualification.salesMeetingDate} ${lead.qualification.salesMeetingTime}`)).size).toBe(scheduledMeetings.length)
  })

  it('routes land-dependent Sales handoffs to both Land Sourcing and the land queue', () => {
    const sent = state.leads.filter(lead => lead.stage === 'Qualified')
    expect(sent.some(lead => lead.salesQueue === 'New Lead for Land Sourcing')).toBe(true)
    for (const lead of sent) {
      const needsLand = lead.qualification.landStatus === 'Need to Source Land'
      expect(lead.salesQueue).toBe(needsLand ? 'New Lead for Land Sourcing' : 'New Leads')
      if (needsLand) expect(lead.landSourcingHandoff?.reference).toBe(lead.journeyId.replace('KX-', 'KX-LS-'))
      else expect(lead.landSourcingHandoff).toBeUndefined()
    }
    for (const lead of state.leads.filter(item => item.stage !== 'Qualified')) expect(lead.landSourcingHandoff).toBeUndefined()
  })

  it('sends the journeys the Land Sourcing demo works on, with matching statuses', () => {
    const handedOff = state.leads.filter(lead => lead.landSourcingHandoff)
    expect(handedOff.map(lead => lead.journeyId).sort()).toEqual([
      'KX-2026-000244', 'KX-2026-000248', 'KX-2026-000250', 'KX-2026-000256', 'KX-2026-000257',
      'KX-2026-000260', 'KX-2026-000264', 'KX-2026-000266', 'KX-2026-000272', 'KX-2026-000278',
    ])
    expect(handedOff.filter(lead => lead.landSourcingHandoff?.status === 'Land Identified').map(lead => lead.journeyId).sort())
      .toEqual(['KX-2026-000257', 'KX-2026-000260', 'KX-2026-000266'])
    expect(state.leads.find(lead => lead.journeyId === 'KX-2026-000269')).toMatchObject({ stage: 'Qualification', landStatus: 'Need to Source Land' })
  })

  it('starts every called journey with its call notes in the feedback thread', () => {
    for (const lead of state.leads) {
      expect(lead.feedback.length).toBeGreaterThanOrEqual(lead.contacts.length)
      for (const contact of lead.contacts) expect(lead.feedback).toContainEqual(expect.objectContaining({ contactId: contact.id, text: contact.notes, disposition: contact.disposition }))
      const times = lead.feedback.map(item => item.createdAt)
      expect([...times].sort()).toEqual(times)
    }
  })

  it('shows journeys Sales sent back in the Sales Rejected bucket, read-only', async () => {
    // Anita Rawat is sent back before her meeting in the Sales demo too.
    const rejected = state.leads.filter(lead => lead.stage === 'Sales Rejected')
    expect(rejected.map(lead => lead.journeyId)).toEqual(['KX-2026-000233'])
    const [anita] = rejected
    expect(anita).toMatchObject({ name: 'Anita Rawat', phone: '+91 9876500233', handoffReference: 'KX-SH-2026-000233', salesQueue: 'New Leads' })
    expect(anita.salesRejection).toMatchObject({ by: 'Tanvi Arora', attempts: 0 })
    expect(anita.feedback.at(-1)).toMatchObject({ team: 'Sales', text: anita.salesRejection!.reason })
    await expect(crmService.logContactAttempt('KX-2026-000233', { direction: 'Outbound', duration: 60, disposition: 'Interested', notes: 'Trying again', employee: 'Priya Singh' })).rejects.toThrow('Sales sent this journey back')
  })

  it('keeps Dead Leads closed with a Not Interested reason', () => {
    for (const lead of state.leads.filter(item => item.stage === 'Lost')) {
      expect(lead.lostReason).toBe('Not Interested')
      expect(lead.nextAction).toBe('Dead lead')
      expect(lead.nextActionAt).toBeUndefined()
      expect(state.followUps.some(item => item.journeyId === lead.journeyId && item.status === 'Open')).toBe(false)
    }
  })

  it('uses valid duplicate evidence and synchronized requirement summaries', () => {
    for (const lead of state.leads) {
      if (lead.duplicateOf) {
        const original = state.leads.find(item => item.journeyId === lead.duplicateOf)
        expect(original).toBeDefined()
        expect(normalizeEmail(lead.email) === normalizeEmail(original!.email) || normalizePhone(lead.phone) === normalizePhone(original!.phone)).toBe(true)
      }
      if (lead.qualification.landStatus) expect(lead.landStatus).toBe(lead.qualification.landStatus)
      if (lead.qualification.budget) expect(lead.budget).toBe(lead.qualification.budget)
      if (lead.qualification.timeline) expect(lead.timeline).toBe(lead.qualification.timeline)
    }
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

  it('keeps unanswered budget, timeline, and land status empty when saved state is reloaded', async () => {
    await crmService.getSnapshot()
    const reloaded = (await crmService.getSnapshot()).leads.find(item => item.journeyId === 'KX-2026-000254')!
    expect(reloaded.qualification).toMatchObject({ budget: '', timeline: '', landStatus: '' })
  })

  it('saves qualification checklist items without completing the form', async () => {
    await crmService.updateQualificationChecklist('KX-2026-000241', 'verifiedContact', false)
    const lead = await crmService.getJourney('KX-2026-000241')
    expect(lead?.qualification.verifiedContact).toBe(false)
    expect(lead?.qualification.propertyType).toBe('Individual House (1 Floor / Villa)')
  })

  it('allows only Team Leads and CRM Managers to create leads', async () => {
    const executive = await crmService.login('priya.singh@kennix.in', PREVIEW_PASSWORD)
    await expect(crmService.createLead({
      name: 'Aman Khanna', email: 'aman.khanna@example.in', phone: '9876500000', city: 'Mohali', type: 'Individual', source: 'Phone', requirement: '3 BHK home', budget: '₹90 lakh', timeline: 'Within 3 months', landStatus: 'Own land', priority: 'Medium',
    }, executive!)).rejects.toThrow('Only a Team Lead or CRM Manager can create leads')
  })

  it('requires and creates the next call for follow-up dispositions', async () => {
    await expect(crmService.logContactAttempt('KX-2026-000241', {
      direction: 'Outbound', duration: 20, disposition: 'RNR', notes: 'Customer did not answer the call.', employee: 'Priya Singh',
    })).rejects.toThrow('Next call date and time')

    await crmService.logContactAttempt('KX-2026-000241', {
      direction: 'Outbound', duration: 20, disposition: 'Switch Off', notes: 'Customer phone was switched off.', employee: 'Priya Singh', followUpAt: '2026-11-09T10:30',
    })
    const snapshot = await crmService.getSnapshot()
    const lead = snapshot.leads.find(item => item.journeyId === 'KX-2026-000241')
    expect(lead).toMatchObject({ stage: 'Attempted', lastDisposition: 'Switch Off', nextActionAt: '2026-11-09T10:30' })
    expect(snapshot.followUps).toContainEqual(expect.objectContaining({ journeyId: 'KX-2026-000241', dueAt: '2026-11-09T10:30', status: 'Open' }))
  })

  it('routes Interested and Not Interested dispositions into their buckets', async () => {
    await crmService.logContactAttempt('KX-2026-000241', {
      direction: 'Outbound', duration: 180, disposition: 'Interested', notes: 'Customer shared the initial property requirement.', employee: 'Priya Singh',
    })
    expect(await crmService.getJourney('KX-2026-000241')).toMatchObject({
      stage: 'Qualification',
      lastDisposition: 'Interested',
      qualification: { verifiedContact: true, interestConfirmed: true },
    })

    await crmService.logContactAttempt('KX-2026-000243', {
      direction: 'Outbound', duration: 45, disposition: 'Not Interested', notes: 'Customer confirmed they do not want to proceed.', employee: 'Priya Singh',
    })
    expect(await crmService.getJourney('KX-2026-000243')).toMatchObject({ stage: 'Lost', lastDisposition: 'Not Interested', nextAction: 'Dead lead' })
  })

  it('requires a fixed Sales meeting before handoff', async () => {
    const lead = await crmService.getJourney('KX-2026-000241')
    await crmService.saveQualification('KX-2026-000241', {
      ...lead!.qualification,
      salesMeetingDate: '',
      salesMeetingTime: '',
    })
    await expect(crmService.changeStage('KX-2026-000241', 'qualify')).rejects.toThrow('Sales meeting date and time')
  })

  it('builds team references from the full journey ID so years never collide', () => {
    expect(teamReference('LS', 'KX-2026-000241')).toBe('KX-LS-2026-000241')
    expect(teamReference('SH', 'KX-2027-000241')).toBe('KX-SH-2027-000241')
    expect(teamReference('LS', 'KX-2026-000241')).not.toBe(teamReference('LS', 'KX-2027-000241'))
  })

  it('records a visible Sales handoff while retaining the Journey ID', async () => {
    await crmService.changeStage('KX-2026-000241', 'qualify')
    const lead = await crmService.getJourney('KX-2026-000241')
    expect(lead?.stage).toBe('Qualified')
    expect(lead?.handoffReference).toBe('KX-SH-2026-000241')
    expect(lead?.activities[0].type).toBe('Sales handoff')
  })

  it('sends own-land journeys to the Sales New Leads queue only', async () => {
    await crmService.changeStage('KX-2026-000241', 'qualify')
    const lead = await crmService.getJourney('KX-2026-000241')
    expect(lead?.salesQueue).toBe('New Leads')
    expect(lead?.landSourcingHandoff).toBeUndefined()
  })

  it('sends land-dependent journeys to Land Sourcing and Sales together', async () => {
    const lead = await crmService.getJourney('KX-2026-000241')
    await crmService.saveQualification('KX-2026-000241', {
      ...lead!.qualification,
      landStatus: 'Need to Source Land',
    })
    await crmService.changeStage('KX-2026-000241', 'qualify')
    const sent = await crmService.getJourney('KX-2026-000241')
    expect(sent).toMatchObject({ stage: 'Qualified', handoffReference: 'KX-SH-2026-000241', salesQueue: 'New Lead for Land Sourcing' })
    expect(sent?.landSourcingHandoff).toMatchObject({
      reference: 'KX-LS-2026-000241',
      status: 'Submitted',
      customerName: 'Rahul Sharma',
      maskedMobile: '+91 98XXX XX210',
      locations: [{ name: 'Mohali', pincode: '160055' }],
      propertyType: 'Individual House (1 Floor / Villa)',
      city: 'Mohali',
      state: 'Punjab',
    })
    // Never the full phone number.
    expect(JSON.stringify(sent?.landSourcingHandoff)).not.toContain('43210')
    expect(sent?.activities.slice(0, 2).map(item => item.type)).toEqual(['Sales handoff', 'Land Sourcing handoff'])

    await crmService.markLandIdentified('KX-2026-000241')
    const identified = await crmService.getJourney('KX-2026-000241')
    expect(identified).toMatchObject({ stage: 'Qualified', salesQueue: 'New Lead for Land Sourcing', landSourcingHandoff: { status: 'Land Identified' } })
  })

  it('still requires the Sales meeting for land-dependent journeys', async () => {
    const lead = await crmService.getJourney('KX-2026-000241')
    await crmService.saveQualification('KX-2026-000241', { ...lead!.qualification, landStatus: 'Need to Source Land', salesMeetingDate: '' })
    await expect(crmService.changeStage('KX-2026-000241', 'qualify')).rejects.toThrow('Sales meeting date and time')
    expect((await crmService.getJourney('KX-2026-000241'))?.landSourcingHandoff).toBeUndefined()
  })

  it('captures call notes in the feedback thread with the disposition and time', async () => {
    const before = (await crmService.getJourney('KX-2026-000242'))!.feedback.length
    await crmService.logContactAttempt('KX-2026-000242', {
      direction: 'Outbound', duration: 30, disposition: 'Call Back Later', notes: 'Customer is travelling; call back on Monday.', employee: 'Arjun Nair', followUpAt: '2026-11-10T11:00',
    })
    const lead = await crmService.getJourney('KX-2026-000242')
    expect(lead!.feedback).toHaveLength(before + 1)
    const entry = lead!.feedback.at(-1)!
    expect(entry).toMatchObject({ text: 'Customer is travelling; call back on Monday.', author: 'Arjun Nair', team: 'Telesales', disposition: 'Call Back Later', contactId: lead!.contacts[0].id })
    expect(Number.isNaN(Date.parse(entry.createdAt))).toBe(false)
  })

  it('appends comments to the feedback thread in the order they are added', async () => {
    await crmService.addFeedback('KX-2026-000241', 'First comment after the call.', 'Priya Singh')
    await crmService.addFeedback('KX-2026-000241', 'Second comment: customer prefers evening calls.', 'Priya Singh')
    const thread = (await crmService.getJourney('KX-2026-000241'))!.feedback
    expect(thread.slice(-2).map(item => item.text)).toEqual(['First comment after the call.', 'Second comment: customer prefers evening calls.'])
    expect(thread.slice(-1)[0]).toMatchObject({ author: 'Priya Singh', team: 'Telesales' })
    expect(thread.slice(-2)[0].createdAt <= thread.slice(-1)[0].createdAt).toBe(true)
    await expect(crmService.addFeedback('KX-2026-000241', '  ', 'Priya Singh')).rejects.toThrow('Enter the call feedback')
  })

  it('keeps the feedback thread read-only once the journey is with Sales', async () => {
    await crmService.changeStage('KX-2026-000241', 'qualify')
    await expect(crmService.addFeedback('KX-2026-000241', 'Late comment from Telesales', 'Priya Singh')).rejects.toThrow('read-only in Telesales')
  })

  it('keeps sent-to-Sales journeys visible but read-only in Telesales', async () => {
    await crmService.changeStage('KX-2026-000241', 'qualify')
    const lead = await crmService.getJourney('KX-2026-000241')
    expect(lead?.name).toBe('Rahul Sharma')
    expect(lead?.contacts.length).toBeGreaterThan(0)
    await expect(crmService.addNote('KX-2026-000241', 'Attempted edit after handoff', 'Priya Singh')).rejects.toThrow('read-only in Telesales')
  })
})
