/**
 * pushService.js — Web Push subscription manager for EduConnect
 * Import and call initPush() after the user logs in.
 *
 * Place this file in: frontend/src/pushService.js
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const API_BASE = '/api'

// ── Convert VAPID public key to Uint8Array ────────────────
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

// ── Register service worker ───────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return reg
  } catch (err) {
    console.warn('[Push] Service worker registration failed:', err)
    return null
  }
}

// ── Subscribe to push ─────────────────────────────────────
async function subscribeToPush(registration) {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY is not set.')
    return null
  }

  try {
    // Check existing subscription first
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    return subscription
  } catch (err) {
    console.warn('[Push] Push subscription failed:', err)
    return null
  }
}

// ── Save subscription to backend ─────────────────────────
async function saveSubscription(subscription) {
  const token = localStorage.getItem('token')
  if (!token) return false

  try {
    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    })
    return res.ok
  } catch (err) {
    console.warn('[Push] Failed to save subscription:', err)
    return false
  }
}

// ── Main: call this after login ───────────────────────────
export async function initPush() {
  // Must be HTTPS or localhost
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('[Push] Push notifications require HTTPS.')
    return false
  }

  if (!('Notification' in window) || !('PushManager' in window)) {
    console.warn('[Push] Push not supported in this browser.')
    return false
  }

  // Check current permission state
  if (Notification.permission === 'denied') {
    console.warn('[Push] Notifications blocked by user.')
    return false
  }

  // Request permission if not yet granted
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[Push] User denied notification permission.')
      return false
    }
  }

  const registration = await registerSW()
  if (!registration) return false

  const subscription = await subscribeToPush(registration)
  if (!subscription) return false

  const saved = await saveSubscription(subscription)
  if (saved) {
    console.log('[Push] Push notifications enabled.')
  }

  return saved
}

// ── Unsubscribe (call on logout) ──────────────────────────
export async function disablePush() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration  = await navigator.serviceWorker.ready
    const subscription  = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }

    const token = localStorage.getItem('token')
    if (token) {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify(subscription?.toJSON() || {}),
      }).catch(() => {})
    }
  } catch (err) {
    console.warn('[Push] Unsubscribe failed:', err)
  }
}
