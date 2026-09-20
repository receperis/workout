import { EMPTY_WORKOUT_DATA, isWorkoutData } from './types'

const GIS_URL = 'https://accounts.google.com/gsi/client'
const GAPI_URL = 'https://apis.google.com/js/api.js'
const FOLDER_NAME = 'WorkoutTracker'
const FILE_NAME = 'workout-data.json'
const MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder'
const MIME_TYPE_JSON = 'application/json'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'

let currentAccessToken = null
let tokenClient = null

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error(`Failed to load ${url}`))
    document.head.appendChild(script)
  })
}

export function loadGIS() {
  return loadScript(GIS_URL)
}

export function loadGapi() {
  return new Promise((resolve, reject) => {
    loadScript(GAPI_URL)
      .then(() => {
        if (window.gapi) {
          window.gapi.load('client:picker', { onerror: reject, callback: resolve })
        } else {
          reject(new Error('gapi not available after script load'))
        }
      })
      .catch(reject)
  })
}

export async function loadGoogleScripts() {
  await Promise.all([loadGIS(), loadGapi()])
}

export function initTokenClient(clientId) {
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services not loaded')
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: () => {},
  })
  return tokenClient
}

export function signIn(clientId) {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('Missing required parameter client_id'))
      return
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }

    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: () => {},
      })
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }
      currentAccessToken = response.access_token
      resolve(response.access_token)
    }

    tokenClient.requestAccessToken({ prompt: '' })
  })
}

export async function signOut() {
  if (currentAccessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentAccessToken)
  }
  currentAccessToken = null
}

export function getAccessToken() {
  return currentAccessToken
}

export function isSignedIn() {
  return currentAccessToken !== null
}

export function restoreSession(clientId) {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('Missing required parameter client_id'))
      return
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: () => {},
    })

    tokenClient.callback = (response) => {
      if (response.error) {
        tokenClient = null
        reject(new Error(response.error))
        return
      }
      currentAccessToken = response.access_token
      resolve(response.access_token)
    }

    tokenClient.requestAccessToken({ prompt: 'none' })
  })
}

export function resetAuth() {
  currentAccessToken = null
  tokenClient = null
}

function driveFetch(path, options = {}) {
  const token = currentAccessToken
  if (!token) throw new Error('Not signed in')
  const url = `${DRIVE_API}${path}`
  const headers = { Authorization: `Bearer ${token}`, ...options.headers }
  return fetch(url, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const errMsg = body.error?.message || `Drive API error ${res.status}`
      if (res.status === 401) {
        currentAccessToken = null
        tokenClient = null
        throw new Error('Token expired')
      }
      throw new Error(errMsg)
    }
    return res.json()
  })
}

export async function findOrCreateFile() {
  let folderId = await findFolder(FOLDER_NAME)
  if (!folderId) {
    folderId = await createFolder(FOLDER_NAME)
  }

  let fileId = await findFile(FILE_NAME, folderId)
  if (!fileId) {
    fileId = await createFile(FILE_NAME, folderId, JSON.stringify(EMPTY_WORKOUT_DATA))
  }

  return { folderId, fileId }
}

export async function loadFromDrive(fileId) {
  const token = currentAccessToken
  if (!token) throw new Error('Not signed in')

  const url = `${DRIVE_API}/files/${fileId}?alt=media`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errMsg = body.error?.message || `Drive API error ${res.status}`
    if (res.status === 401) {
      currentAccessToken = null
      tokenClient = null
      throw new Error('Token expired')
    }
    throw new Error(errMsg)
  }

  const text = await res.text()

  try {
    const parsed = JSON.parse(text)
    if (!isWorkoutData(parsed)) return EMPTY_WORKOUT_DATA
    return parsed
  } catch {
    return EMPTY_WORKOUT_DATA
  }
}

export async function saveToDrive(fileId, data) {
  const token = currentAccessToken
  if (!token) throw new Error('Not signed in')

  const content = JSON.stringify(data)
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': MIME_TYPE_JSON,
      },
      body: content,
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errMsg = body.error?.message || `Drive API error ${res.status}`
    if (res.status === 401) {
      currentAccessToken = null
      tokenClient = null
      throw new Error('Token expired')
    }
    throw new Error(errMsg)
  }

  return res.json()
}

async function findFolder(name) {
  const q = `name='${name}' and mimeType='${MIME_TYPE_FOLDER}' and trashed=false`
  const data = await driveFetch(`/files?q=${encodeURIComponent(q)}&fields=files(id)`)
  return data.files.length > 0 ? data.files[0].id : null
}

async function createFolder(name) {
  const data = await driveFetch('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: MIME_TYPE_FOLDER }),
  })
  return data.id
}

async function findFile(name, folderId) {
  const q = `name='${name}' and '${folderId}' in parents and trashed=false`
  const data = await driveFetch(`/files?q=${encodeURIComponent(q)}&fields=files(id)`)
  return data.files.length > 0 ? data.files[0].id : null
}

async function createFile(name, folderId, content) {
  const metadata = { name, parents: [folderId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: MIME_TYPE_JSON }))

  const token = currentAccessToken
  if (!token) throw new Error('Not signed in')
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || `Drive API error ${res.status}`)
  }
  const data = await res.json()
  return data.id
}
