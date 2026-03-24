require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')
const { pool } = require('./db')

// Run pending migrations on startup
async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY, filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    const dir = path.join(__dirname, 'db/migrations')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const { rows } = await client.query('SELECT id FROM _migrations WHERE filename=$1', [file])
      if (rows.length) continue
      const sql = fs.readFileSync(path.join(dir, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`migration applied: ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`migration failed: ${file}`, err.message)
      }
    }
  } finally {
    client.release()
  }
}

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
app.use('/team',       require('./routes/team'))

// Notifications polling endpoint
const { verifyJWT } = require('./middleware/auth')
const db = require('./db')
const { sendPush, vapidPublicKey } = require('./services/push')

// Push subscription endpoints
app.get('/push/vapid-key', (req, res) => res.json({ key: vapidPublicKey || null }))

app.post('/push/subscribe', verifyJWT, async (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Invalid subscription' })
  try {
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh=$3, auth=$4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/push/subscribe', verifyJWT, async (req, res) => {
  const { endpoint } = req.body
  try {
    await db.query(`DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2`, [req.user.id, endpoint])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

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

// Serve frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('/{*path}', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')))
} else {
  // 404 for API-only mode (local dev)
  app.use((req, res) => res.status(404).json({ error: 'Not found' }))
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
runMigrations()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => { console.error('Migration error:', err); process.exit(1) })
