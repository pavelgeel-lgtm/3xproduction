const router  = require('express').Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const db      = require('../db')
const { sendEmail } = require('../services/resend')

const SALT_ROUNDS = 12
const CODE_TTL_MIN = 15

// POST /auth/register  — only via invite token
router.post('/register', async (req, res) => {
  const { token, name, email, password } = req.body
  if (!token || !name || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  try {
    // Validate invite
    const { rows: invites } = await db.query(
      `SELECT * FROM invites WHERE token = $1 AND used = FALSE`, [token]
    )
    if (!invites.length) return res.status(400).json({ error: 'Invalid or used invite' })
    const invite = invites[0]

    // Check email not taken
    const { rows: existing } = await db.query(
      `SELECT id FROM users WHERE email = $1`, [email]
    )
    if (existing.length) return res.status(400).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role, project_id, warehouse_zone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, project_id`,
      [name, email, password_hash, invite.role, invite.project_id, invite.warehouse_zone]
    )
    const user = rows[0]

    // Mark invite used
    await db.query(`UPDATE invites SET used = TRUE WHERE id = $1`, [invite.id])

    const jwtToken = jwt.sign(
      { id: user.id, role: user.role, project_id: user.project_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({ token: jwtToken, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = $1`, [email]
    )
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' })
    const user = rows[0]

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, role: user.role, project_id: user.project_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, project_id: user.project_id },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/recover/request
router.post('/recover/request', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })

  try {
    const { rows } = await db.query(`SELECT id FROM users WHERE email = $1`, [email])
    // Always return 200 to not leak user existence
    if (!rows.length) return res.json({ ok: true })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires_at = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000)

    await db.query(
      `INSERT INTO recover_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email, code, expires_at]
    )

    await sendEmail({
      to: email,
      subject: 'Код восстановления пароля — 3XMedia Production',
      html: `
        <p>Ваш код восстановления пароля:</p>
        <h2 style="letter-spacing:8px;font-size:32px;">${code}</h2>
        <p>Код действителен ${CODE_TTL_MIN} минут.</p>
        <p>Если вы не запрашивали восстановление — проигнорируйте это письмо.</p>
      `,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/recover/verify
router.post('/recover/verify', async (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Missing fields' })

  try {
    const { rows } = await db.query(
      `SELECT * FROM recover_codes
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    )
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired code' })

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/recover/reset
router.post('/recover/reset', async (req, res) => {
  const { email, code, password } = req.body
  if (!email || !code || !password) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' })

  try {
    const { rows } = await db.query(
      `SELECT * FROM recover_codes
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    )
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired code' })

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
    await db.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [password_hash, email])
    await db.query(`UPDATE recover_codes SET used = TRUE WHERE id = $1`, [rows[0].id])

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/seed-test — create test accounts for all roles (idempotent, skips existing)
router.post('/seed-test', async (req, res) => {
  try {
    const password = 'Test1234'
    const hash = await bcrypt.hash(password, SALT_ROUNDS)

    // Ensure test project exists
    let projectId
    const { rows: existingProjects } = await db.query(
      `SELECT id FROM projects WHERE name = $1 LIMIT 1`, ['Тестовый проект']
    )
    if (existingProjects.length) {
      projectId = existingProjects[0].id
    } else {
      const { rows: newProject } = await db.query(
        `INSERT INTO projects (name) VALUES ($1) RETURNING id`, ['Тестовый проект']
      )
      projectId = newProject[0].id
    }

    const testUsers = [
      { email: 'test.warehouse_director@3x.test',name: 'Павел Директор Склада',   role: 'warehouse_director',project_id: null },
      { email: 'test.project_director@3x.test',  name: 'Иван Директор Площадки', role: 'project_director',  project_id: projectId },
      { email: 'test.producer@3x.test',          name: 'Мария Продюсер',          role: 'producer',          project_id: null },
      { email: 'test.warehouse_deputy@3x.test',  name: 'Алексей Зам Склада',      role: 'warehouse_deputy',  project_id: null },
      { email: 'test.warehouse_staff@3x.test',   name: 'Дмитрий Сотрудник Склада',role: 'warehouse_staff',   project_id: null },
      { email: 'test.production_designer@3x.test',name:'Анна Художник-постановщик',role: 'production_designer',project_id: projectId },
      { email: 'test.props_master@3x.test',      name: 'Сергей Реквизитор',       role: 'props_master',      project_id: projectId },
      { email: 'test.costumer@3x.test',          name: 'Елена Костюмер',          role: 'costumer',          project_id: projectId },
    ]

    const results = []
    for (const u of testUsers) {
      const { rows: existing } = await db.query(`SELECT id FROM users WHERE email=$1`, [u.email])
      if (existing.length) {
        results.push({ email: u.email, role: u.role, status: 'already_exists' })
        continue
      }
      await db.query(
        `INSERT INTO users (name, email, password_hash, role, project_id) VALUES ($1,$2,$3,$4,$5)`,
        [u.name, u.email, hash, u.role, u.project_id]
      )
      results.push({ email: u.email, role: u.role, name: u.name, status: 'created' })
    }

    res.json({ password, project_id: projectId, users: results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /auth/password — change own password
const { verifyJWT } = require('../middleware/auth')
router.patch('/password', verifyJWT, async (req, res) => {
  const { current, next } = req.body
  if (!current || !next) return res.status(400).json({ error: 'Missing fields' })
  if (next.length < 6) return res.status(400).json({ error: 'Password too short' })
  try {
    const { rows } = await db.query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    const match = await bcrypt.compare(current, rows[0].password_hash)
    if (!match) return res.status(400).json({ error: 'Текущий пароль неверный' })
    const password_hash = await bcrypt.hash(next, SALT_ROUNDS)
    await db.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [password_hash, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
