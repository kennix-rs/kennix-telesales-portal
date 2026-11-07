import type { Activity, CrmState, Lead, Priority, Source, Stage, User } from '../types'

export const previewUsers: User[] = [
  { id: 'usr-priya', name: 'Priya Singh', email: 'priya.singh@kennix.in', role: 'executive', title: 'Telesales Executive', team: 'North Growth', initials: 'PS', managerId: 'usr-kavya' },
  { id: 'usr-arjun', name: 'Arjun Nair', email: 'arjun.nair@kennix.in', role: 'senior_executive', title: 'Senior Telesales Executive', team: 'North Growth', initials: 'AN', managerId: 'usr-kavya' },
  { id: 'usr-kavya', name: 'Kavya Sethi', email: 'kavya.sethi@kennix.in', role: 'team_lead', title: 'Telesales Team Lead', team: 'North Growth', initials: 'KS', managerId: 'usr-ritesh' },
  { id: 'usr-ritesh', name: 'Ritesh Malhotra', email: 'ritesh.malhotra@kennix.in', role: 'crm_manager', title: 'CRM Manager', team: 'Customer Acquisition', initials: 'RM' },
]

const names = ['Rahul Sharma','Aditi Verma','Vikram Mehta','Neha Kapoor','Sandeep Gill','Ishita Bansal','Manpreet Kaur','Rohan Khanna','Meera Iyer','Amanpreet Singh','Sneha Joshi','Harish Chawla','Divya Arora','Nitin Bhatia','Simran Kaur','Aditya Rao','Pooja Malhotra','Kunal Sood','Ritu Sharma','Deepak Yadav','Tanya Goel','Gurpreet Singh','Nandini Arora','Varun Sehgal','Ananya Menon','Rajiv Khurana','Shreya Tandon','Mohit Jain','Preeti Saini','Arnav Chopra','Seema Reddy','Jayant Kumar','Kirti Ahuja','Abhishek Dutta','Rashmi Oberoi','Tarun Bedi','Sonia Paul','Lakshay Gupta','Madhuri Nair','Yash Malhotra']
const cities = ['Mohali','New Chandigarh','Chandigarh','Zirakpur','Panchkula','Ludhiana','Kharar','Delhi NCR','Noida','Gurugram']
const requirements = ['3 BHK independent residence','4 BHK premium villa','Duplex residence with home office','2 BHK retirement home','Farmhouse and weekend residence','Row housing community','Low-rise apartment cluster','3 BHK sustainable family home']
const budgets = ['Below ₹1 Cr','₹1–1.5 Cr','₹1.5–2 Cr','₹2–3 Cr','₹3–4 Cr','₹4 Cr+'] as const
const sizes = ['1,000–1,500 sq ft','1,500–2,000 sq ft','2,000–2,500 sq ft','2,500–3,000 sq ft','3,000–3,500 sq ft','3,500+ sq ft'] as const
const timelines = ['Immediate','1–3 months','3–6 months','6+ months'] as const
const propertyTypes = ['Individual House (1 Floor / Villa)','Standalone Apartment','Commercial Building'] as const
const pincodes = ['160055','140901','160017','140603','134109','141001','140301','110001','201301','122001']
const stages: Stage[] = ['New','Attempted','Contacted','Qualification','Qualified','Nurture','Lost']
const sources: Source[] = ['Website','Phone','Referral','Campaign','Walk-in','Partner']
const priorities: Priority[] = ['High','Medium','Low']
const owners = ['usr-priya','usr-arjun','usr-priya','usr-arjun','usr-kavya']

function activity(id: string, type: string, description: string, actor: string, createdAt: string): Activity {
  return { id, type, description, actor, createdAt }
}

function makeLead(index: number): Lead {
  const serial = 241 + index
  const name = names[index]
  const stage = stages[index % stages.length]
  const source = sources[index % sources.length]
  const type = index % 8 === 5 || index % 11 === 7 ? 'Group / Community' as const : 'Individual' as const
  const createdDay = 10 + (index % 22)
  const createdAt = `2026-10-${String(createdDay).padStart(2, '0')}T${String(9 + (index % 7)).padStart(2, '0')}:15:00+05:30`
  const dueDay = index % 5 === 0 ? 30 : 2 + (index % 12)
  const dueMonth = index % 5 === 0 ? '10' : '11'
  const dueAt = `2026-${dueMonth}-${String(dueDay).padStart(2, '0')}T${String(9 + (index % 8)).padStart(2, '0')}:30:00+05:30`
  const complete = index % 3 === 0 || stage === 'Qualified'
  const lastDisposition = stage === 'New' ? undefined : stage === 'Attempted' ? (['RNR','Call Back Later','Switch Off'] as const)[index % 3] : stage === 'Lost' ? 'Not Interested' as const : 'Interested' as const
  const customerId = `CUS-${String(1081 + Math.floor(index / (index % 9 === 0 ? 2 : 1))).padStart(5, '0')}`
  const lead: Lead = {
    journeyId: `KX-2026-${String(serial).padStart(6, '0')}`,
    customerId,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@${index % 3 === 0 ? 'gmail.com' : index % 3 === 1 ? 'outlook.com' : 'yahoo.in'}`,
    phone: `+91 ${String(98100 + index * 13).slice(0,5)} ${String(22000 + index * 97).slice(0,5)}`,
    city: cities[index % cities.length],
    type,
    stage,
    priority: priorities[index % priorities.length],
    source,
    ownerId: owners[index % owners.length],
    createdAt,
    requirement: requirements[index % requirements.length],
    budget: budgets[index % budgets.length],
    timeline: timelines[index % timelines.length],
    landStatus: index % 4 === 1 ? 'Need to Source Land' : 'Own Land',
    nextAction: stage === 'Qualified' ? 'Sales handoff completed' : stage === 'Lost' ? 'Journey closed' : stage === 'Nurture' ? 'Monthly nurture check-in' : 'Call and confirm requirement',
    nextActionAt: stage === 'Lost' ? undefined : dueAt,
    lastDisposition,
    qualification: {
      verifiedContact: complete,
      interestConfirmed: complete,
      customerType: type,
      propertyRequirement: complete || index % 2 === 0 ? requirements[index % requirements.length] : '',
      budget: complete ? budgets[index % budgets.length] : index % 2 === 0 ? budgets[index % budgets.length] : '',
      size: complete ? sizes[index % sizes.length] : '',
      timeline: complete ? timelines[index % timelines.length] : '',
      propertyType: complete ? propertyTypes[index % propertyTypes.length] : '',
      locations: complete || index % 2 === 0 ? [{ name: cities[index % cities.length], pincode: pincodes[index % pincodes.length] }] : [],
      landStatus: complete ? (stage === 'Qualified' || index % 2 === 0 ? 'Own Land' : 'Need to Source Land') : '',
      source,
      consent: complete || index % 4 !== 1,
      salesMeetingDate: complete && lastDisposition === 'Interested' ? '2026-11-08' : '',
      salesMeetingTime: complete && lastDisposition === 'Interested' ? '11:30' : '',
      ...(type === 'Group / Community' ? {
        coordinator: complete ? name : '', approximateFamilies: complete ? 18 + index : undefined,
        sharedRequirement: complete ? 'Coordinated low-rise homes with shared green space' : '',
        combinedBudget: complete ? `₹${8 + (index % 6)}–${10 + (index % 6)} crore` : '', commonLocation: complete ? cities[index % cities.length] : '',
      } : {}),
    },
    contacts: stage !== 'New' && index % 2 === 0 ? [{ id: `CA-${serial}-1`, direction: 'Outbound', date: createdAt, duration: 180 + index * 7, disposition: lastDisposition!, notes: stage === 'Attempted' ? 'Customer could not be reached. A next call was scheduled.' : stage === 'Lost' ? 'Customer confirmed they are not interested.' : 'Introduced Kennix process and confirmed an initial requirement.', employee: owners[index % owners.length] === 'usr-priya' ? 'Priya Singh' : 'Arjun Nair' }] : [],
    notes: [{ id: `N-${serial}-1`, text: index % 4 === 0 ? 'Customer prefers a weekend consultation with decision-makers present.' : 'Confirm land documents and site access during the next conversation.', author: index % 2 ? 'Arjun Nair' : 'Priya Singh', createdAt, pinned: index % 6 === 0 }],
    documents: index % 4 === 0 ? [{ id: `DOC-${serial}-1`, name: 'Initial requirement brief.pdf', category: 'Requirement reference', uploadedAt: createdAt, visibility: 'Internal', status: 'Reviewed' }] : [],
    activities: [
      activity(`A-${serial}-1`, 'Lead created', `${source} lead captured and Journey ID assigned.`, 'System', createdAt),
      activity(`A-${serial}-2`, 'Assignment', `Assigned through North Growth round-robin.`, 'System', createdAt),
    ],
    ...(stage === 'Lost' ? { lostReason: ['Budget mismatch','Unable to establish contact','Project postponed'][index % 3] } : {}),
    ...(stage === 'Nurture' ? { nurtureReason: ['Planning land purchase','Timeline beyond six months','Awaiting family decision'][index % 3] } : {}),
    ...(stage === 'Qualified' ? { handoffReference: `KX-SH-${String(serial).padStart(6, '0')}` } : {}),
  }
  if (index === 0) {
    return {
      ...lead,
      journeyId: 'KX-2026-000241', customerId: 'CUS-01081', name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', phone: '+91 98765 43210', city: 'Mohali, New Chandigarh', type: 'Individual', stage: 'Qualification', priority: 'High', source: 'Website', ownerId: 'usr-priya', createdAt: '2026-10-18T09:42:00+05:30', requirement: '3 BHK independent residence', budget: '₹1–1.5 Cr', timeline: '1–3 months', landStatus: 'Own Land', nextAction: 'Review qualification and send to Sales', nextActionAt: '2026-10-22T10:30:00+05:30',
      lastDisposition: 'Interested',
      qualification: { verifiedContact: true, interestConfirmed: true, customerType: 'Individual', propertyRequirement: '3 BHK independent residence', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '2,000–2,500 sq ft', timeline: '1–3 months', locations: [{ name: 'Mohali', pincode: '160055' }, { name: 'New Chandigarh', pincode: '140901' }], landStatus: 'Own Land', source: 'Website', consent: true, salesMeetingDate: '2026-11-08', salesMeetingTime: '11:30' },
      contacts: [{ id: 'CA-241-1', direction: 'Outbound', date: '2026-10-19T11:05:00+05:30', duration: 412, disposition: 'Interested', notes: 'Rahul owns a plot near New Chandigarh. Asked for a transparent design-to-build process and indicative timelines.', employee: 'Priya Singh', followUpId: 'FU-241' }],
      notes: [{ id: 'N-241-1', text: 'Spouse will join the next consultation. Share the land-document checklist after the call.', author: 'Priya Singh', createdAt: '2026-10-19T11:15:00+05:30', pinned: true }],
      documents: [{ id: 'DOC-241-1', name: 'Mohali plot location.pdf', category: 'Land reference', uploadedAt: '2026-10-19T12:10:00+05:30', visibility: 'Internal', status: 'Review pending' }],
      activities: [activity('A-241-4','Qualification ready','Identity, genuine interest, and initial requirement confirmed.','Priya Singh','2026-10-19T11:14:00+05:30'), activity('A-241-3','Contacted','Requirements discussed during a 6m 52s outbound call.','Priya Singh','2026-10-19T11:05:00+05:30'), activity('A-241-2','Assignment','Assigned to Priya Singh through North Growth round-robin.','System','2026-10-18T09:42:00+05:30'), activity('A-241-1','Lead created','Website consultation form received and Journey ID assigned.','System','2026-10-18T09:42:00+05:30')],
    }
  }
  if (index === 1) lead.duplicateOf = 'KX-2026-000241'
  if (index === 1) lead.duplicateStatus = 'Pending review'
  if (index === 9) { lead.email = 'rahul.sharma@gmail.com'; lead.duplicateOf = 'KX-2026-000241'; lead.duplicateStatus = 'Pending review' }
  return lead
}

export function createInitialState(): CrmState {
  const leads = names.map((_, index) => makeLead(index))
  const followUps = leads.filter(lead => lead.nextActionAt && lead.stage !== 'Qualified' && lead.stage !== 'Lost').map((lead, index) => ({
    id: lead.journeyId === 'KX-2026-000241' ? 'FU-241' : `FU-${lead.journeyId.slice(-6)}-1`, journeyId: lead.journeyId,
    title: lead.stage === 'Nurture' ? 'Nurture check-in' : lead.nextAction,
    type: lead.stage === 'Nurture' ? 'Nurture check-in' as const : index % 4 === 0 ? 'Consultation' as const : 'Call' as const,
    dueAt: lead.nextActionAt!, priority: lead.priority, status: 'Open' as const, ownerId: lead.ownerId,
    reminderChannels: ['In-app', ...(index % 3 === 0 ? ['Email'] : [])], history: [],
  }))
  const customerMap = new Map<string, typeof leads>()
  leads.forEach(lead => customerMap.set(lead.customerId, [...(customerMap.get(lead.customerId) ?? []), lead]))
  const customers = [...customerMap.entries()].map(([id, journeys]) => ({
    id, name: journeys[0].name, email: journeys[0].email, phone: journeys[0].phone, city: journeys[0].city,
    consent: journeys.some(j => j.qualification.consent), journeyIds: journeys.map(j => j.journeyId), since: journeys.map(j => j.createdAt).sort()[0],
  }))
  return { leads, followUps, customers, assignmentCursor: 0 }
}
