const router = require('express').Router()
const db     = require('../db')
const { verifyJWT } = require('../middleware/auth')

// GET /team — list team members visible to current user
router.get('/', verifyJWT, async (req, res) => {
  const user = req.user
  try {
    let rows

    if (user.project_id) {
      // Production roles — show everyone in the same project
      const result = await db.query(
        `SELECT id, name, email, role, warehouse_zone, created_at
         FROM users WHERE project_id = $1 ORDER BY name`,
        [user.project_id]
      )
      rows = result.rows
    } else {
      // Warehouse roles — show all warehouse users (no project_id)
      const result = await db.query(
        `SELECT id, name, email, role, warehouse_zone, created_at
         FROM users WHERE project_id IS NULL ORDER BY name`
      )
      rows = result.rows
    }

    res.json({ team: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
