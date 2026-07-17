import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TransactionModal from './TransactionModal'

const mockCategories = [
  { id: 'cat-1', name: 'Salário', color: '#10B981', type: 'income' as const },
  { id: 'cat-2', name: 'Alimentação', color: '#EF4444', type: 'expense' as const },
  { id: 'cat-3', name: 'Lazer', color: '#8B5CF6', type: 'expense' as const },
]

describe('TransactionModal Component', () => {
  it('should render correct title for new transaction mode', () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        categories={mockCategories}
        transaction={null}
      />
    )

    expect(screen.getByText('Nova Transação')).toBeInTheDocument()
  })

  it('should render correct title and prefill values for edit mode', () => {
    const mockTx = {
      id: 'tx-1',
      description: 'Lanches',
      amount: 45.90,
      type: 'expense' as const,
      category_id: 'cat-2',
      date: '2026-07-16'
    }

    render(
      <TransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        categories={mockCategories}
        transaction={mockTx}
      />
    )

    expect(screen.getByText('Editar Transação')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Lanches')
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue(45.90)
    expect(screen.getByLabelText('Categoria')).toHaveValue('cat-2')
    expect(screen.getByLabelText('Data')).toHaveValue('2026-07-16')
  })

  it('should switch categories list when toggling type', async () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        categories={mockCategories}
        transaction={null}
      />
    )

    // Default is expense. Let's inspect option values
    const select = screen.getByLabelText('Categoria')
    
    // Switch to income (Receita)
    const incomeBtn = screen.getByText('Receita')
    fireEvent.click(incomeBtn)

    // Option should switch to income category (cat-1)
    await waitFor(() => {
      expect(select).toHaveValue('cat-1')
    })
  })

  it('should call onClose when cancel button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <TransactionModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={vi.fn()}
        categories={mockCategories}
        transaction={null}
      />
    )

    const cancelBtn = screen.getByText('Cancelar')
    fireEvent.click(cancelBtn)

    expect(handleClose).toHaveBeenCalledOnce()
  })
})
