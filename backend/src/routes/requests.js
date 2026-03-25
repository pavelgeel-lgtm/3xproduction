const router = require('express').Router()
const db     = require('../db')
const { verifyJWT, checkRole } = require('../middleware/auth')
const { createNotification, notifyWarehouse } = require('../services/notifications')

// POST /requests
router.post('/', verifyJWT, async (req, res) => {
  const { unit_ids, warehouse_id, deadline, project_id, notes } = req.body
  if (!unit_ids) return res.status(400).json({ error: 'unit_ids required' })

  try {
    const { rows } = await db.query(
      `INSERT INTO requests (unit_ids, requester_id, warehouse_id, deadline, project_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [unit_ids, req.user.id, warehouse_id || null, deadline || null, project_id || null, notes || null]
    )
    const request = rows[0]

    // Get unit names for notification
    const { rows: units } = await db.query(
      `SELECT name FROM units WHERE id = ANY($1)`, [unit_ids]
    )
    const names = units.map(u => u.name).join(', ')

    await notifyWarehouse({
      type: 'new_request',
      text: `Новый запрос: ${names}`,
      entity_id: request.id,
      entity_type: 'request',
    })

    res.status(201).json({ request })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /requests/:id/status
router.put('/:id/status', verifyJWT, checkRole('warehouse_director', 'warehouse_deputy', 'warehouse_staff'), async (req, res) => {
  const { status } = req.body
  const allowed = ['collecting', 'ready', 'cancelled']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  try {
    const { rows } = await db.query(
      `UPDATE requests SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Request not found' })
    res.json({ request: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /requests
router.get('/', verifyJWT, async (req, res) => {
  const { status, warehouse_id, project_id, requester_id } = req.query
  try {
    let q = `
      SELECT r.*, u.name AS requester_name, u.role AS requester_role
      FROM requests r
      JOIN users u ON u.id = r.requester_id
      WHERE 1=1
    `
    const params = []
    if (status)       { params.push(status);       q += ` AND r.status = $${params.length}` }
    if (warehouse_id) { params.push(warehouse_id); q += ` AND r.warehouse_id = $${params.length}` }
    if (project_id)   { params.push(project_id);   q += ` AND r.project_id = $${params.length}` }
    if (requester_id) { params.push(requester_id); q += ` AND r.requester_id = $${params.length}` }
    q += ` ORDER BY r.created_at DESC`

    const { rows } = await db.query(q, params)
    res.json({ requests: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
