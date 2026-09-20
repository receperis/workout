// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import WeightProgression from '../components/WeightProgression'
import { WorkoutProvider } from '../context/WorkoutContext'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

beforeEach(() => {
  localStorage.clear()
})

function renderWithSessions(sets, exerciseId = 1) {
  localStorage.setItem(
    'workout-data',
    JSON.stringify({
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: {},
      sessions: [
        {
          id: '1',
          date: '2026-09-10',
          day: 'Monday',
          sets,
        },
      ],
    }),
  )
  return render(
    <WorkoutProvider>
      <WeightProgression exerciseId={exerciseId} />
    </WorkoutProvider>,
  )
}

describe('WeightProgression - Multi-line Rep Tiers', () => {
  it('renders empty message when no data', () => {
    render(
      <WorkoutProvider>
        <WeightProgression exerciseId={1} />
      </WorkoutProvider>,
    )
    expect(screen.getByText(/Bu dönem için veri yok/)).toBeInTheDocument()
  })

  it('does not show empty message when session data exists', () => {
    renderWithSessions([
      { exerciseId: 1, reps: 15, weight: 50 },
      { exerciseId: 1, reps: 13, weight: 55 },
    ])
    expect(screen.queryByText(/Bu dönem için veri yok/)).not.toBeInTheDocument()
  })

  it('renders date range selector with 3 options', () => {
    render(
      <WorkoutProvider>
        <WeightProgression exerciseId={1} />
      </WorkoutProvider>,
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('all')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(3)
  })

  it('changes date range selection', () => {
    render(
      <WorkoutProvider>
        <WeightProgression exerciseId={1} />
      </WorkoutProvider>,
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '30d' } })
    expect(select).toHaveValue('30d')
  })

  it('shows empty message when session is outside date range', () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [{ id: 1, name: 'Bench Press' }],
        schedule: {},
        sessions: [
          {
            id: '1',
            date: '2025-01-01',
            day: 'Monday',
            sets: [{ exerciseId: 1, reps: 15, weight: 80 }],
          },
        ],
      }),
    )

    render(
      <WorkoutProvider>
        <WeightProgression exerciseId={1} />
      </WorkoutProvider>,
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '30d' } })
    expect(screen.getByText(/Bu dönem için veri yok/)).toBeInTheDocument()
  })

  it('does not show empty message when data is within date range', () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 5)
    const recentDateStr = recentDate.toISOString().split('T')[0]

    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [{ id: 1, name: 'Bench Press' }],
        schedule: {},
        sessions: [
          {
            id: '1',
            date: recentDateStr,
            day: 'Monday',
            sets: [{ exerciseId: 1, reps: 15, weight: 80 }],
          },
        ],
      }),
    )

    render(
      <WorkoutProvider>
        <WeightProgression exerciseId={1} />
      </WorkoutProvider>,
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '30d' } })
    expect(screen.queryByText(/Bu dönem için veri yok/)).not.toBeInTheDocument()
  })

  it('shows no data for different exercise with no sessions', () => {
    renderWithSessions(
      [{ exerciseId: 1, reps: 15, weight: 50 }],
      2
    )
    expect(screen.getByText(/Bu dönem için veri yok/)).toBeInTheDocument()
  })

  it('filters sessions by exercise ID', () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squat' }],
        schedule: {},
        sessions: [
          {
            id: '1',
            date: '2026-09-10',
            day: 'Monday',
            sets: [
              { exerciseId: 1, reps: 15, weight: 80 },
              { exerciseId: 2, reps: 15, weight: 140 },
            ],
          },
        ],
      }),
    )

    render(
      <WorkoutProvider>
        <WeightProgression exerciseId={1} />
      </WorkoutProvider>,
    )

    expect(screen.queryByText(/Bu dönem için veri yok/)).not.toBeInTheDocument()
  })
})
