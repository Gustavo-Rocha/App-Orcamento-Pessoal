'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  type: 'income' | 'expense'
}

interface Transaction {
  id?: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id: string
  date: string
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Category[]
  transaction?: Transaction | null
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  transaction,
}: TransactionModalProps) {
  const supabase = createClient()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Filter categories by type (income or expense)
  const filteredCategories = categories.filter((cat) => cat.type === type)

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description)
      setAmount(transaction.amount.toString())
      setType(transaction.type)
      setCategoryId(transaction.category_id || '')
      setDate(transaction.date)
    } else {
      setDescription('')
      setAmount('')
      setType('expense')
      setCategoryId('')
      setDate(new Date().toISOString().split('T')[0])
    }
    setError(null)
  }, [transaction, isOpen])

  // Automatically select the first category of the selected type when type changes
  useEffect(() => {
    if (filteredCategories.length > 0 && !categoryId) {
      setCategoryId(filteredCategories[0].id)
    }
  }, [type, filteredCategories, categoryId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('O valor precisa ser maior que zero.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Usuário não autenticado.')
      setLoading(false)
      return
    }

    const transactionData = {
      user_id: user.id,
      description,
      amount: numAmount,
      type,
      category_id: categoryId || null,
      date,
    }

    let queryError

    if (transaction?.id) {
      // Update
      const { error: err } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id)
      queryError = err
    } else {
      // Create
      const { error: err } = await supabase
        .from('transactions')
        .insert([transactionData])
      queryError = err
    }

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
          {transaction ? 'Editar Transação' : 'Nova Transação'}
        </h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toggle Type */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setType('expense')
                  setCategoryId('')
                }}
              >
                Despesa
              </button>
              <button
                type="button"
                className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, backgroundColor: type === 'income' ? 'var(--color-success)' : '' }}
                onClick={() => {
                  setType('income')
                  setCategoryId('')
                }}
              >
                Receita
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Descrição</label>
            <input
              type="text"
              id="description"
              className="form-input"
              placeholder="Ex: Aluguel, Supermercado"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label" htmlFor="amount">Valor (R$)</label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="category_id">Categoria</label>
            <select
              id="category_id"
              className="form-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>Selecione uma categoria</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="date">Data</label>
            <input
              type="date"
              id="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
