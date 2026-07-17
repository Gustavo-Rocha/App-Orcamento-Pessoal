import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BudgetsPage from './page'

describe('BudgetsPage Component', () => {
  it('should render page title', () => {
    render(<BudgetsPage />)

    expect(screen.getByText('Limites de Orçamento')).toBeInTheDocument()
  })
})
