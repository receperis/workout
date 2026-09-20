import { useState, useEffect } from 'react'

/**
 * Debounce a value by `delay` ms. Returns the value after the user stops
 * changing it for the given period.
 *
 * @template T
 * @param {T} value
 * @param {number} delay - milliseconds
 * @returns {T}
 */
export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
