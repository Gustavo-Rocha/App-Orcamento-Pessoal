'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TransactionModal from '@/components/TransactionModal'
import { Plus, Edit2, Trash2, Calendar, Search, Filter } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  type: 'income' | 'expense'
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id: string
  date: string
  categories: Category | null
}

export default function TransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch categories
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, color, type')
      .eq('user_id', user.id)

    if (cats) setCategories(cats)

    // Get current filtered month range
    const [year, month] = selectedMonth.split('-')
    const startOfMonth = `${year}-${month}-01`
    const endOfMonth = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`

    // Fetch transactions
    let query = supabase
      .from('transactions')
      .select('id, description, amount, type, category_id, date, categories(id, name, color, type)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    const { data: txs } = await query

    if (txs) {
      setTransactions(txs as unknown as Transaction[])
    }
    setLoading(false)
  }, [supabase, selectedMonth, typeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      
      if (!error) {
        fetchData()
      } else {
        alert('Erro ao excluir: ' + error.message)
      }
    }
  }

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingTransaction(null)
    setIsModalOpen(true)
  }

  // Filter transactions in memory by search query
  const filteredTransactions = transactions.filter((tx) =>
    tx.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="page-subtitle">Gerencie suas movimentações financeiras de receitas e despesas</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddNew}>
          <Plus size={18} />
          Nova Transação
        </button>
      </div>

      {/* Control Panel (Filters & Search) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div className="search-container">
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 2, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '44px', width: '100%' }}
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Month Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
            <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="month"
              className="form-input"
              style={{ width: '100%' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-input"
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Carregando transações...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '15px' }}>
            Nenhuma transação encontrada para este período.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ fontWeight: '500' }}>{tx.description}</td>
                    <td>
                      {tx.categories ? (
                        <span 
                          className="badge-tag" 
                          style={{ 
                            background: `${tx.categories.color}15`, 
                            color: tx.categories.color,
                            border: `1px solid ${tx.categories.color}30` 
                          }}
                        >
                          {tx.categories.name}
                        </span>
                      ) : (
                        <span className="badge-tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          Sem Categoria
                        </span>
                      )}
                    </td>
                    <td 
                      style={{ 
                        fontWeight: '600', 
                        color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' 
                      }}
                    >
                      {tx.type === 'income' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '8px', borderRadius: '6px' }}
                          onClick={() => handleEdit(tx)}
                          aria-label="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '8px', borderRadius: '6px', color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(tx.id)}
                          aria-label="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        categories={categories}
        transaction={editingTransaction}
      />
    </>
  )
}
