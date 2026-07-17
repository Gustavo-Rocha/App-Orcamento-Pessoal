import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardCharts from './DashboardCharts'

describe('DashboardCharts Component', () => {
  it('should render placeholders when category data is empty', () => {
    render(<DashboardCharts categoryData={[]} evolutionData={[]} />)

    expect(screen.getByText('Nenhuma despesa registrada este mês.')).toBeInTheDocument()
    expect(screen.getByText('Evolução de Fluxo')).toBeInTheDocument()
  })

  it('should render chart containers when data is provided', () => {
    const mockCatData = [
      { name: 'Alimentação', value: 300, color: '#EF4444' },
      { name: 'Transporte', value: 150, color: '#F59E0B' }
    ]
    const mockEvolData = [
      { month: 'Jan/26', income: 1000, expense: 500 }
    ]

    const { container } = render(<DashboardCharts categoryData={mockCatData} evolutionData={mockEvolData} />)

    expect(screen.getByText('Gastos por Categoria')).toBeInTheDocument()
    expect(screen.getByText('Evolução de Fluxo')).toBeInTheDocument()
    
    // Check if the mock chart classes are in the DOM tree
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})
