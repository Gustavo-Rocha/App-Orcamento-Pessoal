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
        } // should ignore income
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
