const webPush = require('web-push')

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:admin@3xproduction.ru',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

async function sendPush(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — caller should delete it
      throw err
    }
    console.error('Push error:', err.message)
  }
}

module.exports = { sendPush, vapidPublicKey: process.env.VAPID_PUBLIC_KEY }
