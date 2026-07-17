'use client'

import { useState, useEffect } from 'react'
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts'

interface DashboardChartsProps {
  categoryData: { name: string; value: number; color: string }[]
  evolutionData: { month: string; income: number; expense: number }[]
}

export default function DashboardCharts({ categoryData, evolutionData }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Carregando gráficos...
      </div>
    )
  }

  return (
    <div className="grid-cols-2" style={{ marginTop: '24px' }}>
      {/* Expenses by Category */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Gastos por Categoria</h3>
        {categoryData.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
            Nenhuma despesa registrada este mês.
          </div>
        ) : (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    borderColor: 'var(--border-color)', 
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }} 
                  formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly Evolution */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Evolução de Fluxo</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={evolutionData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg-surface)', 
                  borderColor: 'var(--border-color)', 
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }} 
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value === 'income' ? 'Receita' : 'Despesa'}</span>}
              />
              <Bar dataKey="income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
