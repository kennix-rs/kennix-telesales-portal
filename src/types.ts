export type Role = 'executive' | 'senior_executive' | 'team_lead' | 'crm_manager'
export type Stage = 'New' | 'Attempted' | 'Contacted' | 'Qualification' | 'Qualified' | 'Nurture' | 'Lost'
export type Priority = 'High' | 'Medium' | 'Low'
export type LeadType = 'Individual' | 'Group / Community'
export type Source = 'Website' | 'Phone' | 'Referral' | 'Campaign' | 'Walk-in' | 'Partner'
export type FollowUpStatus = 'Open' | 'Completed' | 'Rescheduled'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  team: string
  initials: string
  managerId?: string
}

export interface Qualification {
  verifiedContact: boolean
  interestConfirmed: boolean
  customerType: LeadType | ''
  propertyRequirement: string
  budget: string
  timeline: string
  location: string
  landStatus: string
  source: Source | ''
  consent: boolean
  coordinator?: string
  approximateFamilies?: number
  sharedRequirement?: string
  combinedBudget?: string
  commonLocation?: string
}

export interface ContactAttempt {
  id: string
  direction: 'Inbound' | 'Outbound'
  date: string
  duration: number
  disposition: string
  notes: string
  employee: string
  followUpId?: string
}

export interface FollowUp {
  id: string
  journeyId: string
  title: string
  type: 'Call' | 'Consultation' | 'Nurture check-in' | 'Document review'
  dueAt: string
  priority: Priority
  status: FollowUpStatus
  ownerId: string
  reminderChannels: string[]
  history: string[]
}

export interface Note {
  id: string
  text: string
  author: string
  createdAt: string
  pinned: boolean
}

export interface Activity {
  id: string
  type: string
  description: string
  actor: string
  createdAt: string
}

export interface DocumentRecord {
  id: string
  name: string
  category: string
  uploadedAt: string
  visibility: 'Internal' | 'Customer shared'
  status: string
}

export interface Lead {
  journeyId: string
  customerId: string
  name: string
  email: string
  phone: string
  city: string
  type: LeadType
  stage: Stage
  priority: Priority
  source: Source
  ownerId: string
  createdAt: string
  requirement: string
  budget: string
  timeline: string
  landStatus: string
  nextAction: string
  nextActionAt?: string
  duplicateOf?: string
  duplicateStatus?: 'Pending review' | 'Linked' | 'No duplicate'
  qualification: Qualification
  contacts: ContactAttempt[]
  notes: Note[]
  documents: DocumentRecord[]
  activities: Activity[]
  lostReason?: string
  nurtureReason?: string
  handoffReference?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  city: string
  consent: boolean
  journeyIds: string[]
  since: string
}

export interface CrmState {
  leads: Lead[]
  followUps: FollowUp[]
  customers: Customer[]
  assignmentCursor: number
}

export interface LeadFilters {
  search?: string
  stage?: Stage | 'All'
  source?: Source | 'All'
  ownerId?: string | 'All'
  type?: LeadType | 'All'
}
