/**
 * Web Audio API based Call Sound Synthesizer.
 * Provides ringing, dialing, connection, and hangup sounds without external assets.
 */

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass()
  }
  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume()
  }
  return sharedAudioContext
}

/**
 * Phát âm thanh đổ chuông gọi đi (Dialing / Ringback tone).
 * Chu kỳ tiêu chuẩn: 1.5 giây tút, 2 giây ngắt.
 * @returns Hàm dừng âm thanh
 */
export function playOutgoingDialingSound(): () => void {
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  let isPlaying = true
  let activeNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null
  let timeoutId: number | null = null

  const scheduleRing = () => {
    if (!isPlaying) return

    try {
      const now = ctx.currentTime
      const duration = 1.5

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      // Tần số tiêu chuẩn tiếng chuông thoại: 440Hz + 480Hz
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(440, now)

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(480, now)

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05)
      gain.gain.setValueAtTime(0.08, now + duration - 0.05)
      gain.gain.linearRampToValueAtTime(0, now + duration)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + duration)
      osc2.stop(now + duration)

      activeNodes = { osc1, osc2, gain }

      timeoutId = window.setTimeout(() => {
        scheduleRing()
      }, 3500)
    } catch {
      // Ignored if audio context not permitted yet
    }
  }

  scheduleRing()

  return () => {
    isPlaying = false
    if (timeoutId !== null) window.clearTimeout(timeoutId)
    if (activeNodes) {
      try {
        activeNodes.gain.disconnect()
        activeNodes.osc1.stop()
        activeNodes.osc2.stop()
      } catch {
        // Ignored
      }
      activeNodes = null
    }
  }
}

/**
 * Phát nhạc chuông cuộc gọi đến (Incoming Ringtone).
 * Giai điệu chuông điện thoại hiện đại êm dịu, tự động lặp.
 * @returns Hàm dừng nhạc chuông
 */
export function playIncomingRingtone(): () => void {
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  let isPlaying = true
  let timeoutId: number | null = null

  const notes = [
    { freq: 523.25, time: 0 },    // C5
    { freq: 659.25, time: 0.18 }, // E5
    { freq: 783.99, time: 0.36 }, // G5
    { freq: 1046.5, time: 0.54 }, // C6
    { freq: 783.99, time: 0.8 },  // G5
    { freq: 1046.5, time: 1.0 },  // C6
  ]

  const scheduleMelody = () => {
    if (!isPlaying) return

    try {
      const now = ctx.currentTime
      for (const note of notes) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(note.freq, now + note.time)

        gain.gain.setValueAtTime(0, now + note.time)
        gain.gain.linearRampToValueAtTime(0.12, now + note.time + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + note.time)
        osc.stop(now + note.time + 0.36)
      }

      timeoutId = window.setTimeout(() => {
        scheduleMelody()
      }, 2400)
    } catch {
      // Ignored if user hasn't interacted
    }
  }

  scheduleMelody()

  return () => {
    isPlaying = false
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}

/**
 * Phát âm thanh khi cuộc gọi kết nối thành công (Chime).
 */
export function playConnectedTone(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const tones = [
      { freq: 587.33, time: 0, duration: 0.12 },    // D5
      { freq: 880.0, time: 0.12, duration: 0.2 },   // A5
    ]

    for (const tone of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(tone.freq, now + tone.time)

      gain.gain.setValueAtTime(0.08, now + tone.time)
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.time + tone.duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + tone.time)
      osc.stop(now + tone.time + tone.duration)
    }
  } catch {
    // Ignored
  }
}

/**
 * Phát âm thanh cúp máy (Hangup / End call).
 * 3 tiếng bíp ngắn.
 */
export function playHangupTone(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const beeps = [0, 0.15, 0.3]

    for (const startTime of beeps) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(420, now + startTime)

      gain.gain.setValueAtTime(0.1, now + startTime)
      gain.gain.setValueAtTime(0.1, now + startTime + 0.08)
      gain.gain.linearRampToValueAtTime(0.001, now + startTime + 0.09)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + startTime)
      osc.stop(now + startTime + 0.09)
    }
  } catch {
    // Ignored
  }
}
