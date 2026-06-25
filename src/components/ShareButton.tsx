import { useRef } from 'react'
import { Share2 } from 'lucide-react'
import { shareNode } from '../lib/share'

export default function ShareButton({ targetId }: { targetId: string }) {
  const busy = useRef(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (busy.current) return
        busy.current = true
        try {
          const node = document.getElementById(targetId)
          if (node) await shareNode(node, 'uccle-climate.png')
        } finally {
          busy.current = false
        }
      }}
      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <Share2 size={16} /> Share
    </button>
  )
}
