import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Me from './Me'

const summary = {
  station: { id: '', name: '', lat: 0, lon: 0 },
  baselines: { '1991-2020': 11, '1961-1990': 10 },
  annual: [
    { year: 1990, mean: 9.5, tmin: 0, tmax: 0, incomplete: false },
    { year: 2020, mean: 11.5, tmin: 0, tmax: 0, incomplete: false },
  ],
  anomaly: {
    '1991-2020': [
      { year: 1990, v: -1.5 },
      { year: 2020, v: 0.5 },
    ],
    '1961-1990': [],
  },
  decadal: [],
  warmingRate: { full: 0, last30: 0 },
  counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
  rankings: { warmest: [], coldest: [] },
}

test('birth year input produces lifetime warming readout', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary }))

  render(<Me />)

  await waitFor(() => screen.getByLabelText(/birth year/i))
  fireEvent.change(screen.getByLabelText(/birth year/i), { target: { value: '1990' } })

  await waitFor(() => expect(screen.getByText(/since you were born/i)).toBeInTheDocument())
})

test('share card contains no birth-year PII but shows location', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary }))
  render(<Me />)
  await waitFor(() => screen.getByLabelText(/birth year/i))
  fireEvent.change(screen.getByLabelText(/birth year/i), { target: { value: '1990' } })
  await waitFor(() => screen.getByText(/since you were born/i))
  const card = document.querySelector('#share-card')
  expect(card).not.toBeNull()
  expect(card!.textContent).not.toContain('1990')
  expect(card!.textContent).toContain('Uccle, Brussels')
})

afterEach(() => vi.unstubAllGlobals())
