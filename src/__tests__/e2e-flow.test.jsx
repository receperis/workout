// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import Progress from '../pages/Progress'
import { WorkoutProvider } from '../context/WorkoutContext'
import '@testing-library/jest-dom/vitest'

describe('E2E Flow - Create exercises → Schedule → Log → Chart', () => {
  it('displays day tabs and exercise names from localStorage', () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squat' }],
        schedule: { Pazartesi: [1], Çarşamba: [2] },
        sessions: [
          {
            id: '1',
            date: '2026-09-14',
            day: 'Pazartesi',
            sets: [
              { exerciseId: 1, reps: 15, weight: 100 },
            ],
          },
          {
            id: '2',
            date: '2026-09-14',
            day: 'Çarşamba',
            sets: [
              { exerciseId: 2, reps: 15, weight: 150 },
            ],
          },
        ],
      }),
    )

    render(<WorkoutProvider><Progress /></WorkoutProvider>)

    expect(screen.getByText('Paz')).toBeInTheDocument()
    expect(screen.getByText('Çar')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Paz'))
    expect(screen.getByText('Bench Press')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Çar'))
    expect(screen.getByText('Squat')).toBeInTheDocument()
  })
})
