// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../components/Layout'

afterEach(() => {
  localStorage.clear()
})

function renderWithLayout(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Layout />
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('renders sidebar with 4 navigation links', () => {
    const { container } = renderWithLayout()
    const sidebar = container.querySelector('aside')
    expect(sidebar).not.toBeNull()
    const links = sidebar.querySelectorAll('a')
    expect(links).toHaveLength(4)
  })

  it('renders dashboard link with emoji icon', () => {
    const { container } = renderWithLayout()
    const sidebar = container.querySelector('aside')
    const dashboardLink = sidebar.querySelector('a[href="/"]')
    expect(dashboardLink).not.toBeNull()
    expect(dashboardLink.textContent).toContain('Ana Sayfa')
    expect(dashboardLink.textContent).toContain('\uD83C\uDFE0')
  })

  it('renders log workout link with emoji icon', () => {
    const { container } = renderWithLayout()
    const sidebar = container.querySelector('aside')
    const logLink = sidebar.querySelector('a[href="/log"]')
    expect(logLink).not.toBeNull()
    expect(logLink.textContent).toContain('Antrenman Kaydet')
    expect(logLink.textContent).toContain('\uD83D\uDCCB')
  })

  it('renders progress link with emoji icon', () => {
    const { container } = renderWithLayout()
    const sidebar = container.querySelector('aside')
    const progressLink = sidebar.querySelector('a[href="/progress"]')
    expect(progressLink).not.toBeNull()
    expect(progressLink.textContent).toContain('İlerleme')
    expect(progressLink.textContent).toContain('\uD83D\uDCC8')
  })

  it('renders settings link with emoji icon', () => {
    const { container } = renderWithLayout()
    const sidebar = container.querySelector('aside')
    const settingsLink = sidebar.querySelector('a[href="/settings"]')
    expect(settingsLink).not.toBeNull()
    expect(settingsLink.textContent).toContain('Ayarlar')
    expect(settingsLink.textContent).toContain('\u2699\uFE0F')
  })

  it('renders toggle sidebar button in header', () => {
    const { container } = renderWithLayout()
    const header = container.querySelector('header')
    const btn = header.querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-label')).toBe('Kenar çubuğunu aç/kapat')
  })

  it('sidebar links have transition-colors class', () => {
    const { container } = renderWithLayout()
    const sidebar = container.querySelector('aside')
    const links = sidebar.querySelectorAll('a')
    expect(links).toHaveLength(4)
    links.forEach((link) => {
      expect(link.getAttribute('class')).toContain('transition-colors')
    })
  })
})
