/**
 * sw.js — EduConnect Service Worker
 * Handles background push notifications.
 * Place this file in: frontend/public/sw.js
 */

const APP_NAME = 'EduConnect'
const ICON = '/icon-192.png'   // add your app icon here later

// ── Push event — fires when server sends a push ───────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: APP_NAME, body: event.data.text() }
  }

  const title   = payload.title || APP_NAME
  const options = {
    body:    payload.body    || '',
    icon:    payload.icon    || ICON,
    badge:   payload.badge   || ICON,
    tag:     payload.tag     || 'educonnect',   // replaces previous notif of same tag
    renotify: true,
    vibrate: [150, 60, 150],
    data: {
      url: payload.url || '/',
    },
    actions: payload.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── Notification click — open / focus the app ─────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ── Activate — take control immediately ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
