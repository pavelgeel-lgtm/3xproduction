const router = require('express').Router()
const crypto = require('crypto')
const db     = require('../db')
const { verifyJWT, checkRole } = require('../middleware/auth')
const { createIssuancePDF } = require('../services/pdf')
const { uploadFile } = require('../services/r2')
const { sendEmail } = require('../services/resend')

const RENT_ROLES = ['warehouse_director', 'warehouse_deputy']

// POST /rent — new deal
router.post('/', verifyJWT, checkRole(...RENT_ROLES), async (req, res) => {
  const {
    type, counterparty_name, counterparty_type, counterparty_contact, counterparty_email,
    unit_ids, period_start, period_end, price_total, signature_data,
  } = req.body

  if (!type || !counterparty_name || !unit_ids?.length || !period_start || !period_end) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    // Generate contract PDF
    const { rows: units } = await client.query(`SELECT * FROM units WHERE id = ANY($1)`, [unit_ids])
    const { rows: issuer } = await client.query(`SELECT name FROM users WHERE id=$1`, [req.user.id])

    const pdfBytes = await createIssuancePDF({
      items: units,
      issuedTo: counterparty_name,
      issuedBy: issuer[0]?.name || 'Склад',
      deadline: period_end,
      signatureDataUrl: signature_data,
    })
    const contract_pdf_url = await uploadFile(Buffer.from(pdfBytes), 'contract.pdf', 'contracts')

    // Save deal
    const { rows } = await client.query(
      `INSERT INTO rent_deals
         (type, counterparty_name, counterparty_type, counterparty_contact, counterparty_email,
          unit_ids, period_start, period_end, price_total, signature_url, contract_pdf_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [type, counterparty_name, counterparty_type || 'person', counterparty_contact || null,
       counterparty_email || null, unit_ids, period_start, period_end,
       price_total || null, null, contract_pdf_url]
    )
    const deal = rows[0]

    // If we're renting OUT — update unit statuses
    if (type === 'out') {
      for (const uid of unit_ids) {
        await client.query(`UPDATE units SET status='issued' WHERE id=$1`, [uid])
      }
    }

    await client.query('COMMIT')

    // Send email to counterparty
    if (counterparty_email) {
      sendEmail({
        to: counterparty_email,
        subject: type === 'out'
          ? 'Договор аренды — 3XMedia Production'
          : 'Уведомление об аренде — 3XMedia Production',
        html: `
          <p>Здравствуйте, ${counterparty_name}!</p>
          ${type === 'out'
            ? `<p>Договор аренды подписан. Период: ${period_start} — ${period_end}.</p>
               <p>Сумма: ${price_total ? Number(price_total).toLocaleString('ru-RU') + ' ₽' : 'по договорённости'}.</p>
               <p>PDF договора прикреплён: <a href="${contract_pdf_url}">Скачать</a></p>`
            : `<p>Компания 3XMedia Production берёт в аренду ваше имущество.</p>
               <p>Период: ${period_start} — ${period_end}.</p>`
          }
        `,
      }).catch(err => console.error('Email send error:', err.message))
    }

    res.status(201).json({ deal, contract_pdf_url })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// GET /rent
router.get('/', verifyJWT, checkRole(...RENT_ROLES, 'producer'), async (req, res) => {
  const { type, status } = req.query
  try {
    let q = `SELECT * FROM rent_deals WHERE 1=1`
    const params = []
    if (type)   { params.push(type);   q += ` AND type=$${params.length}` }
    if (status) { params.push(status); q += ` AND status=$${params.length}` }
    q += ` ORDER BY created_at DESC`
    const { rows } = await db.query(q, params)
    res.json({ deals: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /rent/:id
router.get('/:id', verifyJWT, checkRole(...RENT_ROLES, 'producer'), async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM rent_deals WHERE id=$1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Deal not found' })
    res.json({ deal: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /rent/:id/status
router.put('/:id/status', verifyJWT, checkRole(...RENT_ROLES), async (req, res) => {
  const { status } = req.body
  const allowed = ['done', 'cancelled']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const client = await db.getClient()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`SELECT * FROM rent_deals WHERE id=$1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Deal not found' })
    const deal = rows[0]

    await client.query(`UPDATE rent_deals SET status=$1 WHERE id=$2`, [status, req.params.id])

    // If done and we were renting out — return units to stock
    if (status === 'done' && deal.type === 'out') {
      for (const uid of deal.unit_ids) {
        await client.query(`UPDATE units SET status='on_stock' WHERE id=$1`, [uid])
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// POST /rent/:id/return — return act for rent
router.post('/:id/return', verifyJWT, checkRole(...RENT_ROLES), async (req, res) => {
  const { condition_notes } = req.body
  try {
    const { rows } = await db.query(`SELECT * FROM rent_deals WHERE id=$1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Deal not found' })

    await db.query(`UPDATE rent_deals SET status='done' WHERE id=$1`, [req.params.id])
    for (const uid of rows[0].unit_ids) {
      await db.query(`UPDATE units SET status='on_stock' WHERE id=$1`, [uid])
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ─── Public routes (no JWT) ─────────────────────────────────────────────────

// Generate public token for warehouse (warehouse staff can share)
router.post('/public/generate-link', verifyJWT,
  checkRole('warehouse_director', 'warehouse_deputy', 'warehouse_staff'),
  async (req, res) => {
    const token = crypto.randomBytes(20).toString('hex')
    // In production store token in DB with warehouse_id
    res.json({ token, url: `/public/warehouse/${token}` })
  }
)

// GET /public/warehouse/:token — public catalog
router.get('/public/warehouse/:token', async (req, res) => {
  // In production validate token against DB
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.category, u.description, u.status, u.serial,
              array_agg(p.url) FILTER (WHERE p.url IS NOT NULL) AS photos
       FROM units u
       LEFT JOIN unit_photos p ON p.unit_id = u.id AND p.type='stock'
       WHERE u.status != 'written_off'
       GROUP BY u.id
       ORDER BY u.category, u.name`
    )
    res.json({ units: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /public/warehouse/:token/request — external rent request
router.post('/public/warehouse/:token/request', async (req, res) => {
  const { name, phone, unit_id, message, dates } = req.body
  if (!name || !phone || !unit_id) return res.status(400).json({ error: 'Missing fields' })

  try {
    // Notify warehouse directors
    const { rows: directors } = await db.query(
      `SELECT id FROM users WHERE role IN ('warehouse_director','warehouse_deputy')`
    )
    for (const u of directors) {
      await db.query(
        `INSERT INTO notifications (user_id, type, text, entity_id, entity_type)
         VALUES ($1,'new_request',$2,$3,'unit')`,
        [u.id, `Внешний запрос аренды от ${name} (${phone}): ${message || ''}`, unit_id]
      )
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
