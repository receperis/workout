// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'

const syncNow = vi.fn()
const dispatch = vi.fn()
const day = new Date().toLocaleString('tr-TR', { weekday: 'long' })

vi.mock('../context/WorkoutContext', () => ({
  useWorkout: () => ({
    state: {
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule: { [day]: [1, 2] },
      sessions: [],
    },
    dispatch,
    syncNow,
  }),
}))

import LogWorkout from '../pages/LogWorkout'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  syncNow.mockClear()
})

function setup() {
  render(
    <MemoryRouter>
      <LogWorkout />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('Bench Press'))
  fireEvent.click(screen.getByText('Squats'))
}

const weight = (name, v) =>
  fireEvent.change(screen.getByRole('spinbutton', { name: `${name} 15 tekrar ağırlığı` }), { target: { value: v } })

describe('Drive sync triggers', () => {
  it('does not sync while editing the same exercise', () => {
    setup()
    weight('Bench Press', '60')
    weight('Bench Press', '65')
    expect(syncNow).not.toHaveBeenCalled()
  })

  it('syncs once when moving to another exercise', () => {
    setup()
    weight('Bench Press', '60')
    weight('Squats', '80')
    expect(syncNow).toHaveBeenCalledTimes(1)
  })

  it('syncs when the app is hidden, only if there are changes', () => {
    setup()
    const hide = () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    hide()
    expect(syncNow).not.toHaveBeenCalled()
    weight('Bench Press', '60')
    hide()
    expect(syncNow).toHaveBeenCalledTimes(1)
  })

  it('syncs 10 minutes after the last edit', () => {
    vi.useFakeTimers()
    setup()
    weight('Bench Press', '60')
    act(() => vi.advanceTimersByTime(9 * 60 * 1000))
    expect(syncNow).not.toHaveBeenCalled()
    weight('Bench Press', '65')
    act(() => vi.advanceTimersByTime(9 * 60 * 1000))
    expect(syncNow).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(60 * 1000))
    expect(syncNow).toHaveBeenCalledTimes(1)
  })
})
