import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'

describe('Sidebar Component', () => {
  it('should render menu items and user info', () => {
    const mockUser = { name: 'Gustavo', email: 'gustavo@example.com' }
    render(<Sidebar user={mockUser} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Transações')).toBeInTheDocument()
    expect(screen.getByText('Categorias')).toBeInTheDocument()
    expect(screen.getByText('Orçamentos')).toBeInTheDocument()
    expect(screen.getByText('Gustavo')).toBeInTheDocument()
    expect(screen.getByText('gustavo@example.com')).toBeInTheDocument()
  })

  it('should fallback user initials when no user name is provided', () => {
    const mockUser = { email: 'test@example.com' }
    render(<Sidebar user={mockUser} />)

    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })
})
