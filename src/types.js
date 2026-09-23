/**
 * @typedef {Object} Exercise
 * @property {number} id - Unique integer ID
 * @property {string} name - Display name (can be renamed)
 * @property {string} [image] - Optional image path
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
    { id: 1, name: 'Bench Press', image: '/images/exercises/bench-press.jpeg' },
    { id: 2, name: 'Smith Incline Bench Press', image: '/images/exercises/smith-incline-bench-press.jpeg' },
    { id: 3, name: 'Dumbbell Svend Press', image: '/images/exercises/dumbbell-svend-press.jpeg' },
    { id: 4, name: 'Fly', image: '/images/exercises/fly.jpeg' },
    { id: 5, name: 'Hammer Curl', image: '/images/exercises/hammer-curl.jpeg' },
    { id: 6, name: 'Biceps Curl', image: '/images/exercises/biceps-curl.jpeg' },
    { id: 7, name: 'Cross Body Hammer Curl', image: '/images/exercises/cross-body-hammer-curl.jpeg' },
    { id: 8, name: 'Concentration Curl', image: '/images/exercises/concentration-curl.jpeg' },
    { id: 9, name: 'Close Grip Preacher Curl', image: '/images/exercises/close-grip-preacher-curl.jpeg' },
    { id: 10, name: 'Cable Curl', image: '/images/exercises/cable-curl.jpeg' },
    { id: 11, name: 'One Arm Bent-over Row', image: '/images/exercises/one-arm-bent-over-row.jpeg' },
    { id: 12, name: 'Lever Seated Row', image: '/images/exercises/lever-seated-row.jpeg' },
    { id: 13, name: 'Bar Lateral Pulldown', image: '/images/exercises/bar-lateral-pulldown.jpeg' },
    { id: 14, name: 'Dumbbell Seated Reverse Grip', image: '/images/exercises/dumbbell-seated-reverse-grip.jpeg' },
    { id: 15, name: 'Weighted Pull-Up', image: '/images/exercises/weighted-pull-up.jpeg' },
    { id: 16, name: 'Barbell Lying Triceps Extension', image: '/images/exercises/barbell-lying-triceps-extension.jpeg' },
    { id: 17, name: 'Cable Pushdown', image: '/images/exercises/cable-pushdown.jpeg' },
    { id: 18, name: 'Triceps Pushdown', image: '/images/exercises/triceps-pushdown.jpeg' },
    { id: 19, name: 'Bench Dip', image: '/images/exercises/bench-dip.jpeg' },
    { id: 20, name: 'Lever Seated Leg Press', image: '/images/exercises/lever-seated-leg-press.jpeg' },
    { id: 21, name: 'Lever One Leg Extension', image: '/images/exercises/lever-one-leg-extension.jpeg' },
    { id: 22, name: 'Smith Calf Raise', image: '/images/exercises/smith-calf-raise.jpeg' },
    { id: 23, name: 'Dumbbell Arnold Press', image: '/images/exercises/dumbbell-arnold-press.jpeg' },
    { id: 24, name: 'Dumbbell Rear Delt Fly', image: '/images/exercises/dumbbell-rear-delt-fly.jpeg' },
    { id: 25, name: 'Upright Row', image: '/images/exercises/upright-row.jpeg' },
    { id: 26, name: 'Lateral Raise', image: '/images/exercises/lateral-raise.jpeg' },
    { id: 27, name: 'Seated Shoulder Press', image: '/images/exercises/seated-shoulder-press.jpeg' },
  ],
  schedule: {
    'Pazartesi': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'Çarşamba': [11, 12, 13, 14, 15, 16, 17, 18, 19],
    'Cuma': [20, 21, 22, 23, 24, 25, 26, 27],
  },
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
  return (
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    (obj.image === undefined || typeof obj.image === 'string')
  )
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
