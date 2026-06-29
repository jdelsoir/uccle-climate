export function monthSummary({ warm, cool, total, records, soFar }: {
  warm: number; cool: number; total: number; records: number; soFar: boolean
}): string {
  if (total === 0) return soFar ? 'No days recorded yet.' : 'No data for this month.'
  const days = `${warm} of ${total} day${total === 1 ? '' : 's'}${soFar ? ' so far' : ''} ran warm, ${cool} cool`
  const rec = records > 0 ? ` — and ${records} all-time daily record${records === 1 ? '' : 's'} fell.` : '.'
  return days + rec
}
