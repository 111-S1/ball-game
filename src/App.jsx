import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { ABILITY_LABEL, ARENA, DEFAULT_BALLS, createWorld, draw, step } from './game.js'

export default function App() {
  const canvasRef = useRef(null)
  const worldRef = useRef(null)
  const savedRef = useRef(false)
  const [defs, setDefs] = useState(null)
  const [winner, setWinner] = useState(null)
  const [over, setOver] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    async function load() {
      if (supabase) {
        const { data, error } = await supabase.from('balls').select('*').order('id')
        if (!error && data && data.length >= 2) return setDefs(data)
      }
      setDefs(DEFAULT_BALLS)
    }
    load()
  }, [])

  useEffect(() => {
    if (!defs) return
    worldRef.current = createWorld(defs)
    savedRef.current = false
    setOver(false)
    setWinner(null)
    const ctx = canvasRef.current.getContext('2d')
    let last = performance.now()
    let raf
    const loop = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const w = worldRef.current
      step(w, dt)
      draw(ctx, w)
      if (w.over) {
        setOver(true)
        setWinner(w.winner)
        if (!savedRef.current) {
          savedRef.current = true
          if (supabase) supabase.from('matches').insert({ winner_name: w.winner })
        }
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [defs, round])

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 12, color: '#f3e9df', fontFamily: 'sans-serif' }}>
      <canvas ref={canvasRef} width={ARENA} height={ARENA} style={{ width: '100%', maxWidth: 560, borderRadius: 8 }} />
      {over && (
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          {winner ? `${winner} 승리!` : '무승부'}
        </div>
      )}
      <button
        onClick={() => setRound((r) => r + 1)}
        style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, border: 0, borderRadius: 6, background: '#ffd23f', color: '#14110f', cursor: 'pointer' }}
      >
        {over ? '다시 시작' : '새 경기'}
      </button>
      <div style={{ maxWidth: 560, fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
        {(defs || []).map((d) => (
          <div key={d.name}>
            <b style={{ color: d.color }}>{d.name}</b> · {ABILITY_LABEL[d.ability]}
          </div>
        ))}
      </div>
    </div>
  )
}
