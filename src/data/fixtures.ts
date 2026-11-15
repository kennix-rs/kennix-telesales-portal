import { maskMobile, stateFor, teamReference } from '../lib/utils'
import type { Activity, CrmState, FeedbackComment, FollowUp, LandSourcingHandoff, Lead, LeadDisposition, Priority, PropertyType, Source, User } from '../types'

export const previewUsers: User[] = [
  { id: 'usr-priya', name: 'Priya Singh', email: 'priya.singh@kennix.in', role: 'executive', title: 'Telesales Executive', team: 'North Growth', initials: 'PS', managerId: 'usr-kavya' },
  { id: 'usr-arjun', name: 'Arjun Nair', email: 'arjun.nair@kennix.in', role: 'senior_executive', title: 'Senior Telesales Executive', team: 'North Growth', initials: 'AN', managerId: 'usr-kavya' },
  { id: 'usr-kavya', name: 'Kavya Sethi', email: 'kavya.sethi@kennix.in', role: 'team_lead', title: 'Telesales Team Lead', team: 'North Growth', initials: 'KS', managerId: 'usr-ritesh' },
  { id: 'usr-ritesh', name: 'Ritesh Malhotra', email: 'ritesh.malhotra@kennix.in', role: 'crm_manager', title: 'CRM Manager', team: 'Customer Acquisition', initials: 'RM' },
]

type FixturePlan =
  | 'new'
  | 'followup-rnr'
  | 'followup-callback'
  | 'followup-switch-off'
  | 'interested-incomplete'
  | 'interested-ready'
  | 'interested-land-ready'
  | 'sales'
  | 'sales-land'
  | 'dead'

// The 'sales-land' journeys (plus index 16) are the ones the Land Sourcing portal's demo works on.
const plans: FixturePlan[] = [
  'interested-ready', 'new', 'followup-rnr', 'sales-land', 'sales',
  'dead', 'followup-callback', 'sales-land', 'new', 'sales-land',
  'sales', 'dead', 'followup-switch-off', 'interested-incomplete', 'new',
  'sales-land', 'sales', 'followup-rnr', 'dead', 'sales-land',
  'new', 'followup-callback', 'interested-ready', 'sales-land', 'dead',
  'sales-land', 'interested-incomplete', 'followup-switch-off', 'interested-land-ready', 'sales',
  'new', 'sales-land', 'followup-rnr', 'dead', 'interested-incomplete',
  'new', 'followup-callback', 'sales-land', 'new', 'followup-switch-off',
]

/** Land Sourcing has reported land for these journeys (they match the Land Sourcing demo). */
const landIdentifiedIndexes = new Set([16, 19, 25])

const people = [
  ['Rahul Sharma', 'Mohali'], ['Aditi Verma', 'New Chandigarh'], ['Vikram Mehta', 'Chandigarh'], ['Neha Kapoor', 'Zirakpur'],
  ['Sandeep Gill', 'Panchkula'], ['Ishita Bansal', 'Ludhiana'], ['Manpreet Kaur', 'Kharar'], ['Rohan Khanna', 'Delhi NCR'],
  ['Meera Iyer', 'Noida'], ['Amanpreet Singh', 'Gurugram'], ['Sneha Joshi', 'Mohali'], ['Harish Chawla', 'New Chandigarh'],
  ['Divya Arora', 'Chandigarh'], ['Nitin Bhatia', 'Zirakpur'], ['Simran Kaur', 'Panchkula'], ['Aditya Rao', 'Ludhiana'],
  ['Pooja Malhotra', 'Kharar'], ['Kunal Sood', 'Delhi NCR'], ['Ritu Sharma', 'Noida'], ['Deepak Yadav', 'Gurugram'],
  ['Rahul Sharma', 'Mohali'], ['Gurpreet Singh', 'New Chandigarh'], ['Nandini Arora', 'Chandigarh'], ['Varun Sehgal', 'Zirakpur'],
  ['Ananya Menon', 'Panchkula'], ['Rajiv Khurana', 'Ludhiana'], ['Shreya Tandon', 'Kharar'], ['Mohit Jain', 'Delhi NCR'],
  ['Preeti Saini', 'Noida'], ['Arnav Chopra', 'Gurugram'], ['Seema Reddy', 'Mohali'], ['Jayant Kumar', 'New Chandigarh'],
  ['Kirti Ahuja', 'Chandigarh'], ['Abhishek Dutta', 'Zirakpur'], ['Rashmi Oberoi', 'Panchkula'], ['Tarun Bedi', 'Ludhiana'],
  ['Sonia Paul', 'Kharar'], ['Lakshay Gupta', 'Delhi NCR'], ['Madhuri Nair', 'Noida'], ['Yash Malhotra', 'Gurugram'],
] as const

const locationPincodes: Record<string, string> = {
  Mohali: '160055', 'New Chandigarh': '140901', Chandigarh: '160017', Zirakpur: '140603', Panchkula: '134109',
  Ludhiana: '141001', Kharar: '140301', 'Delhi NCR': '110001', Noida: '201301', Gurugram: '122001',
}
const requirements: { summary: string; propertyType: PropertyType }[] = [
  { summary: '3 BHK independent family residence', propertyType: 'Individual House (1 Floor / Villa)' },
  { summary: '4 BHK villa with home office and garden', propertyType: 'Individual House (1 Floor / Villa)' },
  { summary: '3 BHK apartment in a low-rise development', propertyType: 'Standalone Apartment' },
  { summary: 'Retail showroom with two office floors', propertyType: 'Commercial Building' },
  { summary: '2 BHK accessible retirement residence', propertyType: 'Individual House (1 Floor / Villa)' },
  { summary: 'Premium duplex residence for a joint family', propertyType: 'Individual House (1 Floor / Villa)' },
]
const budgets = ['Below ₹1 Cr', '₹1–1.5 Cr', '₹1.5–2 Cr', '₹2–3 Cr', '₹3–4 Cr', '₹4 Cr+'] as const
const sizes = ['1,000–1,500 sq ft', '1,500–2,000 sq ft', '2,000–2,500 sq ft', '2,500–3,000 sq ft', '3,000–3,500 sq ft', '3,500+ sq ft'] as const
const timelines = ['Immediate', '1–3 months', '3–6 months', '6+ months'] as const
const sources: Source[] = ['Website', 'Phone', 'Referral', 'Campaign', 'Walk-in', 'Partner']
const priorities: Priority[] = ['High', 'Medium', 'Low']
const groupIndexes = new Set([9, 19, 28, 34])
const ownerIds = ['usr-priya', 'usr-arjun'] as const

function dateAt(dayOffset: number, hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 9, 18 + dayOffset, hour, minute) - 330 * 60 * 1000).toISOString()
}

function localDate(dayOffset: number) {
  return new Date(Date.UTC(2026, 9, 18 + dayOffset)).toISOString().slice(0, 10)
}

function activity(id: string, type: string, description: string, actor: string, createdAt: string): Activity {
  return { id, type, description, actor, createdAt }
}

function dispositionFor(plan: FixturePlan): LeadDisposition | undefined {
  if (plan === 'followup-rnr') return 'RNR'
  if (plan === 'followup-callback') return 'Call Back Later'
  if (plan === 'followup-switch-off') return 'Switch Off'
  if (plan === 'dead') return 'Not Interested'
  if (plan.startsWith('interested') || plan.startsWith('sales')) return 'Interested'
  return undefined
}

function isQualificationComplete(plan: FixturePlan) {
  return ['interested-ready', 'interested-land-ready', 'sales', 'sales-land'].includes(plan)
}

function isLandSourcingPlan(plan: FixturePlan, index: number) {
  return plan === 'sales-land' || plan === 'interested-land-ready' || (plan === 'sales' && index === 16)
}

function makeLead(index: number): Lead {
  const plan = plans[index]
  const serial = 241 + index
  const journeyId = `KX-2026-${String(serial).padStart(6, '0')}`
  const [name, city] = people[index]
  const ownerId = ownerIds[index % ownerIds.length]
  const owner = ownerId === 'usr-priya' ? 'Priya Singh' : 'Arjun Nair'
  const source = sources[index % sources.length]
  const priority = priorities[(index + 1) % priorities.length]
  const requirement = requirements[index % requirements.length]
  const type = groupIndexes.has(index) ? 'Group / Community' as const : 'Individual' as const
  const createdAt = dateAt(index % 18, 9 + (index % 7), index % 2 ? 15 : 40)
  const contactAt = dateAt((index % 18) + 1, 10 + (index % 6), index % 2 ? 20 : 5)
  const disposition = dispositionFor(plan)
  const complete = isQualificationComplete(plan)
  const needsLand = isLandSourcingPlan(plan, index)
  const duplicate = index === 20
  const email = index === 0 || duplicate ? 'rahul.sharma@gmail.com' : `${name.toLowerCase().replace(/\s+/g, '.')}.${serial}@example.com`
  const phone = index === 0 || duplicate ? '+91 98765 43210' : `+91 98${String(10000000 + index * 17391).slice(-8)}`
  const customerId = `CUS-${String(1081 + index).padStart(5, '0')}`
  const followUpId = `FU-${String(serial).padStart(6, '0')}-1`
  const nextDueAt = dateAt(20 + (index % 7), 9 + (index % 8), index % 2 ? 30 : 0)
  const meetingOrdinal = plans.slice(0, index + 1).filter(item => item === 'interested-ready' || item === 'interested-land-ready' || item === 'sales' || item === 'sales-land').length - 1
  const salesMeetingDate = complete ? localDate(22 + meetingOrdinal) : ''
  const salesMeetingTime = complete ? `${String(10 + (meetingOrdinal % 7)).padStart(2, '0')}:${meetingOrdinal % 2 ? '30' : '00'}` : ''
  const stage = plan === 'new' ? 'New' as const : plan.startsWith('followup') ? 'Attempted' as const : plan === 'sales' || plan === 'sales-land' ? 'Qualified' as const : plan === 'dead' ? 'Lost' as const : 'Qualification' as const
  const landStatus = needsLand ? 'Need to Source Land' as const : 'Own Land' as const
  const followUpTitle = disposition === 'RNR' ? 'Retry RNR lead' : disposition === 'Switch Off' ? 'Retry switched-off number' : 'Customer callback'
  const nextAction = plan === 'new' ? 'Make first contact'
    : plan.startsWith('followup') ? followUpTitle
      : plan === 'interested-incomplete' ? 'Complete customer requirements'
        : plan === 'interested-land-ready' ? 'Send to Land Sourcing and Sales'
          : plan === 'interested-ready' ? 'Review and move to Sales Team'
            : plan === 'sales' || plan === 'sales-land' ? 'Sales handoff completed'
                : 'Dead lead'

  const qualification = {
    verifiedContact: disposition === 'Interested',
    interestConfirmed: disposition === 'Interested',
    customerType: type,
    propertyRequirement: complete || plan === 'interested-incomplete' ? requirement.summary : '',
    propertyType: complete ? requirement.propertyType : '' as const,
    budget: complete ? budgets[index % budgets.length] : '' as const,
    size: complete ? sizes[index % sizes.length] : '' as const,
    timeline: complete ? timelines[index % timelines.length] : '' as const,
    locations: complete ? [{ name: city, pincode: locationPincodes[city] }] : [],
    landStatus: complete ? landStatus : '' as const,
    source,
    consent: disposition === 'Interested',
    salesMeetingDate,
    salesMeetingTime,
    ...(type === 'Group / Community' && complete ? {
      coordinator: name,
      approximateFamilies: 12 + index,
      sharedRequirement: 'Coordinated low-rise homes with shared green space and common services',
      combinedBudget: `₹${9 + (index % 4)}–${12 + (index % 4)} crore`,
      commonLocation: city,
    } : {}),
  }

  const contactNotes = disposition === 'RNR' ? 'The call rang without an answer. A retry time was scheduled.'
    : disposition === 'Call Back Later' ? 'Customer was occupied and requested a call at the committed time.'
      : disposition === 'Switch Off' ? 'The number was switched off. A retry time was scheduled.'
        : disposition === 'Interested' ? `Customer confirmed interest in a ${requirement.summary.toLowerCase()} and shared initial requirements.`
          : 'Customer clearly confirmed they are not interested and requested no further sales calls.'
  const contacts = disposition ? [{
    id: `CA-${serial}-1`,
    direction: 'Outbound' as const,
    date: contactAt,
    duration: disposition === 'RNR' || disposition === 'Switch Off' ? 0 : disposition === 'Call Back Later' ? 45 : 240 + index * 5,
    disposition,
    notes: contactNotes,
    employee: owner,
    ...(plan.startsWith('followup') ? { followUpId } : {}),
  }] : []

  const feedback: FeedbackComment[] = contacts.map(contact => ({
    id: `FB-${serial}-1`, text: contact.notes, author: owner, team: 'Telesales', createdAt: contact.date, disposition: contact.disposition, contactId: contact.id,
  }))
  if (complete) feedback.push({
    id: `FB-${serial}-2`,
    text: needsLand
      ? `Customer needs land in ${city} before construction. Shared budget and size; asked for plot options near the preferred pincode.`
      : `Customer owns land in ${city}. Requirement, budget, and timeline confirmed; customer agreed to the Sales meeting.`,
    author: owner, team: 'Telesales', createdAt: dateAt((index % 18) + 2, 13, 10),
  })

  let landSourcingHandoff: LandSourcingHandoff | undefined
  const sentToSales = plan === 'sales' || plan === 'sales-land'
  if (sentToSales && needsLand) {
    const identified = landIdentifiedIndexes.has(index)
    landSourcingHandoff = {
      reference: teamReference('LS', journeyId),
      status: identified ? 'Land Identified' : 'Submitted',
      submittedAt: dateAt((index % 18) + 6, 16),
      ...(identified ? { completedAt: dateAt((index % 18) + 9, 15) } : {}),
      customerName: name,
      maskedMobile: maskMobile(phone),
      locations: qualification.locations,
      propertyType: requirement.propertyType,
      size: qualification.size as LandSourcingHandoff['size'],
      budget: qualification.budget as LandSourcingHandoff['budget'],
      city,
      state: stateFor(city),
    }
  }

  const activities: Activity[] = [
    activity(`A-${serial}-2`, 'Assignment', `Assigned to ${owner} through North Growth round-robin.`, 'System', createdAt),
    activity(`A-${serial}-1`, 'Lead created', `${source} enquiry captured and ${journeyId} created.`, 'System', createdAt),
  ]
  if (disposition) activities.unshift(activity(`A-${serial}-3`, 'Call disposition', `${disposition} recorded after the outbound call.`, owner, contactAt))
  if (disposition === 'Interested') activities.unshift(activity(`A-${serial}-4`, 'Interested lead', 'Customer moved to Interested Leads for structured requirement capture.', owner, contactAt))
  if (complete) activities.unshift(activity(`A-${serial}-5`, 'Qualification updated', 'Required customer and property details were captured.', owner, dateAt((index % 18) + 2, 14)))
  if (landSourcingHandoff) activities.unshift(activity(`A-${serial}-6`, 'Land Sourcing handoff', `${landSourcingHandoff.reference} submitted to Land Sourcing.`, owner, landSourcingHandoff.submittedAt))
  if (landSourcingHandoff?.status === 'Land Identified') activities.unshift(activity(`A-${serial}-7`, 'Land identified', 'Land Sourcing identified land and updated the Sales team.', 'Land Sourcing', landSourcingHandoff.completedAt!))
  if (sentToSales) activities.unshift(activity(`A-${serial}-8`, 'Sales handoff', `${journeyId} moved to Sales under ${needsLand ? 'New Lead for Land Sourcing' : 'New Leads'} with meeting ${salesMeetingDate} at ${salesMeetingTime}.`, owner, dateAt((index % 18) + 6, 16)))
  if (plan === 'dead') activities.unshift(activity(`A-${serial}-4`, 'Dead Lead', 'Journey closed after the customer selected Not Interested.', owner, contactAt))

  return {
    journeyId,
    customerId,
    name,
    email,
    phone,
    city,
    type,
    stage,
    priority,
    source,
    ownerId,
    createdAt,
    requirement: qualification.propertyRequirement || requirement.summary,
    budget: qualification.budget || 'Not captured',
    timeline: qualification.timeline || 'Not captured',
    landStatus: qualification.landStatus || 'Not captured',
    nextAction,
    nextActionAt: plan === 'new' || plan.startsWith('followup') || plan === 'interested-incomplete' ? nextDueAt : undefined,
    lastDisposition: disposition,
    ...(duplicate ? { duplicateOf: 'KX-2026-000241', duplicateStatus: 'Pending review' as const } : {}),
    qualification,
    contacts,
    feedback,
    notes: disposition ? [{
      id: `N-${serial}-1`,
      text: disposition === 'Interested' ? 'Keep the requirement summary and meeting commitment current before Sales transfer.' : contactNotes,
      author: owner,
      createdAt: dateAt((index % 18) + 1, 16),
      pinned: disposition === 'Interested' && priority === 'High',
    }] : [],
    documents: complete && index % 3 === 0 ? [{
      id: `DOC-${serial}-1`,
      name: needsLand ? 'Preferred land area brief.pdf' : 'Initial property requirement.pdf',
      category: needsLand ? 'Land reference' : 'Requirement reference',
      uploadedAt: dateAt((index % 18) + 2, 15),
      visibility: 'Internal',
      status: 'Reviewed',
    }] : [],
    activities,
    ...(plan === 'dead' ? { lostReason: 'Not Interested' } : {}),
    ...(sentToSales ? { handoffReference: teamReference('SH', journeyId), salesQueue: needsLand ? 'New Lead for Land Sourcing' as const : 'New Leads' as const } : {}),
    ...(landSourcingHandoff ? { landSourcingHandoff } : {}),
  }
}

function createFollowUp(lead: Lead, index: number): FollowUp | null {
  if (!lead.nextActionAt || lead.stage === 'Qualified' || lead.stage === 'Lost' || lead.landSourcingHandoff?.status === 'Submitted') return null
  const disposition = lead.lastDisposition
  const type = lead.stage === 'Qualification' ? 'Consultation' as const : 'Call' as const
  return {
    id: lead.contacts[0]?.followUpId ?? `FU-${lead.journeyId.slice(-6)}-1`,
    journeyId: lead.journeyId,
    title: lead.nextAction,
    type,
    dueAt: lead.nextActionAt,
    priority: lead.priority,
    status: 'Open',
    ownerId: lead.ownerId,
    reminderChannels: ['In-app', ...(index % 4 === 0 ? ['Email'] : [])],
    history: disposition ? [`Created from ${disposition} disposition`] : ['Created with lead assignment'],
  }
}

/**
 * Anita Rawat (KX-2026-000233): sent to Sales in October and sent back before her meeting, as in the
 * Sales demo ("Sales Rejected"). Built from an own-land "sent to Sales" story, moved to her details and
 * to October, with its own record IDs.
 */
function makeSalesRejectedLead(): Lead {
  const base = makeLead(4)
  const shift = new Date('2026-10-20T10:00:00+05:30').getTime() - new Date(base.createdAt).getTime()
  const move = (value: string) => new Date(new Date(value).getTime() + shift).toISOString()
  const swap = (text: string) => text.replaceAll(base.name, 'Anita Rawat').replaceAll(base.city, 'Zirakpur').replaceAll(base.journeyId, 'KX-2026-000233')
  const renumber = <T extends { id: string }>(items: T[]) => items.map((item, index) => ({ ...item, id: `SR-${item.id.split('-')[0]}-${index + 1}` }))
  const rejectedAt = '2026-10-27T12:30:00.000Z'
  const reason = 'Bought a ready-built house elsewhere before the meeting; not interested any more.'
  return {
    ...base,
    journeyId: 'KX-2026-000233', customerId: 'CUS-01073', name: 'Anita Rawat', email: 'anita.rawat@example.com', phone: '+91 9876500233', city: 'Zirakpur',
    createdAt: move(base.createdAt), stage: 'Sales Rejected', budget: '₹1–1.5 Cr', timeline: '1–3 months',
    requirement: '1,500–2,000 sq ft independent house on own plot', nextAction: 'Returned by Sales', nextActionAt: undefined,
    handoffReference: 'KX-SH-2026-000233', salesQueue: 'New Leads', landSourcingHandoff: undefined, duplicateOf: undefined, duplicateStatus: undefined,
    qualification: {
      ...base.qualification, budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '1–3 months',
      locations: [{ name: 'Zirakpur', pincode: '140603' }], location: 'Zirakpur', salesMeetingDate: '2026-10-28', salesMeetingTime: '12:00',
    },
    contacts: base.contacts.map(item => ({ ...item, id: `SR-${item.id}`, date: move(item.date), notes: swap(item.notes), followUpId: undefined })),
    feedback: [
      ...renumber(base.feedback.map(item => ({ ...item, createdAt: move(item.createdAt), text: swap(item.text), contactId: item.contactId ? `SR-${item.contactId}` : undefined }))),
      { id: 'SR-FB-sales', text: reason, author: 'Tanvi Arora', team: 'Sales', createdAt: rejectedAt },
    ],
    notes: renumber(base.notes.map(item => ({ ...item, createdAt: move(item.createdAt), text: swap(item.text) }))),
    documents: renumber(base.documents.map(item => ({ ...item, uploadedAt: move(item.uploadedAt) }))),
    activities: [
      { id: 'SR-A-sales', type: 'Sales rejected', description: `Sales sent the journey back: ${reason}`, actor: 'Tanvi Arora', createdAt: rejectedAt },
      ...renumber(base.activities.map(item => ({ ...item, createdAt: move(item.createdAt), description: swap(item.description) }))),
    ],
    salesRejection: { at: rejectedAt, by: 'Tanvi Arora', reason, attempts: 0 },
  }
}

export function createInitialState(): CrmState {
  const leads = [...plans.map((_, index) => makeLead(index)), makeSalesRejectedLead()]
  const followUps = leads.map(createFollowUp).filter((item): item is FollowUp => Boolean(item))
  const customers = leads.map(lead => ({
    id: lead.customerId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    consent: lead.qualification.consent,
    journeyIds: [lead.journeyId],
    since: lead.createdAt,
  }))
  return { leads, followUps, customers, assignmentCursor: 0 }
}
