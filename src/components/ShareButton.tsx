import { useRef } from 'react'
import { shareNode } from '../lib/share'

export default function ShareButton({ targetId }: { targetId: string }) {
  const busy = useRef(false)
  return (
    <button
      onClick={async () => {
        if (busy.current) return
        busy.current = true
        const node = document.getElementById(targetId)
        if (node) await shareNode(node, 'uccle-climate.png')
        busy.current = false
      }}
    >
      Share
    </button>
  )
}
