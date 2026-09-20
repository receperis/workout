/**
 * @typedef {Object} Exercise
 * @property {number} id - Unique integer ID
 * @property {string} name - Display name (can be renamed)
 */

/**
 * @typedef {Object} WorkoutSet
 * @property {number} exerciseId - Exercise ID
 * @property {PyramidRep} reps - Number of reps (15, 13, 11, 9, or 7)
 * @property {number} weight - Weight in kilograms
 */

/**
 * @typedef {Object} WorkoutSession
 * @property {string} id - UUID
 * @property {string} date - ISO date string (e.g. "2026-09-14")
 * @property {string} day - Day of the week (e.g. "Monday")
 * @property {WorkoutSet[]} sets - Array of sets completed
 */

/**
 * @typedef {Object} WorkoutData
 * @property {Exercise[]} exercises - User-defined exercises
 * @property {Record<string, number[]>} schedule - Day name -> exercise IDs
 * @property {WorkoutSession[]} sessions - All logged sessions
 */

/**
 * @typedef {15|13|11|9|7} PyramidRep
 */

/**
 * @typedef {'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday'} DayOfWeek
 */

/**
 * @typedef {Object} AuthState
 * @property {boolean} signedIn - Whether the user is signed in
 * @property {string|null} accessToken - Google OAuth access token
 */

export const PYRAMID_REPS = /** @type {const} */ ([15, 13, 11, 9, 7])

export const DAYS_OF_WEEK = /** @type {const} */ ([
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
])

export const EMPTY_WORKOUT_DATA = /** @type {const} */ ({
  exercises: [
    { id: 1, name: 'Bench Press' },
    { id: 2, name: 'Squats' },
    { id: 3, name: 'Deadlift' },
    { id: 4, name: 'Overhead Press' },
    { id: 5, name: 'bench dips' },
    { id: 6, name: 'Alna press' },
    { id: 7, name: 'Cable Push' },
    { id: 8, name: 'Lateral pull - srt' },
    { id: 9, name: 'Low row - srt' },
    { id: 10, name: 'Dumbell Enseden itiş' },
  ],
  schedule: {},
  sessions: [],
})

/**
 * @param {Exercise[]} exercises
 * @param {number} id
 * @returns {string}
 */
export function exerciseNameById(exercises, id) {
  return exercises.find((e) => e.id === id)?.name ?? String(id)
}

/**
 * @param {unknown} value
 * @returns {value is Exercise}
 */
export function isExercise(value) {
  if (typeof value !== 'object' || value === null) return false
  const obj = /** @type {Record<string, unknown>} */ (value)
  return typeof obj.id === 'number' && typeof obj.name === 'string'
}

/**
 * @param {unknown} value
 * @returns {value is WorkoutSet}
 */
export function isWorkoutSet(value) {
  if (typeof value !== 'object' || value === null) return false
  const obj = /** @type {Record<string, unknown>} */ (value)
  return (
    typeof obj.exerciseId === 'number' &&
    PYRAMID_REPS.includes(/** @type {PyramidRep} */ (obj.reps)) &&
    typeof obj.weight === 'number' &&
    obj.weight > 0
  )
}

/**
 * @param {unknown} value
 * @returns {value is WorkoutSession}
 */
export function isWorkoutSession(value) {
  if (typeof value !== 'object' || value === null) return false
  const obj = /** @type {Record<string, unknown>} */ (value)
  return (
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.day === 'string' &&
    DAYS_OF_WEEK.includes(/** @type {DayOfWeek} */ (obj.day)) &&
    Array.isArray(obj.sets) &&
    obj.sets.every(isWorkoutSet)
  )
}

/**
 * @param {unknown} value
 * @returns {value is WorkoutData}
 */
export function isWorkoutData(value) {
  if (typeof value !== 'object' || value === null) return false
  const obj = /** @type {Record<string, unknown>} */ (value)
  return (
    Array.isArray(obj.exercises) &&
    obj.exercises.every(isExercise) &&
    typeof obj.schedule === 'object' &&
    obj.schedule !== null &&
    Object.values(obj.schedule).every(
      (v) => Array.isArray(v) && v.every((e) => typeof e === 'number'),
    ) &&
    Array.isArray(obj.sessions) &&
    obj.sessions.every(isWorkoutSession)
  )
}
