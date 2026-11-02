import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AccessDenied } from '../components/ui'
import { StageBadge } from '../components/Status'

describe('critical feedback components', () => {
  it('renders an explicit text stage label', () => {
    render(<StageBadge stage="Qualified" />)
    expect(screen.getByText('Sent to Sales')).toBeVisible()
  })

  it('renders a polished access denied state', () => {
    render(<MemoryRouter><AccessDenied /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'This area is restricted' })).toBeVisible()
    expect(screen.getByText(/does not include access/i)).toBeVisible()
  })
})
