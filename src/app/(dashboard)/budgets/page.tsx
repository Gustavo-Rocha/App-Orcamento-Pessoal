'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateProgressColor } from '@/lib/utils/budgetCalculator'
import { Plus, PiggyBank, Save } from 'lucide-react'
import Big from 'big.js'
import { formatCurrency } from '@/lib/utils/format'


interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
}

interface Budget {
  category_id: string
  limit_amount: number
}

interface CategoryWithBudget {
  id: string
  name: string
  color: string
  expenseSum: number
  limit: number
}

export default function BudgetsPage() {
  const supabase = createClient()
  const [categoriesWithBudgets, setCategoriesWithBudgets] = useState<CategoryWithBudget[]>([])
  const [loading, setLoading] = useState(true)
  
  // Local edit states
  const [editLimits, setEditLimits] = useState<{ [categoryId: string]: string }>({})
  const [saveLoading, setSaveLoading] = useState<{ [categoryId: string]: boolean }>({})
  const [saveStatus, setSaveStatus] = useState<{ [categoryId: string]: 'idle' | 'success' | 'error' }>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch expense categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, color, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')

    if (!categories) {
      setLoading(false)
      return
    }

    // 2. Fetch current month expenses
    const now = new Date()
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    const expenseMap: { [key: string]: Big } = {}
    transactions?.forEach((tx) => {
      if (tx.category_id) {
        const amt = new Big(tx.amount || 0)
        expenseMap[tx.category_id] = (expenseMap[tx.category_id] || new Big(0)).plus(amt)
      }
    })

    // 3. Fetch budgets for this month
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1
    const { data: budgets } = await supabase
      .from('budgets')
      .select('category_id, limit_amount')
      .eq('user_id', user.id)
      .eq('month', currentMonthNum)
      .eq('year', currentYear)

    const budgetMap: { [key: string]: number } = {}
    budgets?.forEach((b) => {
      budgetMap[b.category_id] = Number(b.limit_amount)
    })

    // 4. Combine data
    const combined: CategoryWithBudget[] = categories.map((cat) => {
      const limit = budgetMap[cat.id] || 0
      const expenseSum = expenseMap[cat.id] ? expenseMap[cat.id].toNumber() : 0
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        expenseSum,
        limit,
      }
    })

    setCategoriesWithBudgets(combined)

    // Prefill input states
    const limits: { [categoryId: string]: string } = {}
    combined.forEach((c) => {
      limits[c.id] = c.limit > 0 ? c.limit.toString() : ''
    })
    setEditLimits(limits)

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveLimit = async (categoryId: string) => {
    setSaveLoading((prev) => ({ ...prev, [categoryId]: true }))
    setSaveStatus((prev) => ({ ...prev, [categoryId]: 'idle' }))

    const rawLimit = editLimits[categoryId]
    let bigLimit: Big
    try {
      bigLimit = new Big(rawLimit || 0)
    } catch {
      setSaveStatus((prev) => ({ ...prev, [categoryId]: 'error' }))
      setSaveLoading((prev) => ({ ...prev, [categoryId]: false }))
      return
    }

    if (bigLimit.lt(0)) {
      setSaveStatus((prev) => ({ ...prev, [categoryId]: 'error' }))
      setSaveLoading((prev) => ({ ...prev, [categoryId]: false }))
      return
    }

    const numLimit = bigLimit.toNumber()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1

    // Fetch existing budget to get its ID, or rely on a unique constraint upsert
    // In our schema, we created: constraint unique_user_category_month_year unique (user_id, category_id, month, year)
    // So we can use upsert directly.
    const { error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        limit_amount: numLimit,
        month: currentMonthNum,
        year: currentYear,
      }, {
        onConflict: 'user_id,category_id,month,year'
      })

    if (error) {
      setSaveStatus((prev) => ({ ...prev, [categoryId]: 'error' }))
    } else {
      setSaveStatus((prev) => ({ ...prev, [categoryId]: 'success' }))
      // Refresh combined totals
      fetchData()
    }
    setSaveLoading((prev) => ({ ...prev, [categoryId]: false }))
  }

  return (
    <>
      <div>
        <h1 className="page-title">Limites de Orçamento</h1>
        <p className="page-subtitle">Configure limites de gastos mensais por categoria e evite surpresas</p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando limites...
        </div>
      ) : categoriesWithBudgets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Crie categorias de despesa primeiro na página de categorias para gerenciar limites.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {categoriesWithBudgets.map((cat) => {
            const expense = cat.expenseSum
            const limit = cat.limit
            const percent = limit > 0 ? Math.min((expense / limit) * 100, 100) : 0
            const progressColor = calculateProgressColor(limit > 0 ? (expense / limit) * 100 : 0)
            const isSaving = saveLoading[cat.id]
            const status = saveStatus[cat.id]

            return (
              <div 
                key={cat.id} 
                className="glass-panel" 
                style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  borderLeft: `4px solid ${cat.color}`
                }}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '16px' 
                  }}
                >
                  {/* Category Details */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{cat.name}</h3>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                       Gasto: <span style={{ color: 'white', fontWeight: '500' }}>{formatCurrency(expense)}</span>
                       {limit > 0 && ` de ${formatCurrency(limit)}`}
                    </div>
                  </div>

                  {/* Edit Limit Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <span 
                        style={{ 
                          position: 'absolute', 
                          left: '12px', 
                          top: '10px', 
                          fontSize: '14px', 
                          color: 'var(--text-muted)' 
                        }}
                      >
                        R$
                      </span>
                      <input
                        type="number"
                        placeholder="Definir limite"
                        className="form-input"
                        style={{ paddingLeft: '32px', width: '150px', height: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                        value={editLimits[cat.id] || ''}
                        onChange={(e) => setEditLimits({ ...editLimits, [cat.id]: e.target.value })}
                      />
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', height: '40px' }}
                      onClick={() => handleSaveLimit(cat.id)}
                      disabled={isSaving}
                    >
                      <Save size={16} />
                      {isSaving ? '...' : 'Salvar'}
                    </button>
                    
                    {status === 'success' && (
                      <span style={{ color: 'var(--color-success)', fontSize: '13px' }}>Salvo!</span>
                    )}
                    {status === 'error' && (
                      <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>Erro</span>
                    )}
                  </div>
                </div>

                {/* Progress bar visual indicator */}
                {limit > 0 ? (
                  <div>
                    <div className="progress-container">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${percent}%`, 
                          backgroundColor: progressColor 
                        }} 
                      />
                    </div>
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '12px', 
                        color: 'var(--text-muted)', 
                        marginTop: '6px' 
                      }}
                    >
                      <span>{(limit > 0 ? (expense / limit) * 100 : 0).toFixed(0)}% utilizado</span>
                      {expense >= limit && (
                        <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>
                          Limite estourado!
                        </span>
                      )}
                      {expense >= limit * 0.8 && expense < limit && (
                        <span style={{ color: 'var(--color-warning)', fontWeight: '600' }}>
                          Atenção: Próximo ao limite!
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhum limite definido para esta categoria. Defina um limite para ver o progresso.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
