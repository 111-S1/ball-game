export const ARENA = 720
const R = 30
const BASE_SPEED = 300

export const ABILITY_LABEL = {
  split: '분열: 체력 절반 이하가 되면 둘로 나뉨',
  heal: '회복: 초당 체력 3 회복',
  speed: '가속: 맞힐수록 빨라지고 더 아픔',
  explode: '폭발: 죽을 때 주변에 큰 피해',
  shield: '방어: 처음 3번 공격 무효',
  vampire: '흡혈: 준 피해의 60% 회복',
}

export const DEFAULT_BALLS = [
  { name: '분열볼', ability: 'split', color: '#7ad7f0', hp: 100, atk: 10 },
  { name: '회복볼', ability: 'heal', color: '#7be495', hp: 100, atk: 9 },
  { name: '가속볼', ability: 'speed', color: '#ffd23f', hp: 100, atk: 8 },
  { name: '폭발볼', ability: 'explode', color: '#ff6b4a', hp: 100, atk: 10 },
  { name: '방어볼', ability: 'shield', color: '#b69cff', hp: 100, atk: 10 },
  { name: '흡혈볼', ability: 'vampire', color: '#ff4f8b', hp: 100, atk: 9 },
]

export function createWorld(defs) {
  const n = defs.length
  const balls = defs.map((d, i) => {
    const a = (i / n) * Math.PI * 2
    const dir = Math.random() * Math.PI * 2
    return {
      team: i,
      name: d.name,
      ability: d.ability,
      color: d.color,
      hp: d.hp,
      maxHp: d.hp,
      atk: d.atk,
      x: ARENA / 2 + Math.cos(a) * 250,
      y: ARENA / 2 + Math.sin(a) * 250,
      vx: Math.cos(dir) * BASE_SPEED,
      vy: Math.sin(dir) * BASE_SPEED,
      shield: d.ability === 'shield' ? 3 : 0,
      split: false,
      alive: true,
      cd: 0,
      flash: 0,
    }
  })
  return { balls, rings: [], winner: null, over: false }
}

function hurt(w, target, amount, src) {
  if (!target.alive) return
  if (target.shield > 0) {
    target.shield -= 1
    target.flash = 0.25
    w.rings.push({ x: target.x, y: target.y, r: R, life: 0.3, color: '#b69cff' })
    return
  }
  target.hp -= amount
  target.flash = 0.15
  if (src && src.ability === 'vampire') src.hp = Math.min(src.maxHp, src.hp + amount * 0.6)

  if (target.hp <= 0) {
    target.alive = false
    if (target.ability === 'explode') {
      w.rings.push({ x: target.x, y: target.y, r: 20, life: 0.5, color: '#ff6b4a', grow: 140 })
      for (const o of w.balls) {
        if (!o.alive || o.team === target.team) continue
        if (Math.hypot(o.x - target.x, o.y - target.y) < 140) hurt(w, o, 35, null)
      }
    }
    return
  }
  if (target.ability === 'split' && !target.split && target.hp <= target.maxHp / 2) {
    target.split = true
    const half = Math.ceil(target.hp / 2)
    target.hp = half
    const dir = Math.random() * Math.PI * 2
    w.balls.push({
      ...target,
      hp: half,
      x: target.x + 10,
      y: target.y + 10,
      vx: Math.cos(dir) * BASE_SPEED,
      vy: Math.sin(dir) * BASE_SPEED,
      cd: 0.3,
    })
    w.rings.push({ x: target.x, y: target.y, r: R, life: 0.3, color: '#7ad7f0' })
  }
}

export function step(w, dt) {
  if (w.over) return
  for (const b of w.balls) {
    if (!b.alive) continue
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) }
    if (b.x > ARENA - R) { b.x = ARENA - R; b.vx = -Math.abs(b.vx) }
    if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) }
    if (b.y > ARENA - R) { b.y = ARENA - R; b.vy = -Math.abs(b.vy) }
    if (b.ability === 'heal') b.hp = Math.min(b.maxHp, b.hp + 3 * dt)
    b.cd = Math.max(0, b.cd - dt)
    b.flash = Math.max(0, b.flash - dt)
  }

  const list = w.balls.filter((b) => b.alive)
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], c = list[j]
      if (!a.alive || !c.alive) continue
      const dx = c.x - a.x, dy = c.y - a.y
      const d = Math.hypot(dx, dy) || 1
      if (d >= R * 2) continue
      const nx = dx / d, ny = dy / d
      const overlap = R * 2 - d
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2
      c.x += nx * overlap / 2; c.y += ny * overlap / 2
      const va = a.vx * nx + a.vy * ny
      const vc = c.vx * nx + c.vy * ny
      a.vx += (vc - va) * nx; a.vy += (vc - va) * ny
      c.vx += (va - vc) * nx; c.vy += (va - vc) * ny
      if (a.team === c.team || a.cd > 0 || c.cd > 0) continue
      const dmgA = a.atk * (a.ability === 'speed' ? Math.hypot(a.vx, a.vy) / BASE_SPEED : 1)
      const dmgC = c.atk * (c.ability === 'speed' ? Math.hypot(c.vx, c.vy) / BASE_SPEED : 1)
      a.cd = c.cd = 0.3
      hurt(w, c, dmgA, a)
      hurt(w, a, dmgC, c)
      for (const x of [a, c]) {
        if (x.ability === 'speed' && x.alive) {
          const s = Math.hypot(x.vx, x.vy)
          if (s < BASE_SPEED * 2) { x.vx *= 1.08; x.vy *= 1.08 }
        }
      }
    }
  }

  for (const r of w.rings) {
    r.life -= dt
    r.r += (r.grow || 60) * dt
  }
  w.rings = w.rings.filter((r) => r.life > 0)

  const teams = new Set(w.balls.filter((b) => b.alive).map((b) => b.team))
  if (teams.size <= 1) {
    w.over = true
    const win = w.balls.find((b) => b.alive)
    w.winner = win ? win.name : null
  }
}

export function draw(ctx, w) {
  ctx.clearRect(0, 0, ARENA, ARENA)
  ctx.fillStyle = '#1d1815'
  ctx.fillRect(0, 0, ARENA, ARENA)
  ctx.strokeStyle = '#3a2f28'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, ARENA - 6, ARENA - 6)

  for (const r of w.rings) {
    ctx.globalAlpha = Math.max(0, r.life * 2)
    ctx.strokeStyle = r.color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  for (const b of w.balls) {
    if (!b.alive) continue
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : b.color
    ctx.beginPath()
    ctx.arc(b.x, b.y, R, 0, Math.PI * 2)
    ctx.fill()
    if (b.shield > 0) {
      ctx.strokeStyle = '#b69cff'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(b.x, b.y, R + 5, 0, Math.PI * 2)
      ctx.stroke()
    }
    const bw = 56, ratio = Math.max(0, b.hp / b.maxHp)
    ctx.fillStyle = '#00000088'
    ctx.fillRect(b.x - bw / 2, b.y - R - 16, bw, 8)
    ctx.fillStyle = ratio > 0.5 ? '#7be495' : ratio > 0.25 ? '#ffd23f' : '#ff4f4f'
    ctx.fillRect(b.x - bw / 2, b.y - R - 16, bw * ratio, 8)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(b.name, b.x, b.y + 5)
  }
}
