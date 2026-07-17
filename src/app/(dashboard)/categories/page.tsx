'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Calendar, LayoutGrid } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
}

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // New Category Form State
  const [name, setName] = useState('')
  const [color, setColor] = useState('#8B5CF6')
  const [icon, setIcon] = useState('PiggyBank')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, color, icon, type')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (data) {
      setCategories(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    if (!name.trim()) {
      setFormError('O nome da categoria é obrigatório.')
      setFormLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFormError('Usuário não autenticado.')
      setFormLoading(false)
      return
    }

    const { error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: user.id,
          name,
          color,
          icon,
          type,
        },
      ])

    if (error) {
      setFormError(error.message)
      setFormLoading(false)
    } else {
      setName('')
      setColor('#8B5CF6')
      setIcon('PiggyBank')
      setFormLoading(false)
      fetchCategories()
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria? As transações associadas perderão o vínculo.')) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (!error) {
        fetchCategories()
      } else {
        alert('Erro ao excluir: ' + error.message)
      }
    }
  }

  const predefinedIcons = [
    { name: 'PiggyBank', label: 'Porquinho' },
    { name: 'Utensils', label: 'Alimentação' },
    { name: 'Car', label: 'Transporte' },
    { name: 'Home', label: 'Moradia' },
    { name: 'HeartPulse', label: 'Saúde' },
    { name: 'Sparkles', label: 'Lazer' },
    { name: 'GraduationCap', label: 'Educação' },
    { name: 'Briefcase', label: 'Trabalho' },
    { name: 'TrendingUp', label: 'Investimento' },
    { name: 'CreditCard', label: 'Outros' },
  ]

  const predefinedColors = [
    '#8B5CF6', // Purple
    '#10B981', // Emerald
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6B7280', // Gray
  ]

  return (
    <>
      <div>
        <h1 className="page-title">Categorias</h1>
        <p className="page-subtitle">Personalize suas categorias para organizar receitas e despesas</p>
      </div>

      <div className="grid-cols-3" style={{ alignItems: 'start' }}>
        {/* Form panel */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Nova Categoria</h3>

          {formError && <div className="error-message" style={{ marginBottom: '16px' }}>{formError}</div>}

          <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Type Toggle */}
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${type === 'expense' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                  onClick={() => setType('expense')}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px', backgroundColor: type === 'income' ? 'var(--color-success)' : '' }}
                  onClick={() => setType('income')}
                >
                  Receita
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="cat-name">Nome da Categoria</label>
              <input
                type="text"
                id="cat-name"
                className="form-input"
                placeholder="Ex: Assinaturas, Mercado"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Icons */}
            <div className="form-group">
              <label className="form-label">Ícone</label>
              <select
                className="form-input"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              >
                {predefinedIcons.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Predefined Colors */}
            <div className="form-group">
              <label className="form-label">Cor</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {predefinedColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      backgroundColor: c,
                      height: '32px',
                      borderRadius: '6px',
                      border: color === c ? '2px solid white' : 'none',
                      cursor: 'pointer',
                      boxShadow: color === c ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => setColor(c)}
                    aria-label={`Selecionar cor ${c}`}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ marginTop: '8px' }}>
              <Plus size={18} />
              {formLoading ? 'Criando...' : 'Adicionar'}
            </button>
          </form>
        </div>

        {/* List panel */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Minhas Categorias</h3>

          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              Carregando categorias...
            </div>
          ) : categories.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              Você não possui nenhuma categoria cadastrada.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
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
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: `${cat.color}20`,
                        color: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${cat.color}35`
                      }}
                    >
                      <LayoutGrid size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: '600' }}>{cat.name}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          display: 'block',
                          color: cat.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'
                        }}
                      >
                        {cat.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '8px', borderRadius: '6px', color: 'var(--color-danger)' }}
                    onClick={() => handleDeleteCategory(cat.id)}
                    aria-label="Excluir Categoria"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
