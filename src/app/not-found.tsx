import Link from 'next/link'

export default function NotFound() {
  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px', 
        background: 'var(--bg-main)', 
        color: 'var(--text-primary)' 
      }}
    >
      <div 
        className="glass-panel" 
        style={{ 
          padding: '40px', 
          textAlign: 'center', 
          maxWidth: '480px', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '16px' 
        }}
      >
        <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--color-primary)' }}>404</span>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Página Não Encontrada</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '12px' }}>
          Voltar para o Dashboard
        </Link>
      </div>
    </div>
  )
}
