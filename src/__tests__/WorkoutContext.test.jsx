// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { WorkoutProvider, useWorkout } from '../context/WorkoutContext'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
})

function TestComponent() {
  const { state, dispatch } = useWorkout()
  return (
    <div>
      <span data-testid="exercises">{JSON.stringify(state.exercises)}</span>
      <span data-testid="schedule">{JSON.stringify(state.schedule)}</span>
      <span data-testid="sessions">{JSON.stringify(state.sessions)}</span>
      <button onClick={() => dispatch({ type: 'ADD_EXERCISE', payload: 'Bench Press' })}>
        Add Exercise
      </button>
      <button onClick={() => dispatch({ type: 'REMOVE_EXERCISE', payload: 1 })}>
        Remove Exercise
      </button>
      <button
        onClick={() =>
          dispatch({ type: 'RENAME_EXERCISE', payload: { id: 1, newName: 'Chest Press' } })
        }
      >
        Rename Exercise
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'LOG_SESSION',
            payload: {
              id: 'test-id',
              date: '2026-09-14',
              day: 'Monday',
              sets: [{ exerciseId: 1, reps: 15, weight: 50 }],
            },
          })
        }
      >
        Log Session
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_SCHEDULE',
            payload: { Monday: [1], Wednesday: [2] },
          })
        }
      >
        Set Schedule
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'LOAD_DATA',
            payload: {
              exercises: [{ id: 1, name: 'Squats' }],
              schedule: { Friday: [1] },
              sessions: [],
            },
          })
        }
      >
        Load Data
      </button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <WorkoutProvider>
      <TestComponent />
    </WorkoutProvider>,
  )
}

describe('WorkoutContext', () => {
  it('provides initial state with pre-populated exercises', () => {
    renderWithProvider()
    const exercises = JSON.parse(screen.getByTestId('exercises').textContent)
    expect(exercises).toHaveLength(27)
    expect(exercises[0]).toMatchObject({ id: 1, name: 'Bench Press' })
    expect(screen.getByTestId('sessions')).toHaveTextContent('[]')
  })

  it('handles ADD_EXERCISE', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Add Exercise').click()
    })
    const exercises = JSON.parse(screen.getByTestId('exercises').textContent)
    expect(exercises).toHaveLength(28)
    expect(exercises[27]).toEqual({ id: 28, name: 'Bench Press' })
  })

  it('handles REMOVE_EXERCISE', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Remove Exercise').click()
    })
    const exercises = JSON.parse(screen.getByTestId('exercises').textContent)
    expect(exercises).toHaveLength(26)
    expect(exercises.find((e) => e.id === 1)).toBeUndefined()
  })

  it('handles RENAME_EXERCISE', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Rename Exercise').click()
    })
    const exercises = JSON.parse(screen.getByTestId('exercises').textContent)
    expect(exercises).toHaveLength(27)
    expect(exercises[0]).toMatchObject({ id: 1, name: 'Chest Press' })
  })

  it('handles LOG_SESSION', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Log Session').click()
    })
    expect(screen.getByTestId('sessions')).toHaveTextContent(
      '[{"id":"test-id","date":"2026-09-14","day":"Monday","sets":[{"exerciseId":1,"reps":15,"weight":50}]}]',
    )
  })

  it('handles SET_SCHEDULE', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Set Schedule').click()
    })
    expect(screen.getByTestId('schedule')).toHaveTextContent(
      '{"Monday":[1],"Wednesday":[2]}',
    )
  })

  it('handles LOAD_DATA', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Load Data').click()
    })
    expect(screen.getByTestId('exercises')).toHaveTextContent('[{"id":1,"name":"Squats"}]')
    expect(screen.getByTestId('schedule')).toHaveTextContent('{"Friday":[1]}')
    expect(screen.getByTestId('sessions')).toHaveTextContent('[]')
  })

  it('throws when useWorkout is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useWorkout must be used within a WorkoutProvider')
    consoleSpy.mockRestore()
  })
})
