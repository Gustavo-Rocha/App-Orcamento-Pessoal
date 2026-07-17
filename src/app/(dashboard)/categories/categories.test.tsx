import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CategoriesPage from './page'

describe('CategoriesPage Component', () => {
  it('should render page title and form inputs', () => {
    render(<CategoriesPage />)

    expect(screen.getByText('Categorias')).toBeInTheDocument()
    expect(screen.getByText('Nova Categoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da Categoria')).toBeInTheDocument()
  })
})
