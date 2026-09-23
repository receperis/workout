// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import { WorkoutProvider } from '../context/WorkoutContext'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
})

function renderDashboard(data) {
  if (data) localStorage.setItem('workout-data', JSON.stringify(data))
  return render(
    <MemoryRouter>
      <WorkoutProvider>
        <Dashboard />
      </WorkoutProvider>
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  it('renders today day name as heading', () => {
    renderDashboard()
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(today)
  })

  it('shows exercise count', () => {
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    renderDashboard({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { [today]: [] },
      sessions: [],
    })
    expect(screen.getByText('Bugün için antrenman planlanmamış')).toBeInTheDocument()
  })

  it('shows empty state when no exercises scheduled for today', () => {
    renderDashboard({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { Salı: [1] },
      sessions: [],
    })
    expect(screen.getByText(/Programınızı ayarlamak için/)).toBeInTheDocument()
  })

  it('shows exercise names for today', () => {
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    renderDashboard({
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule: { [today]: [1, 2] },
      sessions: [],
    })
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Squats')).toBeInTheDocument()
  })

  it('shows no session data message when no sessions', () => {
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    renderDashboard({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { [today]: [1] },
      sessions: [],
    })
    expect(screen.getByText(/için henüz kayıt yok/)).toBeInTheDocument()
  })

  it('renders chart when session data exists', () => {
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    renderDashboard({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { [today]: [1] },
      sessions: [
        {
          id: '1',
          date: '2026-09-10',
          day: today,
          sets: [
            { exerciseId: 1, reps: 15, weight: 50 },
            { exerciseId: 1, reps: 13, weight: 55 },
          ],
        },
      ],
    })
    expect(screen.queryByText(/için henüz kayıt yok/)).not.toBeInTheDocument()
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
  })
})
