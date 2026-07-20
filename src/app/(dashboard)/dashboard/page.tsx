import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateSummary, aggregateByCategory, type Transaction } from '@/lib/utils/budgetCalculator'
import DashboardCharts from '@/components/DashboardCharts'
import { ArrowUpRight, ArrowDownRight, Wallet, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import Big from 'big.js'


export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Current month stats
  const { data: currentMonthTransactions } = await supabase
    .from('transactions')
    .select('amount, type, date, description, categories(name, color)')
    .eq('user_id', user.id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  // Last 5 transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, amount, type, date, description, categories(name, color)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(5)

  const formattedRecentTransactions = (recentTransactions || []).map(tx => ({
    ...tx,
    categories: Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
  }))


  const monthTransactions = (currentMonthTransactions || []).map(tx => ({
    ...tx,
    categories: Array.isArray(tx.categories) ? tx.categories[0] : tx.categories
  })) as unknown as Transaction[]

  const { income, expense, balance } = calculateSummary(monthTransactions)
  const categoryData = aggregateByCategory(monthTransactions)


  // Last 6 months evolution
  const startOfSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
  const { data: historyTransactions } = await supabase
    .from('transactions')
    .select('amount, type, date')
    .eq('user_id', user.id)
    .gte('date', startOfSixMonths)

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const evolutionMap: { [key: string]: { month: string; income: Big; expense: Big; sortKey: number } } = {}

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`
    evolutionMap[label] = { month: label, income: new Big(0), expense: new Big(0), sortKey: d.getTime() }
  }

  if (historyTransactions) {
    historyTransactions.forEach(t => {
      const d = new Date(t.date + 'T00:00:00')
      const label = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`
      if (evolutionMap[label]) {
        const amt = new Big(t.amount || 0)
        if (t.type === 'income') {
          evolutionMap[label].income = evolutionMap[label].income.plus(amt)
        } else if (t.type === 'expense') {
          evolutionMap[label].expense = evolutionMap[label].expense.plus(amt)
        }
      }
    })
  }

  const evolutionData = Object.values(evolutionMap).map(item => ({
    ...item,
    income: item.income.toNumber(),
    expense: item.expense.toNumber()
  })).sort((a, b) => a.sortKey - b.sortKey)


  return (
    <>
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Acompanhe suas receitas, despesas e distribuição de orçamento</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid-cols-3">
        {/* Saldo Total */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Saldo Mensal</span>
            <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
              <Wallet size={20} />
            </div>
          </div>
          <span style={{ fontSize: '28px', fontWeight: '700', color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatCurrency(balance)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mês vigente</span>
        </div>

        {/* Receitas */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Receitas</span>
            <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--color-success-glow)', color: 'var(--color-success)' }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-success)' }}>
            {formatCurrency(income)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total recebido este mês</span>
        </div>

        {/* Despesas */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Despesas</span>
            <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--color-danger-glow)', color: 'var(--color-danger)' }}>
              <ArrowDownRight size={20} />
            </div>
          </div>
          <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-danger)' }}>
            {formatCurrency(expense)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total gasto este mês</span>
        </div>
      </div>

      {/* Gráficos */}
      <DashboardCharts categoryData={categoryData} evolutionData={evolutionData} />

      {/* Transações Recentes */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Transações Recentes</h3>
          <Link href="/transactions" className="auth-link" style={{ fontSize: '14px' }}>
            Ver tudo
          </Link>
        </div>

        {(!formattedRecentTransactions || formattedRecentTransactions.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Nenhuma transação cadastrada até o momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {formattedRecentTransactions.map((tx) => (
              <div 
                key={tx.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: tx.categories?.color || 'var(--text-muted)' 
                    }} 
                  />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '500' }}>{tx.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      {tx.categories && ` • ${tx.categories.name}`}
                    </div>
                  </div>
                </div>
                <span 
                  style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' 
                  }}
                >
                  {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
