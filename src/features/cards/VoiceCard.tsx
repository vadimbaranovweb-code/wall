import { useState, useRef, useCallback } from 'react'
import type { VoiceCard as VoiceCardType } from '@/types'

interface Props { card: VoiceCardType }

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Generate a stable waveform from audioDataUrl length (visual only, not real waveform)
function pseudoWave(seed: number, bars: number): number[] {
  const heights: number[] = []
  let v = seed
  for (let i = 0; i < bars; i++) {
    v = (v * 1664525 + 1013904223) & 0xffffffff
    heights.push(0.15 + ((v & 0xff) / 255) * 0.85)
  }
  return heights
}

export function VoiceCard({ card }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress,  setProgress]  = useState(0)   // 0..1
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const BARS   = 28
  const wave   = pseudoWave(card.id.charCodeAt(0) * 31 + card.id.charCodeAt(1), BARS)

  const togglePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) {
      const audio = new Audio(card.audioDataUrl)
      audioRef.current = audio

      audio.ontimeupdate = () =>
        setProgress(audio.duration ? audio.currentTime / audio.duration : 0)

      audio.onended = () => {
        setIsPlaying(false)
        setProgress(0)
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      await audioRef.current.play()
      setIsPlaying(true)
    }
  }, [card.audioDataUrl, isPlaying])

  const elapsed = Math.round(progress * card.durationSeconds)

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-ink-30">
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
          <rect x="3" y="0" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M1 6C1 8.20914 2.79086 10 5 10C7.20914 10 9 8.20914 9 6"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="5" y1="10" x2="5" y2="12"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="text-[9px] font-mono font-medium uppercase tracking-wider">
          голос
        </span>
      </div>

      {/* Waveform + play button */}
      <div className="flex items-center gap-2 flex-1 min-h-0">
        {/* Play / Pause */}
        <button
          className="w-8 h-8 rounded-full bg-ink flex items-center justify-center
                     flex-shrink-0 hover:opacity-80 active:scale-90
                     transition-all duration-100"
          onMouseDown={e => e.stopPropagation()}
          onClick={togglePlay}
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <rect x="1.5" y="1" width="2.5" height="8" rx="0.5"/>
              <rect x="6" y="1" width="2.5" height="8" rx="0.5"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <path d="M2 1.5L9 5L2 8.5V1.5Z"/>
            </svg>
          )}
        </button>

        {/* Waveform bars */}
        <div className="flex items-center gap-[2px] flex-1 h-10">
          {wave.map((h, i) => {
            const filled = i / BARS < progress
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-100"
                style={{
                  height: `${Math.round(h * 100)}%`,
                  background: filled ? 'rgb(26,24,20)' : 'rgba(26,24,20,0.15)',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center justify-between text-[10px] font-mono text-ink-30">
        <span>{isPlaying ? formatDuration(elapsed) : '0:00'}</span>
        <span>{formatDuration(card.durationSeconds)}</span>
      </div>

      {/* Transcript if available */}
      {card.transcript && (
        <p className="text-[11px] text-ink-60 leading-snug line-clamp-2
                      border-t border-ink-10 pt-1.5">
          {card.transcript}
        </p>
      )}
    </div>
  )
}
