import { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react'
import { EMPTY_WORKOUT_DATA } from '../types'
import { loadData, saveData, clearSessionData, getFileId, saveFileId, clearFileId } from '../storage'
import {
  isSignedIn,
  signIn as driveSignIn,
  signOut as driveSignOut,
  findOrCreateFile,
  loadFromDrive,
  loadGoogleScripts,
  restoreSession,
  saveToDrive,
} from '../googleDrive'

const WorkoutContext = createContext(/** @type {import('react').Context<WorkoutContextValue | null>} */ (null))

/**
 * @typedef {'ADD_EXERCISE' | 'REMOVE_EXERCISE' | 'RENAME_EXERCISE' | 'LOG_SESSION' | 'UPDATE_SESSION' | 'SET_SCHEDULE' | 'LOAD_DATA' | 'RESET_DATA'} WorkoutActionType
 */

/**
 * @typedef {Object} WorkoutAction
 * @property {WorkoutActionType} type
 * @property {*} [payload]
 */

/**
 * @typedef {'idle' | 'syncing' | 'error'} SyncStatus
 */

/**
 * @typedef {Object} WorkoutContextValue
 * @property {import('../types').WorkoutData} state
 * @property {React.Dispatch<WorkoutAction>} dispatch
 * @property {() => Promise<void>} signIn
 * @property {() => void} signOut
 * @property {() => Promise<void>} syncNow
 * @property {() => Promise<void>} resetData
 * @property {SyncStatus} syncStatus
 * @property {boolean} signedIn
 * @property {boolean} online
 */

/**
 * @param {import('../types').WorkoutData} local
 * @param {import('../types').WorkoutData} remote
 * @returns {import('../types').WorkoutData}
 */
export function mergeData(local, remote) {
  const exerciseMap = new Map()
  for (const e of local.exercises) exerciseMap.set(e.id, e)
  for (const e of remote.exercises) {
    if (!exerciseMap.has(e.id)) exerciseMap.set(e.id, e)
  }
  const exercises = [...exerciseMap.values()]

  const schedule = { ...remote.schedule, ...local.schedule }

  const sessionMap = new Map()
  for (const s of remote.sessions) sessionMap.set(s.id, s)
  for (const s of local.sessions) sessionMap.set(s.id, s)
  const sessions = [...sessionMap.values()]

  return { exercises, schedule, sessions }
}

/**
 * @param {import('../types').WorkoutData} state
 * @param {WorkoutAction} action
 * @returns {import('../types').WorkoutData}
 */
function workoutReducer(state, action) {
  switch (action.type) {
    case 'ADD_EXERCISE': {
      const maxId = state.exercises.reduce((max, e) => Math.max(max, e.id), 0)
      return {
        ...state,
        exercises: [...state.exercises, { id: maxId + 1, name: action.payload }],
      }
    }

    case 'REMOVE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.filter((e) => e.id !== action.payload),
      }

    case 'RENAME_EXERCISE': {
      const { id, newName } = action.payload
      return {
        ...state,
        exercises: state.exercises.map((e) => (e.id === id ? { ...e, name: newName } : e)),
      }
    }

    case 'LOG_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
      }

    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.id ? action.payload : s,
        ),
      }

    case 'SET_SCHEDULE':
      return {
        ...state,
        schedule: action.payload,
      }

    case 'LOAD_DATA':
      return action.payload

    case 'RESET_DATA':
      return { ...EMPTY_WORKOUT_DATA, sessions: state.sessions }

    default:
      return state
  }
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function WorkoutProvider({ children }) {
  const [state, dispatch] = useReducer(workoutReducer, EMPTY_WORKOUT_DATA, loadData)
  const fileIdRef = useRef(null)
  const stateRef = useRef(state)
  const [syncStatus, setSyncStatus] = useState(/** @type {SyncStatus} */ ('idle'))
  const [signedIn, setSignedIn] = useState(() => isSignedIn())
  const skipSyncRef = useRef(false)
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  stateRef.current = state

  useEffect(() => {
    saveData(state)
  }, [state])

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    if (!isSignedIn() || !fileIdRef.current) return
    if (!navigator.onLine) {
      setSyncStatus('error')
      return
    }
    setSyncStatus('syncing')
    saveToDrive(fileIdRef.current, state)
      .then(() => {
        setSyncStatus('idle')
      })
      .catch((e) => {
        const err = e instanceof Error ? e.message : String(e)
        if (err === 'Token expired') {
          driveSignOut()
          fileIdRef.current = null
          clearFileId()
          setSignedIn(false)
          setSyncStatus('idle')
        } else {
          setSyncStatus('error')
        }
      })
  }, [state])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isSignedIn() && fileIdRef.current) {
        clearSessionData()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return

    let cancelled = false

    async function restore() {
      try {
        await loadGoogleScripts()
        await restoreSession(clientId)
        if (cancelled) return

        setSignedIn(true)

        let fileId = getFileId()
        if (!fileId) {
          const result = await findOrCreateFile()
          fileId = result.fileId
        }
        if (cancelled) return

        fileIdRef.current = fileId
        saveFileId(fileId)

        const driveData = await loadFromDrive(fileId)
        if (cancelled) return

        const merged = mergeData(stateRef.current, driveData)
        skipSyncRef.current = true
        dispatch({ type: 'LOAD_DATA', payload: merged })
      } catch {
        // Silent fail — user stays signed out, can re-auth manually
      }
    }

    restore()

    return () => { cancelled = true }
  }, [])

  const signIn = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) throw new Error('Missing Google Client ID')

    await loadGoogleScripts()
    await driveSignIn(clientId)
    setSignedIn(true)
    const { fileId } = await findOrCreateFile()
    fileIdRef.current = fileId
    saveFileId(fileId)
    const driveData = await loadFromDrive(fileId)
    const merged = mergeData(stateRef.current, driveData)
    skipSyncRef.current = true
    dispatch({ type: 'LOAD_DATA', payload: merged })
  }, [])

  const signOut = useCallback(() => {
    driveSignOut()
    fileIdRef.current = null
    clearFileId()
    clearSessionData()
    setSignedIn(false)
    setSyncStatus('idle')
  }, [])

  const resetData = useCallback(async () => {
    dispatch({ type: 'RESET_DATA' })
    if (isSignedIn() && fileIdRef.current) {
      try {
        const driveData = await loadFromDrive(fileIdRef.current)
        const merged = mergeData(stateRef.current, driveData)
        skipSyncRef.current = true
        dispatch({ type: 'LOAD_DATA', payload: merged })
      } catch {
        // Drive may be unreachable — local reset still applied
      }
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!isSignedIn() || !fileIdRef.current) return
    if (!navigator.onLine) {
      setSyncStatus('error')
      return
    }
    setSyncStatus('syncing')
    try {
      await saveToDrive(fileIdRef.current, stateRef.current)
      setSyncStatus('idle')
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      if (err === 'Token expired') {
        driveSignOut()
        fileIdRef.current = null
        clearFileId()
        setSignedIn(false)
        setSyncStatus('idle')
      } else {
        setSyncStatus('error')
      }
    }
  }, [])

  return (
    <WorkoutContext.Provider
      value={{ state, dispatch, signIn, signOut, syncNow, syncStatus, signedIn, online, resetData }}
    >
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkout() {
  const context = useContext(WorkoutContext)
  if (context === null) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}
