const db = require('../db')
const { sendPush } = require('./push')

async function createNotification({ user_id, type, text, entity_id, entity_type }) {
  await db.query(
    `INSERT INTO notifications (user_id, type, text, entity_id, entity_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, type, text, entity_id || null, entity_type || null]
  )

  // Send push if subscriptions exist
  const { rows: subs } = await db.query(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1`,
    [user_id]
  )
  for (const sub of subs) {
    try {
      await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title: '3XMedia Production', body: text, type }
      )
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint])
      }
    }
  }
}

// Notify all warehouse directors/deputies
async function notifyWarehouse({ type, text, entity_id, entity_type }) {
  const { rows } = await db.query(
    `SELECT id FROM users WHERE role IN ('warehouse_director','warehouse_deputy','warehouse_staff')`
  )
  for (const u of rows) {
    await createNotification({ user_id: u.id, type, text, entity_id, entity_type })
  }
}

// Check overdue issuances and create notifications
async function checkOverdue() {
  const { rows } = await db.query(`
    SELECT i.*, u2.id AS receiver_id, u2.name AS receiver_name,
           array_agg(un.name) AS unit_names,
           array_agg(un.id) AS unit_ids
    FROM issuances i
    JOIN users u2 ON u2.id = i.received_by
    LEFT JOIN requests r ON r.id = i.request_id
    LEFT JOIN units un ON un.id = ANY(r.unit_ids)
    WHERE i.deadline < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM returns rt WHERE rt.issuance_id = i.id
      )
    GROUP BY i.id, u2.id, u2.name
  `)

  for (const issuance of rows) {
    await notifyWarehouse({
      type: 'overdue',
      text: `Просрочен возврат: ${issuance.unit_names.join(', ')} — получатель ${issuance.receiver_name}`,
      entity_id: issuance.id,
      entity_type: 'request',
    })

    // Mark units as overdue
    const unitIds = (issuance.unit_ids || []).filter(Boolean)
    if (unitIds.length) {
      await db.query(
        `UPDATE units SET status = 'overdue' WHERE id = ANY($1) AND status = 'issued'`,
        [unitIds]
      )
    }
  }
}

module.exports = { createNotification, notifyWarehouse, checkOverdue }
