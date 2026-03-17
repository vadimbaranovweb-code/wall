import type { ImageCard as ImageCardType } from '@/types'

interface Props { card: ImageCardType }

export function ImageCard({ card }: Props) {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-card">
      {/* Image fills available space */}
      <div className="flex-1 overflow-hidden">
        <img
          src={card.dataUrl}
          alt={card.originalName}
          draggable={false}
          className="w-full h-full object-cover select-none"
        />
      </div>

      {/* Footer — filename */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5
                      border-t border-ink-10 bg-card flex-shrink-0">
        {/* Image icon */}
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
             className="text-ink-30 flex-shrink-0">
          <rect x="0.5" y="0.5" width="10" height="10" rx="1.5"
                stroke="currentColor" strokeWidth="1"/>
          <circle cx="3.5" cy="3.5" r="1" fill="currentColor"/>
          <path d="M1 8L3.5 5.5L5.5 7.5L7.5 5.5L10 8"
                stroke="currentColor" strokeWidth="1" strokeLinecap="round"
                strokeLinejoin="round"/>
        </svg>
        <span className="text-[10px] font-mono text-ink-30 truncate">
          {card.originalName}
        </span>
      </div>
    </div>
  )
}
