import { useState, useRef, useCallback } from 'react'

type RecordingState = 'idle' | 'recording' | 'processing'

interface UseVoiceRecorderResult {
  state: RecordingState
  durationSeconds: number
  start: () => Promise<void>
  stop: () => Promise<{ audioDataUrl: string; durationSeconds: number; mimeType: string } | null>
  cancel: () => void
  error: string | null
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [state,    setState]    = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [error,    setError]    = useState<string | null>(null)

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Safari doesn't support webm — fall back to mp4
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = mr
      chunksRef.current   = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.start(100) // collect chunk every 100ms
      startTimeRef.current = Date.now()
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Нет доступа к микрофону'
      setError(msg)
    }
  }, [])

  const stop = useCallback((): Promise<{ audioDataUrl: string; durationSeconds: number; mimeType: string } | null> => {
    return new Promise(resolve => {
      const mr = recorderRef.current
      if (!mr || mr.state === 'inactive') { resolve(null); return }

      if (timerRef.current) clearInterval(timerRef.current)

      const finalDuration = Math.round((Date.now() - startTimeRef.current) / 1000)
      const mimeType = mr.mimeType

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        mr.stream.getTracks().forEach(t => t.stop())
        chunksRef.current = []
        recorderRef.current = null

        // Convert to base64 data URL for localStorage storage
        const reader = new FileReader()
        reader.onloadend = () => {
          setState('idle')
          setDuration(0)
          resolve({
            audioDataUrl: reader.result as string,
            durationSeconds: finalDuration,
            mimeType,
          })
        }
        reader.readAsDataURL(blob)
      }

      setState('processing')
      mr.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    const mr = recorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.stream.getTracks().forEach(t => t.stop())
      mr.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current = null
    chunksRef.current   = []
    setState('idle')
    setDuration(0)
  }, [])

  return { state, durationSeconds: duration, start, stop, cancel, error }
}
