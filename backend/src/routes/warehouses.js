const router = require('express').Router()
const db     = require('../db')
const { verifyJWT, checkRole } = require('../middleware/auth')

const DIRECTOR_ROLES = ['warehouse_director', 'warehouse_deputy']

// GET /warehouses
router.get('/', verifyJWT, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM warehouses ORDER BY name`)
    res.json({ warehouses: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /warehouses/:id/cells — sections with cells
router.get('/:id/cells', verifyJWT, async (req, res) => {
  try {
    const { rows: sections } = await db.query(
      `SELECT * FROM warehouse_sections WHERE warehouse_id = $1 ORDER BY name`,
      [req.params.id]
    )

    for (const section of sections) {
      const { rows: cells } = await db.query(
        `SELECT c.*, u.id AS unit_id, u.name AS unit_name, u.status AS unit_status
         FROM cells c
         LEFT JOIN units u ON u.cell_id = c.id AND u.status != 'written_off'
         WHERE c.section_id = $1 ORDER BY c.code`,
        [section.id]
      )
      section.cells = cells
    }

    res.json({ sections })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /sections — create section with cells
router.post('/sections', verifyJWT, checkRole(...DIRECTOR_ROLES), async (req, res) => {
  const { warehouse_id, name, category, rows: numRows, shelves, cells } = req.body
  if (!warehouse_id || !name || !category) return res.status(400).json({ error: 'Missing fields' })

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    const { rows: sec } = await client.query(
      `INSERT INTO warehouse_sections (warehouse_id, name, category, rows, shelves)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [warehouse_id, name, category, numRows || 1, shelves || 1]
    )
    const section = sec[0]

    if (cells && cells.length) {
      for (const cell of cells) {
        await client.query(
          `INSERT INTO cells (section_id, code, custom_name) VALUES ($1,$2,$3)`,
          [section.id, cell.id, cell.custom || null]
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json({ section })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// PUT /cells/:id — rename cell
router.put('/cells/:id', verifyJWT, checkRole(...DIRECTOR_ROLES), async (req, res) => {
  const { custom_name } = req.body
  try {
    const { rows } = await db.query(
      `UPDATE cells SET custom_name=$1 WHERE id=$2 RETURNING *`,
      [custom_name || null, req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Cell not found' })
    res.json({ cell: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
