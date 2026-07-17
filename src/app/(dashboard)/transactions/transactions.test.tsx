import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TransactionsPage from './page'

describe('TransactionsPage Component', () => {
  it('should render page title and filters', () => {
    render(<TransactionsPage />)

    expect(screen.getByText('Transações')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar por descrição...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nova Transação/i })).toBeInTheDocument()
  })
})
