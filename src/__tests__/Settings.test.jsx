// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Settings from '../pages/Settings'
import { WorkoutProvider } from '../context/WorkoutContext'
import { EMPTY_WORKOUT_DATA } from '../types'

const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockFindOrCreateFile = vi.fn()
const mockLoadFromDrive = vi.fn()
const mockSaveToDrive = vi.fn()
let mockSignedIn = false

vi.mock('../googleDrive', () => ({
  isSignedIn: () => mockSignedIn,
  signIn: (...args) => mockSignIn(...args),
  signOut: (...args) => mockSignOut(...args),
  findOrCreateFile: (...args) => mockFindOrCreateFile(...args),
  loadFromDrive: (...args) => mockLoadFromDrive(...args),
  saveToDrive: (...args) => mockSaveToDrive(...args),
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
  mockSignedIn = false
  mockSignIn.mockReset()
  mockSignOut.mockReset()
  mockFindOrCreateFile.mockReset()
  mockLoadFromDrive.mockReset()
  mockSaveToDrive.mockReset()
  mockSaveToDrive.mockResolvedValue({})
})

function renderSettings() {
  return render(
    <WorkoutProvider>
      <Settings />
    </WorkoutProvider>,
  )
}

function addExercise(name) {
  const input = screen.getByPlaceholderText('Yeni antrenman adı')
  fireEvent.change(input, { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: /ekle/i }))
}

function expandExercisesSection() {
  act(() => {
    screen.getByText('Antrenmanlar').click()
  })
}

function getExercisesSection() {
  return screen.getByText('Antrenmanlar').closest('section')
}

describe('Settings - Exercise List', () => {
  it('renders pre-populated exercises', () => {
    renderSettings()
    expandExercisesSection()
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Smith Incline Bench Press')).toBeInTheDocument()
  })

  it('adds an exercise', () => {
    renderSettings()
    expandExercisesSection()
    addExercise('Dumbbell Curl')
    expect(within(getExercisesSection()).getByText('Dumbbell Curl')).toBeInTheDocument()
  })

  it('does not add duplicate exercise', () => {
    renderSettings()
    expandExercisesSection()
    addExercise('Dumbbell Curl')
    addExercise('Dumbbell Curl')
    const exercisesSection = getExercisesSection()
    expect(within(exercisesSection).getAllByText('Dumbbell Curl')).toHaveLength(1)
  })

  it('does not add empty exercise', () => {
    renderSettings()
    expandExercisesSection()
    fireEvent.click(screen.getByRole('button', { name: /ekle/i }))
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Smith Incline Bench Press')).toBeInTheDocument()
  })

  it('removes an exercise', () => {
    renderSettings()
    expandExercisesSection()
    const benchPressRow = screen.getByText('Bench Press').closest('div')
    act(() => {
      within(benchPressRow).getByText('Kaldır').click()
    })
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()
    expect(screen.getByText('Smith Incline Bench Press')).toBeInTheDocument()
  })

  it('renames an exercise', () => {
    renderSettings()
    expandExercisesSection()
    const benchPressRow = screen.getByText('Bench Press').closest('div')
    act(() => {
      within(benchPressRow).getByText('Yeniden Adlandır').click()
    })
    const editInput = screen.getByDisplayValue('Bench Press')
    fireEvent.change(editInput, { target: { value: 'Chest Press' } })
    fireEvent.click(screen.getByText('Kaydet'))
    expect(within(getExercisesSection()).getByText('Chest Press')).toBeInTheDocument()
    expect(within(getExercisesSection()).queryByText('Bench Press')).not.toBeInTheDocument()
  })

  it('cancels rename on Escape', () => {
    renderSettings()
    expandExercisesSection()
    const benchPressRow = screen.getByText('Bench Press').closest('div')
    act(() => {
      within(benchPressRow).getByText('Yeniden Adlandır').click()
    })
    const editInput = screen.getByDisplayValue('Bench Press')
    fireEvent.keyDown(editInput, { key: 'Escape' })
    expect(within(getExercisesSection()).getByText('Bench Press')).toBeInTheDocument()
    expect(within(benchPressRow).getByText('Yeniden Adlandır')).toBeInTheDocument()
  })

  it('renames via Enter key', () => {
    renderSettings()
    expandExercisesSection()
    const benchPressRow = screen.getByText('Bench Press').closest('div')
    act(() => {
      within(benchPressRow).getByText('Yeniden Adlandır').click()
    })
    const editInput = screen.getByDisplayValue('Bench Press')
    fireEvent.change(editInput, { target: { value: 'Chest Press' } })
    fireEvent.keyDown(editInput, { key: 'Enter' })
    expect(within(getExercisesSection()).getByText('Chest Press')).toBeInTheDocument()
    expect(within(getExercisesSection()).queryByText('Bench Press')).not.toBeInTheDocument()
  })
})

describe('Settings - Schedule Editor', () => {
  it('shows day headings when exercises exist', () => {
    renderSettings()
    expect(screen.getByText('Pazartesi')).toBeInTheDocument()
    expect(screen.getByText('Pazar')).toBeInTheDocument()
  })

  it('shows checkboxes for each exercise under each day', () => {
    renderSettings()
    act(() => {
      screen.getByText('Pazartesi').click()
    })
    const scheduleSection = screen.getByText('Program').closest('section')
    const checkboxes = within(scheduleSection).getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(10)
  })

  it('assigns exercise to a day on toggle', () => {
    renderSettings()
    act(() => {
      screen.getByText('Pazartesi').click()
    })
    const scheduleSection = screen.getByText('Program').closest('section')
    const checkboxes = within(scheduleSection).getAllByRole('checkbox')
    const unchecked = checkboxes.find((cb) => !cb.checked)
    act(() => {
      fireEvent.click(unchecked)
    })
    expect(unchecked).toBeChecked()
  })

  it('unassigns exercise from a day on second toggle', () => {
    renderSettings()
    act(() => {
      screen.getByText('Pazartesi').click()
    })
    const scheduleSection = screen.getByText('Program').closest('section')
    const checkboxes = within(scheduleSection).getAllByRole('checkbox')
    const checked = checkboxes.find((cb) => cb.checked)
    act(() => {
      fireEvent.click(checked)
    })
    expect(checked).not.toBeChecked()
    act(() => {
      fireEvent.click(checked)
    })
    expect(checked).toBeChecked()
  })

  it('can assign multiple exercises to a day', () => {
    renderSettings()
    act(() => {
      screen.getByText('Pazartesi').click()
    })
    const scheduleSection = screen.getByText('Program').closest('section')
    const checkboxes = within(scheduleSection).getAllByRole('checkbox')
    const unchecked = checkboxes.filter((cb) => !cb.checked)
    act(() => {
      fireEvent.click(unchecked[0])
    })
    act(() => {
      fireEvent.click(unchecked[1])
    })
    expect(unchecked[0]).toBeChecked()
    expect(unchecked[1]).toBeChecked()
  })
})

describe('Google Drive connection', () => {
  it('shows Connect Google Drive button when not signed in', () => {
    renderSettings()
    expect(screen.getByText("Google Drive'a Bağlan")).toBeInTheDocument()
    expect(screen.queryByText('Bağlantıyı Kes')).not.toBeInTheDocument()
  })

  it('shows connected status, Sync Now, and Disconnect button when signed in', () => {
    mockSignedIn = true
    renderSettings()
    expect(screen.getByText('Bağlı')).toBeInTheDocument()
    expect(screen.getByText('Güncel')).toBeInTheDocument()
    expect(screen.getByText('Şimdi Senkronize Et')).toBeInTheDocument()
    expect(screen.getByText('Bağlantıyı Kes')).toBeInTheDocument()
    expect(screen.queryByText("Google Drive'a Bağlan")).not.toBeInTheDocument()
  })

  it('shows sync status when connected', () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderSettings()

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('Güncel')
  })

  it('shows sync button when connected', () => {
    mockSignedIn = true
    renderSettings()
    expect(screen.getByTestId('syncButton')).toBeInTheDocument()
    expect(screen.getByText('Şimdi Senkronize Et')).toBeInTheDocument()
  })
})
