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

  it('saves an exercise target increment and displays goals next to previous weights', () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const previousDate = addDays(todayDate, -7)
    const previousDay = new Date(previousDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'previous-session',
      date: previousDate,
      day: previousDay,
      sets: [15, 13, 11, 9, 7].map((reps) => ({ exerciseId: 1, reps, weight: 5 })),
    }]
    renderLogWorkout('/log', { [todayDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bench Press hedef artışı' }), {
      target: { value: '1' },
    })

    expect(screen.getAllByText('5 kg')).toHaveLength(5)
    expect(screen.getAllByText('Hedef 6 kg')).toHaveLength(5)
    expect(JSON.parse(localStorage.getItem('workout-data')).exercises[0].targetIncrement).toBe(1)
  })

  it('uses the most recent previous session even when sessions are unsorted', () => {
    const selectedDate = today()
    const selectedDay = new Date(selectedDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const recentDate = addDays(selectedDate, -7)
    const olderDate = addDays(selectedDate, -14)
    const sessions = [
      {
        id: 'recent-session',
        date: recentDate,
        day: new Date(recentDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' }),
        sets: [15, 13, 11, 9, 7].map((reps) => ({ exerciseId: 1, reps, weight: 10 })),
      },
      {
        id: 'older-session',
        date: olderDate,
        day: new Date(olderDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' }),
        sets: [15, 13, 11, 9, 7].map((reps) => ({ exerciseId: 1, reps, weight: 5 })),
      },
    ]
    renderLogWorkout('/log', { [selectedDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))

    expect(screen.getAllByText('10 kg')).toHaveLength(5)
    expect(screen.queryByText('5 kg')).not.toBeInTheDocument()
  })

  it('shows previous custom sets for the same exercise for up to seven days', () => {
    const selectedDate = today()
    const selectedDay = new Date(selectedDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const previousDate = addDays(selectedDate, -7)
    const previousDay = new Date(previousDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'previous-session',
      date: previousDate,
      day: previousDay,
      sets: [{ exerciseId: 1, reps: 10, weight: 25 }],
    }]
    renderLogWorkout('/log', { [selectedDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByText('Önceki özel set · 10 tekrar')).toBeInTheDocument()
    expect(screen.getByText('25 kg')).toBeInTheDocument()
  })

  it('hides previous custom sets when the previous session was more than seven days ago', () => {
    const selectedDate = today()
    const selectedDay = new Date(selectedDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const previousDate = addDays(selectedDate, -8)
    const previousDay = new Date(previousDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'previous-session',
      date: previousDate,
      day: previousDay,
      sets: [{ exerciseId: 1, reps: 10, weight: 25 }],
    }]
    renderLogWorkout('/log', { [selectedDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.queryByText('Önceki özel set · 10 tekrar')).not.toBeInTheDocument()
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

  it('displays session-only exercises not in schedule with separator', () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: todayDate,
      day: todayDay,
      sets: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 2, reps: 15, weight: 80 },
      ],
    }]
    renderLogWorkout('/log', { [todayDay]: [1] }, sessions)

    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Squats')).toBeInTheDocument()
    expect(screen.getByText('Ek egzersizler')).toBeInTheDocument()
  })

  it('preserves session-only exercises on update without data loss', async () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: todayDate,
      day: todayDay,
      sets: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 2, reps: 15, weight: 80 },
      ],
    }]
    renderLogWorkout('/log', { [todayDay]: [1] }, sessions)

    fireEvent.click(screen.getByText('Bench Press'))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' }), { target: { value: '70' } })
    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].sets).toHaveLength(2)
    expect(data.sessions[0].sets.find((s) => s.exerciseId === 2)).toEqual({ exerciseId: 2, reps: 15, weight: 80 })
  })

  it('shows session-only exercises even when schedule is empty', () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: todayDate,
      day: todayDay,
      sets: [
        { exerciseId: 2, reps: 15, weight: 80 },
      ],
    }]
    renderLogWorkout('/log', { [todayDay]: [] }, sessions)

    expect(screen.getByText('Squats')).toBeInTheDocument()
    expect(screen.queryByText(/için antrenman atanmamış/)).not.toBeInTheDocument()
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

  it('does not show a save button when editing', () => {
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
    expect(screen.queryByText('Seansı Güncelle')).not.toBeInTheDocument()
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

    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].sets[0].weight).toBe(70)
    expect(data.sessions[0].sets[0].exerciseName).toBe('Bench Press')
  })

  it('saves edited values and returns to read-only when edit mode is closed', async () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 1, reps: 13, weight: 65 },
        { exerciseId: 2, reps: 15, weight: 45 },
      ],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    fireEvent.click(screen.getByLabelText('Seansı düzenle'))
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    expect(input).not.toBeDisabled()
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 13 tekrar ağırlığı' })).toHaveValue(65)
    fireEvent.change(input, { target: { value: '70' } })

    fireEvent.click(screen.getByLabelText('Düzenlemeyi kapat'))
    expect(input).toBeDisabled()

    await new Promise((r) => setTimeout(r, 100))
    const updatedSession = JSON.parse(localStorage.getItem('workout-data')).sessions[0]
    expect(updatedSession.sets).toContainEqual({
      exerciseId: 1,
      exerciseName: 'Bench Press',
      reps: 15,
      weight: 70,
    })
    expect(updatedSession.sets).toContainEqual({ exerciseId: 1, reps: 13, weight: 65 })
    expect(updatedSession.sets).toContainEqual({ exerciseId: 2, reps: 15, weight: 45 })
  })

  it('shows and preserves old session exercises outside the current schedule when edit mode closes unchanged', async () => {
    const yesterday = addDays(today(), -1)
    const yesterdayDay = new Date(yesterday + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    const oldSet = {
      exerciseId: 2,
      exerciseName: 'Squats',
      reps: 15,
      weight: 80,
    }
    const sessions = [{
      id: 'session-1',
      date: yesterday,
      day: yesterdayDay,
      sets: [oldSet],
    }]
    renderLogWorkout('/log', { [yesterdayDay]: [1] }, sessions)
    fireEvent.click(screen.getByText(formatDateLabel(yesterday)))

    expect(screen.getByText('Squats')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Seansı düzenle'))
    expect(screen.getByRole('spinbutton', { name: 'Squats 15 tekrar ağırlığı' })).toHaveValue(80)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(null)

    fireEvent.click(screen.getByLabelText('Düzenlemeyi kapat'))
    await new Promise((r) => setTimeout(r, 100))

    const updatedSession = JSON.parse(localStorage.getItem('workout-data')).sessions[0]
    expect(updatedSession.sets).toEqual([oldSet])
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

    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].sets[0].weight).toBe(60)
    expect(data.sessions[0].sets[0].exerciseName).toBe('Bench Press')
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

describe('LogWorkout - Auto-save', () => {
  it('saves a session to local storage as soon as a value is entered', async () => {
    const todayDate = today()
    const todayDay = new Date(todayDate + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    renderLogWorkout('/log', { [todayDay]: [1] })

    fireEvent.click(screen.getByText('Bench Press'))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' }), { target: { value: '60' } })
    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].date).toBe(todayDate)
    expect(data.sessions[0].sets).toEqual([{ exerciseId: 1, exerciseName: 'Bench Press', reps: 15, weight: 60 }])
    expect(localStorage.getItem('workout-draft')).toBeNull()
  })

  it('updates the same session and the total on every change', async () => {
    const todayDay = new Date(today() + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    renderLogWorkout('/log', { [todayDay]: [1] })

    fireEvent.click(screen.getByText('Bench Press'))
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    fireEvent.change(input, { target: { value: '60' } })
    expect(screen.getByText('900 kg')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '70' } })
    expect(screen.getByText('1,050 kg')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 100))

    const data = JSON.parse(localStorage.getItem('workout-data'))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].sets[0].weight).toBe(70)
  })

  it('removes the session when all values are cleared', async () => {
    const todayDay = new Date(today() + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
    renderLogWorkout('/log', { [todayDay]: [1] })

    fireEvent.click(screen.getByText('Bench Press'))
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    fireEvent.change(input, { target: { value: '60' } })
    fireEvent.change(input, { target: { value: '' } })
    await new Promise((r) => setTimeout(r, 100))

    expect(JSON.parse(localStorage.getItem('workout-data')).sessions).toHaveLength(0)
  })
})
