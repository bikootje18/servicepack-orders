export function berekenAantal(
  orderGrootte: number | null,
  type: 'delen' | 'vermenigvuldigen',
  factor: number
): number | null {
  if (orderGrootte == null || factor <= 0) return null
  if (type === 'delen') return Math.ceil(orderGrootte / factor)
  return Math.round(orderGrootte * factor)
}
