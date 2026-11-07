export type Role = 'executive' | 'senior_executive' | 'team_lead' | 'crm_manager'
export type Stage = 'New' | 'Attempted' | 'Contacted' | 'Qualification' | 'Qualified' | 'Nurture' | 'Lost'
export type Priority = 'High' | 'Medium' | 'Low'
export type LeadType = 'Individual' | 'Group / Community'
export type Source = 'Website' | 'Phone' | 'Referral' | 'Campaign' | 'Walk-in' | 'Partner'
export type LeadDisposition = 'RNR' | 'Call Back Later' | 'Switch Off' | 'Interested' | 'Not Interested'
export type FollowUpStatus = 'Open' | 'Completed' | 'Rescheduled'
export type BudgetRange = 'Below ₹1 Cr' | '₹1–1.5 Cr' | '₹1.5–2 Cr' | '₹2–3 Cr' | '₹3–4 Cr' | '₹4 Cr+'
export type PropertySize = '1,000–1,500 sq ft' | '1,500–2,000 sq ft' | '2,000–2,500 sq ft' | '2,500–3,000 sq ft' | '3,000–3,500 sq ft' | '3,500+ sq ft'
export type RequirementTimeline = 'Immediate' | '1–3 months' | '3–6 months' | '6+ months'
export type PropertyType = 'Individual House (1 Floor / Villa)' | 'Standalone Apartment' | 'Commercial Building'
export type LandStatus = 'Own Land' | 'Need to Source Land'

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
  budget: BudgetRange | ''
  size: PropertySize | ''
  timeline: RequirementTimeline | ''
  propertyType: PropertyType | ''
  locations: RequirementLocation[]
  location?: string
  landStatus: LandStatus | ''
  source: Source | ''
  consent: boolean
  coordinator?: string
  approximateFamilies?: number
  sharedRequirement?: string
  combinedBudget?: string
  commonLocation?: string
  salesMeetingDate?: string
  salesMeetingTime?: string
}

export interface RequirementLocation {
  name: string
  pincode: string
}

export interface LandSourcingHandoff {
  reference: string
  status: 'Submitted' | 'Land Identified'
  submittedAt: string
  completedAt?: string
  customerName: string
  mobileNumber: string
  locations: RequirementLocation[]
  propertyType: PropertyType
}

export interface ContactAttempt {
  id: string
  direction: 'Inbound' | 'Outbound'
  date: string
  duration: number
  disposition: LeadDisposition
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
  lastDisposition?: LeadDisposition
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
  landSourcingHandoff?: LandSourcingHandoff
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
