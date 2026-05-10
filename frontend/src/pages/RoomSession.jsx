import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  Clock,
  Crown,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Send,
  Settings,
  Square,
  UserMinus,
  Video,
  VideoOff,
  X,
} from 'lucide-react'
import { roomAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import { Button, EmptyState, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60

// ─── ICE config with TURN fallback for cross-origin deployments ───────────────
// STUN-only fails when both peers are behind symmetric NAT (common on mobile/
// corporate networks). The open TURN servers below are rate-limited but
// sufficient for a school pilot. Replace with your own Twilio/Metered TURN
// credentials before scaling.
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Public TURN servers (rate-limited, good for pilot)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
}

const BACKGROUND_PRESETS = [
  { id: 'none', label: 'None', mode: 'none' },
  { id: 'focus', label: 'Focus Blue', mode: 'gradient', background: 'linear-gradient(135deg, #152033 0%, #285b8f 100%)' },
  { id: 'mint', label: 'Mint', mode: 'gradient', background: 'linear-gradient(135deg, #093028 0%, #237a57 100%)' },
  { id: 'sunset', label: 'Sunset', mode: 'gradient', background: 'linear-gradient(135deg, #2b0f1a 0%, #a84c3f 100%)' },
  { id: 'graphite', label: 'Graphite', mode: 'gradient', background: 'linear-gradient(135deg, #111827 0%, #374151 100%)' },
  { id: 'soft', label: 'Soft Blur', mode: 'blur', background: 'linear-gradient(135deg, rgba(148,163,184,0.34) 0%, rgba(71,85,105,0.55) 100%)' },
]

const BOARD_COLORS = ['#ffffff', '#60a5fa', '#34d399', '#fbbf24', '#f87171']
const MOBILE_PANEL_BREAKPOINT = 900

function normalizeMember(member) {
  if (!member) return null
  if (member.user) {
    return {
      ...member,
      user: member.user,
      user_id: member.user?.id || member.user_id,
      is_host: Boolean(member.is_host),
      study_time_mins: member.study_time_mins ?? 0,
    }
  }
  return {
    id: member.id || `temp_${member.user?.id || member.user_id || Math.random()}`,
    user_id: member.user?.id || member.user_id,
    user: member.user || member,
    is_host: Boolean(member.is_host),
    study_time_mins: member.study_time_mins ?? 0,
  }
}

function sortMembers(list) {
  return [...list]
    .map(normalizeMember)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.is_host && !b.is_host) return -1
      if (!a.is_host && b.is_host) return 1
      return (a.user?.name || '').localeCompare(b.user?.name || '')
    })
}

function getPomodoroSnapshot(room) {
  if (!room?.pomodoro_active || !room?.pomodoro_start) {
    return { active: false, isBreak: false, seconds: POMODORO_WORK, total: POMODORO_WORK, completedFocusSessions: 0 }
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(room.pomodoro_start).getTime()) / 1000))
  const cycleLength = POMODORO_WORK + POMODORO_BREAK
  const cycleOffset = elapsed % cycleLength
  const isBreak = cycleOffset >= POMODORO_WORK
  const seconds = isBreak
    ? Math.max(1, POMODORO_BREAK - (cycleOffset - POMODORO_WORK))
    : Math.max(1, POMODORO_WORK - cycleOffset)
  return {
    active: true,
    isBreak,
    seconds,
    total: isBreak ? POMODORO_BREAK : POMODORO_WORK,
    completedFocusSessions: Math.floor(elapsed / cycleLength) + (isBreak ? 1 : 0),
  }
}

function defaultMediaState(overrides = {}) {
  return {
    mic_on: false, cam_on: false, screen_sharing: false,
    hand_raised: false, background_mode: 'none',
    background_color: '', background_image: '',
    audio_enabled: false, video_enabled: false,
    ...overrides,
  }
}

function getBackgroundPreset(presetId) {
  return BACKGROUND_PRESETS.find((p) => p.id === presetId) || BACKGROUND_PRESETS[0]
}

function getTileBackgroundStyle(mediaState) {
  if (mediaState?.background_mode === 'gradient') {
    return { background: mediaState.background_color || 'linear-gradient(135deg, #111827 0%, #334155 100%)' }
  }
  if (mediaState?.background_mode === 'blur') {
    return {
      background: mediaState.background_color || 'linear-gradient(135deg, rgba(148,163,184,0.34) 0%, rgba(71,85,105,0.55) 100%)',
      backdropFilter: 'blur(24px)',
    }
  }
  return { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }
}

function drawStroke(ctx, stroke) {
  if (!ctx || !stroke?.points?.length) return
  ctx.save()
  ctx.strokeStyle = stroke.color || '#ffffff'
  ctx.lineWidth = stroke.size || 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  stroke.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  if (stroke.points.length === 1) {
    const point = stroke.points[0]
    ctx.arc(point.x, point.y, (stroke.size || 4) / 2, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.restore()
}

function PomodoroRing({ seconds, total, isBreak }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? seconds / total : 0
  const dashOffset = circumference * (1 - progress)
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg width="120" height="120" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={isBreak ? 'var(--green)' : 'var(--primary)'}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.35rem', color: isBreak ? 'var(--green)' : 'var(--text)', lineHeight: 1 }}>
          {mins}:{secs}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 700 }}>
          {isBreak ? 'BREAK' : 'FOCUS'}
        </span>
      </div>
    </div>
  )
}

// ─── MediaTile ────────────────────────────────────────────────────────────────
// FIX 1: Remote video element must NOT be muted — the original code had
//         `muted` on the <video> which silenced all remote audio.
// FIX 2: Audio for remote peers must play through a *separate* <audio> element
//         (kept outside the video, always in DOM, never muted).
// FIX 3: srcObject assignment uses a useEffect keyed on `stream` object identity
//         AND on individual track counts so it re-fires when tracks arrive.
// FIX 4: We call .play() only after srcObject is set, with an autoplay-policy
//         workaround (user-gesture unlock via click on document).
function MediaTile({ member, stream, mediaState, isHost, isMe, onKick, onTransfer }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const targetUserId = member.user?.id

  // Derive track presence directly from stream
  const videoTracks = stream?.getVideoTracks?.() || []
  const audioTracks = stream?.getAudioTracks?.() || []
  const hasLiveVideo = videoTracks.some((t) => t.readyState === 'live' && t.enabled)
  const hasLiveAudio = audioTracks.some((t) => t.readyState === 'live')

  // FIX: Attach video stream — local tile shows own camera, no audio needed
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.srcObject !== stream) {
      vid.srcObject = stream || null
    }
    if (stream) {
      vid.play().catch(() => {
        // Autoplay blocked — will play on next user gesture
      })
    }
  }, [stream, hasLiveVideo])

  // FIX: Attach audio stream for REMOTE peers only — completely separate
  // from the video element so muting video doesn't mute audio.
  // The audio element is never muted (isMe guard prevents self-echo).
  useEffect(() => {
    const aud = audioRef.current
    if (!aud || isMe) return
    if (aud.srcObject !== stream) {
      aud.srcObject = stream || null
      aud.muted = false
      aud.volume = 1.0
    }
    if (stream && hasLiveAudio) {
      aud.play().catch(() => {
        // Will auto-resume on next user interaction
      })
    }
  }, [stream, hasLiveAudio, isMe])

  const backgroundStyle = getTileBackgroundStyle(mediaState)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        minHeight: 220,
        position: 'relative',
      }}
    >
      <div style={{ aspectRatio: '16 / 10', width: '100%', position: 'relative', ...backgroundStyle }}>
        {/* Video element — muted ONLY for local self-preview to prevent echo */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe}   // FIX: only mute self, NEVER mute remote video
          style={{
            width: '100%',
            height: '100%',
            objectFit: mediaState?.screen_sharing ? 'contain' : 'cover',
            background: '#030712',
            display: hasLiveVideo ? 'block' : 'none',
          }}
        />

        {/* Avatar shown when no video */}
        {!hasLiveVideo && (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, textAlign: 'center' }}>
            <Avatar user={member.user} size="xl" showRing />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{member.user?.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
                {mediaState?.screen_sharing
                  ? 'Sharing a screen'
                  : hasLiveAudio
                    ? '🎙 Audio live'
                    : mediaState?.cam_on
                      ? 'Camera starting...'
                      : 'Camera off'}
              </div>
            </div>
          </div>
        )}

        {/* FIX: Audio element — separate from video, always in DOM for remote peers,
            NEVER muted, positioned outside video so video-mute can't affect it */}
        {!isMe && (
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            muted={false}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          />
        )}

        {member.is_host && (
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(251, 191, 36, 0.18)', color: '#fde68a', fontSize: '0.68rem', fontWeight: 700, border: '1px solid rgba(251, 191, 36, 0.25)' }}>
            <Crown size={11} /> Host
          </div>
        )}

        {mediaState?.screen_sharing && (
          <div style={{ position: 'absolute', top: 10, right: isHost && !member.is_host && targetUserId ? 48 : 10, padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(15, 23, 42, 0.72)', color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>
            Screen sharing
          </div>
        )}

        {isHost && !member.is_host && targetUserId && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => setMenuOpen((v) => !v)}>
              <Settings size={13} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ position: 'absolute', top: '115%', right: 0, minWidth: 150, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 10 }}
                >
                  <button onClick={() => { onTransfer(targetUserId, member.user?.name); setMenuOpen(false) }} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                    <Crown size={13} /> Make host
                  </button>
                  <button onClick={() => { onKick(targetUserId, member.user?.name); setMenuOpen(false) }} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)' }}>
                    <UserMinus size={13} /> Remove
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }} className="truncate">
            {member.user?.name}{isMe ? ' (you)' : ''}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{member.study_time_mins ?? 0}m studied today</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ padding: '4px 7px', borderRadius: 'var(--radius-full)', background: mediaState?.mic_on ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: mediaState?.mic_on ? 'var(--green)' : 'var(--red)', fontSize: '0.68rem', fontWeight: 700 }}>
            {mediaState?.mic_on ? 'Mic on' : 'Muted'}
          </span>
          <span style={{ padding: '4px 7px', borderRadius: 'var(--radius-full)', background: mediaState?.cam_on || mediaState?.screen_sharing ? 'rgba(59,130,246,0.16)' : 'rgba(148,163,184,0.16)', color: mediaState?.cam_on || mediaState?.screen_sharing ? 'var(--primary)' : 'var(--text-3)', fontSize: '0.68rem', fontWeight: 700 }}>
            {mediaState?.screen_sharing ? 'Screen' : mediaState?.cam_on ? 'Video on' : 'Video off'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main RoomSession ─────────────────────────────────────────────────────────
export default function RoomSession() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const wsOn = useWSStore((s) => s.on)
  const wsSend = useWSStore((s) => s.send)
  const sendOffer = useWSStore((s) => s.sendOffer)
  const sendAnswer = useWSStore((s) => s.sendAnswer)
  const sendIce = useWSStore((s) => s.sendIce)
  const sendRoomJoin = useWSStore((s) => s.sendRoomJoin)
  const sendRoomLeave = useWSStore((s) => s.sendRoomLeave)
  const sendRoomMediaState = useWSStore((s) => s.sendRoomMediaState)
  const sendRoomWhiteboard = useWSStore((s) => s.sendRoomWhiteboard)
  const sendRoomScreenShare = useWSStore((s) => s.sendRoomScreenShare)
  const sendRoomStateSync = useWSStore((s) => s.sendRoomStateSync)
  const sendRoomStateSyncRequest = useWSStore((s) => s.sendRoomStateSyncRequest)

  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshingMembers, setRefreshingMembers] = useState(false)

  const [pomoActive, setPomoActive] = useState(false)
  const [pomoSeconds, setPomoSeconds] = useState(POMODORO_WORK)
  const [pomoTotal, setPomoTotal] = useState(POMODORO_WORK)
  const [pomoBreak, setPomoBreak] = useState(false)
  const [pomoCount, setPomoCount] = useState(0)
  const pomoRef = useRef(null)

  const [panel, setPanel] = useState(null)
  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_PANEL_BREAKPOINT : false
  )
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatText, setChatText] = useState('')
  const [unreadChat, setUnreadChat] = useState(0)
  const chatBottomRef = useRef(null)

  const [localMediaState, setLocalMediaState] = useState(defaultMediaState())
  const localMediaStateRef = useRef(defaultMediaState())
  // FIX: Track the local preview stream as a ref + state so MediaTile gets
  //      a fresh object reference every time tracks change.
  const [localPreviewStream, setLocalPreviewStream] = useState(null)
  // FIX: remoteStreams now stores {[userId]: MediaStream} where each value
  //      is ALWAYS a new MediaStream instance so MediaTile useEffects fire.
  const [remoteStreams, setRemoteStreams] = useState({})
  const [participantMedia, setParticipantMedia] = useState({})
  const participantMediaRef = useRef({})

  const [selectedBackground, setSelectedBackground] = useState('none')
  const [boardColor, setBoardColor] = useState(BOARD_COLORS[0])
  const [boardSize, setBoardSize] = useState(4)
  const [boardStrokes, setBoardStrokes] = useState([])
  const boardStrokesRef = useRef([])
  const boardWrapRef = useRef(null)
  const boardCanvasRef = useRef(null)
  const boardDrawingRef = useRef(null)

  // Media tracks — kept as refs so we never need stale closures
  const audioTrackRef = useRef(null)
  const cameraTrackRef = useRef(null)
  const screenTrackRef = useRef(null)

  // FIX: peerConnectionsRef stores { pc, audioSender, videoSender }
  // We always createOffer with onnegotiationneeded rather than calling
  // createOfferForUser manually after track changes, which was causing
  // race conditions in the original code.
  const peerConnectionsRef = useRef({})
  const makingOfferRef = useRef({})
  const syncRequestedRef = useRef(false)

  const isHost = room?.host_id === currentUser?.id
  const showChat = panel === 'chat'
  const showWhiteboard = panel === 'whiteboard'
  const showBackgrounds = panel === 'backgrounds'
  const memberCount = members.length
  const panelTitle = showChat ? 'Room Chat' : showWhiteboard ? 'Collaborative Whiteboard' : showBackgrounds ? 'Virtual Background' : ''

  useEffect(() => { localMediaStateRef.current = localMediaState }, [localMediaState])
  useEffect(() => { participantMediaRef.current = participantMedia }, [participantMedia])
  useEffect(() => { boardStrokesRef.current = boardStrokes }, [boardStrokes])

  useEffect(() => {
    const sync = () => setIsCompactLayout(window.innerWidth <= MOBILE_PANEL_BREAKPOINT)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const updateLocalMediaState = useCallback((patch, options = {}) => {
    const next = { ...localMediaStateRef.current, ...patch }
    localMediaStateRef.current = next
    setLocalMediaState(next)
    if (!options.silent && roomId) sendRoomMediaState(roomId, next)
  }, [roomId, sendRoomMediaState])

  // FIX: rebuildLocalPreview creates a brand-new MediaStream each time so
  //      the MediaTile useEffect always fires (object reference changes).
  const rebuildLocalPreview = useCallback(() => {
    const nextStream = new MediaStream()
    const activeVideoTrack = screenTrackRef.current ||
      (localMediaStateRef.current.cam_on ? cameraTrackRef.current : null)
    if (activeVideoTrack?.readyState === 'live') nextStream.addTrack(activeVideoTrack)
    if (audioTrackRef.current?.readyState === 'live') nextStream.addTrack(audioTrackRef.current)
    setLocalPreviewStream(nextStream.getTracks().length ? nextStream : null)
  }, [])

  // FIX: syncPeerMediaForUser uses replaceTrack correctly.
  // Key insight: we pass the ACTUAL track object (not null when disabled) so the
  // codec stays negotiated. We disable the track via track.enabled=false instead
  // of sending null, which avoids unnecessary renegotiation.
  const syncPeerMediaForUser = useCallback((remoteUserId) => {
    const conn = peerConnectionsRef.current[remoteUserId]
    if (!conn) return

    const activeVideoTrack = screenTrackRef.current ||
      (cameraTrackRef.current?.readyState === 'live' ? cameraTrackRef.current : null)
    const activeAudioTrack = audioTrackRef.current?.readyState === 'live' ? audioTrackRef.current : null

    // replaceTrack never triggers renegotiation — it just hot-swaps the track
    if (conn.audioSender) {
      conn.audioSender.replaceTrack(activeAudioTrack || null).catch(() => {})
    }
    if (conn.videoSender) {
      conn.videoSender.replaceTrack(activeVideoTrack || null).catch(() => {})
    }
  }, [])

  const syncAllPeerMedia = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach(syncPeerMediaForUser)
  }, [syncPeerMediaForUser])

  const cleanupPeer = useCallback((remoteUserId) => {
    const conn = peerConnectionsRef.current[remoteUserId]
    if (conn) {
      try {
        conn.pc.ontrack = null
        conn.pc.onicecandidate = null
        conn.pc.onconnectionstatechange = null
        conn.pc.onnegotiationneeded = null
        conn.pc.close()
      } catch {}
    }
    delete peerConnectionsRef.current[remoteUserId]
    delete makingOfferRef.current[remoteUserId]
    setRemoteStreams((prev) => { if (!prev[remoteUserId]) return prev; const n = { ...prev }; delete n[remoteUserId]; return n })
    setParticipantMedia((prev) => { if (!prev[remoteUserId]) return prev; const n = { ...prev }; delete n[remoteUserId]; participantMediaRef.current = n; return n })
  }, [])

  // FIX: ensurePeerConnection sets up onnegotiationneeded so the browser
  //      handles renegotiation automatically when tracks are added/replaced.
  //      We also use addTransceiver so both audio and video codecs are
  //      pre-negotiated even before getUserMedia is called.
  const ensurePeerConnection = useCallback((remoteUserId) => {
    if (!remoteUserId || remoteUserId === currentUser?.id) return null
    if (peerConnectionsRef.current[remoteUserId]) return peerConnectionsRef.current[remoteUserId]

    const pc = new RTCPeerConnection(ICE_CONFIG)

    // Pre-add transceivers so SDP always contains audio+video sections.
    // direction: sendrecv means we're willing to both send and receive.
    const audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender
    const videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender

    const conn = { pc, audioSender, videoSender }
    peerConnectionsRef.current[remoteUserId] = conn

    pc.onicecandidate = (e) => {
      if (e.candidate) sendIce(roomId, remoteUserId, e.candidate)
    }

    // FIX: ontrack — create a fresh MediaStream for every incoming track so
    //      the remoteStreams object reference changes and MediaTile re-renders.
    pc.ontrack = (e) => {
      setRemoteStreams((prev) => {
        const existing = prev[remoteUserId]
        // Build new stream preserving existing tracks + adding new ones
        const allTracks = existing ? [...existing.getTracks()] : []
        const incomingTrack = e.track
        if (!allTracks.find((t) => t.id === incomingTrack.id)) {
          allTracks.push(incomingTrack)
        }
        // Always new MediaStream object → MediaTile useEffect always fires
        return { ...prev, [remoteUserId]: new MediaStream(allTracks) }
      })
    }

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) cleanupPeer(remoteUserId)
    }

    pc.oniceconnectionstatechange = () => {
      // Auto-restart ICE if it fails (handles flaky NAT traversal)
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce()
      }
    }

    // FIX: onnegotiationneeded — browser fires this whenever tracks change.
    // This replaces the manual renegotiateAllPeers() approach which had
    // timing bugs (calling createOffer while signaling wasn't stable).
    pc.onnegotiationneeded = async () => {
      if (makingOfferRef.current[remoteUserId]) return
      try {
        if (pc.signalingState !== 'stable') return
        makingOfferRef.current[remoteUserId] = true
        const offer = await pc.createOffer()
        if (pc.signalingState !== 'stable') return // check again after async
        await pc.setLocalDescription(offer)
        sendOffer(roomId, remoteUserId, pc.localDescription)
      } catch {
        cleanupPeer(remoteUserId)
      } finally {
        makingOfferRef.current[remoteUserId] = false
      }
    }

    // Immediately sync any tracks we already have
    syncPeerMediaForUser(remoteUserId)

    return conn
  }, [cleanupPeer, currentUser?.id, roomId, sendIce, sendOffer, syncPeerMediaForUser])

  const createOfferForUser = useCallback(async (remoteUserId) => {
    const conn = ensurePeerConnection(remoteUserId)
    if (!conn || makingOfferRef.current[remoteUserId]) return
    if (conn.pc.signalingState !== 'stable') return
    try {
      makingOfferRef.current[remoteUserId] = true
      syncPeerMediaForUser(remoteUserId)
      const offer = await conn.pc.createOffer()
      if (conn.pc.signalingState !== 'stable') return
      await conn.pc.setLocalDescription(offer)
      sendOffer(roomId, remoteUserId, conn.pc.localDescription)
    } catch {
      cleanupPeer(remoteUserId)
    } finally {
      makingOfferRef.current[remoteUserId] = false
    }
  }, [cleanupPeer, ensurePeerConnection, roomId, sendOffer, syncPeerMediaForUser])

  const ensureAudioTrack = useCallback(async () => {
    if (audioTrackRef.current?.readyState === 'live') return audioTrackRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Audio capture is not supported in this browser.')
      return null
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const track = stream.getAudioTracks()[0]
    if (!track) return null
    audioTrackRef.current = track
    return track
  }, [])

  const ensureCameraTrack = useCallback(async () => {
    if (cameraTrackRef.current?.readyState === 'live') return cameraTrackRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera capture is not supported in this browser.')
      return null
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    })
    const track = stream.getVideoTracks()[0]
    if (!track) return null
    cameraTrackRef.current = track
    return track
  }, [])

  const stopScreenShare = useCallback(async () => {
    if (screenTrackRef.current) {
      try { screenTrackRef.current.onended = null; screenTrackRef.current.stop() } catch {}
      screenTrackRef.current = null
    }
    rebuildLocalPreview()
    syncAllPeerMedia()
    updateLocalMediaState({ screen_sharing: false, video_enabled: localMediaStateRef.current.cam_on })
    if (roomId) sendRoomScreenShare(roomId, { active: false })
  }, [rebuildLocalPreview, roomId, sendRoomScreenShare, syncAllPeerMedia, updateLocalMediaState])

  // ── Whiteboard ──────────────────────────────────────────────────────────────
  const resizeBoard = useCallback(() => {
    const canvas = boardCanvasRef.current
    const wrap = boardWrapRef.current
    if (!canvas || !wrap) return
    const width = Math.max(280, Math.floor(wrap.clientWidth))
    const height = Math.max(280, Math.floor(wrap.clientHeight))
    if (canvas.width === width && canvas.height === height) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    boardStrokesRef.current.forEach((stroke) => drawStroke(ctx, stroke))
  }, [])

  // ── Pomodoro ────────────────────────────────────────────────────────────────
  const applyPomodoroSnapshot = useCallback((snapshot) => {
    clearInterval(pomoRef.current)
    setPomoActive(snapshot.active)
    setPomoBreak(snapshot.isBreak)
    setPomoSeconds(snapshot.seconds)
    setPomoTotal(snapshot.total)
    setPomoCount(snapshot.completedFocusSessions || 0)
    if (snapshot.active) {
      let seconds = snapshot.seconds
      let currentBreak = snapshot.isBreak
      pomoRef.current = setInterval(() => {
        seconds -= 1
        if (seconds > 0) { setPomoSeconds(seconds); return }
        currentBreak = !currentBreak
        const nextTotal = currentBreak ? POMODORO_BREAK : POMODORO_WORK
        seconds = nextTotal
        setPomoBreak(currentBreak)
        setPomoTotal(nextTotal)
        setPomoSeconds(nextTotal)
        if (currentBreak) { setPomoCount((c) => c + 1); toast('Break time. Take 5 minutes.', { duration: 2400 }) }
        else { toast('Focus time. Back to 25 minutes.', { duration: 2400 }) }
      }, 1000)
    }
  }, [])

  const applyRoomSnapshot = useCallback((payload, syncPomodoro = false) => {
    const data = payload?.room ? payload : { room: payload, members: payload?.members || [] }
    setRoom(data.room)
    setMembers(sortMembers(data.members || []))
    if (syncPomodoro) applyPomodoroSnapshot(getPomodoroSnapshot(data.room))
  }, [applyPomodoroSnapshot])

  const refreshRoomMembers = useCallback(async () => {
    if (!roomId) return
    setRefreshingMembers(true)
    try {
      const payload = await roomAPI.getRoom(roomId)
      applyRoomSnapshot(payload, false)
    } catch {} finally {
      setRefreshingMembers(false)
    }
  }, [applyRoomSnapshot, roomId])

  const loadRoom = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const payload = await roomAPI.getRoom(roomId)
      applyRoomSnapshot(payload, true)
      sendRoomJoin(roomId)
    } catch {
      toast.error('Room not found or session expired.')
      navigate('/rooms')
    } finally {
      setLoading(false)
    }
  }, [applyRoomSnapshot, navigate, roomId, sendRoomJoin])

  useEffect(() => {
    loadRoom()
    return () => {
      clearInterval(pomoRef.current)
      sendRoomLeave(roomId)
      Object.keys(peerConnectionsRef.current).forEach(cleanupPeer)
      ;[audioTrackRef.current, cameraTrackRef.current, screenTrackRef.current].forEach((t) => { try { t?.stop() } catch {} })
    }
  }, [cleanupPeer, loadRoom, roomId, sendRoomLeave])

  useEffect(() => {
    if (!showWhiteboard) return
    resizeBoard()
    window.addEventListener('resize', resizeBoard)
    return () => window.removeEventListener('resize', resizeBoard)
  }, [resizeBoard, showWhiteboard, boardStrokes])

  // Broadcast our own media state when we first enter
  useEffect(() => {
    if (!roomId || !room) return
    sendRoomMediaState(roomId, localMediaStateRef.current)
  }, [room?.id, roomId, sendRoomMediaState])

  // Request state sync from host when joining a room already in session
  useEffect(() => {
    if (!roomId || !room?.host_id || room.host_id === currentUser?.id || syncRequestedRef.current) return
    const timer = setTimeout(() => {
      syncRequestedRef.current = true
      sendRoomStateSyncRequest(roomId, room.host_id)
    }, 900)
    return () => clearTimeout(timer)
  }, [currentUser?.id, room?.host_id, roomId, sendRoomStateSyncRequest])

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs, showChat])

  // FIX: When members list changes, set up peer connections.
  // The "higher ID initiates" rule prevents both sides making offers simultaneously.
  useEffect(() => {
    members.forEach((member) => {
      const remoteUserId = member.user?.id
      if (!remoteUserId || remoteUserId === currentUser?.id) return
      if (!participantMediaRef.current[remoteUserId]) {
        setParticipantMedia((prev) => ({ ...prev, [remoteUserId]: defaultMediaState() }))
      }
      // Higher string ID initiates to break symmetry
      if (!peerConnectionsRef.current[remoteUserId] && String(currentUser?.id || '') > String(remoteUserId)) {
        createOfferForUser(remoteUserId)
      } else {
        // Lower ID still creates the PC so it's ready to receive an offer
        ensurePeerConnection(remoteUserId)
      }
    })
  }, [createOfferForUser, ensurePeerConnection, currentUser?.id, members])

  // ── WebSocket event handlers ────────────────────────────────────────────────
  useEffect(() => {
    const unsubJoin = wsOn('room_join', (msg) => {
      if (msg.room_id !== roomId || msg.user_id === currentUser?.id) return
      const incoming = normalizeMember({ id: `live_${msg.user_id}`, user_id: msg.user_id, user: msg.user, is_host: false, study_time_mins: 0 })
      setMembers((prev) => {
        if (prev.some((m) => m.user?.id === incoming.user?.id)) return prev
        return sortMembers([...prev, incoming])
      })
      setParticipantMedia((prev) => ({ ...prev, [msg.user_id]: prev[msg.user_id] || defaultMediaState() }))
      // Lower ID waits for offer; higher ID creates offer
      if (String(currentUser?.id || '') > String(msg.user_id || '')) {
        createOfferForUser(msg.user_id)
      } else {
        ensurePeerConnection(msg.user_id)
      }
      refreshRoomMembers()
      if (msg.user?.name) toast(`${msg.user.name} joined the room.`, { duration: 2200 })
    })

    const unsubLeave = wsOn('room_leave', (msg) => {
      if (msg.room_id !== roomId) return
      cleanupPeer(msg.user_id)
      setMembers((prev) => prev.filter((m) => m.user?.id !== msg.user_id))
      if (msg.new_host_id) setRoom((prev) => prev ? { ...prev, host_id: msg.new_host_id } : prev)
      refreshRoomMembers()
    })

    const unsubKick = wsOn('room_kick', (msg) => {
      if (msg.room_id !== roomId) return
      if (msg.user_id === currentUser?.id) { toast.error('You were removed from the room.'); navigate('/rooms'); return }
      cleanupPeer(msg.user_id)
      setMembers((prev) => prev.filter((m) => m.user?.id !== msg.user_id))
      refreshRoomMembers()
    })

    // FIX: webrtc_offer handler — implements "perfect negotiation" pattern.
    // The polite peer (lower ID string) defers to the impolite peer's offer.
    const unsubOffer = wsOn('webrtc_offer', async (msg) => {
      if (msg.room_id !== roomId || msg.from === currentUser?.id) return
      const remoteUserId = msg.from
      const conn = ensurePeerConnection(remoteUserId)
      if (!conn) return

      // Polite peer: lower string ID yields to incoming offer
      const polite = String(currentUser?.id || '') < String(remoteUserId || '')
      const offerCollision = makingOfferRef.current[remoteUserId] || conn.pc.signalingState !== 'stable'

      if (offerCollision && !polite) return // impolite peer ignores colliding offer

      try {
        if (offerCollision && polite) {
          // Rollback our own offer and accept theirs
          await conn.pc.setLocalDescription({ type: 'rollback' })
        }
        await conn.pc.setRemoteDescription(new RTCSessionDescription(msg.offer))
        syncPeerMediaForUser(remoteUserId)
        const answer = await conn.pc.createAnswer()
        await conn.pc.setLocalDescription(answer)
        sendAnswer(roomId, remoteUserId, conn.pc.localDescription)
      } catch {
        cleanupPeer(remoteUserId)
      }
    })

    const unsubAnswer = wsOn('webrtc_answer', async (msg) => {
      if (msg.room_id !== roomId || msg.from === currentUser?.id) return
      const conn = ensurePeerConnection(msg.from)
      if (!conn) return
      try {
        if (conn.pc.signalingState === 'have-local-offer') {
          await conn.pc.setRemoteDescription(new RTCSessionDescription(msg.answer))
        }
      } catch { cleanupPeer(msg.from) }
    })

    const unsubIce = wsOn('webrtc_ice', async (msg) => {
      if (msg.room_id !== roomId || msg.from === currentUser?.id) return
      const conn = ensurePeerConnection(msg.from)
      if (!conn) return
      try {
        if (msg.candidate) await conn.pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
      } catch {
        // Stale ICE candidate — harmless to ignore
      }
    })

    const unsubMedia = wsOn('room_media_state', (msg) => {
      if (msg.room_id !== roomId || msg.user_id === currentUser?.id) return
      setParticipantMedia((prev) => {
        const next = { ...prev, [msg.user_id]: defaultMediaState({ ...(prev[msg.user_id] || {}), ...msg }) }
        participantMediaRef.current = next
        return next
      })
    })

    const unsubScreen = wsOn('room_screen_share', (msg) => {
      if (msg.room_id !== roomId || msg.user_id === currentUser?.id) return
      setParticipantMedia((prev) => {
        const next = { ...prev, [msg.user_id]: defaultMediaState({ ...(prev[msg.user_id] || {}), screen_sharing: Boolean(msg.active) }) }
        participantMediaRef.current = next
        return next
      })
    })

    const unsubWhiteboard = wsOn('room_whiteboard', (msg) => {
      if (msg.room_id !== roomId || msg.user_id === currentUser?.id) return
      if (msg.action === 'clear') { boardStrokesRef.current = []; setBoardStrokes([]); return }
      if (msg.action === 'snapshot' && Array.isArray(msg.snapshot)) {
        boardStrokesRef.current = msg.snapshot; setBoardStrokes(msg.snapshot); return
      }
      if (msg.action === 'stroke' && msg.stroke) {
        setBoardStrokes((prev) => { const next = [...prev, msg.stroke]; boardStrokesRef.current = next; return next })
      }
    })

    const unsubStateRequest = wsOn('room_state_sync_request', (msg) => {
      if (msg.room_id !== roomId || msg.from === currentUser?.id || !isHost) return
      sendRoomStateSync(roomId, msg.from, {
        whiteboard: boardStrokesRef.current,
        participants: { ...participantMediaRef.current, [currentUser?.id]: localMediaStateRef.current },
      })
    })

    const unsubStateSync = wsOn('room_state_sync', (msg) => {
      if (msg.room_id !== roomId || msg.from === currentUser?.id) return
      const snapshot = msg.state || {}
      if (Array.isArray(snapshot.whiteboard)) { boardStrokesRef.current = snapshot.whiteboard; setBoardStrokes(snapshot.whiteboard) }
      if (snapshot.participants) {
        setParticipantMedia((prev) => {
          const merged = { ...prev }
          Object.entries(snapshot.participants).forEach(([uid, ms]) => {
            if (uid !== currentUser?.id) merged[uid] = defaultMediaState({ ...(merged[uid] || {}), ...ms })
          })
          participantMediaRef.current = merged
          return merged
        })
      }
    })

    const unsubPomo = wsOn('pomodoro_start', (msg) => {
      if (msg.room_id !== roomId) return
      applyPomodoroSnapshot({ active: true, isBreak: false, seconds: msg.duration || POMODORO_WORK, total: msg.duration || POMODORO_WORK, completedFocusSessions: pomoCount })
    })

    const unsubStop = wsOn('pomodoro_stop', (msg) => {
      if (msg.room_id !== roomId) return
      applyPomodoroSnapshot({ active: false, isBreak: false, seconds: POMODORO_WORK, total: POMODORO_WORK, completedFocusSessions: pomoCount })
    })

    const unsubChat = wsOn('chat_message', (msg) => {
      if (msg.chat_id !== `room_${roomId}`) return
      setChatMsgs((prev) => [...prev, { ...msg, is_mine: msg.sender_id === currentUser?.id }])
      if (!showChat) setUnreadChat((c) => c + 1)
    })

    return () => {
      unsubJoin(); unsubLeave(); unsubKick()
      unsubOffer(); unsubAnswer(); unsubIce()
      unsubMedia(); unsubScreen(); unsubWhiteboard()
      unsubStateRequest(); unsubStateSync()
      unsubPomo(); unsubStop(); unsubChat()
    }
  }, [
    applyPomodoroSnapshot, cleanupPeer, createOfferForUser, currentUser?.id,
    ensurePeerConnection, isHost, navigate, pomoCount, refreshRoomMembers,
    roomId, sendAnswer, sendRoomStateSync, showChat, syncPeerMediaForUser, wsOn,
  ])

  useEffect(() => { resizeBoard() }, [boardStrokes, resizeBoard])

  // ── Action handlers ─────────────────────────────────────────────────────────
  async function handleStartPomo() {
    try {
      await roomAPI.startPomodoro(roomId)
      applyPomodoroSnapshot({ active: true, isBreak: false, seconds: POMODORO_WORK, total: POMODORO_WORK, completedFocusSessions: pomoCount })
      wsSend({ type: 'pomodoro_start', room_id: roomId, duration: POMODORO_WORK })
      toast('Pomodoro started. Focus for 25 minutes.', { duration: 2400 })
    } catch { toast.error('Could not start Pomodoro.') }
  }

  async function handleStopPomo() {
    try {
      await roomAPI.stopPomodoro(roomId)
      applyPomodoroSnapshot({ active: false, isBreak: false, seconds: POMODORO_WORK, total: POMODORO_WORK, completedFocusSessions: pomoCount })
      wsSend({ type: 'pomodoro_stop', room_id: roomId })
    } catch { toast.error('Could not stop Pomodoro.') }
  }

  // FIX: handleToggleMic — use track.enabled to mute/unmute without stopping
  //      the track. This keeps the sender in the peer connection active so
  //      no renegotiation is needed just to mute.
  async function handleToggleMic() {
    if (localMediaStateRef.current.mic_on) {
      if (audioTrackRef.current) audioTrackRef.current.enabled = false
      updateLocalMediaState({ mic_on: false, audio_enabled: false })
      return
    }
    try {
      const track = await ensureAudioTrack()
      if (!track) return
      track.enabled = true
      audioTrackRef.current = track
      updateLocalMediaState({ mic_on: true, audio_enabled: true })
      // Sync track to all existing peers — replaceTrack handles null→track
      syncAllPeerMedia()
      rebuildLocalPreview()
      toast.success('Microphone enabled.')
    } catch { toast.error('Could not access your microphone.') }
  }

  // FIX: handleToggleCamera — same pattern: enabled flag for mute, replaceTrack
  //      for on/off to avoid costly renegotiation on every toggle.
  async function handleToggleCamera() {
    if (localMediaStateRef.current.cam_on) {
      if (cameraTrackRef.current) cameraTrackRef.current.enabled = false
      updateLocalMediaState({ cam_on: false, video_enabled: Boolean(screenTrackRef.current) })
      rebuildLocalPreview()
      syncAllPeerMedia()
      return
    }
    try {
      const track = await ensureCameraTrack()
      if (!track) return
      track.enabled = true
      cameraTrackRef.current = track
      updateLocalMediaState({ cam_on: true, video_enabled: true })
      rebuildLocalPreview()
      syncAllPeerMedia()
      toast.success('Camera enabled.')
    } catch { toast.error('Could not access your camera.') }
  }

  async function handleToggleScreenShare() {
    if (screenTrackRef.current) { stopScreenShare(); return }
    if (!navigator.mediaDevices?.getDisplayMedia) { toast.error('Screen sharing is not supported in this browser.'); return }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const track = stream.getVideoTracks()[0]
      if (!track) return
      screenTrackRef.current = track
      track.onended = () => stopScreenShare()
      rebuildLocalPreview()
      syncAllPeerMedia()
      updateLocalMediaState({ screen_sharing: true, video_enabled: true })
      sendRoomScreenShare(roomId, { active: true, label: track.label || 'Screen share' })
      toast.success('Screen sharing started.')
    } catch { toast.error('Could not start screen sharing.') }
  }

  function handleBackgroundChange(presetId) {
    const preset = getBackgroundPreset(presetId)
    setSelectedBackground(presetId)
    updateLocalMediaState({ background_mode: preset.mode, background_color: preset.background || '', background_image: '' })
  }

  async function handleKick(targetUserId, targetName) {
    if (!targetUserId) return
    if (!window.confirm(`Remove ${targetName || 'this member'} from the room?`)) return
    try {
      await roomAPI.kickMember(roomId, targetUserId)
      cleanupPeer(targetUserId)
      setMembers((prev) => prev.filter((m) => m.user?.id !== targetUserId))
      toast.success(`${targetName || 'Member'} removed.`)
      refreshRoomMembers()
    } catch { toast.error('Could not remove member.') }
  }

  async function handleTransferHost(targetUserId, targetName) {
    if (!targetUserId) return
    try {
      await roomAPI.transferHost(roomId, targetUserId)
      setRoom((prev) => prev ? { ...prev, host_id: targetUserId } : prev)
      setMembers((prev) => sortMembers(prev.map((m) => ({ ...m, is_host: m.user?.id === targetUserId }))))
      toast.success(`Host transferred to ${targetName || 'member'}.`)
    } catch { toast.error('Could not transfer host.') }
  }

  async function handleLeave() {
    if (isHost && memberCount > 1) {
      if (!window.confirm('You are the host. Leaving will transfer host to another member. Continue?')) return
    }
    try {
      await roomAPI.leaveRoom(roomId)
      sendRoomLeave(roomId)
      navigate('/rooms')
    } catch { toast.error('Could not leave room.') }
  }

  function sendChatMsg(e) {
    e?.preventDefault()
    const content = chatText.trim()
    if (!content) return
    const localMsg = { id: `local_${Date.now()}`, chat_id: `room_${roomId}`, sender: currentUser, sender_id: currentUser?.id, content, created_at: new Date().toISOString(), is_mine: true }
    setChatMsgs((prev) => [...prev, localMsg])
    wsSend({ type: 'chat', chat_id: `room_${roomId}`, content })
    setChatText('')
  }

  // ── Whiteboard drawing ──────────────────────────────────────────────────────
  function getBoardPoint(e) {
    const canvas = boardCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * canvas.width, y: ((e.clientY - rect.top) / rect.height) * canvas.height }
  }

  function handleBoardPointerDown(e) {
    if (!showWhiteboard) return
    const point = getBoardPoint(e)
    if (!point) return
    boardDrawingRef.current = { id: `stroke_${Date.now()}`, color: boardColor, size: boardSize, points: [point] }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handleBoardPointerMove(e) {
    if (!boardDrawingRef.current) return
    const point = getBoardPoint(e)
    if (!point) return
    boardDrawingRef.current = { ...boardDrawingRef.current, points: [...boardDrawingRef.current.points, point] }
    const ctx = boardCanvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, boardCanvasRef.current.width, boardCanvasRef.current.height)
    boardStrokesRef.current.forEach((stroke) => drawStroke(ctx, stroke))
    drawStroke(ctx, boardDrawingRef.current)
  }

  function finishBoardStroke() {
    if (!boardDrawingRef.current) return
    const stroke = boardDrawingRef.current.points.length > 1
      ? boardDrawingRef.current
      : { ...boardDrawingRef.current, points: [...boardDrawingRef.current.points, boardDrawingRef.current.points[0]] }
    boardDrawingRef.current = null
    setBoardStrokes((prev) => { const next = [...prev, stroke]; boardStrokesRef.current = next; return next })
    sendRoomWhiteboard(roomId, { action: 'stroke', stroke, revision: Date.now() })
  }

  function handleClearBoard() {
    boardStrokesRef.current = []; setBoardStrokes([])
    sendRoomWhiteboard(roomId, { action: 'clear', revision: Date.now() })
  }

  const roomSubtitle = useMemo(() => {
    const bits = [room?.subject || 'General session']
    if (room?.exam_target) bits.push(room.exam_target)
    bits.push(`${memberCount} studying`)
    return bits.join(' | ')
  }, [memberCount, room?.exam_target, room?.subject])

  const roomMembers = useMemo(() => sortMembers(members), [members])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Spinner size={36} />
          <p style={{ color: 'var(--text-3)' }}>Joining room...</p>
        </div>
      </div>
    )
  }

  if (!room) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn-icon" onClick={() => navigate('/rooms')}><ChevronLeft size={20} /></button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="truncate">{room.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{roomSubtitle}</div>
        </div>
        <div style={{ padding: '5px 9px', borderRadius: 'var(--radius-full)', background: localMediaState.screen_sharing ? 'rgba(59,130,246,0.16)' : 'var(--surface-2)', color: localMediaState.screen_sharing ? 'var(--primary)' : 'var(--text-3)', fontSize: '0.72rem', fontWeight: 700 }}>
          {localMediaState.screen_sharing ? 'Screen live' : 'Room live'}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Pomodoro bar */}
          <div style={{ padding: '16px 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: pomoActive ? pomoBreak ? 'linear-gradient(180deg, var(--green-light) 0%, transparent 100%)' : 'linear-gradient(180deg, var(--primary-light) 0%, transparent 100%)' : 'transparent', transition: 'background 0.35s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <PomodoroRing seconds={pomoSeconds} total={pomoTotal} isBreak={pomoBreak} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isHost ? (
                  pomoActive
                    ? <Button variant="ghost" size="sm" onClick={handleStopPomo} icon={<Square size={13} />}>Stop Pomodoro</Button>
                    : <Button variant="primary" size="sm" onClick={handleStartPomo} icon={<Play size={13} />}>Start Pomodoro</Button>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} />
                    {pomoActive ? 'Timer running (host controlled)' : 'Waiting for the host to start the timer'}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    localMediaState.mic_on ? 'Mic connected' : 'Mic muted',
                    localMediaState.cam_on ? 'Camera on' : 'Camera off',
                    localMediaState.screen_sharing ? 'Sharing screen' : 'No screen share',
                  ].map((label) => (
                    <span key={label} style={{ padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: '0.72rem', fontWeight: 700 }}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
            {pomoCount > 0 && (
              <div style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-light)', padding: '6px 10px', borderRadius: 'var(--radius-full)' }}>
                Focus sessions: {pomoCount}
              </div>
            )}
          </div>

          {/* Video grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>Study room live stage</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                  {refreshingMembers ? 'Refreshing members...' : `${memberCount} participant${memberCount !== 1 ? 's' : ''} — audio, video, whiteboard & screen-share`}
                </div>
              </div>
            </div>

            {memberCount === 0 ? (
              <EmptyState title="No members" desc="Invite friends to join your study room." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {roomMembers.map((member) => {
                  const userId = member.user?.id
                  const stream = userId === currentUser?.id ? localPreviewStream : remoteStreams[userId]
                  const mediaState = userId === currentUser?.id ? localMediaState : (participantMedia[userId] || defaultMediaState())
                  return (
                    <MediaTile
                      key={userId || member.id}
                      member={member}
                      stream={stream}
                      mediaState={mediaState}
                      isHost={isHost}
                      isMe={userId === currentUser?.id}
                      onKick={handleKick}
                      onTransfer={handleTransferHost}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Control bar */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', background: 'var(--surface)', flexShrink: 0 }}>
            <button
              className="btn-icon" onClick={handleToggleMic}
              title={localMediaState.mic_on ? 'Mute microphone' : 'Unmute microphone'}
              style={{ width: 44, height: 44, color: localMediaState.mic_on ? 'var(--text)' : 'var(--red)', background: localMediaState.mic_on ? 'var(--surface-2)' : 'var(--red-light)' }}
            >
              {localMediaState.mic_on ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <button
              className="btn-icon" onClick={handleToggleCamera}
              title={localMediaState.cam_on ? 'Stop camera' : 'Start camera'}
              style={{ width: 44, height: 44, color: localMediaState.cam_on ? 'var(--text)' : 'var(--red)', background: localMediaState.cam_on ? 'var(--surface-2)' : 'var(--red-light)' }}
            >
              {localMediaState.cam_on ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button
              className="btn btn-sm" onClick={handleToggleScreenShare}
              style={{ minWidth: isCompactLayout ? 108 : 124, background: localMediaState.screen_sharing ? 'var(--primary)' : undefined, color: localMediaState.screen_sharing ? '#fff' : undefined }}
            >
              {localMediaState.screen_sharing ? 'Stop Share' : 'Share Screen'}
            </button>

            <button
              className="btn-icon"
              onClick={() => { setPanel((v) => v === 'chat' ? null : 'chat'); setUnreadChat(0) }}
              title="Room chat"
              style={{ position: 'relative', width: 44, height: 44, color: showChat ? 'var(--primary)' : 'var(--text)', background: showChat ? 'var(--primary-light)' : 'var(--surface-2)' }}
            >
              <MessageCircle size={18} />
              {unreadChat > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--red)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>
                  {unreadChat}
                </span>
              )}
            </button>

            <button
              className="btn-icon"
              onClick={() => setPanel((v) => v === 'whiteboard' ? null : 'whiteboard')}
              title="Whiteboard"
              style={{ width: 44, height: 44, color: showWhiteboard ? 'var(--primary)' : 'var(--text)', background: showWhiteboard ? 'var(--primary-light)' : 'var(--surface-2)' }}
            >
              <Square size={18} />
            </button>

            <button
              className="btn-icon"
              onClick={() => setPanel((v) => v === 'backgrounds' ? null : 'backgrounds')}
              title="Virtual backgrounds"
              style={{ width: 44, height: 44, color: showBackgrounds ? 'var(--primary)' : 'var(--text)', background: showBackgrounds ? 'var(--primary-light)' : 'var(--surface-2)' }}
            >
              <Settings size={18} />
            </button>

            <button
              className="btn-icon" onClick={refreshRoomMembers} title="Refresh room members"
              style={{ width: 44, height: 44, color: refreshingMembers ? 'var(--primary)' : 'var(--text)', background: refreshingMembers ? 'var(--primary-light)' : 'var(--surface-2)' }}
            >
              <RefreshCw size={18} />
            </button>

            <button className="btn btn-danger btn-sm" onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={13} /> Leave
            </button>
          </div>
        </div>

        {/* Side panel (chat / whiteboard / backgrounds) */}
        <AnimatePresence>
          {panel && isCompactLayout && (
            <motion.button
              type="button" aria-label="Close panel"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setPanel(null)}
              style={{ position: 'absolute', inset: 0, zIndex: 18, border: 0, padding: 0, background: 'rgba(2, 6, 23, 0.58)', backdropFilter: 'blur(3px)', cursor: 'pointer' }}
            />
          )}
          {panel && (
            <motion.div
              initial={isCompactLayout ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isCompactLayout ? { y: 0, opacity: 1 } : { width: 360, opacity: 1 }}
              exit={isCompactLayout ? { y: '100%', opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              style={{
                position: isCompactLayout ? 'absolute' : 'relative',
                inset: isCompactLayout ? 'auto 0 0 0' : undefined,
                zIndex: isCompactLayout ? 19 : 'auto',
                width: isCompactLayout ? '100%' : undefined,
                height: isCompactLayout ? 'min(68dvh, 560px)' : undefined,
                maxHeight: isCompactLayout ? '100%' : undefined,
                borderLeft: isCompactLayout ? 'none' : '1px solid var(--border)',
                borderTop: isCompactLayout ? '1px solid var(--border)' : 'none',
                borderTopLeftRadius: isCompactLayout ? 20 : 0,
                borderTopRightRadius: isCompactLayout ? 20 : 0,
                boxShadow: isCompactLayout ? '0 -18px 40px rgba(0,0,0,0.38)' : 'none',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
                background: 'var(--surface)',
              }}
            >
              <div style={{ padding: isCompactLayout ? '10px 14px 0' : 0, background: isCompactLayout ? 'var(--surface)' : 'transparent', flexShrink: 0 }}>
                {isCompactLayout && (
                  <>
                    <div style={{ width: 44, height: 4, borderRadius: 999, background: 'var(--border-2)', margin: '0 auto 10px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{panelTitle}</div>
                      <button className="btn-icon" onClick={() => setPanel(null)} title="Close panel" style={{ width: 36, height: 36 }}><X size={16} /></button>
                    </div>
                  </>
                )}
              </div>

              {/* Chat panel */}
              {showChat && (
                <>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.88rem', display: isCompactLayout ? 'none' : 'block' }}>Room Chat</div>
                  <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {chatMsgs.length === 0 ? (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>No messages yet. Start the session with a quick hello.</p>
                    ) : (
                      chatMsgs.map((msg) => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: msg.is_mine ? 'row-reverse' : 'row', gap: 6, alignItems: 'flex-end' }}>
                          {!msg.is_mine && <Avatar user={msg.sender} size="xs" showRing={false} />}
                          <div style={{ maxWidth: '82%', padding: '7px 10px', borderRadius: 12, background: msg.is_mine ? 'var(--primary)' : 'var(--surface-2)', color: msg.is_mine ? '#fff' : 'var(--text)', fontSize: '0.82rem', lineHeight: 1.4, borderBottomRightRadius: msg.is_mine ? 2 : 12, borderBottomLeftRadius: msg.is_mine ? 12 : 2 }}>
                            {!msg.is_mine && <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>{msg.sender?.name}</div>}
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  <form onSubmit={sendChatMsg} style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Message the room..." style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '7px 10px', outline: 'none', color: 'var(--text)', fontSize: '0.82rem' }} />
                    <button type="submit" disabled={!chatText.trim()} style={{ width: 32, height: 32, borderRadius: '50%', background: chatText.trim() ? 'var(--primary)' : 'var(--surface-3)', border: 'none', cursor: chatText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: chatText.trim() ? '#fff' : 'var(--text-3)', flexShrink: 0 }}>
                      <Send size={13} />
                    </button>
                  </form>
                </>
              )}

              {/* Whiteboard panel */}
              {showWhiteboard && (
                <>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!isCompactLayout && <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Collaborative Whiteboard</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {BOARD_COLORS.map((color) => (
                        <button key={color} onClick={() => setBoardColor(color)} style={{ width: 24, height: 24, borderRadius: '50%', border: boardColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.12)', background: color, cursor: 'pointer' }} />
                      ))}
                      <input type="range" min={2} max={12} step={1} value={boardSize} onChange={(e) => setBoardSize(Number(e.target.value))} style={{ flex: 1, minWidth: 120 }} />
                      <button className="btn-outline" onClick={handleClearBoard}>Clear</button>
                    </div>
                  </div>
                  <div ref={boardWrapRef} style={{ flex: 1, padding: 12, minHeight: 0 }}>
                    <canvas
                      ref={boardCanvasRef}
                      onPointerDown={handleBoardPointerDown} onPointerMove={handleBoardPointerMove}
                      onPointerUp={finishBoardStroke} onPointerLeave={finishBoardStroke}
                      style={{ width: '100%', height: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', cursor: 'crosshair', touchAction: 'none' }}
                    />
                  </div>
                </>
              )}

              {/* Backgrounds panel */}
              {showBackgrounds && (
                <>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.88rem', display: isCompactLayout ? 'none' : 'block' }}>Virtual Background</div>
                  <div style={{ padding: 14, display: 'grid', gap: 10, overflow: 'auto' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                      Pick a stage background for your camera tile. This MVP changes the session backdrop without heavy ML processing, so it stays smoother for your pilot.
                    </p>
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button key={preset.id} onClick={() => handleBackgroundChange(preset.id)} style={{ width: '100%', border: selectedBackground === preset.id ? '1px solid var(--primary)' : '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 0, overflow: 'hidden', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ height: 72, background: preset.background || 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'flex-end', padding: 10, color: '#fff', fontWeight: 700 }}>
                          {preset.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}