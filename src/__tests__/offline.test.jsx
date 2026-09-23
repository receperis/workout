// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { WorkoutProvider, useWorkout } from '../context/WorkoutContext'
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

function TestComponent() {
  const { state, dispatch, signIn, signOut, syncNow, syncStatus, signedIn, online } = useWorkout()
  return (
    <div>
      <span data-testid="exercises">{JSON.stringify(state.exercises)}</span>
      <span data-testid="syncStatus">{syncStatus}</span>
      <span data-testid="signedIn">{String(signedIn)}</span>
      <span data-testid="online">{String(online)}</span>
      <button onClick={() => dispatch({ type: 'ADD_EXERCISE', payload: 'Bench Press' })}>
        Add Exercise
      </button>
      <button onClick={() => syncNow()}>Sync Now</button>
      <button onClick={() => signIn()}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
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

beforeEach(() => {
  localStorage.clear()
  mockSignedIn = false
  mockSignIn.mockReset()
  mockSignOut.mockReset()
  mockFindOrCreateFile.mockReset()
  mockLoadFromDrive.mockReset()
  mockSaveToDrive.mockReset()
  mockSaveToDrive.mockResolvedValue({})
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
})

afterEach(() => {
  cleanup()
})

describe('offline detection', () => {
  it('initializes online state from navigator.onLine', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    renderWithProvider()
    expect(screen.getByTestId('online')).toHaveTextContent('false')
  })

  it('sets online to false on offline event', async () => {
    renderWithProvider()
    expect(screen.getByTestId('online')).toHaveTextContent('true')

    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(screen.getByTestId('online')).toHaveTextContent('false')
  })

  it('sets online to true on online event', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    renderWithProvider()
    expect(screen.getByTestId('online')).toHaveTextContent('false')

    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    expect(screen.getByTestId('online')).toHaveTextContent('true')
  })
})

describe('sync behavior when offline', () => {
  it('sets error status when offline while signed in and calling syncNow', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    mockSaveToDrive.mockClear()
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })

    await act(async () => {
      screen.getByText('Sync Now').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('error')
    expect(mockSaveToDrive).not.toHaveBeenCalled()
  })

  it('does not auto-sync on state change when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    mockSaveToDrive.mockClear()
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })

    await act(async () => {
      screen.getByText('Add Exercise').click()
      await flush()
    })

    expect(screen.getByTestId('syncStatus')).toHaveTextContent('idle')
    expect(mockSaveToDrive).not.toHaveBeenCalled()
  })
})

describe('sync succeeds when online', () => {
  it('does not auto-sync on state change when online', async () => {
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
    expect(screen.getByTestId('syncStatus')).toHaveTextContent('idle')
  })
})

describe('signOut', () => {
  it('clears signed-in state and session data on sign out', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue(EMPTY_WORKOUT_DATA)

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    mockSignedIn = false
    await act(async () => {
      screen.getByText('Sign Out').click()
    })

    expect(screen.getByTestId('signedIn')).toHaveTextContent('false')
    expect(localStorage.getItem('workout-data')).toBeNull()
    expect(localStorage.getItem('google-drive-file-id')).toBeNull()
  })
})

describe('signIn', () => {
  it('loads data from Drive after sign in', async () => {
    mockSignedIn = true
    mockFindOrCreateFile.mockResolvedValue({ folderId: 'f1', fileId: 'file1' })
    mockLoadFromDrive.mockResolvedValue({
      exercises: [{ id: 1, name: 'Squats' }],
      schedule: {},
      sessions: [],
    })

    renderWithProvider()

    await act(async () => {
      screen.getByText('Sign In').click()
      await flush()
    })

    expect(screen.getByTestId('exercises')).toHaveTextContent(
      JSON.stringify(EMPTY_WORKOUT_DATA.exercises),
    )
    expect(screen.getByTestId('signedIn')).toHaveTextContent('true')
  })
})
