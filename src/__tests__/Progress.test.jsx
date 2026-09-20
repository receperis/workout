// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Progress from '../pages/Progress'
import { WorkoutProvider } from '../context/WorkoutContext'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
})

function renderProgress(data = { exercises: [], schedule: {}, sessions: [] }) {
  localStorage.setItem('workout-data', JSON.stringify(data))
  return render(
    <WorkoutProvider>
      <Progress />
    </WorkoutProvider>
  )
}

describe('Progress - Day Tabs', () => {
  it('renders heading with "Progress"', () => {
    renderProgress()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('İlerleme')
  })

  it('shows empty state when no schedule configured', () => {
    renderProgress({ exercises: [{ id: 1, name: 'Bench Press' }], schedule: {}, sessions: [] })
    expect(screen.getByText(/Henüz antrenman planlanmamış/)).toBeInTheDocument()
  })

  it('renders day tabs for days with exercises in schedule', () => {
    renderProgress({
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule: { Pazartesi: [1], Çarşamba: [2] },
      sessions: [],
    })
    expect(screen.getByText('Paz')).toBeInTheDocument()
    expect(screen.getByText('Çar')).toBeInTheDocument()
    expect(screen.queryByText('Sal')).not.toBeInTheDocument()
  })

  it('defaults to today if today has exercises', () => {
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    const todayShort = today.slice(0, 3)
    renderProgress({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { [today]: [1] },
      sessions: [],
    })
    const todayButton = screen.getByText(todayShort)
    expect(todayButton).toBeInTheDocument()
  })

  it('switches tab on click', () => {
    renderProgress({
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule: { Pazartesi: [1], Çarşamba: [2] },
      sessions: [],
    })
    fireEvent.click(screen.getByText('Çar'))
    expect(screen.getByText('Squats')).toBeInTheDocument()
  })

  it('renders exercise names for the selected day', () => {
    renderProgress({
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule: { Pazartesi: [1, 2] },
      sessions: [],
    })
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Squats')).toBeInTheDocument()
  })

  it('shows no session data message when no sessions', () => {
    renderProgress({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { Pazartesi: [1] },
      sessions: [],
    })
    // Expand the exercise to see the "no session data" message
    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByText(/için henüz veri yok/)).toBeInTheDocument()
  })

  it('renders chart area when session data exists', () => {
    renderProgress({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { Pazartesi: [1] },
      sessions: [
        {
          id: '1',
          date: '2026-09-10',
          day: 'Pazartesi',
          sets: [{ exerciseId: 1, reps: 15, weight: 80 }],
        },
      ],
    })
    expect(screen.queryByText(/için henüz veri yok/)).not.toBeInTheDocument()
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
  })
})
