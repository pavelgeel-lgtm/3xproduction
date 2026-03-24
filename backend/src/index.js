require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/auth',       require('./routes/auth'))
app.use('/invites',    require('./routes/invites'))
app.use('/units',      require('./routes/units'))
app.use('/warehouses', require('./routes/warehouses'))
app.use('/requests',   require('./routes/requests'))
app.use('/issuances',  require('./routes/issuances'))
app.use('/documents',  require('./routes/documents'))
app.use('/rent',       require('./routes/rent'))
app.use('/public',     require('./routes/rent')) // public routes share the rent router
app.use('/analytics',  require('./routes/analytics'))

// Notifications polling endpoint
const { verifyJWT } = require('./middleware/auth')
const db = require('./db')

app.get('/notifications', verifyJWT, async (req, res) => {
  const { unread_only } = req.query
  try {
    let q = `SELECT * FROM notifications WHERE user_id=$1`
    if (unread_only === 'true') q += ` AND read=FALSE`
    q += ` ORDER BY created_at DESC LIMIT 50`
    const { rows } = await db.query(q, [req.user.id])
    res.json({ notifications: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/notifications/:id/read', verifyJWT, async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET read=TRUE WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/notifications/read-all', verifyJWT, async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET read=TRUE WHERE user_id=$1`, [req.user.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Overdue check — every 30 min
const { checkOverdue } = require('./services/notifications')
setInterval(checkOverdue, 30 * 60 * 1000)

// Health check
app.get('/health', (_, res) => res.json({ ok: true }))

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
