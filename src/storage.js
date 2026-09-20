import { EMPTY_WORKOUT_DATA } from './types'

const STORAGE_KEY = 'workout-data'
const FILE_ID_KEY = 'google-drive-file-id'
const DRAFT_KEY = 'workout-draft'

/**
 * Migrate old format (string-based exercises) to new format (object-based with IDs).
 * @param {any} data
 * @returns {import('./types').WorkoutData}
 */
function migrateData(data) {
  if (!data || !Array.isArray(data.exercises) || data.exercises.length === 0) {
    return EMPTY_WORKOUT_DATA
  }

  // Already new format
  if (typeof data.exercises[0] === 'object' && data.exercises[0] !== null && 'id' in data.exercises[0]) {
    return data
  }

  // Old format: exercises is string[], schedule values are strings, sets use exercise string
  const nameToId = {}
  const exercises = data.exercises.map((name, i) => {
    const id = i + 1
    nameToId[name] = id
    return { id, name }
  })

  const schedule = {}
  for (const [day, exerciseNames] of Object.entries(data.schedule || {})) {
    schedule[day] = exerciseNames.map((name) => nameToId[name] ?? 0)
  }

  const sessions = (data.sessions || []).map((session) => ({
    ...session,
    sets: session.sets.map((set) => ({
      exerciseId: nameToId[set.exercise] ?? 0,
      reps: set.reps,
      weight: set.weight,
    })),
  }))

  return { exercises, schedule, sessions }
}

/**
 * @returns {import('./types').WorkoutData}
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return EMPTY_WORKOUT_DATA
    const parsed = JSON.parse(raw)
    return migrateData(parsed)
  } catch {
    return EMPTY_WORKOUT_DATA
  }
}

/**
 * @param {import('./types').WorkoutData} data
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

/**
 * Clear workout data from localStorage, keeping the Drive file ID.
 */
export function clearSessionData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently fail
  }
}

/**
 * @param {string} date
 * @param {Record<number, import('./types').WorkoutSet[]>} exerciseSets
 */
export function saveDraft(date, exerciseSets) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ date, exerciseSets }))
  } catch {
    // Silently fail
  }
}

/**
 * @returns {{ date: string, exerciseSets: Record<number, import('./types').WorkoutSet[]> } | null}
 */
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Remove the in-progress draft from localStorage.
 */
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Silently fail
  }
}

/**
 * @returns {string | null}
 */
export function getFileId() {
  try {
    return localStorage.getItem(FILE_ID_KEY)
  } catch {
    return null
  }
}

/**
 * @param {string} fileId
 */
export function saveFileId(fileId) {
  try {
    localStorage.setItem(FILE_ID_KEY, fileId)
  } catch {
    // Silently fail
  }
}

/**
 * Remove the cached Drive file ID.
 */
export function clearFileId() {
  try {
    localStorage.removeItem(FILE_ID_KEY)
  } catch {
    // Silently fail
  }
}
