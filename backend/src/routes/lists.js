const router = require('express').Router()
const db     = require('../db')
const { verifyJWT } = require('../middleware/auth')

const ALL_LIST_TYPES = ['props', 'art_fill', 'dummy', 'auto', 'decoration', 'costumes', 'makeup', 'stunts', 'pyrotechnics']

const ROLE_OWN_LISTS = {
  production_designer:    ALL_LIST_TYPES,
  art_director_assistant: ALL_LIST_TYPES,
  props_master:           ['props', 'art_fill', 'dummy', 'auto'],
  props_assistant:        ['props', 'art_fill', 'dummy', 'auto'],
  decorator:              ['decoration', 'props', 'art_fill', 'dummy'],
  costumer:               ['costumes'],
  costume_assistant:      ['costumes'],
  makeup_artist:          ['makeup'],
  stunt_coordinator:      ['stunts'],
  pyrotechnician:         ['pyrotechnics'],
}

const SEE_ALL_ROLES = ['production_designer', 'art_director_assistant', 'director', 'project_director', 'producer']

function getOwnTypes(role) {
  return ROLE_OWN_LISTS[role] || []
}

// GET /lists — own lists (or all if seeAllLists role)
router.get('/', verifyJWT, async (req, res) => {
  const projectId = req.query.project_id || req.user.project_id
  const seeAll = SEE_ALL_ROLES.includes(req.user.role)

  try {
    let rows
    if (seeAll) {
      // Return all lists for the project with owner info
      const result = await db.query(
        `SELECT l.*, u.name AS user_name, u.role AS user_role
         FROM production_lists l
         JOIN users u ON u.id = l.user_id
         WHERE l.project_id = $1
         ORDER BY l.type, u.name`,
        [projectId]
      )
      rows = result.rows
    } else {
      // Return only own lists
      const result = await db.query(
        `SELECT * FROM production_lists
         WHERE project_id = $1 AND user_id = $2`,
        [projectId, req.user.id]
      )
      rows = result.rows
    }

    res.json({ lists: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /lists/:type/items — get or auto-create list + items
router.get('/:type/items', verifyJWT, async (req, res) => {
  const { type } = req.params
  const projectId = req.query.project_id || req.user.project_id
  const targetUserId = req.query.user_id || req.user.id

  // Permission check
  const ownTypes = getOwnTypes(req.user.role)
  const seeAll = SEE_ALL_ROLES.includes(req.user.role)
  if (!seeAll && !ownTypes.includes(type)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    // Find or create list
    let { rows } = await db.query(
      `SELECT * FROM production_lists WHERE project_id=$1 AND user_id=$2 AND type=$3`,
      [projectId, targetUserId, type]
    )

    let list
    if (rows.length) {
      list = rows[0]
    } else if (targetUserId === req.user.id) {
      // Auto-create own list
      const ins = await db.query(
        `INSERT INTO production_lists (project_id, user_id, type)
         VALUES ($1, $2, $3) RETURNING *`,
        [projectId, req.user.id, type]
      )
      list = ins.rows[0]
    } else {
      return res.json({ list: null, items: [] })
    }

    const items = await db.query(
      `SELECT * FROM production_list_items WHERE list_id=$1 ORDER BY sort_order, created_at`,
      [list.id]
    )

    res.json({ list, items: items.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /lists/:type/items — add item
router.post('/:type/items', verifyJWT, async (req, res) => {
  const { type } = req.params
  const projectId = req.user.project_id
  const ownTypes = getOwnTypes(req.user.role)

  if (!ownTypes.includes(type)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { name, scene, day, time, location, qty, source, note } = req.body
  if (!name) return res.status(400).json({ error: 'Missing name' })

  try {
    // Ensure list exists
    await db.query(
      `INSERT INTO production_lists (project_id, user_id, type)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id, type) DO NOTHING`,
      [projectId, req.user.id, type]
    )

    const { rows: listRows } = await db.query(
      `SELECT id FROM production_lists WHERE project_id=$1 AND user_id=$2 AND type=$3`,
      [projectId, req.user.id, type]
    )
    const listId = listRows[0].id

    const { rows } = await db.query(
      `INSERT INTO production_list_items (list_id, name, scene, day, time, location, qty, source, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [listId, name, scene || null, day || null, time || null, location || null, qty || 1, source || 'manual', note || null]
    )

    res.json({ item: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /lists/items/:id — update note/qty/ai_status
router.patch('/items/:id', verifyJWT, async (req, res) => {
  const { note, qty, ai_status, name, scene, day, time, location, source } = req.body

  try {
    // Verify ownership
    const { rows: check } = await db.query(
      `SELECT i.id FROM production_list_items i
       JOIN production_lists l ON l.id = i.list_id
       WHERE i.id=$1 AND l.user_id=$2`,
      [req.params.id, req.user.id]
    )
    if (!check.length) return res.status(403).json({ error: 'Access denied' })

    const { rows } = await db.query(
      `UPDATE production_list_items
       SET note=$1, qty=COALESCE($2, qty), ai_status=COALESCE($3, ai_status),
           name=COALESCE($4, name), scene=COALESCE($5, scene),
           day=COALESCE($6, day), time=COALESCE($7, time),
           location=COALESCE($8, location), source=COALESCE($9, source)
       WHERE id=$10 RETURNING *`,
      [note ?? null, qty || null, ai_status || null, name || null, scene || null,
       day || null, time || null, location || null, source || null, req.params.id]
    )
    res.json({ item: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /lists/items/:id
router.delete('/items/:id', verifyJWT, async (req, res) => {
  try {
    const { rows: check } = await db.query(
      `SELECT i.id FROM production_list_items i
       JOIN production_lists l ON l.id = i.list_id
       WHERE i.id=$1 AND l.user_id=$2`,
      [req.params.id, req.user.id]
    )
    if (!check.length) return res.status(403).json({ error: 'Access denied' })

    await db.query(`DELETE FROM production_list_items WHERE id=$1`, [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
