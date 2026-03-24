import { useEffect, useState } from 'react'
import { push as pushApi } from '../services/api'

export function usePush() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setSubscribed(!!sub)
        })
      })
    }
  }, [])

  async function subscribe() {
    try {
      const { key } = await pushApi.vapidKey()
      if (!key) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
      const json = sub.toJSON()
      await pushApi.subscribe({ endpoint: json.endpoint, keys: json.keys })
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    }
  }

  return { supported, subscribed, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
