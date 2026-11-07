# Kennix Telesales / CRM Portal

A standalone, production-style React mock for Kennix customer acquisition operations. The application uses typed local fixtures and browser `localStorage`; it has no backend, API, database, email, SMS, WhatsApp, or telephony integration.

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS 4
- React Router
- Radix UI dialogs, tabs, dropdowns, and toasts
- React Hook Form + Zod
- TanStack Table
- Recharts
- Lucide icons
- Vitest + Testing Library

## Setup

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. State mutations and the active login persist in browser `localStorage`. To restore initial fixture data, clear site storage in browser developer tools.

## Preview accounts

All preview accounts use password `Preview@123`.

| Name | Email | Role |
|---|---|---|
| Priya Singh | `priya.singh@kennix.in` | Telesales Executive |
| Arjun Nair | `arjun.nair@kennix.in` | Senior Telesales Executive |
| Kavya Sethi | `kavya.sethi@kennix.in` | Telesales Team Lead |
| Ritesh Malhotra | `ritesh.malhotra@kennix.in` | CRM Manager |

Executives see assigned journeys. Team Leads can access team workload, reassignment, and reports. CRM Managers also see local configuration controls. Restricted routes render an access-denied screen.

### Lead ownership policy

- Only a Telesales Team Lead or CRM Manager can add a lead.
- Every new lead is assigned automatically through round-robin.
- A lead has exactly one active Telesales owner.
- Reassignment replaces the owner and moves all open follow-ups to the new owner.
- Executives work only their assigned leads: record a mandatory call disposition, schedule required next calls, complete Interested lead details, fix the Sales meeting, and transfer sales-ready journeys.
- Telecaller buckets are New Leads, Follow-up Leads, Interested Leads, and Dead Leads.
- RNR, Call Back Later, and Switch Off require the next call date and time and route to Follow-up Leads.
- Interested routes to requirement capture; Not Interested routes to read-only Dead Leads.
- Telesales qualification confirms contact identity, genuine interest, broad requirement, indicative budget, expected timeline, preferred location, land status, source, and communication consent.
- Detailed commercial discovery, feasibility, proposal, negotiation, and booking belong to the Sales portal.
- After a journey is sent to Sales, the original Telesales owner retains read-only access to the complete internal record and history.
- Sent-to-Sales journeys cannot be edited, reassigned, annotated, or given new Telesales follow-ups.

## Included feature scope

- Role-aware local authentication and responsive application shell
- Home dashboard and prioritised queue with October/November 2026 data
- 40 workflow-valid Indian lead stories covering New, Follow-up, Interested, Land Sourcing, Sent to Sales, and Dead outcomes
- Fixture integrity tests for Telecaller ownership, dispositions, contact history, callbacks, qualification, Sales meetings, land status, duplicates, and customer identity
- Permanent `KX-YYYY-NNNNNN` Journey IDs and round-robin lead creation
- Complete lead workspace: overview, qualification, contact history, follow-ups, notes, documents, and audit activity
- Duplicate review using normalized email/phone, including linking separate journeys to one customer
- Mandatory RNR, Call Back Later, Switch Off, Interested, and Not Interested dispositions with automatic bucket routing
- Required next-call scheduling for every Follow-up Lead disposition
- Agenda/calendar follow-ups with completion and rescheduling
- Mandatory individual and group/community qualification gates
- Structured requirements for multiple pincode-linked locations, budget, size, timeline, property type, and land status
- Sequential land-dependent workflow: Telesales → Land Sourcing → Sales
- Land Sourcing receives only customer name, mobile number, locations/pincodes, and property type
- Mandatory Sales meeting date and time before an Interested lead can move to Sales
- Lead search includes customer name, Journey ID, email, phone, and location.
- Customer identity remains an internal data relationship for duplicate detection and multiple journeys; it is not a separate Telesales module.
- Reporting hierarchy where individuals see their manager and managers monitor direct-report progress
- Reporting-line workload, round-robin distribution, and reasoned reassignment
- Source, stage, outreach, compliance, and lost/nurture reports
- Responsive empty, validation, modal, confirmation, toast, and access-denied states

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Vercel deployment

1. Import this folder into a new Vercel project or push it to its future standalone repository.
2. Use framework preset **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. No environment variables are required.

`vercel.json` rewrites application routes to `index.html` so React Router URLs work when opened directly.

## No-API limitation

This is a review-ready mock UI. All users, leads, customers, audit events, reports, and mutations exist only in the current browser. Clearing browser storage resets the application. Authentication is for preview purposes and is not suitable for production security. Future API adapters can replace `LocalCrmService` without coupling screens to fixture arrays.
