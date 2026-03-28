const router = require('express').Router()
const multer = require('multer')
const db     = require('../db')
const { verifyJWT, checkRole } = require('../middleware/auth')
const { uploadFile } = require('../services/r2')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const DIRECTOR_ROLES = ['warehouse_director', 'warehouse_deputy']

// GET /units
router.get('/', verifyJWT, async (req, res) => {
  const { warehouse, status, category, search, cell_id } = req.query
  try {
    let q = `
      SELECT u.*, w.name AS warehouse_name, c.code AS cell_code
      FROM units u
      LEFT JOIN warehouses w ON w.id = u.warehouse_id
      LEFT JOIN cells c ON c.id = u.cell_id
      WHERE 1=1
    `
    const params = []
    if (warehouse) { params.push(warehouse); q += ` AND u.warehouse_id = $${params.length}` }
    if (status)    { params.push(status);    q += ` AND u.status = $${params.length}` }
    if (category)  { params.push(category);  q += ` AND u.category = $${params.length}` }
    if (cell_id)   { params.push(cell_id);   q += ` AND u.cell_id = $${params.length}` }
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (u.name ILIKE $${params.length} OR u.serial ILIKE $${params.length})`
    }
    q += ` ORDER BY u.created_at DESC`

    const { rows } = await db.query(q, params)
    res.json({ units: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /units — add unit (goes to pending, waits for director approval)
router.post('/', verifyJWT, async (req, res) => {
  const { name, category, serial, warehouse_id, cell_id, description, qty, condition, valuation, source, dimensions } = req.body
  if (!name || !category) return res.status(400).json({ error: 'Missing required fields' })

  const isDirector = req.user.role === 'warehouse_director'
  const finalStatus = isDirector ? 'on_stock' : 'pending'

  try {
    const { rows } = await db.query(
      `INSERT INTO units (name, category, serial, warehouse_id, cell_id, description, qty, condition, valuation, source, dimensions, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, category, serial || null, warehouse_id || null, cell_id || null,
       description || null, qty || 1, condition || null, valuation || null,
       source || null, dimensions || null, finalStatus]
    )
    const unit = rows[0]

    // Create approval record
    await db.query(
      `INSERT INTO approvals (unit_id, proposed_by, action, new_data)
       VALUES ($1, $2, 'add', $3)`,
      [unit.id, req.user.id, JSON.stringify(req.body)]
    )

    // Log
    await db.query(
      `INSERT INTO unit_history (unit_id, action, user_id) VALUES ($1, 'Добавлено (ожидает подписи)', $2)`,
      [unit.id, req.user.id]
    )

    res.status(201).json({ unit })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /units/approvals — pending approvals list
router.get('/approvals', verifyJWT, checkRole('warehouse_director', 'warehouse_deputy', 'warehouse_staff'), async (req, res) => {
  try {
    const isStaff = req.user.role === 'warehouse_staff'
    let q = `
      SELECT a.id AS approval_id, a.unit_id, a.action, a.new_data, a.created_at,
             u.name AS unit_name, u.category, u.status AS unit_status,
             usr.name AS proposed_by_name, usr.role AS proposed_by_role
      FROM approvals a
      JOIN units u ON u.id = a.unit_id
      JOIN users usr ON usr.id = a.proposed_by
      WHERE a.status = 'pending'
    `
    // Staff only sees their own proposals
    if (isStaff) q += ` AND a.proposed_by = '${req.user.id}'`
    q += ` ORDER BY a.created_at DESC`

    const { rows } = await db.query(q)
    res.json({ approvals: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /units/:id
router.get('/:id', verifyJWT, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.*, w.name AS warehouse_name, c.code AS cell_code, c.custom_name AS cell_custom
       FROM units u
       LEFT JOIN warehouses w ON w.id = u.warehouse_id
       LEFT JOIN cells c ON c.id = u.cell_id
       WHERE u.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Unit not found' })

    const unit = rows[0]

    // Photos
    const { rows: photos } = await db.query(
      `SELECT * FROM unit_photos WHERE unit_id = $1 ORDER BY created_at`, [unit.id]
    )
    unit.photos = photos

    // History — only director/deputy
    if (DIRECTOR_ROLES.includes(req.user.role)) {
      const { rows: history } = await db.query(
        `SELECT h.*, u.name AS user_name
         FROM unit_history h
         LEFT JOIN users u ON u.id = h.user_id
         WHERE h.unit_id = $1 ORDER BY h.created_at DESC`,
        [unit.id]
      )
      unit.history = history
    }

    res.json({ unit })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /units/:id — propose edit (goes to pending approval)
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM units WHERE id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Unit not found' })

    // Director can edit directly
    if (DIRECTOR_ROLES.includes(req.user.role)) {
      const { name, category, serial, warehouse_id, cell_id, description, qty, condition, valuation } = req.body
      const { rows: updated } = await db.query(
        `UPDATE units SET name=$1,category=$2,serial=$3,warehouse_id=$4,cell_id=$5,
         description=$6,qty=$7,condition=$8,valuation=$9 WHERE id=$10 RETURNING *`,
        [name, category, serial, warehouse_id, cell_id, description, qty, condition, valuation, req.params.id]
      )
      await db.query(
        `INSERT INTO unit_history (unit_id, action, user_id) VALUES ($1,'Изменено',$2)`,
        [req.params.id, req.user.id]
      )
      return res.json({ unit: updated[0] })
    }

    // Others create approval
    await db.query(
      `INSERT INTO approvals (unit_id, proposed_by, action, new_data) VALUES ($1,$2,'edit',$3)`,
      [req.params.id, req.user.id, JSON.stringify(req.body)]
    )
    res.json({ ok: true, pending: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /units/:id/approve
router.post('/:id/approve', verifyJWT, checkRole('warehouse_director'), async (req, res) => {
  const { approval_id } = req.body
  try {
    const { rows } = await db.query(
      `SELECT * FROM approvals WHERE id = $1 AND unit_id = $2 AND status = 'pending'`,
      [approval_id, req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Approval not found' })
    const approval = rows[0]

    if (approval.action === 'add') {
      await db.query(`UPDATE units SET status = 'on_stock' WHERE id = $1`, [req.params.id])
      await db.query(
        `INSERT INTO unit_history (unit_id, action, user_id) VALUES ($1,'Принято на склад',$2)`,
        [req.params.id, req.user.id]
      )
    } else if (approval.action === 'edit') {
      const data = approval.new_data
      await db.query(
        `UPDATE units SET name=$1,category=$2,serial=$3,description=$4,qty=$5,condition=$6,valuation=$7 WHERE id=$8`,
        [data.name, data.category, data.serial, data.description, data.qty, data.condition, data.valuation, req.params.id]
      )
      await db.query(
        `INSERT INTO unit_history (unit_id, action, user_id) VALUES ($1,'Изменение подписано',$2)`,
        [req.params.id, req.user.id]
      )
    }

    await db.query(`UPDATE approvals SET status='approved' WHERE id=$1`, [approval_id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /units/:id/reject
router.post('/:id/reject', verifyJWT, checkRole('warehouse_director'), async (req, res) => {
  const { approval_id } = req.body
  try {
    await db.query(`UPDATE approvals SET status='rejected' WHERE id=$1`, [approval_id])
    await db.query(
      `INSERT INTO unit_history (unit_id, action, user_id) VALUES ($1,'Отклонено директором',$2)`,
      [req.params.id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /units/:id/writeoff
router.post('/:id/writeoff', verifyJWT, checkRole('warehouse_director'), async (req, res) => {
  const { reason } = req.body
  try {
    await db.query(`UPDATE units SET status='written_off' WHERE id=$1`, [req.params.id])
    await db.query(
      `INSERT INTO unit_history (unit_id, action, user_id, notes) VALUES ($1,'Списано',$2,$3)`,
      [req.params.id, req.user.id, reason || null]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /units/:id/photos
router.post('/:id/photos', verifyJWT, upload.array('photos', 10), async (req, res) => {
  const { type = 'stock' } = req.body
  try {
    const urls = []
    for (const file of req.files) {
      const url = await uploadFile(file.buffer, file.originalname, 'units')
      const { rows } = await db.query(
        `INSERT INTO unit_photos (unit_id, url, type) VALUES ($1,$2,$3) RETURNING *`,
        [req.params.id, url, type]
      )
      urls.push(rows[0])
    }
    res.json({ photos: urls })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
