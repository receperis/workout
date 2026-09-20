// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { WorkoutProvider } from '../context/WorkoutContext'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
})

function renderWithRouter(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <WorkoutProvider>
        <App />
      </WorkoutProvider>
    </MemoryRouter>,
  )
}

describe('React Router setup', () => {
  it('renders Dashboard on /', () => {
    renderWithRouter('/')
    expect(screen.getByRole('heading', { name: /cumartesi/i })).toBeInTheDocument()
  })

  it('renders LogWorkout on /log', () => {
    renderWithRouter('/log')
    expect(screen.getByRole('heading', { name: /antrenman kaydet/i })).toBeInTheDocument()
  })

  it('renders Progress on /progress', () => {
    renderWithRouter('/progress')
    expect(screen.getAllByText('İlerleme').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Settings on /settings', () => {
    renderWithRouter('/settings')
    expect(screen.getByRole('heading', { name: /ayarlar/i })).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    renderWithRouter('/')
    const dashboardLinks = screen.getAllByRole('link', { name: /ana sayfa/i })
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1)
    expect(dashboardLinks[0]).toHaveAttribute('href', '/')
    const logLinks = screen.getAllByRole('link', { name: /antrenman kaydet/i })
    expect(logLinks.length).toBeGreaterThanOrEqual(1)
    expect(logLinks[0]).toHaveAttribute('href', '/log')
    const progressLinks = screen.getAllByRole('link', { name: /İlerleme/ })
    expect(progressLinks.length).toBeGreaterThanOrEqual(1)
    expect(progressLinks[0]).toHaveAttribute('href', '/progress')
    const settingsLinks = screen.getAllByRole('link', { name: /ayarlar/i })
    expect(settingsLinks.length).toBeGreaterThanOrEqual(1)
    expect(settingsLinks[0]).toHaveAttribute('href', '/settings')
  })
})
