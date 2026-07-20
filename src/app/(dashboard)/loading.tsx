export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px 0' }}>
      <div>
        <div 
          style={{ 
            width: '180px', 
            height: '28px', 
            borderRadius: '6px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            marginBottom: '8px' 
          }} 
        />
        <div 
          style={{ 
            width: '320px', 
            height: '16px', 
            borderRadius: '4px', 
            background: 'rgba(255, 255, 255, 0.03)' 
          }} 
        />
      </div>

      <div className="grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="glass-panel" 
            style={{ 
              height: '130px', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between' 
            }}
          >
            <div style={{ width: '100px', height: '14px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }} />
            <div style={{ width: '140px', height: '32px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)' }} />
            <div style={{ width: '80px', height: '12px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)' }} />
          </div>
        ))}
      </div>

      <div 
        className="glass-panel" 
        style={{ height: '350px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando dados...</span>
      </div>
    </div>
  )
}
