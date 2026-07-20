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
