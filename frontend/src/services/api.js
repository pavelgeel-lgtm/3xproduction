const BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const config = {
    method,
    headers,
    ...opts,
  }

  if (body && !(body instanceof FormData)) {
    config.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    delete config.headers['Content-Type'] // browser sets multipart boundary
    config.headers = { Authorization: `Bearer ${token}` }
    config.body = body
  }

  const res = await fetch(`${BASE}${path}`, config)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login:          (email, password) => request('POST', '/auth/login',          { email, password }),
  register:       (body)            => request('POST', '/auth/register',        body),
  recoverRequest: (email)           => request('POST', '/auth/recover/request', { email }),
  recoverVerify:  (email, code)     => request('POST', '/auth/recover/verify',  { email, code }),
  recoverReset:   (email, code, password) =>
    request('POST', '/auth/recover/reset', { email, code, password }),
}

// ─── Invites ─────────────────────────────────────────────────────────────────
export const invites = {
  get:      (token) => request('GET',  `/invites/${token}`),
  generate: (body)  => request('POST', '/invites', body),
}

// ─── Units ───────────────────────────────────────────────────────────────────
export const units = {
  list:     (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/units${q ? '?' + q : ''}`)
  },
  get:      (id)   => request('GET',  `/units/${id}`),
  create:   (body) => request('POST', '/units', body),
  update:   (id, body) => request('PUT', `/units/${id}`, body),
  approve:  (id)   => request('POST', `/units/${id}/approve`),
  reject:   (id, reason) => request('POST', `/units/${id}/reject`, { reason }),
  writeoff: (id, reason) => request('POST', `/units/${id}/writeoff`, { reason }),
  uploadPhoto: (id, formData) => request('POST', `/units/${id}/photos`, formData),
  deletePhoto: (id, photoId) => request('DELETE', `/units/${id}/photos/${photoId}`),
  history:  (id)   => request('GET', `/units/${id}/history`),
}

// ─── Warehouses / Cells ──────────────────────────────────────────────────────
export const warehouses = {
  list:          ()             => request('GET',  '/warehouses'),
  cells:         (warehouseId) => request('GET',  `/warehouses/${warehouseId}/cells`),
  createSection: (warehouseId, body) => request('POST', `/warehouses/${warehouseId}/sections`, body),
  renameCell:    (cellId, name) => request('PUT', `/warehouses/cells/${cellId}`, { name }),
}

// ─── Requests ────────────────────────────────────────────────────────────────
export const requests = {
  list:   (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/requests${q ? '?' + q : ''}`)
  },
  create: (body)        => request('POST', '/requests', body),
  status: (id, status)  => request('PUT',  `/requests/${id}/status`, { status }),
}

// ─── Issuances ───────────────────────────────────────────────────────────────
export const issuances = {
  active:  ()           => request('GET',  '/issuances/active'),
  issue:   (formData)   => request('POST', '/issuances', formData),
  return:  (formData)   => request('POST', '/issuances/returns', formData),
  extend:  (body)       => request('POST', '/issuances/extensions', body),
}

// ─── Documents ───────────────────────────────────────────────────────────────
export const documents = {
  list:    (projectId, type) => {
    const q = type ? `?type=${type}` : ''
    return request('GET', `/documents/${projectId}${q}`)
  },
  upload:  (formData)  => request('POST', '/documents/upload', formData),
  delta:   (id)        => request('GET',  `/documents/${id}/delta`),
  reparse: (id, text)  => request('POST', `/documents/${id}/parse`, { text }),
  lists:   (projectId, role) => request('GET', `/documents/lists/${projectId}/${role}`),
}

// ─── Rent ────────────────────────────────────────────────────────────────────
export const rent = {
  list:   (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/rent${q ? '?' + q : ''}`)
  },
  get:    (id)          => request('GET',  `/rent/${id}`),
  create: (body)        => request('POST', '/rent', body),
  status: (id, status)  => request('PUT',  `/rent/${id}/status`, { status }),
  return: (id, body)    => request('POST', `/rent/${id}/return`, body),
  generateLink: ()      => request('POST', '/rent/public/generate-link'),
}

// ─── Public (no auth) ────────────────────────────────────────────────────────
export const publicApi = {
  catalog: (token)       => request('GET',  `/public/warehouse/${token}`),
  sendRequest: (token, body) => request('POST', `/public/warehouse/${token}/request`, body),
}

// ─── Notifications ───────────────────────────────────────────────────────────
export const notifications = {
  list:    (unreadOnly = false) =>
    request('GET', `/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  read:    (id)  => request('POST', `/notifications/${id}/read`),
  readAll: ()    => request('POST', '/notifications/read-all'),
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analytics = {
  warehouse: ()             => request('GET', '/analytics/warehouse'),
  producer:  (projectId)   => {
    const q = projectId ? `?project_id=${projectId}` : ''
    return request('GET', `/analytics/producer${q}`)
  },
}
