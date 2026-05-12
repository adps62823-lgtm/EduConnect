import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must be a unique reverse-domain identifier for your app.
  // Change 'com.sunbeam' to your school/org domain if you have one.
  appId: 'com.sunbeam.educonnect',

  // Display name shown on the phone's home screen
  appName: 'EduConnect',

  // Where your Vite build output goes
  webDir: 'dist',

  // ── Server config ──────────────────────────────────────
  server: {
    // In development you can point to your local Vite dev server
    // so hot-reload works on the device. Comment this out for production builds.
    // url: 'http://192.168.1.X:5173',  // replace X with your local IP
    // cleartext: true,

    // All API calls go to your Render backend directly.
    // This is the production setting — keep this for Play Store builds.
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.educonnect.local',
  },

  // ── Plugin configurations ──────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',       // matches your dark theme
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    StatusBar: {
      style: 'Dark',                    // light text on dark background
      backgroundColor: '#0f172a',
      overlaysWebView: false,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  // ── Android specific ───────────────────────────────────
  android: {
    // Allow cleartext (http) only in debug mode. In production leave this out.
    // allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set to true while debugging
  },

  // ── iOS specific ───────────────────────────────────────
  ios: {
    contentInset: 'automatic',
    // scrollEnabled: true,
  },
};

export default config;
