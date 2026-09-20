// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi, beforeAll } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LogWorkout from '../pages/LogWorkout'
import { WorkoutProvider } from '../context/WorkoutContext'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
})

function today() {
  return new Date().toISOString().split('T')[0]
}

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dayName = d.toLocaleString('tr-TR', { weekday: 'short' })
  const dayNum = d.getDate()
  return `${dayName} ${dayNum}`
}

function renderLogWorkout(route = '/log', schedule = {}, sessions = []) {
  localStorage.setItem(
    'workout-data',
    JSON.stringify({
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule,
      sessions,
    })
  )
  return render(
    <MemoryRouter initialEntries={[route]}>
      <WorkoutProvider>
        <Routes>
          <Route path="/log" element={<LogWorkout />} />
          <Route path="/log/:day" element={<LogWorkout />} />
        </Routes>
      </WorkoutProvider>
    </MemoryRouter>
  )
}

describe('LogWorkout - Date Selector', () => {
  it('renders heading', () => {
    renderLogWorkout()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Antrenman Kaydet')
  })

  it('renders 7 date pills for the current week', () => {
    renderLogWorkout()
    const monday = getMonday(today())
    for (let i = 0; i < 7; i++) {
      const dateStr = addDays(monday, i)
      expect(screen.getByText(formatDateLabel(dateStr))).toBeInTheDocument()
    }
  })

  it('highlights today date pill', () => {
    renderLogWorkout()
    const todayPill = screen.getByText(formatDateLabel(today()))
    expect(todayPill).toBeInTheDocument()
    expect(todayPill.style.background).toBe('var(--accent)')
  })

  it('renders week navigation arrows', () => {
    renderLogWorkout()
    expect(screen.getByLabelText('Önceki hafta')).toBeInTheDocument()
    expect(screen.getByLabelText('Sonraki hafta')).toBeInTheDocument()
  })

  it('navigates to previous week when clicking left arrow', () => {
    renderLogWorkout()
    const prevButton = screen.getByLabelText('Önceki hafta')
    fireEvent.click(prevButton)

    const prevMonday = addDays(getMonday(today()), -7)
    expect(screen.getByText(formatDateLabel(prevMonday))).toBeInTheDocument()
  })

  it('navigates to next week when clicking right arrow', () => {
    renderLogWorkout()
    const nextButton = screen.getByLabelText('Sonraki hafta')
    fireEvent.click(nextButton)

    const nextMonday = addDays(getMonday(today()), 7)
    expect(screen.getByText(formatDateLabel(nextMonday))).toBeInTheDocument()
  })

  it('selects a date when clicking a date pill', () => {
    renderLogWorkout('/log', { Pazartesi: [1] })
    const monday = getMonday(today())
    const mondayPill = screen.getByText(formatDateLabel(monday))
    fireEvent.click(mondayPill)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
  })
})

describe('LogWorkout - Exercise Cards', () => {
  it('shows empty state when no exercises assigned to day', () => {
    renderLogWorkout('/log', {})
    expect(screen.getByText(/için antrenman atanmamış/)).toBeInTheDocument()
  })

  it('renders exercise cards for assigned exercises', () => {
    renderLogWorkout('/log', { Pazartesi: [1, 2] })
    const monday = getMonday(today())
    fireEvent.click(screen.getByText(formatDateLabel(monday)))
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Squats')).toBeInTheDocument()
  })

  it('does not show complete button when no weights entered', () => {
    renderLogWorkout('/log', { Pazartesi: [1] })
    const monday = getMonday(today())
    fireEvent.click(screen.getByText(formatDateLabel(monday)))
    expect(screen.queryByText('Seansı Tamamla')).not.toBeInTheDocument()
  })
})

describe('LogWorkout - Pre-populate from existing session', () => {
  it('pre-populates fields from existing session for selected date', () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: todayDate,
      day: todayDay,
      sets: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 1, reps: 13, weight: 65 },
        { exerciseId: 1, reps: 11, weight: 70 },
        { exerciseId: 1, reps: 9, weight: 75 },
        { exerciseId: 1, reps: 7, weight: 80 },
      ],
    }]
    renderLogWorkout('/log', { [todayDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(60)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 13 tekrar ağırlığı' })).toHaveValue(65)
  })

  it('shows empty fields when no session exists for date', () => {
    renderLogWorkout('/log', { Pazartesi: [1] })
    const monday = getMonday(today())
    fireEvent.click(screen.getByText(formatDateLabel(monday)))
    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(null)
  })
})

describe('LogWorkout - Past date read-only', () => {
  it('makes inputs read-only for past dates with a session', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 1, reps: 13, weight: 65 },
        { exerciseId: 1, reps: 11, weight: 70 },
        { exerciseId: 1, reps: 9, weight: 75 },
        { exerciseId: 1, reps: 7, weight: 80 },
      ],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)

    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    expect(input).toHaveValue(60)
    expect(input).toBeDisabled()
  })

  it('shows "Session logged — read only" for past dates with session', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))
    expect(screen.getByText('Seans kaydedildi — salt okunur')).toBeInTheDocument()
  })

  it('shows "Bu tarih için kayıt yok" for past dates without session', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    renderLogWorkout('/log', { [yesterdayDay]: [1] })
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))
    expect(screen.getByText('Bu tarih için kayıt yok')).toBeInTheDocument()
  })

  it('does not show Session Complete button for past dates', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))
    expect(screen.queryByText('Seansı Tamamla')).not.toBeInTheDocument()
  })
})

describe('LogWorkout - Edit past session', () => {
  it('shows edit button next to read-only banner for past dates with session', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))
    expect(screen.getByLabelText('Seansı düzenle')).toBeInTheDocument()
  })

  it('enables inputs when edit button is clicked', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    expect(input).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Seansı düzenle'))
    expect(input).not.toBeDisabled()
  })

  it('shows "Seansı Güncelle" button when editing', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    fireEvent.click(screen.getByLabelText('Seansı düzenle'))
    expect(screen.getByText('Seansı Güncelle')).toBeInTheDocument()
  })

  it('saves updated session without creating a duplicate', async () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    fireEvent.click(screen.getByLabelText('Seansı düzenle'))
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    fireEvent.change(input, { target: { value: '70' } })

    fireEvent.click(screen.getByText('Seansı Güncelle'))
    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].sets[0].weight).toBe(70)
  })

  it('reverts to read-only when edit is cancelled', () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    fireEvent.click(screen.getByLabelText('Seansı düzenle'))
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    expect(input).not.toBeDisabled()

    fireEvent.click(screen.getByLabelText('Düzenlemeyi iptal et'))
    expect(input).toBeDisabled()
  })

  it('allows adding a new session to a past date with no record', async () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, [])
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    expect(screen.getByText('Bu tarih için kayıt yok')).toBeInTheDocument()
    const addBtn = screen.getByLabelText('Seansı düzenle')
    expect(addBtn).toBeInTheDocument()

    fireEvent.click(addBtn)
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    expect(input).not.toBeDisabled()
    fireEvent.change(input, { target: { value: '60' } })

    fireEvent.click(screen.getByText('Seansı Tamamla'))
    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].sets[0].weight).toBe(60)
    expect(data.sessions[0].date).toBe(yesterday)
  })
})

describe('LogWorkout - URL routing', () => {
  it('loads Pazartesi of current week from /log/Pazartesi', () => {
    renderLogWorkout('/log/Pazartesi', { Pazartesi: [1] })
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
  })

  it('loads specific date from /log/2026-09-15', () => {
    renderLogWorkout('/log/2026-09-15', { Salı: [2] })
    expect(screen.getByText('Squats')).toBeInTheDocument()
  })
})

describe('LogWorkout - Draft auto-save', () => {
  it('restores draft from localStorage on page load', () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const draft = {
      date: todayDate,
      exerciseSets: {
        1: [
          { exerciseId: 1, reps: 15, weight: 60 },
          { exerciseId: 1, reps: 13, weight: 65 },
          { exerciseId: 1, reps: 11, weight: 70 },
          { exerciseId: 1, reps: 9, weight: 75 },
          { exerciseId: 1, reps: 7, weight: 80 },
        ],
      },
    }
    localStorage.setItem('workout-draft', JSON.stringify(draft))
    renderLogWorkout('/log', { [todayDay]: [1] })

    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(60)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 13 tekrar ağırlığı' })).toHaveValue(65)
  })

  it('does not restore draft for a different date', () => {
    const draft = {
      date: '2020-01-01',
      exerciseSets: {
        1: [
          { exerciseId: 1, reps: 15, weight: 99 },
        ],
      },
    }
    localStorage.setItem('workout-draft', JSON.stringify(draft))
    renderLogWorkout('/log', { Pazartesi: [1] })
    const monday = getMonday(today())
    fireEvent.click(screen.getByText(formatDateLabel(monday)))
    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(null)
  })

  it('existing session takes priority over draft', () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: todayDate,
      day: todayDay,
      sets: [
        { exerciseId: 1, reps: 15, weight: 50 },
        { exerciseId: 1, reps: 13, weight: 55 },
      ],
    }]
    const draft = {
      date: todayDate,
      exerciseSets: {
        1: [
          { exerciseId: 1, reps: 15, weight: 99 },
          { exerciseId: 1, reps: 13, weight: 99 },
        ],
      },
    }
    localStorage.setItem('workout-draft', JSON.stringify(draft))
    renderLogWorkout('/log', { [todayDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(50)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 13 tekrar ağırlığı' })).toHaveValue(55)
  })

  it('inputs remain populated after completing session', async () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    renderLogWorkout('/log', { [todayDay]: [1] })

    fireEvent.click(screen.getByText(formatDateLabel(today())))
    fireEvent.click(screen.getByText('Bench Press'))
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    fireEvent.change(input, { target: { value: '60' } })

    const completeButton = screen.getByText('Seansı Tamamla')
    fireEvent.click(completeButton)

    await new Promise((r) => setTimeout(r, 100))

    expect(input).toHaveValue(60)
  })

  it('draft is cleared after completing session', async () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const draft = {
      date: todayDate,
      exerciseSets: {
        1: [
          { exerciseId: 1, reps: 15, weight: 60 },
          { exerciseId: 1, reps: 13, weight: 65 },
          { exerciseId: 1, reps: 11, weight: 70 },
          { exerciseId: 1, reps: 9, weight: 75 },
          { exerciseId: 1, reps: 7, weight: 80 },
        ],
      },
    }
    localStorage.setItem('workout-draft', JSON.stringify(draft))
    renderLogWorkout('/log', { [todayDay]: [1] })

    fireEvent.click(screen.getByText(formatDateLabel(today())))

    const completeButton = screen.getByText('Seansı Tamamla')
    fireEvent.click(completeButton)

    await new Promise((r) => setTimeout(r, 100))

    expect(localStorage.getItem('workout-draft')).toBeNull()
  })
})
