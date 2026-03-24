const router = require('express').Router()
const multer = require('multer')
const db     = require('../db')
const { verifyJWT } = require('../middleware/auth')
const { uploadFile } = require('../services/r2')
const { parseDocument, computeDelta } = require('../services/groq')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

// Roles that can upload
const UPLOAD_KPP_ROLES = [
  'project_deputy_upload', 'production_designer', 'art_director_assistant',
  'props_master', 'props_assistant', 'decorator', 'costumer', 'costume_assistant',
  'makeup_artist', 'stunt_coordinator', 'pyrotechnician',
]
const UPLOAD_CALLSHEET_ROLES = [
  ...UPLOAD_KPP_ROLES, 'set_admin', 'assistant_director',
]

// Roles that get notified on new version (everyone except drivers, camera mechanics, playback)
const NO_NOTIFY_ROLES = ['driver', 'camera_mechanic', 'playback']

// POST /documents/upload
router.post('/upload', verifyJWT, upload.single('file'), async (req, res) => {
  const { project_id, type } = req.body
  if (!project_id || !type) return res.status(400).json({ error: 'Missing project_id or type' })
  if (!['kpp', 'scenario', 'callsheet'].includes(type)) return res.status(400).json({ error: 'Invalid type' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  // Check upload permission
  const canUpload = type === 'callsheet'
    ? UPLOAD_CALLSHEET_ROLES.includes(req.user.role)
    : UPLOAD_KPP_ROLES.includes(req.user.role)
  if (!canUpload) return res.status(403).json({ error: 'No upload permission' })

  try {
    // Get latest version for this project+type
    const { rows: latest } = await db.query(
      `SELECT * FROM documents WHERE project_id=$1 AND type=$2 ORDER BY version DESC LIMIT 1`,
      [project_id, type]
    )
    const version = latest.length ? latest[0].version + 1 : 1

    // Upload to R2
    const file_url = await uploadFile(req.file.buffer, req.file.originalname, 'documents')

    // Parse with Groq (only kpp and scenario)
    let parsed_data = null
    let delta = null
    if (type !== 'callsheet') {
      try {
        // Extract text from PDF buffer (basic — real app uses pdf-parse)
        const text = req.file.buffer.toString('utf8', 0, 15000)
        parsed_data = await parseDocument(text)

        if (latest.length && latest[0].parsed_data) {
          delta = computeDelta(latest[0].parsed_data, parsed_data)
        }
      } catch (err) {
        console.error('Groq parse error:', err.message)
      }
    }

    const { rows } = await db.query(
      `INSERT INTO documents (project_id, type, version, file_url, parsed_data, delta, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [project_id, type, version, file_url, parsed_data ? JSON.stringify(parsed_data) : null,
       delta ? JSON.stringify(delta) : null, req.user.id]
    )
    const doc = rows[0]

    // Notify all project users (except no-notify roles)
    const { rows: projectUsers } = await db.query(
      `SELECT id, role FROM users WHERE project_id=$1`, [project_id]
    )
    for (const u of projectUsers) {
      if (NO_NOTIFY_ROLES.includes(u.role)) continue
      await db.query(
        `INSERT INTO notifications (user_id, type, text, entity_id, entity_type)
         VALUES ($1,'new_version',$2,$3,'document')`,
        [u.id, `Новая версия ${type.toUpperCase()} (v${version}) — загружено ${new Date().toLocaleDateString('ru-RU')}`, doc.id]
      )
    }

    res.status(201).json({ document: doc })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /documents/:projectId
router.get('/:projectId', verifyJWT, async (req, res) => {
  const { type } = req.query
  try {
    let q = `
      SELECT d.*, u.name AS uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      WHERE d.project_id = $1
    `
    const params = [req.params.projectId]
    if (type) { params.push(type); q += ` AND d.type = $${params.length}` }
    q += ` ORDER BY d.type, d.version DESC`

    const { rows } = await db.query(q, params)
    res.json({ documents: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /documents/:id/parse — re-parse existing document
router.post('/:id/parse', verifyJWT, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM documents WHERE id=$1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Document not found' })
    const doc = rows[0]

    if (!['kpp', 'scenario'].includes(doc.type)) {
      return res.status(400).json({ error: 'Only kpp/scenario can be parsed' })
    }

    // In production: download file from R2, extract text
    const parsed_data = await parseDocument(req.body.text || '')
    await db.query(`UPDATE documents SET parsed_data=$1 WHERE id=$2`, [JSON.stringify(parsed_data), doc.id])

    res.json({ parsed_data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /documents/:id/delta
router.get('/:id/delta', verifyJWT, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT delta FROM documents WHERE id=$1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Document not found' })
    res.json({ delta: rows[0].delta })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /lists/:projectId/:role — unit list for a role
router.get('/lists/:projectId/:role', verifyJWT, async (req, res) => {
  const { projectId, role } = req.params

  // Map role to categories
  const ROLE_CATEGORIES = {
    props_master:           ['props', 'auto'],
    props_assistant:        ['props', 'auto'],
    decorator:              ['decoration', 'props'],
    costumer:               ['costumes'],
    costume_assistant:      ['costumes'],
    makeup_artist:          ['makeup'],
    stunt_coordinator:      ['stunts'],
    pyrotechnician:         ['pyrotechnics'],
    production_designer:    ['props', 'costumes', 'decoration', 'makeup', 'stunts', 'pyrotechnics', 'auto'],
    art_director_assistant: ['props', 'costumes', 'decoration', 'makeup', 'stunts', 'pyrotechnics', 'auto'],
  }

  const categories = ROLE_CATEGORIES[role] || []

  try {
    const { rows: docs } = await db.query(
      `SELECT parsed_data FROM documents WHERE project_id=$1 AND type IN ('kpp','scenario') ORDER BY version DESC LIMIT 2`,
      [projectId]
    )

    // Merge items from all docs for the relevant categories
    const items = []
    for (const doc of docs) {
      if (!doc.parsed_data) continue
      for (const cat of categories) {
        const catItems = doc.parsed_data[cat] || []
        items.push(...catItems.map(i => ({ ...i, category: cat })))
      }
    }

    // Also include ai_suggestions for the role's categories
    const aiSuggestions = []
    for (const doc of docs) {
      if (!doc.parsed_data?.ai_suggestions) continue
      for (const s of doc.parsed_data.ai_suggestions) {
        if (!categories.length || categories.includes(s.category)) {
          aiSuggestions.push(s)
        }
      }
    }

    res.json({ items, ai_suggestions: aiSuggestions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /lists/:id/item — accept/reject AI suggestion, add note
router.put('/lists/:projectId/item', verifyJWT, async (req, res) => {
  // In a real app this would persist per-user list customizations to a separate table
  // For now just return ok
  res.json({ ok: true })
})

module.exports = router
