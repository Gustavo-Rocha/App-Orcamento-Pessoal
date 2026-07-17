export interface Transaction {
  amount: number
  type: 'income' | 'expense'
  date: string
  description: string
  categories?: {
    name: string
    color: string
  } | null
}

export function calculateSummary(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  
  transactions.forEach(t => {
    const amt = Number(t.amount)
    if (t.type === 'income') {
      income += amt
    } else if (t.type === 'expense') {
      expense += amt
    }
  })

  return {
    income,
    expense,
    balance: income - expense
  }
}

export function aggregateByCategory(transactions: Transaction[]) {
  const categoryMap: { [key: string]: { name: string; value: number; color: string } } = {}

  transactions.forEach(t => {
    if (t.type === 'expense') {
      const catName = t.categories?.name || 'Sem Categoria'
      const catColor = t.categories?.color || '#6B7280'
      const amt = Number(t.amount)

      if (categoryMap[catName]) {
        categoryMap[catName].value += amt
      } else {
        categoryMap[catName] = { name: catName, value: amt, color: catColor }
      }
    }
  })

  return Object.values(categoryMap)
}

export function calculateProgressColor(percentage: number): string {
  if (percentage >= 100) return 'var(--color-danger)'
  if (percentage >= 80) return 'var(--color-warning)'
  return 'var(--color-primary)'
}
