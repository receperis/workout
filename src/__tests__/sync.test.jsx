// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { WorkoutProvider, useWorkout, mergeData } from '../context/WorkoutContext'
import { EMPTY_WORKOUT_DATA } from '../types'

const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockFindOrCreateFile = vi.fn()
const mockLoadFromDrive = vi.fn()
const mockSaveToDrive = vi.fn()
const mockRestoreSession = vi.fn()
let mockSignedIn = false

vi.mock('../googleDrive', () => ({
  isSignedIn: () => mockSignedIn,
  signIn: (...args) => mockSignIn(...args),
  signOut: (...args) => mockSignOut(...args),
  restoreSession: (...args) => mockRestoreSession(...args),
  findOrCreateFile: (...args) => mockFindOrCreateFile(...args),
  loadFromDrive: (...args) => mockLoadFromDrive(...args),
  saveToDrive: (...args) => mockSaveToDrive(...args),
  loadGoogleScripts: vi.fn(),
}))

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  localStorage.clear()
  mockSignedIn = false
  mockSignIn.mockReset()
  mockSignOut.mockReset()
  mockRestoreSession.mockReset()
  mockFindOrCreateFile.mockReset()
  mockLoadFromDrive.mockReset()
  mockSaveToDrive.mockReset()
  mockSaveToDrive.mockResolvedValue({})
})

afterEach(() => {
  cleanup()
})

function TestComponent() {
  const { state, dispatch, signIn, signOut, syncNow, syncStatus, signedIn } = useWorkout()
  return (
    <div>
      <span data-testid="exercises">{JSON.stringify(state.exercises)}</span>
      <span data-testid="schedule">{JSON.stringify(state.schedule)}</span>
      <span data-testid="sessions">{JSON.stringify(state.sessions)}</span>
      <span data-testid="syncStatus">{syncStatus}</span>
      <span data-testid="signedIn">{String(signedIn)}</span>
      <button onClick={() => dispatch({ type: 'ADD_EXERCISE', payload: 'Bench Press' })}>
        Add Exercise
      </button>
      <button onClick={() => signIn()}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <button onClick={() => syncNow()}>Sync Now</button>
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

describe('mergeData', () => {
  it('returns local when remote is empty', () => {
    const result = mergeData(EMPTY_WORKOUT_DATA, { exercises: [], schedule: {}, sessions: [] })
    expect(result).toEqual(EMPTY_WORKOUT_DATA)
  })

  it('returns remote when local is empty', () => {
    const remote = {
      exercises: [{ id: 2, name: 'Squats' }],
      schedule: { Friday: [2] },
      sessions: [{ id: '2', date: '2026-09-15', day: 'Friday', sets: [] }],
    }
    const result = mergeData({ exercises: [], schedule: {}, sessions: [] }, remote)
    expect(result).toEqual(remote)
  })

  it('combines exercises from both sources', () => {
    const local = { exercises: [{ id: 1, name: 'Bench Press' }], schedule: {}, sessions: [] }
    const remote = { exercises: [{ id: 2, name: 'Squats' }], schedule: {}, sessions: [] }
    const result = mergeData(local, remote)
    expect(result.exercises).toEqual([{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }])
  })

  it('deduplicates exercises by ID', () => {
    const local = { exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }], schedule: {}, sessions: [] }
    const remote = { exercises: [{ id: 2, name: 'Squats' }, { id: 3, name: 'Deadlift' }], schedule: {}, sessions: [] }
    const result = mergeData(local, remote)
    expect(result.exercises).toEqual([{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }, { id: 3, name: 'Deadlift' }])
  })

  it('local schedule overrides remote for shared keys', () => {
    const local = {
      exercises: [],
      schedule: { Monday: [1], Wednesday: [2] },
      sessions: [],
    }
    const remote = {
      exercises: [],
      schedule: { Monday: [3], Friday: [4] },
      sessions: [],
    }
    const result = mergeData(local, remote)
    expect(result.schedule).toEqual({
      Monday: [1],
      Wednesday: [2],
      Friday: [4],
    })
  })

  it('merges sessions by id, local wins for conflicts', () => {
    const local = {
      exercises: [],
      schedule: {},
      sessions: [{ id: '1', date: '2026-09-14', day: 'Monday', sets: [] }],
    }
    const remote = {
      exercises: [],
      schedule: {},
      sessions: [
        { id: '1', date: '2026-09-14', day: 'Monday', sets: [{ exerciseId: 1, reps: 15, weight: 50 }] },
        { id: '2', date: '2026-09-15', day: 'Friday', sets: [] },
      ],
    }
    const result = mergeData(local, remote)
    expect(result.sessions).toHaveLength(2)
    expect(result.sessions.find((s) => s.id === '1')).toEqual(local.sessions[0])
    expect(result.sessions.find((s) => s.id === '2')).toEqual(remote.sessions[1])
  })
})

describe('signIn sync flow', () => {
  it('loads data from Drive and merges with local on signIn', async () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [{ id: 1, name: 'Bench Press' }],
        schedule: { Monday: [1] },
        sessions: [],
      }),
    )

    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue({
      exercises: [{ id: 2, name: 'Squats' }],
      schedule: { Friday: [2] },
      sessions: [],
    })

    renderWithProvider()

    expect(screen.getByTestId('exercises')).toHaveTextContent('[{"id":1,"name":"Bench Press"}]')

    mockSignedIn = true
    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    expect(mockSignIn).toHaveBeenCalled()
    expect(mockFindOrCreateFile).toHaveBeenCalled()
    expect(mockLoadFromDrive).toHaveBeenCalledWith('file1')
    expect(screen.getByTestId('exercises')).toHaveTextContent('[{"id":1,"name":"Bench Press"},{"id":2,"name":"Squats"}]')
    expect(screen.getByTestId('schedule')).toHaveTextContent(
      '{"Friday":[2],"Monday":[1]}',
    )
  })

  it('uses Drive data when local is empty', async () => {
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue({
      exercises: [{ id: 28, name: 'Squats' }],
      schedule: { Friday: [28] },
      sessions: [{ id: 's1', date: '2026-09-15', day: 'Friday', sets: [] }],
    })

    renderWithProvider()

    mockSignedIn = true
    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    const exercises = JSON.parse(screen.getByTestId('exercises').textContent)
    expect(exercises).toEqual([...EMPTY_WORKOUT_DATA.exercises, { id: 28, name: 'Squats' }])
    const schedule = JSON.parse(screen.getByTestId('schedule').textContent)
    expect(schedule).toEqual({ Friday: [28], ...EMPTY_WORKOUT_DATA.schedule })
    expect(screen.getByTestId('sessions')).toHaveTextContent(
      '[{"id":"s1","date":"2026-09-15","day":"Friday","sets":[]}]',
    )
  })

  it('deduplicates sessions from Drive and local', async () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [],
        schedule: {},
        sessions: [{ id: 's1', date: '2026-09-14', day: 'Monday', sets: [] }],
      }),
    )

    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue({
      exercises: [],
      schedule: {},
      sessions: [
        { id: 's1', date: '2026-09-14', day: 'Monday', sets: [{ exerciseId: 1, reps: 15, weight: 50 }] },
        { id: 's2', date: '2026-09-15', day: 'Friday', sets: [] },
      ],
    })

    renderWithProvider()

    mockSignedIn = true
    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    const sessions = JSON.parse(screen.getByTestId('sessions').textContent)
    expect(sessions).toHaveLength(2)
    expect(sessions.find((s) => s.id === 's2')).toBeDefined()
  })
})

describe('Drive sync on state change', () => {
  it('does not auto-push state to Drive on state change', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    mockSaveToDrive.mockClear()

    await act(async () => {
      screen.getByText('Add Exercise').click()
      await flush()
    })

    expect(mockSaveToDrive).not.toHaveBeenCalled()
  })

  it('does not push to Drive when not signed in', async () => {
    renderWithProvider()

    await act(async () => {
      screen.getByText('Add Exercise').click()
      await flush()
    })

    expect(mockSaveToDrive).not.toHaveBeenCalled()
  })

  it('does not change syncStatus on state change', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('idle')

    mockSaveToDrive.mockClear()
    await act(async () => {
      screen.getByText('Add Exercise').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('idle')
  })
})

describe('signOut', () => {
  it('clears signedIn state and stops syncing', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    expect(screen.getByTestId('signedIn')).toHaveTextContent('true')

    mockSignedIn = false
    act(() => {
      screen.getByText('Sign Out').click()
    })

    expect(screen.getByTestId('signedIn')).toHaveTextContent('false')
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('does not push to Drive after signOut', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    mockSignedIn = false
    mockSaveToDrive.mockClear()
    act(() => {
      screen.getByText('Sign Out').click()
    })

    await act(async () => {
      screen.getByText('Add Exercise').click()
      await flush()
    })

    expect(mockSaveToDrive).not.toHaveBeenCalled()
  })
})

describe('syncNow', () => {
  it('pushes current state to Drive when called manually', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    await act(async () => {
      screen.getByText('Add Exercise').click()
      await flush()
    })

    mockSaveToDrive.mockClear()

    await act(async () => {
      screen.getByText('Sync Now').click()
      await flush()
    })

    expect(mockSaveToDrive).toHaveBeenCalledWith('file1', expect.objectContaining({
      exercises: [...EMPTY_WORKOUT_DATA.exercises, { id: 28, name: 'Bench Press' }],
    }))
  })

  it('sets syncStatus to syncing then idle on successful sync', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('idle')

    await act(async () => {
      screen.getByText('Sync Now').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('idle')
  })

  it('sets syncStatus to error on failed sync', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    mockSaveToDrive.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      screen.getByText('Sync Now').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('error')
  })

  it('does nothing when not signed in', async () => {
    renderWithProvider()

    await act(async () => {
      screen.getByText('Sync Now').click()
      await flush()
    })

    expect(mockSaveToDrive).not.toHaveBeenCalled()
  })
})
