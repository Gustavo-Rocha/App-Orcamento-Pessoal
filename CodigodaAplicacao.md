# Código Completo da Aplicação - App de Orçamento Pessoal

Este arquivo consolida todo o código-fonte da aplicação **Antigravity Fin (App de Orçamento Pessoal)**, abrangendo a camada de banco de dados (Supabase Postgres & RLS), utilitários financeiros de precisão centesimal, middleware de segurança, rotas do Next.js 16 (App Router), componentes React e testes unitários.

---

## 1. Banco de Dados & Segurança na Fonte (Supabase SQL Migrations)

### `supabase/migrations/20260716_initial_schema.sql`
```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create categories table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text not null default '#8B5CF6', -- Purple default
  icon text not null default 'PiggyBank', -- Icon name from Lucide
  type text not null check (type in ('income', 'expense')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric not null check (amount > 0),
  description text not null,
  type text not null check (type in ('income', 'expense')),
  date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create budgets table
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  limit_amount numeric not null check (limit_amount >= 0),
  month integer not null check (month >= 1 and month <= 12),
  year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_category_month_year unique (user_id, category_id, month, year)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Categories Policies
create policy "Users can view own categories" on public.categories
  for select using (auth.uid() = user_id);

create policy "Users can insert own categories" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "Users can update own categories" on public.categories
  for update using (auth.uid() = user_id);

create policy "Users can delete own categories" on public.categories
  for delete using (auth.uid() = user_id);

-- Transactions Policies
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- Budgets Policies
create policy "Users can view own budgets" on public.budgets
  for select using (auth.uid() = user_id);

create policy "Users can insert own budgets" on public.budgets
  for insert with check (auth.uid() = user_id);

create policy "Users can update own budgets" on public.budgets
  for update using (auth.uid() = user_id);

create policy "Users can delete own budgets" on public.budgets
  for delete using (auth.uid() = user_id);

-- Automate Profile Creation on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Insert some default categories for the new user
  insert into public.categories (user_id, name, color, icon, type) values
    (new.id, 'Salário', '#10B981', 'Briefcase', 'income'),
    (new.id, 'Investimentos', '#059669', 'TrendingUp', 'income'),
    (new.id, 'Outros (Receitas)', '#34D399', 'PlusCircle', 'income'),
    (new.id, 'Alimentação', '#EF4444', 'Utensils', 'expense'),
    (new.id, 'Moradia', '#3B82F6', 'Home', 'expense'),
    (new.id, 'Transporte', '#F59E0B', 'Car', 'expense'),
    (new.id, 'Saúde', '#EC4899', 'HeartPulse', 'expense'),
    (new.id, 'Lazer', '#8B5CF6', 'Sparkles', 'expense'),
    (new.id, 'Educação', '#6366F1', 'GraduationCap', 'expense'),
    (new.id, 'Outros (Despesas)', '#6B7280', 'CreditCard', 'expense');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### `supabase/migrations/20260718_global_rules_security.sql`
```sql
-- Revogar privilégio de execução pública na função trigger de criação de perfil
revoke execute on function public.handle_new_user() from public;

-- Remover políticas existentes das tabelas e criá-las limitando a apenas usuários autenticados
-- 1. Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- 2. Categories
drop policy if exists "Users can view own categories" on public.categories;
create policy "Users can view own categories" on public.categories
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories" on public.categories
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories" on public.categories
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories" on public.categories
  for delete to authenticated using (auth.uid() = user_id);

-- 3. Transactions
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions" on public.transactions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" on public.transactions
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions" on public.transactions
  for delete to authenticated using (auth.uid() = user_id);

-- 4. Budgets
drop policy if exists "Users can view own budgets" on public.budgets;
create policy "Users can view own budgets" on public.budgets
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own budgets" on public.budgets;
create policy "Users can insert own budgets" on public.budgets
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own budgets" on public.budgets;
create policy "Users can update own budgets" on public.budgets
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can delete own budgets" on public.budgets
  for delete to authenticated using (auth.uid() = user_id);
```

---

## 2. Utilitários & Clientes Supabase

### `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Can be ignored if middleware is handling cookies
          }
        },
      },
    }
  )
}
```

### `src/lib/utils/budgetCalculator.ts`
```typescript
import Big from 'big.js'

export interface Transaction {
  amount: number | string | Big
  type: 'income' | 'expense'
  date: string
  description: string
  categories?: {
    name: string
    color: string
  } | null
}

export function calculateSummary(transactions: Transaction[]) {
  let income = new Big(0)
  let expense = new Big(0)
  
  transactions.forEach(t => {
    const amt = new Big(t.amount || 0)
    if (t.type === 'income') {
      income = income.plus(amt)
    } else if (t.type === 'expense') {
      expense = expense.plus(amt)
    }
  })

  return {
    income: income.toNumber(),
    expense: expense.toNumber(),
    balance: income.minus(expense).toNumber()
  }
}

export function aggregateByCategory(transactions: Transaction[]) {
  const categoryMap: { [key: string]: { name: string; value: Big; color: string } } = {}

  transactions.forEach(t => {
    if (t.type === 'expense') {
      const catName = t.categories?.name || 'Sem Categoria'
      const catColor = t.categories?.color || '#6B7280'
      const amt = new Big(t.amount || 0)

      if (categoryMap[catName]) {
        categoryMap[catName].value = categoryMap[catName].value.plus(amt)
      } else {
        categoryMap[catName] = { name: catName, value: amt, color: catColor }
      }
    }
  })

  return Object.values(categoryMap).map(item => ({
    ...item,
    value: item.value.toNumber()
  }))
}

export function calculateProgressColor(percentage: number): string {
  if (percentage >= 100) return 'var(--color-danger)'
  if (percentage >= 80) return 'var(--color-warning)'
  return 'var(--color-primary)'
}
```

### `src/lib/utils/format.ts`
```typescript
import Big from 'big.js'

/**
 * Formats a value as BRL currency (R$ X.XXX,XX).
 * Accepts number, string representation, or Big.
 */
export function formatCurrency(value: number | string | Big): string {
  try {
    const numericValue = value instanceof Big ? value.toNumber() : Number(value)
    
    if (isNaN(numericValue)) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(0)
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numericValue)
  } catch {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(0)
  }
}
```

---

## 3. Middleware & Proxy de Autenticação

### `src/proxy.ts`
```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Crucial: calling getUser updates session cookie if expired
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  
  // Exclude static and api files
  const isStaticFile = pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api')

  if (!isStaticFile) {
    if (!user && !isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const middleware = proxy
export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 4. Componentes React da Aplicação

### `src/components/Sidebar.tsx`
```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  Receipt, 
  Tags, 
  PiggyBank, 
  LogOut 
} from 'lucide-react'

interface SidebarProps {
  user: {
    email?: string
    name?: string
    avatar_url?: string
  } | null
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transações', href: '/transactions', icon: Receipt },
    { name: 'Categorias', href: '/categories', icon: Tags },
    { name: 'Orçamentos', href: '/budgets', icon: PiggyBank },
  ]

  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">
          <span>Antigravity Fin</span>
        </div>
        
        <nav>
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <li key={item.href} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <Link href={item.href}>
                    <Icon size={20} />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        {user && (
          <div className="user-profile-info">
            <div className="user-avatar">
              {firstLetter}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name || 'Usuário'}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
        )}
        <button onClick={handleSignOut} className="sidebar-btn">
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  )
}
```

### `src/components/DashboardCharts.tsx`
```tsx
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
import { formatCurrency } from '@/lib/utils/format'

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
                  formatter={(value) => formatCurrency(Number(value))}
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
                formatter={(value) => formatCurrency(Number(value))}
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
```

### `src/components/TransactionModal.tsx`
```tsx
'use client'

import { useState, useEffect } from 'react'
import Big from 'big.js'
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

    let bigAmount: Big
    try {
      bigAmount = new Big(amount)
    } catch {
      setError('O valor informado é inválido.')
      setLoading(false)
      return
    }

    if (bigAmount.lte(0)) {
      setError('O valor precisa ser maior que zero.')
      setLoading(false)
      return
    }

    const numAmount = bigAmount.toNumber()

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
      const { error: err } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', transaction.id)
      queryError = err
    } else {
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
```

---

## 5. Páginas do App Router (Next.js 16)

### `src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Antigravity Fin - Orçamento Pessoal",
    template: "%s | Antigravity Fin",
  },
  description: "Gerenciador financeiro pessoal moderno, seguro e inteligente",
  keywords: ["orçamento pessoal", "finanças", "controle de gastos", "gestão financeira"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### `src/app/page.tsx`
```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

### `src/app/(auth)/login/page.tsx`
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    const { error: oAuthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oAuthError) {
      setError(oAuthError.message)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h1 className="auth-title">Bem-vindo de volta</h1>
          <p className="auth-subtitle">Entre na sua conta para gerenciar seu orçamento</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail</label>
            <input
              className="form-input"
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <input
              className="form-input"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-divider">ou continue com</div>

        <button className="btn btn-google" onClick={handleGoogleLogin}>
          Google
        </button>

        <div className="auth-footer">
          Não tem uma conta?{' '}
          <Link href="/register" className="auth-link">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  )
}
```

### `src/app/(auth)/register/page.tsx`
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h1 className="auth-title">Crie sua conta</h1>
          <p className="auth-subtitle">Comece a gerenciar seu orçamento pessoal hoje</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--color-success)', fontSize: '15px', fontWeight: '500' }}>
              Cadastro realizado com sucesso!
            </div>
            <p className="auth-subtitle">
              Verifique seu e-mail para confirmar seu cadastro.
            </p>
            <Link href="/login" className="btn btn-primary">
              Ir para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Nome completo</label>
              <input
                className="form-input"
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                className="form-input"
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Senha</label>
              <input
                className="form-input"
                id="password"
                type="password"
                placeholder="No mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        )}

        {!success && (
          <div className="auth-footer">
            Já tem uma conta?{' '}
            <Link href="/login" className="auth-link">
              Entre aqui
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/app/(dashboard)/layout.tsx`
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, avatar_url')
    .eq('id', user.id)
    .single()

  const formattedUser = {
    email: user.email,
    name: profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
  }

  return (
    <div className="dashboard-container">
      <Sidebar user={formattedUser} />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
```

### `src/app/(dashboard)/dashboard/page.tsx`
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateSummary, aggregateByCategory, type Transaction } from '@/lib/utils/budgetCalculator'
import DashboardCharts from '@/components/DashboardCharts'
import { ArrowUpRight, ArrowDownRight, Wallet, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'
import Big from 'big.js'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Antigravity Fin',
  description: 'Visão geral das receitas, despesas e distribuição de orçamento mensal',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const startOfSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]

  const [
    { data: currentMonthTransactions },
    { data: recentTransactions },
    { data: historyTransactions }
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type, date, description, categories(name, color)')
      .eq('user_id', user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    supabase
      .from('transactions')
      .select('id, amount, type, date, description, categories(name, color)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('user_id', user.id)
      .gte('date', startOfSixMonths)
  ])

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

      <div className="grid-cols-3">
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

      <DashboardCharts categoryData={categoryData} evolutionData={evolutionData} />

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
```

### `src/app/(dashboard)/transactions/page.tsx`
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TransactionModal from '@/components/TransactionModal'
import { Plus, Edit2, Trash2, Calendar, Search, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

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

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, color, type')
      .eq('user_id', user.id)

    if (cats) setCategories(cats)

    const [year, month] = selectedMonth.split('-')
    const startOfMonth = `${year}-${month}-01`
    const endOfMonth = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`

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
    // 3 Confirmações obrigatórias para operação destrutiva
    const step1 = confirm("ATENÇÃO: Você está prestes a excluir permanentemente esta transação financeira do sistema.\nConfirmar Passo 1 de 3: Deseja prosseguir?")
    if (!step1) return

    const step2 = confirm("AVISO: A exclusão desta transação afetará diretamente o seu saldo mensal calculado.\nConfirmar Passo 2 de 3: Você tem certeza absoluta?")
    if (!step2) return

    const step3 = confirm("CONFIRMAÇÃO FINAL: Deseja apagar fisicamente esta transação agora?\nConfirmar Passo 3 de 3: Excluir permanentemente?")
    if (!step3) return

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

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingTransaction(null)
    setIsModalOpen(true)
  }

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

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div className="search-container">
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
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
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
```

### `src/app/(dashboard)/categories/page.tsx`
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, LayoutGrid } from 'lucide-react'

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

    const { data } = await supabase
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
    const step1 = confirm("ATENÇÃO: Você está prestes a excluir permanentemente esta categoria do sistema.\nConfirmar Passo 1 de 3: Deseja prosseguir?")
    if (!step1) return

    const step2 = confirm("AVISO DE IMPACTO: Todas as transações atualmente associadas a esta categoria perderão o vínculo e ficarão marcadas como 'Sem Categoria'.\nConfirmar Passo 2 de 3: Deseja prosseguir?")
    if (!step2) return

    const step3 = confirm("CONFIRMAÇÃO FINAL: Deseja apagar fisicamente esta categoria agora?\nConfirmar Passo 3 de 3: Excluir permanentemente?")
    if (!step3) return

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
    '#8B5CF6', '#10B981', '#EF4444', '#3B82F6', '#F59E0B',
    '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#6B7280',
  ]

  return (
    <>
      <div>
        <h1 className="page-title">Categorias</h1>
        <p className="page-subtitle">Personalize suas categorias para organizar receitas e despesas</p>
      </div>

      <div className="grid-cols-3" style={{ alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Nova Categoria</h3>

          {formError && <div className="error-message" style={{ marginBottom: '16px' }}>{formError}</div>}

          <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
```

### `src/app/(dashboard)/budgets/page.tsx`
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateProgressColor } from '@/lib/utils/budgetCalculator'
import { Save } from 'lucide-react'
import Big from 'big.js'
import { formatCurrency } from '@/lib/utils/format'

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
  
  const [editLimits, setEditLimits] = useState<{ [categoryId: string]: string }>({})
  const [saveLoading, setSaveLoading] = useState<{ [categoryId: string]: boolean }>({})
  const [saveStatus, setSaveStatus] = useState<{ [categoryId: string]: 'idle' | 'success' | 'error' }>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, color, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')

    if (!categories) {
      setLoading(false)
      return
    }

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
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{cat.name}</h3>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                       Gasto: <span style={{ color: 'white', fontWeight: '500' }}>{formatCurrency(expense)}</span>
                       {limit > 0 && ` de ${formatCurrency(limit)}`}
                    </div>
                  </div>

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
```

---

## 6. Testes Unitários (Vitest & React Testing Library)

### `src/lib/utils/budgetCalculator.test.ts`
```typescript
import { describe, it, expect } from 'vitest'
import { 
  calculateSummary, 
  aggregateByCategory, 
  calculateProgressColor,
  type Transaction 
} from './budgetCalculator'

describe('budgetCalculator utilities', () => {
  describe('calculateSummary', () => {
    it('should correctly sum income and expense and calculate balance', () => {
      const mockTransactions: Transaction[] = [
        { amount: 1000, type: 'income', date: '2026-07-01', description: 'Salary' },
        { amount: 200, type: 'expense', date: '2026-07-02', description: 'Food' },
        { amount: 50, type: 'expense', date: '2026-07-03', description: 'Rent' },
        { amount: 500, type: 'income', date: '2026-07-04', description: 'Freelance' }
      ]

      const result = calculateSummary(mockTransactions)

      expect(result.income).toBe(1500)
      expect(result.expense).toBe(250)
      expect(result.balance).toBe(1250)
    })

    it('should return zeros for empty list', () => {
      const result = calculateSummary([])
      expect(result.income).toBe(0)
      expect(result.expense).toBe(0)
      expect(result.balance).toBe(0)
    })
  })

  describe('aggregateByCategory', () => {
    it('should group expenses by category name and sum amounts', () => {
      const mockTransactions: Transaction[] = [
        { 
          amount: 100, 
          type: 'expense', 
          date: '2026-07-01', 
          description: 'Burgers',
          categories: { name: 'Alimentação', color: '#FF0000' }
        },
        { 
          amount: 50, 
          type: 'expense', 
          date: '2026-07-02', 
          description: 'Uber',
          categories: { name: 'Transporte', color: '#00FF00' }
        },
        { 
          amount: 150, 
          type: 'expense', 
          date: '2026-07-03', 
          description: 'Pizza',
          categories: { name: 'Alimentação', color: '#FF0000' }
        },
        { 
          amount: 500, 
          type: 'income', 
          date: '2026-07-04', 
          description: 'Salary'
        }
      ]

      const result = aggregateByCategory(mockTransactions)

      expect(result).toHaveLength(2)
      
      const food = result.find(r => r.name === 'Alimentação')
      const transport = result.find(r => r.name === 'Transporte')

      expect(food).toBeDefined()
      expect(food?.value).toBe(250)
      expect(food?.color).toBe('#FF0000')

      expect(transport).toBeDefined()
      expect(transport?.value).toBe(50)
      expect(transport?.color).toBe('#00FF00')
    })

    it('should assign fallback category details if empty categories object', () => {
      const mockTransactions: Transaction[] = [
        { 
          amount: 100, 
          type: 'expense', 
          date: '2026-07-01', 
          description: 'Uncategorized Expense',
          categories: null
        }
      ]

      const result = aggregateByCategory(mockTransactions)
      expect(result[0].name).toBe('Sem Categoria')
      expect(result[0].color).toBe('#6B7280')
      expect(result[0].value).toBe(100)
    })
  })

  describe('calculateProgressColor', () => {
    it('should return error color if percentage >= 100', () => {
      expect(calculateProgressColor(100)).toBe('var(--color-danger)')
      expect(calculateProgressColor(120)).toBe('var(--color-danger)')
    })

    it('should return warning color if percentage >= 80 and < 100', () => {
      expect(calculateProgressColor(80)).toBe('var(--color-warning)')
      expect(calculateProgressColor(95)).toBe('var(--color-warning)')
    })

    it('should return primary color if percentage < 80', () => {
      expect(calculateProgressColor(50)).toBe('var(--color-primary)')
      expect(calculateProgressColor(0)).toBe('var(--color-primary)')
    })
  })
})
```
