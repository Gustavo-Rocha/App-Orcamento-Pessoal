'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error securely if needed without exposing sensitive user data
  }, [error])

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '40px', 
        textAlign: 'center', 
        maxWidth: '500px', 
        margin: '60px auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '16px' 
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-danger)' }}>
        Algo deu errado!
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Ocorreu um erro inesperado ao carregar os dados desta página.
      </p>
      <button 
        className="btn btn-primary" 
        onClick={() => reset()}
        style={{ marginTop: '12px' }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
