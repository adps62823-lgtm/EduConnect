/**
 * capacitorService.js
 * Wraps Capacitor native plugins with safe fallbacks for web.
 * Import and use these instead of calling Capacitor plugins directly.
 *
 * Usage in any component:
 *   import { takePhoto, shareContent, vibrateLight } from '@/capacitorService'
 */

import { Capacitor } from '@capacitor/core'

// Detect if we're running inside a native app (Android/iOS) or just the browser
export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'android' | 'ios' | 'web'

// ── Camera ────────────────────────────────────────────────

/**
 * Take a photo using the device camera or pick from gallery.
 * Returns a base64 data URL string, or null if cancelled / on web.
 *
 * @param {'CAMERA'|'PHOTOS'} source
 */
export async function takePhoto(source = 'CAMERA') {
  if (!isNative) {
    // On web, fall back to a standard file input
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = source === 'CAMERA' ? 'environment' : undefined
      input.onchange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return resolve(null)
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(file)
      }
      input.click()
    })
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: source === 'CAMERA' ? CameraSource.Camera : CameraSource.Photos,
      quality: 85,
      allowEditing: false,
      width: 1080,
      correctOrientation: true,
    })
    return photo.dataUrl || null
  } catch (err) {
    if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
      return null // User cancelled — not an error
    }
    console.error('Camera error:', err)
    return null
  }
}

// ── Share ─────────────────────────────────────────────────

/**
 * Open the native share sheet (WhatsApp, Instagram, etc.)
 * Falls back to navigator.share on web if available.
 *
 * @param {{ title: string, text: string, url?: string }} options
 */
export async function shareContent({ title, text, url }) {
  if (isNative) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url, dialogTitle: title })
      return true
    } catch {
      return false
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return true
    } catch {
      return false
    }
  }

  // Last resort: copy to clipboard
  if (url && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
    return true
  }

  return false
}

// ── Haptics / Vibration ───────────────────────────────────

export async function vibrateLight() {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {}
  } else if (navigator.vibrate) {
    navigator.vibrate(30)
  }
}

export async function vibrateMedium() {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {}
  } else if (navigator.vibrate) {
    navigator.vibrate(60)
  }
}

export async function vibrateSuccess() {
  if (isNative) {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics')
      await Haptics.notification({ type: NotificationType.Success })
    } catch {}
  } else if (navigator.vibrate) {
    navigator.vibrate([30, 50, 30])
  }
}

// ── Network ───────────────────────────────────────────────

/**
 * Check if the device is online.
 * Returns { connected: boolean, connectionType: string }
 */
export async function getNetworkStatus() {
  if (isNative) {
    try {
      const { Network } = await import('@capacitor/network')
      const status = await Network.getStatus()
      return status
    } catch {}
  }
  return { connected: navigator.onLine, connectionType: 'unknown' }
}

/**
 * Listen for network changes. Returns an unsubscribe function.
 * @param {(status: { connected: boolean }) => void} callback
 */
export async function onNetworkChange(callback) {
  if (isNative) {
    try {
      const { Network } = await import('@capacitor/network')
      const handle = await Network.addListener('networkStatusChange', callback)
      return () => handle.remove()
    } catch {}
  }

  const handler = () => callback({ connected: navigator.onLine })
  window.addEventListener('online', handler)
  window.addEventListener('offline', handler)
  return () => {
    window.removeEventListener('online', handler)
    window.removeEventListener('offline', handler)
  }
}

// ── Push Notifications ────────────────────────────────────

/**
 * Request push notification permission and return the FCM/APNs token.
 * Call this after the user logs in.
 * Returns the token string, or null if denied / on web.
 */
export async function registerPushNotifications() {
  if (!isNative) return null

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return null

    await PushNotifications.register()

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('Push token:', token.value)
        resolve(token.value)
      })
      PushNotifications.addListener('registrationError', () => resolve(null))
      // Timeout after 10 seconds
      setTimeout(() => resolve(null), 10_000)
    })
  } catch (err) {
    console.error('Push registration error:', err)
    return null
  }
}

// ── Status Bar ────────────────────────────────────────────

export async function setStatusBarDark() {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0f172a' })
  } catch {}
}

export async function hideStatusBar() {
  if (!isNative) return
  try {
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.hide()
  } catch {}
}

// ── Splash Screen ─────────────────────────────────────────

export async function hideSplashScreen() {
  if (!isNative) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 300 })
  } catch {}
}

// ── Open external URL ─────────────────────────────────────

export async function openUrl(url) {
  if (isNative) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url, presentationStyle: 'popover' })
      return
    } catch {}
  }
  window.open(url, '_blank', 'noopener noreferrer')
}
