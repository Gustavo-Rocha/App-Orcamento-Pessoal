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

