import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './page'

describe('LoginPage Component', () => {
  it('should render email and password inputs and buttons', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument()
  })

  it('should allow user typing in input fields', () => {
    render(<LoginPage />)

    const emailInput = screen.getByLabelText('E-mail')
    const passwordInput = screen.getByLabelText('Senha')

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'mypassword123' } })

    expect(emailInput).toHaveValue('user@example.com')
    expect(passwordInput).toHaveValue('mypassword123')
  })
})
