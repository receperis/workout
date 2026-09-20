// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadGIS,
  loadGapi,
  loadGoogleScripts,
  signIn,
  signOut,
  getAccessToken,
  isSignedIn,
  resetAuth,
  initTokenClient,
  restoreSession,
  findOrCreateFile,
  loadFromDrive,
  saveToDrive,
} from '../googleDrive'

const GIS_URL = 'https://accounts.google.com/gsi/client'
const GAPI_URL = 'https://apis.google.com/js/api.js'

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  document.head.innerHTML = ''
  delete window.gapi
  delete window.google
  resetAuth()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadGIS', () => {
  it('appends GIS script to document head', async () => {
    const loadPromise = loadGIS()
    const script = document.querySelector(`script[src="${GIS_URL}"]`)
    expect(script).not.toBeNull()
    expect(script.async).toBe(true)
    script.onload()
    await loadPromise
  })

  it('resolves immediately if script already exists', async () => {
    const existing = document.createElement('script')
    existing.src = GIS_URL
    document.head.appendChild(existing)
    await loadGIS()
    expect(document.querySelectorAll(`script[src="${GIS_URL}"]`).length).toBe(1)
  })

  it('rejects on script load error', async () => {
    const loadPromise = loadGIS()
    const script = document.querySelector(`script[src="${GIS_URL}"]`)
    script.onerror()
    await expect(loadPromise).rejects.toThrow(`Failed to load ${GIS_URL}`)
  })
})

describe('loadGapi', () => {
  it('loads gapi script and calls gapi.load', async () => {
    let gapiLoadCallback
    window.gapi = {
      load: vi.fn((_, opts) => {
        gapiLoadCallback = opts.callback
      }),
    }
    const loadPromise = loadGapi()
    const script = document.querySelector(`script[src="${GAPI_URL}"]`)
    expect(script).not.toBeNull()
    script.onload()
    await flush()
    gapiLoadCallback()
    await loadPromise
    expect(window.gapi.load).toHaveBeenCalledWith('client:picker', expect.any(Object))
  })

  it('rejects when gapi.load reports an error', async () => {
    window.gapi = {
      load: vi.fn((_, opts) => {
        opts.onerror()
      }),
    }
    const loadPromise = loadGapi()
    const script = document.querySelector(`script[src="${GAPI_URL}"]`)
    script.onload()
    await expect(loadPromise).rejects.toThrow()
  })

  it('rejects when gapi.load reports a timeout', async () => {
    window.gapi = {
      load: vi.fn((_, opts) => {
        opts.ontimeout()
      }),
    }
    const loadPromise = loadGapi()
    const script = document.querySelector(`script[src="${GAPI_URL}"]`)
    script.onload()
    await expect(loadPromise).rejects.toThrow()
  })

  it('rejects when gapi is not available after script load', async () => {
    const loadPromise = loadGapi()
    const script = document.querySelector(`script[src="${GAPI_URL}"]`)
    script.onload()
    await expect(loadPromise).rejects.toThrow('gapi not available after script load')
  })
})

describe('loadGoogleScripts', () => {
  it('loads both GIS and gapi in parallel', async () => {
    let gapiLoadCallback
    window.gapi = {
      load: vi.fn((_, opts) => {
        gapiLoadCallback = opts.callback
      }),
    }
    const promise = loadGoogleScripts()
    const scripts = document.querySelectorAll('script')
    expect(scripts.length).toBe(2)

    const gisScript = document.querySelector(`script[src="${GIS_URL}"]`)
    const gapiScript = document.querySelector(`script[src="${GAPI_URL}"]`)
    expect(gisScript).not.toBeNull()
    expect(gapiScript).not.toBeNull()

    gisScript.onload()
    gapiScript.onload()
    await flush()
    gapiLoadCallback()
    await promise
  })
})

describe('signIn', () => {
  function setupGoogleMock() {
    let capturedCallback
    const requestAccessToken = vi.fn()
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((opts) => {
            capturedCallback = opts.callback
            return { requestAccessToken, callback: null }
          }),
          revoke: vi.fn(),
        },
      },
    }
    return { requestAccessToken, getCb: () => capturedCallback }
  }

  it('rejects when GIS is not loaded', async () => {
    await expect(signIn('client-id')).rejects.toThrow('Google Identity Services not loaded')
  })

  it('creates token client and requests access token', async () => {
    const { requestAccessToken } = setupGoogleMock()
    const promise = signIn('client-id')
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
      client_id: 'client-id',
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: expect.any(Function),
    })
    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: '' })

    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'tok-123', error: undefined })
    const token = await promise
    expect(token).toBe('tok-123')
    expect(getAccessToken()).toBe('tok-123')
    expect(isSignedIn()).toBe(true)
  })

  it('rejects when callback reports an error', async () => {
    setupGoogleMock()
    const promise = signIn('client-id')

    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ error: 'access_denied' })
    await expect(promise).rejects.toThrow('access_denied')
  })

  it('reuses existing token client on second call', async () => {
    setupGoogleMock()
    const p1 = signIn('client-id')
    const cb1 = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb1({ access_token: 'tok-1' })
    await p1

    const p2 = signIn('client-id')
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1)
    const cb2 = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb2({ access_token: 'tok-2' })
    await p2
    expect(getAccessToken()).toBe('tok-2')
  })
})

describe('signOut', () => {
  it('clears access token', async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'tok-abc' })
    await p

    expect(isSignedIn()).toBe(true)
    await signOut()
    expect(getAccessToken()).toBeNull()
    expect(isSignedIn()).toBe(false)
  })

  it('revokes the token via Google API', async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'tok-revoke-me' })
    await p

    await signOut()
    expect(window.google.accounts.oauth2.revoke).toHaveBeenCalledWith('tok-revoke-me')
  })

  it('does not throw when not signed in', async () => {
    await expect(signOut()).resolves.toBeUndefined()
  })
})

describe('getAccessToken / isSignedIn', () => {
  it('returns null and false initially', () => {
    expect(getAccessToken()).toBeNull()
    expect(isSignedIn()).toBe(false)
  })
})

describe('initTokenClient', () => {
  it('throws when GIS is not loaded', () => {
    expect(() => initTokenClient('cid')).toThrow('Google Identity Services not loaded')
  })

  it('returns token client instance', () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({ requestAccessToken: vi.fn() })),
        },
      },
    }
    const client = initTokenClient('cid')
    expect(client).toBeDefined()
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
      client_id: 'cid',
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: expect.any(Function),
    })
  })
})

describe('findOrCreateFile', () => {
  async function signInWithToken() {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'test-token' })
    await p
  }

  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('throws when not signed in', async () => {
    await expect(findOrCreateFile()).rejects.toThrow('Not signed in')
  })

  it('returns existing folder and file IDs', async () => {
    await signInWithToken()
    mockFetch((url) => {
      if (url.includes('WorkoutTracker')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [{ id: 'folder-1' }] }) })
      }
      if (url.includes('workout-data.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [{ id: 'file-1' }] }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await findOrCreateFile()
    expect(result).toEqual({ folderId: 'folder-1', fileId: 'file-1' })
  })

  it('creates folder when not found, finds existing file', async () => {
    await signInWithToken()
    mockFetch((url, opts) => {
      if (url.includes('WorkoutTracker') && url.includes('/files?')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [] }) })
      }
      if (opts?.method === 'POST' && !url.includes('uploadType')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-folder' }) })
      }
      if (url.includes('workout-data.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [{ id: 'file-2' }] }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await findOrCreateFile()
    expect(result).toEqual({ folderId: 'new-folder', fileId: 'file-2' })
  })

  it('finds existing folder, creates file when not found', async () => {
    await signInWithToken()
    mockFetch((url) => {
      if (url.includes('WorkoutTracker')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [{ id: 'folder-3' }] }) })
      }
      if (url.includes('workout-data.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [] }) })
      }
      if (url.includes('uploadType=multipart')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-file' }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await findOrCreateFile()
    expect(result).toEqual({ folderId: 'folder-3', fileId: 'new-file' })
  })

  it('creates both folder and file when neither exists', async () => {
    await signInWithToken()
    mockFetch((url, opts) => {
      if (url.includes('WorkoutTracker') && url.includes('/files?')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [] }) })
      }
      if (url.includes('workout-data.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [] }) })
      }
      if (url.includes('uploadType=multipart')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-file-2' }) })
      }
      if (opts?.method === 'POST' && !url.includes('uploadType')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-folder-2' }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await findOrCreateFile()
    expect(result).toEqual({ folderId: 'new-folder-2', fileId: 'new-file-2' })
  })

  it('throws on Drive API errors', async () => {
    await signInWithToken()
    mockFetch(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: { message: 'quota exceeded' } }) }),
    )

    await expect(findOrCreateFile()).rejects.toThrow('quota exceeded')
  })
})

describe('loadFromDrive', () => {
  async function signInWithToken() {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'test-token' })
    await p
  }

  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('throws when not signed in', async () => {
    await expect(loadFromDrive('file-1')).rejects.toThrow('Not signed in')
  })

  it('loads and parses valid workout data', async () => {
    await signInWithToken()
    const validData = {
      exercises: ['Bench Press'],
      schedule: { Monday: ['Bench Press'] },
      sessions: [],
    }
    mockFetch((url) => {
      if (url.includes('alt=media')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(validData)),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await loadFromDrive('file-1')
    expect(result).toEqual(validData)
  })

  it('returns EMPTY_WORKOUT_DATA when JSON is invalid', async () => {
    await signInWithToken()
    mockFetch((url) => {
      if (url.includes('alt=media')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('not valid json{{{'),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await loadFromDrive('file-1')
    expect(result).toEqual({ exercises: [], schedule: {}, sessions: [] })
  })

  it('returns EMPTY_WORKOUT_DATA when data fails validation', async () => {
    await signInWithToken()
    const invalidData = { exercises: 'not an array', schedule: {}, sessions: [] }
    mockFetch((url) => {
      if (url.includes('alt=media')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(invalidData)),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const result = await loadFromDrive('file-1')
    expect(result).toEqual({ exercises: [], schedule: {}, sessions: [] })
  })

  it('throws on Drive API errors', async () => {
    await signInWithToken()
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'file not found' } }),
      }),
    )

    await expect(loadFromDrive('file-1')).rejects.toThrow('file not found')
  })
})

describe('saveToDrive', () => {
  async function signInWithToken() {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'test-token' })
    await p
  }

  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('throws when not signed in', async () => {
    await expect(saveToDrive('file-1', { exercises: [] })).rejects.toThrow('Not signed in')
  })

  it('serializes and uploads JSON data', async () => {
    await signInWithToken()
    const data = {
      exercises: ['Bench Press', 'Squat'],
      schedule: { Monday: ['Bench Press'] },
      sessions: [],
    }
    let capturedUrl, capturedOpts
    mockFetch((url, opts) => {
      capturedUrl = url
      capturedOpts = opts
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'file-1' }) })
    })

    await saveToDrive('file-1', data)

    expect(capturedUrl).toContain('upload/drive/v3/files/file-1?uploadType=media')
    expect(capturedOpts.method).toBe('PATCH')
    expect(capturedOpts.headers['Content-Type']).toBe('application/json')
    expect(capturedOpts.headers['Authorization']).toBe('Bearer test-token')
    expect(capturedOpts.body).toBe(JSON.stringify(data))
  })

  it('throws on Drive API errors', async () => {
    await signInWithToken()
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'storage quota exceeded' } }),
      }),
    )

    await expect(saveToDrive('file-1', { exercises: [] })).rejects.toThrow(
      'storage quota exceeded',
    )
  })

  it('throws generic error when response body has no error message', async () => {
    await signInWithToken()
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({}),
      }),
    )

    await expect(saveToDrive('file-1', { exercises: [] })).rejects.toThrow(
      'Drive API error 400',
    )
  })
})

describe('driveFetch 401 handling', () => {
  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('clears token on 401 response', async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    await signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'tok-123' })
    await expect(getAccessToken()).resolves.toBe('tok-123')

    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }),
    )

    await expect(driveFetch('/files', {})).rejects.toThrow('Token expired')
    expect(currentAccessToken).toBeNull()
  })

  it('clears tokenClient on 401 response', async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    await signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'tok-123' })
    await expect(getAccessToken()).resolves.toBe('tok-123')

    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }),
    )

    await expect(driveFetch('/files', {})).rejects.toThrow('Token expired')
    expect(tokenClient).toBeNull()
  })
})

describe('loadFromDrive 401 handling', () => {
  async function signInWithToken() {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'test-token' })
    await p
  }

  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('clears token on 401 response', async () => {
    await signInWithToken()
    mockFetch((url) => {
      if (url.includes('alt=media')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    await expect(loadFromDrive('file-1')).rejects.toThrow('Token expired')
    expect(currentAccessToken).toBeNull()
  })
})

describe('saveToDrive 401 handling', () => {
  async function signInWithToken() {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    const p = signIn('client-id')
    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'test-token' })
    await p
  }

  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('clears token on 401 response', async () => {
    await signInWithToken()
    mockFetch((url, opts) => {
      if (opts?.method === 'PATCH' && url.includes('uploadType=media')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    await expect(saveToDrive('file-1', { exercises: [] })).rejects.toThrow(
      'Token expired',
    )
    expect(currentAccessToken).toBeNull()
  })
})

describe('network error handling', () => {
  function mockFetch(handler) {
    vi.stubGlobal('fetch', vi.fn((url, opts) => handler(url, opts)))
  }

  beforeEach(() => {
    resetAuth()
    vi.unstubAllGlobals()
  })

  it('throws network error on fetch failure', async () => {
    mockFetch(() => Promise.reject(new TypeError('Network error')))

    await expect(driveFetch('/files', {})).rejects.toThrow('Network error')
  })

  it('throws network error on saveToDrive failure', async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(),
            callback: null,
          })),
          revoke: vi.fn(),
        },
      },
    }
    await signIn('client-id')

    mockFetch(() => Promise.reject(new TypeError('Network error')))

    await expect(saveToDrive('file-1', { exercises: [] })).rejects.toThrow(
      'Network error',
    )
  })
})

describe('restoreSession', () => {
  function setupGoogleMock() {
    let capturedCallback
    const requestAccessToken = vi.fn()
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((opts) => {
            capturedCallback = opts.callback
            return { requestAccessToken, callback: null }
          }),
          revoke: vi.fn(),
        },
      },
    }
    return { requestAccessToken, getCb: () => capturedCallback }
  }

  it('rejects when GIS is not loaded', async () => {
    await expect(restoreSession('client-id')).rejects.toThrow('Google Identity Services not loaded')
  })

  it('rejects when client ID is missing', async () => {
    setupGoogleMock()
    await expect(restoreSession('')).rejects.toThrow('Missing required parameter client_id')
  })

  it('requests access token with prompt none for silent restore', async () => {
    const { requestAccessToken } = setupGoogleMock()
    const promise = restoreSession('client-id')
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
      client_id: 'client-id',
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: expect.any(Function),
    })
    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: 'none' })

    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ access_token: 'restored-token', error: undefined })
    const token = await promise
    expect(token).toBe('restored-token')
    expect(getAccessToken()).toBe('restored-token')
    expect(isSignedIn()).toBe(true)
  })

  it('rejects when silent restore fails', async () => {
    setupGoogleMock()
    const promise = restoreSession('client-id')

    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ error: 'login_required' })
    await expect(promise).rejects.toThrow('login_required')
    expect(isSignedIn()).toBe(false)
  })

  it('clears token client on failure', async () => {
    setupGoogleMock()
    const promise = restoreSession('client-id')

    const cb = window.google.accounts.oauth2.initTokenClient.mock.results[0].value.callback
    cb({ error: 'login_required' })
    await expect(promise).rejects.toThrow()
    expect(getAccessToken()).toBeNull()
  })
})
